"""
Database models and setup for Export 9 ELO rating system
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import os
import uuid
import logging

logger = logging.getLogger(__name__)

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'export9.db')


@dataclass
class User:
  id: Optional[str] = None
  oec_user_id: Optional[str] = None  # For authenticated users
  username: str = ""
  display_name: str = ""
  is_guest: bool = True
  elo_rating: int = 1200  # Standard starting ELO
  games_played: int = 0
  wins: int = 0
  losses: int = 0
  draws: int = 0
  created_at: Optional[datetime] = None
  last_played: Optional[datetime] = None


@dataclass
class GameRecord:
  id: Optional[int] = None
  player1_id: str = ""
  player2_id: str = ""
  winner_id: Optional[str] = None  # None for draws
  player1_score: int = 0
  player2_score: int = 0
  player1_elo_before: int = 0
  player2_elo_before: int = 0
  player1_elo_after: int = 0
  player2_elo_after: int = 0
  elo_change: int = 0  # ELO points gained/lost
  game_duration: Optional[int] = None  # seconds
  created_at: Optional[datetime] = None


@dataclass
class PrivateRoom:
  id: Optional[str] = None
  creator_id: str = ""
  room_code: str = ""  # Short, shareable code
  is_active: bool = True
  max_players: int = 2
  current_players: int = 0
  created_at: Optional[datetime] = None
  expires_at: Optional[datetime] = None


def generate_user_id() -> str:
  """Generate a unique string ID for users"""
  return str(uuid.uuid4())


def generate_room_code() -> str:
  """Generate a short, shareable room code"""
  import random
  import string
  # Generate a 6-character room code (letters and numbers)
  return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def coerce_user_id(user_id) -> str:
  """Convert user ID to string"""
  return str(user_id) if user_id is not None else None


class Database:
  def __init__(self, db_path: str = DATABASE_PATH):
    self.db_path = db_path
    self.init_database()

  def get_connection(self):
    """Get database connection with row factory for easier access"""
    conn = sqlite3.connect(self.db_path)
    conn.row_factory = sqlite3.Row
    return conn

  def init_database(self):
    """Initialize database tables"""
    conn = self.get_connection()
    try:
      # Users table
      conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    oec_user_id TEXT UNIQUE,
                    username TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    is_guest BOOLEAN DEFAULT 1,
                    elo_rating INTEGER DEFAULT 1200,
                    games_played INTEGER DEFAULT 0,
                    wins INTEGER DEFAULT 0,
                    losses INTEGER DEFAULT 0,
                    draws INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_played TIMESTAMP
                )
            ''')

      # Game records table
      conn.execute('''
                CREATE TABLE IF NOT EXISTS game_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player1_id TEXT NOT NULL,
                    player2_id TEXT NOT NULL,
                    winner_id TEXT,
                    player1_score INTEGER NOT NULL,
                    player2_score INTEGER NOT NULL,
                    player1_elo_before INTEGER NOT NULL,
                    player2_elo_before INTEGER NOT NULL,
                    player1_elo_after INTEGER NOT NULL,
                    player2_elo_after INTEGER NOT NULL,
                    elo_change INTEGER NOT NULL,
                    game_duration INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player1_id) REFERENCES users (id),
                    FOREIGN KEY (player2_id) REFERENCES users (id),
                    FOREIGN KEY (winner_id) REFERENCES users (id)
                )
            ''')

      # Private rooms table
      conn.execute('''
                CREATE TABLE IF NOT EXISTS private_rooms (
                    id TEXT PRIMARY KEY,
                    creator_id TEXT NOT NULL,
                    room_code TEXT UNIQUE NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    max_players INTEGER DEFAULT 2,
                    current_players INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    FOREIGN KEY (creator_id) REFERENCES users (id)
                )
            ''')

      # Indexes for performance
      conn.execute('CREATE INDEX IF NOT EXISTS idx_users_oec_id ON users(oec_user_id)')
      conn.execute('CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo_rating)')
      conn.execute('CREATE INDEX IF NOT EXISTS idx_users_last_played ON users(last_played)')
      conn.execute('CREATE INDEX IF NOT EXISTS idx_games_created ON game_records(created_at)')
      conn.execute('CREATE INDEX IF NOT EXISTS idx_private_rooms_code ON private_rooms(room_code)')
      conn.execute('CREATE INDEX IF NOT EXISTS idx_private_rooms_creator ON private_rooms(creator_id)')
      conn.execute('CREATE INDEX IF NOT EXISTS idx_private_rooms_active ON private_rooms(is_active)')

      conn.commit()
    finally:
      conn.close()

  def create_guest_user(self, username: str, display_name: str) -> User:
    """Create a new guest user"""
    conn = self.get_connection()
    try:
      user_id = generate_user_id()
      created_at = datetime.now()
      conn.execute('''
                INSERT INTO users (id, username, display_name, is_guest, created_at)
                VALUES (?, ?, ?, 1, ?)
            ''', (user_id, username, display_name, created_at.isoformat()))

      conn.commit()

      return User(
          id=user_id,
          username=username,
          display_name=display_name,
          is_guest=True,
          elo_rating=1200,
          created_at=created_at
      )
    finally:
      conn.close()

  def create_authenticated_user(self, oec_user_id: str, username: str, display_name: str) -> User:
    """Create or update authenticated user from OEC"""
    conn = self.get_connection()
    try:
      # Check if user already exists
      existing = conn.execute(
          'SELECT * FROM users WHERE oec_user_id = ?', (oec_user_id,)
      ).fetchone()

      if existing:
        # Update existing user
        now = datetime.now()
        conn.execute('''
                    UPDATE users SET username = ?, display_name = ?, last_played = ?
                    WHERE oec_user_id = ?
                ''', (username, display_name, now.isoformat(), oec_user_id))
        conn.commit()
        return self.get_user_by_oec_id(oec_user_id)
      else:
        # Create new user - use OEC user ID as the primary key
        user_id = coerce_user_id(oec_user_id)
        created_at = datetime.now()
        conn.execute('''
                    INSERT INTO users (id, oec_user_id, username, display_name, is_guest, created_at)
                    VALUES (?, ?, ?, ?, 0, ?)
                ''', (user_id, oec_user_id, username, display_name, created_at.isoformat()))

        conn.commit()

        return User(
            id=user_id,
            oec_user_id=oec_user_id,
            username=username,
            display_name=display_name,
            is_guest=False,
            elo_rating=1200,
            created_at=created_at
        )
    finally:
      conn.close()

  def get_user_by_id(self, user_id) -> Optional[User]:
    """Get user by database ID"""
    conn = self.get_connection()
    try:
      user_id_str = coerce_user_id(user_id)
      row = conn.execute('SELECT * FROM users WHERE id = ?', (user_id_str,)).fetchone()
      if row:
        user_data = dict(row)
        user_data['id'] = coerce_user_id(user_data['id'])
        return User(**user_data)
      return None
    finally:
      conn.close()

  def get_user_by_oec_id(self, oec_user_id: str) -> Optional[User]:
    """Get user by OEC user ID"""
    conn = self.get_connection()
    try:
      row = conn.execute('SELECT * FROM users WHERE oec_user_id = ?', (oec_user_id,)).fetchone()
      if row:
        user_data = dict(row)
        user_data['id'] = coerce_user_id(user_data['id'])
        return User(**user_data)
      return None
    finally:
      conn.close()

  def update_user_elo(self, user_id, new_elo: int, game_result: str):
    """Update user's ELO rating and stats"""
    conn = self.get_connection()
    try:
      user_id_str = coerce_user_id(user_id)
      now = datetime.now().isoformat()
      # Update stats based on game result
      if game_result == 'win':
        conn.execute('''
                    UPDATE users SET 
                        elo_rating = ?, 
                        games_played = games_played + 1,
                        wins = wins + 1,
                        last_played = ?
                    WHERE id = ?
                ''', (new_elo, now, user_id_str))
      elif game_result == 'loss':
        conn.execute('''
                    UPDATE users SET 
                        elo_rating = ?, 
                        games_played = games_played + 1,
                        losses = losses + 1,
                        last_played = ?
                    WHERE id = ?
                ''', (new_elo, now, user_id_str))
      else:  # draw
        conn.execute('''
                    UPDATE users SET 
                        elo_rating = ?, 
                        games_played = games_played + 1,
                        draws = draws + 1,
                        last_played = ?
                    WHERE id = ?
                ''', (new_elo, now, user_id_str))

      conn.commit()
    finally:
      conn.close()

  def save_game_record(self, game_record: GameRecord):
    """Save a completed game record"""
    conn = self.get_connection()
    try:
      conn.execute('''
                INSERT INTO game_records (
                    player1_id, player2_id, winner_id, player1_score, player2_score,
                    player1_elo_before, player2_elo_before, player1_elo_after, 
                    player2_elo_after, elo_change, game_duration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
          game_record.player1_id, game_record.player2_id, game_record.winner_id,
          game_record.player1_score, game_record.player2_score,
          game_record.player1_elo_before, game_record.player2_elo_before,
          game_record.player1_elo_after, game_record.player2_elo_after,
          game_record.elo_change, game_record.game_duration
      ))
      conn.commit()
    finally:
      conn.close()

  def get_leaderboard(self, limit: int = 50) -> List[Dict[str, Any]]:
    """Get ELO leaderboard"""
    conn = self.get_connection()
    try:
      rows = conn.execute('''
                SELECT 
                    display_name, elo_rating, games_played, wins, losses, draws,
                    CASE WHEN games_played > 0 
                         THEN ROUND((wins * 100.0 / games_played), 1) 
                         ELSE 0 END as win_rate
                FROM users 
                WHERE games_played >= 3  -- Minimum games for leaderboard
                ORDER BY elo_rating DESC, games_played DESC
                LIMIT ?
            ''', (limit,)).fetchall()

      return [dict(row) for row in rows]
    finally:
      conn.close()

  async def get_enhanced_leaderboard(self, limit: int = 50) -> List[Dict[str, Any]]:
    """Get enhanced leaderboard with external API data"""
    import aiohttp

    # Get local leaderboard data
    local_data = self.get_leaderboard(limit)

    # Fetch external leaderboard data
    external_data = []
    try:
      async with aiohttp.ClientSession() as session:
        async with session.post(
            'https://oec.world/api/games/leaderboard',
            json={"game": "export-holdem"},
            headers={"Origin": "oec.world"},
            timeout=aiohttp.ClientTimeout(total=10)
        ) as response:
          if response.status == 200:
            result = await response.json()
            if result.get('success') and result.get('results'):
              external_data = result['results'] if isinstance(result['results'], list) else [result['results']]
    except Exception as e:
      logger.error(f"Failed to fetch external leaderboard: {e}")
      # Continue with local data only if external API fails

    # Helper function to process username (handle pipes and emails)
    def process_username(username):
      # Handle pipe character
      if '|' in username:
        parts = username.split('|')
        before_pipe = parts[0].strip()
        after_pipe = parts[-1].strip()

        # If after pipe is "google", use before pipe but only part before @
        if after_pipe.lower() == "google":
          if '@' in before_pipe:
            return before_pipe.split('@')[0].strip()
          return before_pipe
        else:
          # Use after pipe (existing behavior)
          processed = after_pipe
      else:
        processed = username

      # Handle email addresses - only show part before @
      if '@' in processed:
        return processed.split('@')[0].strip()

      return processed

    # Combine local and external data
    enhanced_data = []
    external_usernames_added = set()

    # First, add local players with external data matching
    for entry in local_data:
      enhanced_entry = entry.copy()

      # Process display name for pipe character
      processed_display_name = process_username(entry['display_name'])
      enhanced_entry['display_name'] = processed_display_name

      # Look for matching external data by display name (try both original and processed)
      external_match = None
      for ext_entry in external_data:
        ext_username = ext_entry.get('username', '')
        if (ext_username == entry['display_name'] or
            ext_username == processed_display_name or
                process_username(ext_username) == processed_display_name):
          external_match = ext_entry
          external_usernames_added.add(ext_username)
          break

      if external_match:
        enhanced_entry['external_elo'] = external_match.get('new_elo')
        enhanced_entry['external_old_elo'] = external_match.get('old_elo')
        enhanced_entry['external_last_game'] = external_match.get('date')
        enhanced_entry['has_external_data'] = True

        # Update with actual OEC game stats if available
        if 'totalgames' in external_match:
          enhanced_entry['games_played'] = external_match.get('totalgames')
        if 'wins' in external_match:
          enhanced_entry['wins'] = external_match.get('wins')
        if 'losses' in external_match:
          enhanced_entry['losses'] = external_match.get('losses')
        if 'draws' in external_match:
          enhanced_entry['draws'] = external_match.get('draws')

        # Recalculate win rate with actual data
        if enhanced_entry['games_played'] > 0:
          enhanced_entry['win_rate'] = round((enhanced_entry['wins'] * 100.0) / enhanced_entry['games_played'], 1)
      else:
        enhanced_entry['external_elo'] = None
        enhanced_entry['external_old_elo'] = None
        enhanced_entry['external_last_game'] = None
        enhanced_entry['has_external_data'] = False

      enhanced_data.append(enhanced_entry)

    # Then, add external players who aren't in local database
    for ext_entry in external_data:
      ext_username = ext_entry.get('username', '')
      if ext_username not in external_usernames_added:
        # Create entry for external-only player
        # Use actual game stats from OEC API if available, otherwise fallback to old logic
        games_played = ext_entry.get('totalgames', 1) or 1
        new_elo = ext_entry.get('new_elo', 1200) or 1200
        old_elo = ext_entry.get('old_elo', 1200) or 1200
        wins = ext_entry.get('wins', 0) or (1 if new_elo > old_elo else 0)
        losses = ext_entry.get('losses', 0) or (1 if new_elo < old_elo else 0)
        draws = ext_entry.get('draws', 0) or 0

        # Calculate win rate based on actual games played
        if games_played > 0:
          win_rate = round((wins * 100.0) / games_played, 1)
        else:
          win_rate = 0.0

        external_only_entry = {
            'display_name': process_username(ext_username),
            'elo_rating': ext_entry.get('new_elo', 1200),
            'games_played': games_played,
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'win_rate': win_rate,
            'external_elo': ext_entry.get('new_elo'),
            'external_old_elo': ext_entry.get('old_elo'),
            'external_last_game': ext_entry.get('date'),
            'has_external_data': True
        }
        enhanced_data.append(external_only_entry)

    # Sort by ELO rating (prioritize external ELO if available, otherwise local ELO)
    enhanced_data.sort(key=lambda x: (x.get('external_elo') or x.get('elo_rating') or 0), reverse=True)

    return enhanced_data

  def get_guest_leaderboard(self, limit: int = 50) -> List[Dict[str, Any]]:
    """Get ELO leaderboard for guest players only (no oec_user_id)"""
    conn = self.get_connection()
    try:
      rows = conn.execute('''
                SELECT 
                    display_name, elo_rating, games_played, wins, losses, draws,
                    CASE WHEN games_played > 0 
                         THEN ROUND((wins * 100.0 / games_played), 1) 
                         ELSE 0 END as win_rate
                FROM users 
                WHERE games_played >= 3 
                AND (oec_user_id IS NULL OR oec_user_id = '')
                ORDER BY elo_rating DESC, games_played DESC
                LIMIT ?
            ''', (limit,)).fetchall()

      leaderboard = [dict(row) for row in rows]

      # Add external data fields (all None for guest players)
      for entry in leaderboard:
        entry['external_elo'] = None
        entry['external_old_elo'] = None
        entry['external_last_game'] = None
        entry['has_external_data'] = False

      return leaderboard
    finally:
      conn.close()

  def find_matched_opponent(self, user_elo: int, exclude_user_id) -> Optional[Dict[str, Any]]:
    """Find opponent with closest ELO rating"""
    conn = self.get_connection()
    try:
      exclude_user_id_str = coerce_user_id(exclude_user_id)
      # First try to find someone within 100 ELO points
      row = conn.execute('''
                SELECT id, display_name, elo_rating 
                FROM users 
                WHERE id != ? 
                AND ABS(elo_rating - ?) <= 100
                AND (last_played IS NULL OR last_played < datetime('now', '-1 minute'))
                ORDER BY ABS(elo_rating - ?) ASC
                LIMIT 1
            ''', (exclude_user_id_str, user_elo, user_elo)).fetchone()

      if row:
        return dict(row)

      # If no close match, expand search to 200 points
      row = conn.execute('''
                SELECT id, display_name, elo_rating 
                FROM users 
                WHERE id != ? 
                AND ABS(elo_rating - ?) <= 200
                AND (last_played IS NULL OR last_played < datetime('now', '-1 minute'))
                ORDER BY ABS(elo_rating - ?) ASC
                LIMIT 1
            ''', (exclude_user_id_str, user_elo, user_elo)).fetchone()

      if row:
        return dict(row)

      # Last resort: any available opponent
      row = conn.execute('''
                SELECT id, display_name, elo_rating 
                FROM users 
                WHERE id != ?
                AND (last_played IS NULL OR last_played < datetime('now', '-1 minute'))
                ORDER BY RANDOM()
                LIMIT 1
            ''', (exclude_user_id_str,)).fetchone()

      return dict(row) if row else None
    finally:
      conn.close()

  def create_private_room(self, creator_id: str) -> PrivateRoom:
    """Create a new private room"""
    conn = self.get_connection()
    try:
      room_id = str(uuid.uuid4())
      room_code = generate_room_code()
      created_at = datetime.now()
      # Rooms expire after 24 hours
      expires_at = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

      # Ensure unique room code
      max_attempts = 10
      for _ in range(max_attempts):
        try:
          conn.execute('''
                        INSERT INTO private_rooms (id, creator_id, room_code, created_at, expires_at)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (room_id, creator_id, room_code, created_at.isoformat(), expires_at.isoformat()))
          conn.commit()
          break
        except sqlite3.IntegrityError:
          # Room code collision, try again
          room_code = generate_room_code()
      else:
        raise Exception("Failed to generate unique room code")

      return PrivateRoom(
          id=room_id,
          creator_id=creator_id,
          room_code=room_code,
          is_active=True,
          created_at=created_at,
          expires_at=expires_at
      )
    finally:
      conn.close()

  def get_private_room_by_code(self, room_code: str) -> Optional[PrivateRoom]:
    """Get private room by room code"""
    conn = self.get_connection()
    try:
      row = conn.execute('''
                SELECT * FROM private_rooms 
                WHERE room_code = ? AND is_active = 1 AND expires_at > datetime('now')
            ''', (room_code.upper(),)).fetchone()
      if row:
        room_data = dict(row)
        # Convert string dates back to datetime objects
        if room_data['created_at']:
          room_data['created_at'] = datetime.fromisoformat(room_data['created_at'])
        if room_data['expires_at']:
          room_data['expires_at'] = datetime.fromisoformat(room_data['expires_at'])
        return PrivateRoom(**room_data)
      return None
    finally:
      conn.close()

  def get_private_rooms_by_creator(self, creator_id: str) -> List[PrivateRoom]:
    """Get all active private rooms by creator"""
    conn = self.get_connection()
    try:
      rows = conn.execute('''
                SELECT * FROM private_rooms 
                WHERE creator_id = ? AND is_active = 1 AND expires_at > datetime('now')
                ORDER BY created_at DESC
            ''', (creator_id,)).fetchall()
      rooms = []
      for row in rows:
        room_data = dict(row)
        # Convert string dates back to datetime objects
        if room_data['created_at']:
          room_data['created_at'] = datetime.fromisoformat(room_data['created_at'])
        if room_data['expires_at']:
          room_data['expires_at'] = datetime.fromisoformat(room_data['expires_at'])
        rooms.append(PrivateRoom(**room_data))
      return rooms
    finally:
      conn.close()

  def update_room_player_count(self, room_code: str, player_count: int) -> bool:
    """Update the current player count for a room"""
    conn = self.get_connection()
    try:
      cursor = conn.execute('''
                UPDATE private_rooms 
                SET current_players = ? 
                WHERE room_code = ? AND is_active = 1
            ''', (player_count, room_code.upper()))
      conn.commit()
      return cursor.rowcount > 0
    finally:
      conn.close()

  def deactivate_private_room(self, room_code: str) -> bool:
    """Deactivate a private room"""
    conn = self.get_connection()
    try:
      cursor = conn.execute('''
                UPDATE private_rooms 
                SET is_active = 0 
                WHERE room_code = ?
            ''', (room_code.upper(),))
      conn.commit()
      return cursor.rowcount > 0
    finally:
      conn.close()


# Initialize database on import
db = Database()
