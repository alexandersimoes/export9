from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from enum import Enum
import uuid
import asyncio
import time
import random
import logging

from oec_client import oec_client, OECCountry, OECProduct

logger = logging.getLogger(__name__)

class GameState(Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress" 
    FINISHED = "finished"

class PlayerState(Enum):
    WAITING = "waiting"
    IN_GAME = "in_game"
    DISCONNECTED = "disconnected"

@dataclass
class Country:
    code: str
    name: str
    oec_id: str  # OEC API identifier
    
@dataclass 
class Product:
    id: str
    name: str
    category: str
    oec_id: str  # OEC API identifier
    
@dataclass
class ExportData:
    country_code: str
    product_id: str
    export_value: float  # in billions USD
    
@dataclass
class Card:
    country: Country
    is_played: bool = False
    
@dataclass
class Player:
    id: str
    name: str
    socket_id: str
    state: PlayerState = PlayerState.WAITING
    cards: List[Card] = field(default_factory=list)
    score: int = 0
    current_card: Optional[Card] = None
    
    def __post_init__(self):
        if not self.cards:
            self.cards = []

@dataclass 
class GameRound:
    round_number: int
    product: Product
    player_cards: Dict[str, Card] = field(default_factory=dict)  # player_id -> card
    winner_id: Optional[str] = None
    export_data: Dict[str, float] = field(default_factory=dict)  # country_code -> export_value
    is_complete: bool = False

@dataclass
class Game:
    id: str
    players: List[Player] = field(default_factory=list)
    state: GameState = GameState.WAITING
    current_round: int = 0
    rounds: List[GameRound] = field(default_factory=list)
    winner_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    
    def __post_init__(self):
        if not self.rounds:
            self.rounds = []
            
    def is_full(self) -> bool:
        return len(self.players) >= 2
        
    def add_player(self, player: Player):
        if len(self.players) < 2:
            self.players.append(player)
            player.state = PlayerState.IN_GAME
            
    def get_player_by_id(self, player_id: str) -> Optional[Player]:
        return next((p for p in self.players if p.id == player_id), None)
        
    def get_player_by_socket(self, socket_id: str) -> Optional[Player]:
        return next((p for p in self.players if p.socket_id == socket_id), None)

class GameManager:
    def __init__(self):
        self.games: Dict[str, Game] = {}
        self.waiting_players: List[Player] = []
        self.player_game_map: Dict[str, str] = {}  # player_id -> game_id
        self.countries: List[Country] = []
        self.products: List[Product] = []
        # Note: Export data is now managed by ExportDataManager
        # self.cached_export_data removed - using global data manager
        
        # Initialize game data
        self._initialize_countries()
        self._initialize_products()
        
    def _initialize_countries(self):
        """Initialize list of countries with OEC mappings"""
        countries_data = [
            ("CN", "China", "aschn"),
            ("US", "United States", "nausa"),
            ("DE", "Germany", "eudeu"),
            ("JP", "Japan", "asjpn"),
            ("GB", "United Kingdom", "eugbr"),
            ("FR", "France", "eufra"),
            ("KR", "South Korea", "askor"),
            ("IT", "Italy", "euita"),
            ("CA", "Canada", "nacan"),
            ("ES", "Spain", "euesp"),
            ("IN", "India", "asind"),
            ("NL", "Netherlands", "eunld"),
            ("SA", "Saudi Arabia", "sabra"),
            ("CH", "Switzerland", "euche"),
            ("AU", "Australia", "ocaus"),
            ("IE", "Ireland", "euirl"),
            ("MX", "Mexico", "namex"),
            ("RU", "Russia", "eurus"),
            ("TH", "Thailand", "astha"),
            ("MY", "Malaysia", "asmys")
        ]
        self.countries = [Country(code=code, name=name, oec_id=oec_id) 
                         for code, name, oec_id in countries_data]
        
    def _initialize_products(self):
        """Initialize list of products with OEC mappings"""
        products_data = [
            ("cars", "Cars", "automotive", "178703"),
            ("phones", "Telephones", "electronics", "168517"),
            ("medicine", "Packaged Medicaments", "healthcare", "63004"),
            ("coffee", "Coffee", "beverages", "20901"),
            ("wine", "Wine", "beverages", "42204"),
            ("computers", "Computers", "electronics", "168471"),
            ("oil", "Crude Petroleum", "energy", "52709"),
            ("circuits", "Integrated Circuits", "electronics", "168542"),
            ("gas", "Petroleum Gas", "energy", "52711"),
            ("cheese", "Cheese", "food", "10406"),
            ("beer", "Beer", "beverages", "42203"),
            ("tires", "Rubber Tires", "automotive", "74011"),
            ("soybeans", "Soybeans", "agriculture", "21201"),
            ("sugar", "Raw Sugar", "food", "41701"),
            ("liquor", "Hard Liquor", "beverages", "42208"),
            ("refined_oil", "Refined Petroleum", "energy", "52710"),
            ("auto_parts", "Motor Vehicle Parts", "automotive", "178708"),
            ("drones", "Drones", "electronics", "178806")
        ]
        self.products = [Product(id=id, name=name, category=category, oec_id=oec_id) 
                        for id, name, category, oec_id in products_data]
        
    async def get_export_value(self, country_code: str, product_id: str) -> float:
        """Get export value for a country-product combination"""
        # Import here to avoid circular imports
        from data_manager import export_data_manager
        
        # Find country and product to get OEC IDs
        country = next((c for c in self.countries if c.code == country_code), None)
        product = next((p for p in self.products if p.id == product_id), None)
        
        if not country or not product:
            return 0.0
        
        # Get data from the global data manager
        product_data = await export_data_manager.get_export_data(product.oec_id)
        return product_data.get(country.oec_id, 0.0)
        
    def create_game(self) -> Game:
        """Create a new game"""
        game_id = str(uuid.uuid4())
        game = Game(id=game_id)
        self.games[game_id] = game
        return game
        
    def add_waiting_player(self, player: Player):
        """Add player to waiting queue"""
        self.waiting_players.append(player)
        
    def find_match(self) -> Optional[Game]:
        """Find or create a game for waiting players"""
        if len(self.waiting_players) >= 2:
            # Create new game with 2 waiting players
            game = self.create_game()
            
            # Add first 2 players to the game
            for _ in range(2):
                player = self.waiting_players.pop(0)
                game.add_player(player)
                self.player_game_map[player.id] = game.id
                
            # Deal cards to players
            self._deal_cards(game)
            
            return game
        return None
        
    def _deal_cards(self, game: Game):
        """Deal the same 10 country cards to each player"""
        available_countries = self.countries.copy()
        random.shuffle(available_countries)
        
        # Select 10 random countries that both players will get
        selected_countries = available_countries[:10]
        
        for player in game.players:
            # Give each player the same 10 country cards
            player.cards = [Card(country=country) for country in selected_countries]
            
    def start_game(self, game_id: str):
        """Start a game and initialize rounds"""
        game = self.games.get(game_id)
        if not game or game.state != GameState.WAITING:
            return
            
        game.state = GameState.IN_PROGRESS
        
        # Create 9 rounds with random products
        products = random.sample(self.products, 9)
        
        # No need to preload - data manager handles this globally
        for i, product in enumerate(products):
            round_data = GameRound(round_number=i + 1, product=product)
            game.rounds.append(round_data)
            
    def get_game_by_player(self, player_id: str) -> Optional[Game]:
        """Get game that player is in"""
        game_id = self.player_game_map.get(player_id)
        return self.games.get(game_id) if game_id else None
        
    def remove_player(self, player_id: str):
        """Remove player from game or waiting queue"""
        # Remove from waiting queue
        self.waiting_players = [p for p in self.waiting_players if p.id != player_id]
        
        # Remove from game
        game_id = self.player_game_map.get(player_id)
        if game_id:
            game = self.games.get(game_id)
            if game:
                game.players = [p for p in game.players if p.id != player_id]
                if not game.players:
                    # Clean up empty game
                    del self.games[game_id]
            del self.player_game_map[player_id]