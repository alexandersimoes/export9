"""
Database models and setup for Export 9 ELO rating system
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'export9.db')

@dataclass
class User:
    id: Optional[int] = None
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
    player1_id: int = 0
    player2_id: int = 0
    winner_id: Optional[int] = None  # None for draws
    player1_score: int = 0
    player2_score: int = 0
    player1_elo_before: int = 0
    player2_elo_before: int = 0
    player1_elo_after: int = 0
    player2_elo_after: int = 0
    elo_change: int = 0  # ELO points gained/lost
    game_duration: Optional[int] = None  # seconds
    created_at: Optional[datetime] = None

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
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                    player1_id INTEGER NOT NULL,
                    player2_id INTEGER NOT NULL,
                    winner_id INTEGER,
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
            
            # Indexes for performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_users_oec_id ON users(oec_user_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo_rating)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_users_last_played ON users(last_played)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_games_created ON game_records(created_at)')
            
            conn.commit()
        finally:
            conn.close()
    
    def create_guest_user(self, username: str, display_name: str) -> User:
        """Create a new guest user"""
        conn = self.get_connection()
        try:
            cursor = conn.execute('''
                INSERT INTO users (username, display_name, is_guest, created_at)
                VALUES (?, ?, 1, ?)
            ''', (username, display_name, datetime.now()))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return User(
                id=user_id,
                username=username,
                display_name=display_name,
                is_guest=True,
                elo_rating=1200,
                created_at=datetime.now()
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
                conn.execute('''
                    UPDATE users SET username = ?, display_name = ?, last_played = ?
                    WHERE oec_user_id = ?
                ''', (username, display_name, datetime.now(), oec_user_id))
                conn.commit()
                return self.get_user_by_oec_id(oec_user_id)
            else:
                # Create new user
                cursor = conn.execute('''
                    INSERT INTO users (oec_user_id, username, display_name, is_guest, created_at)
                    VALUES (?, ?, ?, 0, ?)
                ''', (oec_user_id, username, display_name, datetime.now()))
                
                user_id = cursor.lastrowid
                conn.commit()
                
                return User(
                    id=user_id,
                    oec_user_id=oec_user_id,
                    username=username,
                    display_name=display_name,
                    is_guest=False,
                    elo_rating=1200,
                    created_at=datetime.now()
                )
        finally:
            conn.close()
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by database ID"""
        conn = self.get_connection()
        try:
            row = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
            if row:
                return User(**dict(row))
            return None
        finally:
            conn.close()
    
    def get_user_by_oec_id(self, oec_user_id: str) -> Optional[User]:
        """Get user by OEC user ID"""
        conn = self.get_connection()
        try:
            row = conn.execute('SELECT * FROM users WHERE oec_user_id = ?', (oec_user_id,)).fetchone()
            if row:
                return User(**dict(row))
            return None
        finally:
            conn.close()
    
    def update_user_elo(self, user_id: int, new_elo: int, game_result: str):
        """Update user's ELO rating and stats"""
        conn = self.get_connection()
        try:
            # Update stats based on game result
            if game_result == 'win':
                conn.execute('''
                    UPDATE users SET 
                        elo_rating = ?, 
                        games_played = games_played + 1,
                        wins = wins + 1,
                        last_played = ?
                    WHERE id = ?
                ''', (new_elo, datetime.now(), user_id))
            elif game_result == 'loss':
                conn.execute('''
                    UPDATE users SET 
                        elo_rating = ?, 
                        games_played = games_played + 1,
                        losses = losses + 1,
                        last_played = ?
                    WHERE id = ?
                ''', (new_elo, datetime.now(), user_id))
            else:  # draw
                conn.execute('''
                    UPDATE users SET 
                        elo_rating = ?, 
                        games_played = games_played + 1,
                        draws = draws + 1,
                        last_played = ?
                    WHERE id = ?
                ''', (new_elo, datetime.now(), user_id))
            
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
    
    def find_matched_opponent(self, user_elo: int, exclude_user_id: int) -> Optional[Dict[str, Any]]:
        """Find opponent with closest ELO rating"""
        conn = self.get_connection()
        try:
            # First try to find someone within 100 ELO points
            row = conn.execute('''
                SELECT id, display_name, elo_rating 
                FROM users 
                WHERE id != ? 
                AND ABS(elo_rating - ?) <= 100
                AND (last_played IS NULL OR last_played < datetime('now', '-1 minute'))
                ORDER BY ABS(elo_rating - ?) ASC
                LIMIT 1
            ''', (exclude_user_id, user_elo, user_elo)).fetchone()
            
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
            ''', (exclude_user_id, user_elo, user_elo)).fetchone()
            
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
            ''', (exclude_user_id,)).fetchone()
            
            return dict(row) if row else None
        finally:
            conn.close()

# Initialize database on import
db = Database()