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
  CPU = "cpu"


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
  is_cpu: bool = False
  elo_rating: Optional[int] = None
  room_code: Optional[str] = None
  user_id: Optional[str] = None
  last_seen: float = field(default_factory=time.time)

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
        ("SA", "Saudi Arabia", "assau"),
        ("CH", "Switzerland", "euche"),
        ("AU", "Australia", "ocaus"),
        ("IE", "Ireland", "euirl"),
        ("MX", "Mexico", "namex"),
        ("RU", "Russia", "eurus"),
        ("TH", "Thailand", "astha"),
        ("MY", "Malaysia", "asmys"),
        ("BR", "Brazil", "sabra"),
        ("CL", "Chile", "sachl"),
        ("ZA", "South Africa", "afzaf"),
        ("SL", "Sierra Leone", "afsle"),
        ("NG", "Nigeria", "afnga"),
        ("ID", "Indonesia", "asidn"),
        ("EC", "Ecuador", "saecu"),
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
        ("drones", "Drones", "electronics", "178806"),
        ("corn", "Corn", "agriculture", "21005"),
        ("cherries", "Cherries", "agriculture", "2080920"),
        ("diamonds", "Diamonds", "mining", "147102"),
        ("copper_ore", "Copper Ore", "mining", "52603"),
        ("cocoa_beans", "Cocoa Beans", "agriculture", "41801"),
        ("fish_fillets", "Fish Fillets", "agriculture", "10304"),
        ("t_shirts", "T-shirts", "clothing", "116109"),
        ("tea", "Tea", "clothing", "20902"),
        ("leather_footwear", "Leather Footwear", "clothing", "126403"),
        ("bicycles", "Bicycles", "transportation", "178712"),
        ("bananas", "Bananas", "agriculture", "20803"),
        ("nitrogenous_fertilizers", "Nitrogenous Fertilizers", "agriculture", "63102"),
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
      # Find two different users (avoid matching same user with themselves)
      player1 = None
      player2 = None

      for i, player in enumerate(self.waiting_players):
        if player1 is None:
          player1 = player
        elif getattr(player, 'user_id', None) != getattr(player1, 'user_id', None):
          # Found a different user
          player2 = player
          break

      # Only create game if we found 2 different users
      if player1 and player2:
        # Create new game
        game = self.create_game()

        # Remove players from waiting list and add to game
        self.waiting_players.remove(player1)
        self.waiting_players.remove(player2)

        game.add_player(player1)
        game.add_player(player2)
        self.player_game_map[player1.id] = game.id
        self.player_game_map[player2.id] = game.id

        # Deal cards to players
        self._deal_cards(game)

        return game
    return None

  def create_cpu_game(self, human_player: Player) -> Game:
    """Create a game with a human player vs CPU"""
    game = self.create_game()

    # Add human player
    game.add_player(human_player)
    self.player_game_map[human_player.id] = game.id

    # Create CPU player
    cpu_player = Player(
        id=str(uuid.uuid4()),
        name="CPU",
        socket_id="",  # CPU doesn't need socket
        state=PlayerState.CPU,
        is_cpu=True,
        elo_rating=1200  # Fixed ELO for CPU
    )
    game.add_player(cpu_player)
    self.player_game_map[cpu_player.id] = game.id

    # Deal cards to both players
    self._deal_cards(game)

    # Remove human player from waiting list
    if human_player in self.waiting_players:
      self.waiting_players.remove(human_player)

    return game

  async def get_cpu_best_card(self, cpu_player: Player, product: Product) -> Optional[Card]:
    """Get the best card for CPU to play from remaining cards (greedy strategy)"""
    available_cards = [card for card in cpu_player.cards if not card.is_played]
    if not available_cards:
      return None

    best_card = None
    best_value = -1

    # CPU is greedy: picks the best card from its remaining hand
    # This doesn't guarantee winning since human might have a better card
    for card in available_cards:
      export_value = await self.get_export_value(card.country.code, product.id)
      if export_value > best_value:
        best_value = export_value
        best_card = card

    logger.info(
        f"CPU choosing {best_card.country.code if best_card else 'None'} with export value {best_value:.2f}B for {product.name}")
    return best_card

  def _deal_cards(self, game: Game):
    """Deal the same 10 country cards to each player"""
    available_countries = self.countries.copy()
    random.shuffle(available_countries)

    # Select 10 random countries that both players will get
    selected_countries = available_countries[:10]
    selected_codes = [c.code for c in selected_countries]
    logger.info(f"Dealing cards to game {game.id}: {selected_codes}")

    for player in game.players:
      # Give each player the same 10 country cards
      player.cards = [Card(country=country) for country in selected_countries]
      player_type = "CPU" if player.is_cpu else "Human"
      logger.info(f"{player_type} ({player.name}) received cards: {selected_codes}")

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
