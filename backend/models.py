from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from enum import Enum
import uuid
import asyncio
import time
import random

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
    
@dataclass 
class Product:
    id: str
    name: str
    category: str
    
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
        self.export_data: List[ExportData] = []
        self.countries: List[Country] = []
        self.products: List[Product] = []
        
        # Initialize game data
        self._initialize_countries()
        self._initialize_products()
        self._initialize_export_data()
        
    def _initialize_countries(self):
        """Initialize list of countries"""
        countries_data = [
            ("CN", "China"), ("US", "United States"), ("DE", "Germany"),
            ("JP", "Japan"), ("UK", "United Kingdom"), ("FR", "France"),
            ("KR", "South Korea"), ("IT", "Italy"), ("CA", "Canada"),
            ("ES", "Spain"), ("IN", "India"), ("NL", "Netherlands"),
            ("BR", "Brazil"), ("CH", "Switzerland"), ("AU", "Australia"),
            ("IE", "Ireland"), ("MX", "Mexico"), ("RU", "Russia"),
            ("TH", "Thailand"), ("MY", "Malaysia")
        ]
        self.countries = [Country(code=code, name=name) for code, name in countries_data]
        
    def _initialize_products(self):
        """Initialize list of products"""
        products_data = [
            ("cars", "Cars", "automotive"),
            ("phones", "Mobile Phones", "electronics"),
            ("chocolate", "Chocolate", "food"),
            ("medicine", "Pharmaceuticals", "healthcare"),
            ("coffee", "Coffee", "food"),
            ("wine", "Wine", "beverages"),
            ("computers", "Computers", "electronics"),
            ("oil", "Crude Oil", "energy"),
            ("rice", "Rice", "food"),
            ("steel", "Steel", "materials")
        ]
        self.products = [Product(id=id, name=name, category=category) 
                        for id, name, category in products_data]
        
    def _initialize_export_data(self):
        """Initialize export data with realistic values"""
        # Simplified - in production, this would come from a real database
        for product in self.products:
            for country in self.countries:
                # Generate semi-realistic export values based on country/product combinations
                base_value = random.uniform(0.1, 50.0)  # billions USD
                
                # Add some realism - certain countries excel at certain products
                multipliers = {
                    ("CN", "phones"): 3.0, ("CN", "computers"): 2.5,
                    ("DE", "cars"): 4.0, ("JP", "cars"): 3.0,
                    ("CH", "chocolate"): 2.0, ("US", "medicine"): 3.0,
                    ("BR", "coffee"): 4.0, ("FR", "wine"): 3.0,
                    ("RU", "oil"): 5.0, ("TH", "rice"): 3.0,
                    ("IN", "medicine"): 2.0, ("KR", "phones"): 2.5
                }
                
                multiplier = multipliers.get((country.code, product.id), 1.0)
                export_value = base_value * multiplier
                
                self.export_data.append(ExportData(
                    country_code=country.code,
                    product_id=product.id,
                    export_value=export_value
                ))
    
    def get_export_value(self, country_code: str, product_id: str) -> float:
        """Get export value for a country-product combination"""
        data = next((ed for ed in self.export_data 
                    if ed.country_code == country_code and ed.product_id == product_id), None)
        return data.export_value if data else 0.0
        
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