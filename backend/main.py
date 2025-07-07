import asyncio
import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import socketio
from dotenv import load_dotenv
import os
from typing import Optional, List
from pydantic import BaseModel
import requests
import json
from datetime import datetime

from models import GameManager
from socket_handlers import register_socket_handlers
from data_manager import export_data_manager, update_scheduler
from database import db, User, GameRecord, PrivateRoom, coerce_user_id
from elo_system import EloCalculator
from guest_names import generate_guest_username, generate_guest_display_name

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                          "https://export9.oec.world", "https://dev.oec.world", "https://oec.world"],
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25
)

# Create FastAPI app
app = FastAPI(title="Export Game API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://export9.oec.world", "https://dev.oec.world", "https://oec.world"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize game manager
# Pydantic models for API


class GuestUserRequest(BaseModel):
  name: Optional[str] = None


class AuthUserRequest(BaseModel):
  oec_token: Optional[str] = None
  oec_user_id: Optional[str] = None
  username: Optional[str] = None
  display_name: Optional[str] = None
  email: Optional[str] = None


class UserResponse(BaseModel):
  id: str
  username: str
  display_name: str
  is_guest: bool
  elo_rating: int
  games_played: int
  wins: int
  losses: int
  draws: int
  elo_category: str


class LeaderboardEntry(BaseModel):
  display_name: str
  elo_rating: int
  games_played: int
  wins: int
  losses: int
  draws: int
  win_rate: float
  external_elo: Optional[int] = None
  external_old_elo: Optional[int] = None
  external_last_game: Optional[str] = None
  has_external_data: bool = False


class GameResultRequest(BaseModel):
  player1_id: str
  player2_id: str
  player1_score: int
  player2_score: int
  game_duration: Optional[int] = None


class CreatePrivateRoomRequest(BaseModel):
  creator_id: str


class PrivateRoomResponse(BaseModel):
  id: str
  creator_id: str
  room_code: str
  is_active: bool
  current_players: int
  max_players: int
  share_url: str
  created_at: str
  expires_at: str


class JoinPrivateRoomRequest(BaseModel):
  room_code: str
  user_id: str


# Security for OEC authentication
security = HTTPBearer(auto_error=False)

game_manager = GameManager()

# Register socket event handlers
register_socket_handlers(sio, game_manager)


@app.on_event("startup")
async def startup_event():
  """Initialize data manager and start background scheduler"""
  logger.info("🚀 Starting Export Game server...")
  await export_data_manager.initialize()
  update_scheduler.start()
  logger.info("✅ Server startup complete")


@app.on_event("shutdown")
async def shutdown_event():
  """Clean shutdown"""
  logger.info("🛑 Shutting down Export Game server...")
  update_scheduler.stop()
  logger.info("✅ Server shutdown complete")

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)


# Helper functions
async def verify_oec_token(token: str) -> Optional[dict]:
  """Verify OEC token and get user info"""
  try:
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("https://oec.world/api/auth/verify", headers=headers, timeout=10)

    if response.status_code == 200:
      return response.json()
    return None
  except Exception as e:
    logger.error(f"OEC token verification failed: {e}")
    return None


def user_to_response(user: User) -> UserResponse:
  """Convert User to UserResponse"""
  return UserResponse(
      id=coerce_user_id(user.id),
      username=user.username,
      display_name=user.display_name,
      is_guest=user.is_guest,
      elo_rating=user.elo_rating,
      games_played=user.games_played,
      wins=user.wins,
      losses=user.losses,
      draws=user.draws,
      elo_category=EloCalculator.get_elo_category(user.elo_rating)
  )

# API Endpoints


def validate_display_name(name: str) -> str:
  """Validate and clean display name"""
  import re

  if not name or not name.strip():
    raise HTTPException(status_code=400, detail="Name is required")

  cleaned_name = name.strip()

  if len(cleaned_name) > 20:
    raise HTTPException(status_code=400, detail="Name must be 20 characters or less")

  # Allow only letters, numbers, and spaces
  if not re.match(r'^[a-zA-Z0-9\s]+$', cleaned_name):
    raise HTTPException(status_code=400, detail="Name can only contain letters, numbers, and spaces")

  return cleaned_name


@app.post("/api/users/guest", response_model=UserResponse)
async def create_guest_user(request: GuestUserRequest):
  """Create a new guest user"""
  try:
    if request.name and request.name.strip():
      # Validate and use provided name
      display_name = validate_display_name(request.name)
      username = display_name.replace(" ", "")
    else:
      # Generate random name
      username = generate_guest_username()
      display_name = generate_guest_display_name()

    user = db.create_guest_user(username, display_name)
    return user_to_response(user)

  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Failed to create guest user: {e}")
    raise HTTPException(status_code=500, detail="Failed to create guest user")


@app.post("/api/users/auth", response_model=UserResponse)
async def authenticate_user(request: AuthUserRequest):
  """Authenticate user with OEC session data or token"""
  try:
    # Check if we have direct OEC session data
    if request.oec_user_id and request.username:
      oec_user_id = request.oec_user_id
      username = request.username
      display_name = request.display_name or request.username
    else:
      raise HTTPException(status_code=400, detail="Either OEC session data or token required")

    # Clean and validate display name
    # try:
    #   display_name = validate_display_name(raw_display_name)
    # except HTTPException:
    #   # If name is invalid, fall back to username or generate clean name
    #   import re
    #   if re.match(r'^[a-zA-Z0-9\s]+$', username) and len(username) <= 20:
    #     display_name = username
    #   else:
    #     display_name = f"User {oec_user_id}"[:20]

    # Create or update user
    user = db.create_authenticated_user(oec_user_id, username, display_name)
    return user_to_response(user)

  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Failed to authenticate user: {e}")
    raise HTTPException(status_code=500, detail="Authentication failed")


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
  """Get user by ID"""
  user = db.get_user_by_id(user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")

  return user_to_response(user)


@app.get("/api/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 50):
  """Get ELO leaderboard with external data"""
  try:
    leaderboard = await db.get_enhanced_leaderboard(limit)
    return [LeaderboardEntry(**entry) for entry in leaderboard]
  except Exception as e:
    logger.error(f"Failed to get leaderboard: {e}")
    raise HTTPException(status_code=500, detail="Failed to get leaderboard")


@app.post("/api/games/result")
async def record_game_result(request: GameResultRequest):
  """Record game result and update ELO ratings"""
  try:
    # Check for duplicate game processing (same players, scores within last 5 minutes)
    conn = db.get_connection()
    try:
      duplicate_check = conn.execute('''
        SELECT id, player1_elo_before, player1_elo_after, player2_elo_before, player2_elo_after, elo_change 
        FROM game_records 
        WHERE player1_id = ? AND player2_id = ? 
        AND player1_score = ? AND player2_score = ? 
        AND created_at > datetime('now', '-5 minutes')
        LIMIT 1
      ''', (request.player1_id, request.player2_id, 
            request.player1_score, request.player2_score)).fetchone()
      
      if duplicate_check:
        logger.info(f"Duplicate game result detected for players {request.player1_id} vs {request.player2_id}")
        # Return the actual ELO changes from the original game processing
        player1_elo_change = duplicate_check[2] - duplicate_check[1]  # after - before
        player2_elo_change = duplicate_check[4] - duplicate_check[3]  # after - before
        return {
          "success": True,
          "message": "Game already processed",
          "player1_elo_change": player1_elo_change,
          "player2_elo_change": player2_elo_change,
          "elo_points_exchanged": duplicate_check[5]
        }
    finally:
      conn.close()

    # Get player1 (human player)
    player1 = db.get_user_by_id(request.player1_id)
    if not player1:
      raise HTTPException(status_code=404, detail="Player not found")

    # Check if this is a CPU game
    is_cpu_game = request.player2_id == 'cpu'

    if is_cpu_game:
      # CPU opponent with fixed rating
      cpu_elo = 1200
      cpu_games_played = 1000  # Treat CPU as experienced player for K-factor

      # Calculate new ELO for player1 vs CPU
      elo_result = EloCalculator.calculate_new_elos(
          player1.elo_rating, player1.games_played,
          cpu_elo, cpu_games_played,
          request.player1_score, request.player2_score
      )

      # Determine winner and game result for player1
      if request.player1_score > request.player2_score:
        winner_id = player1.id
        player1_result = "win"
      elif request.player2_score > request.player1_score:
        winner_id = 'cpu'
        player1_result = "loss"
      else:
        winner_id = None
        player1_result = "draw"

      # Update only player1's ELO (CPU doesn't get updated)
      db.update_user_elo(player1.id, elo_result.player1_new_elo, player1_result)

      # Save game record for CPU game
      game_record = GameRecord(
          player1_id=player1.id,
          player2_id='cpu',
          winner_id=winner_id,
          player1_score=request.player1_score,
          player2_score=request.player2_score,
          player1_elo_before=player1.elo_rating,
          player2_elo_before=cpu_elo,
          player1_elo_after=elo_result.player1_new_elo,
          player2_elo_after=cpu_elo,  # CPU ELO doesn't change
          elo_change=elo_result.elo_change,
          game_duration=request.game_duration
      )
      db.save_game_record(game_record)

      return {
          "success": True,
          "player1_elo_change": elo_result.player1_new_elo - player1.elo_rating,
          "player2_elo_change": 0,  # CPU doesn't change
          "elo_points_exchanged": elo_result.elo_change
      }

    else:
      # Human vs Human game
      player2 = db.get_user_by_id(request.player2_id)
      if not player2:
        raise HTTPException(status_code=404, detail="Player 2 not found")

      # Calculate new ELO ratings
      elo_result = EloCalculator.calculate_new_elos(
          player1.elo_rating, player1.games_played,
          player2.elo_rating, player2.games_played,
          request.player1_score, request.player2_score
      )

      # Determine winner and game results
      if request.player1_score > request.player2_score:
        winner_id = player1.id
        player1_result = "win"
        player2_result = "loss"
      elif request.player2_score > request.player1_score:
        winner_id = player2.id
        player1_result = "loss"
        player2_result = "win"
      else:
        winner_id = None
        player1_result = "draw"
        player2_result = "draw"

      # Update both players' ELOs
      db.update_user_elo(player1.id, elo_result.player1_new_elo, player1_result)
      db.update_user_elo(player2.id, elo_result.player2_new_elo, player2_result)

      # Save game record for human vs human game
      game_record = GameRecord(
          player1_id=player1.id,
          player2_id=player2.id,
          winner_id=winner_id,
          player1_score=request.player1_score,
          player2_score=request.player2_score,
          player1_elo_before=player1.elo_rating,
          player2_elo_before=player2.elo_rating,
          player1_elo_after=elo_result.player1_new_elo,
          player2_elo_after=elo_result.player2_new_elo,
          elo_change=elo_result.elo_change,
          game_duration=request.game_duration
      )
      db.save_game_record(game_record)

      return {
          "success": True,
          "player1_elo_change": elo_result.player1_new_elo - player1.elo_rating,
          "player2_elo_change": elo_result.player2_new_elo - player2.elo_rating,
          "elo_points_exchanged": elo_result.elo_change
      }

  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Failed to record game result: {e}")
    raise HTTPException(status_code=500, detail="Failed to record game result")


@app.get("/api/matchmaking/{user_id}")
async def find_opponent(user_id: str):
  """Find opponent with similar ELO rating"""
  try:
    user = db.get_user_by_id(user_id)
    if not user:
      raise HTTPException(status_code=404, detail="User not found")

    opponent = db.find_matched_opponent(user.elo_rating, user_id)

    if opponent:
      return {
          "found": True,
          "opponent": opponent,
          "elo_difference": abs(opponent["elo_rating"] - user.elo_rating)
      }
    else:
      return {"found": False}

  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Matchmaking failed: {e}")
    raise HTTPException(status_code=500, detail="Matchmaking failed")


@app.post("/api/private-rooms", response_model=PrivateRoomResponse)
async def create_private_room(request: CreatePrivateRoomRequest):
  """Create a new private room"""
  try:
    # Verify user exists
    user = db.get_user_by_id(request.creator_id)
    if not user:
      raise HTTPException(status_code=404, detail="User not found")

    # Check if user already has an active private room
    existing_rooms = db.get_private_rooms_by_creator(request.creator_id)
    if existing_rooms:
      # Return the existing room instead of creating a new one
      room = existing_rooms[0]
    else:
      # Create new room if none exists
      room = db.create_private_room(request.creator_id)
    
    # Build share URL
    base_url = "https://export9.oec.world" if os.getenv("NODE_ENV") == "production" else "http://localhost:3000"
    share_url = f"{base_url}/room/{room.room_code}"
    
    return PrivateRoomResponse(
        id=room.id,
        creator_id=room.creator_id,
        room_code=room.room_code,
        is_active=room.is_active,
        current_players=room.current_players,
        max_players=room.max_players,
        share_url=share_url,
        created_at=room.created_at.isoformat() if room.created_at else "",
        expires_at=room.expires_at.isoformat() if room.expires_at else ""
    )
    
  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Failed to create private room: {e}")
    raise HTTPException(status_code=500, detail="Failed to create private room")


@app.get("/api/private-rooms/{room_code}", response_model=PrivateRoomResponse)
async def get_private_room(room_code: str):
  """Get private room by room code"""
  try:
    room = db.get_private_room_by_code(room_code)
    if not room:
      raise HTTPException(status_code=404, detail="Room not found or expired")
    
    # Build share URL
    base_url = "https://export9.oec.world" if os.getenv("NODE_ENV") == "production" else "http://localhost:3000"
    share_url = f"{base_url}/room/{room.room_code}"
    
    return PrivateRoomResponse(
        id=room.id,
        creator_id=room.creator_id,
        room_code=room.room_code,
        is_active=room.is_active,
        current_players=room.current_players,
        max_players=room.max_players,
        share_url=share_url,
        created_at=room.created_at.isoformat() if room.created_at else "",
        expires_at=room.expires_at.isoformat() if room.expires_at else ""
    )
    
  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Failed to get private room: {e}")
    raise HTTPException(status_code=500, detail="Failed to get private room")


@app.get("/api/users/{user_id}/private-rooms", response_model=List[PrivateRoomResponse])
async def get_user_private_rooms(user_id: str):
  """Get all active private rooms created by a user"""
  try:
    user = db.get_user_by_id(user_id)
    if not user:
      raise HTTPException(status_code=404, detail="User not found")
    
    rooms = db.get_private_rooms_by_creator(user_id)
    
    # Build share URLs
    base_url = "https://export9.oec.world" if os.getenv("NODE_ENV") == "production" else "http://localhost:3000"
    
    return [
        PrivateRoomResponse(
            id=room.id,
            creator_id=room.creator_id,
            room_code=room.room_code,
            is_active=room.is_active,
            current_players=room.current_players,
            max_players=room.max_players,
            share_url=f"{base_url}/room/{room.room_code}",
            created_at=room.created_at.isoformat() if room.created_at else "",
            expires_at=room.expires_at.isoformat() if room.expires_at else ""
        )
        for room in rooms
    ]
    
  except HTTPException:
    raise
  except Exception as e:
    logger.error(f"Failed to get user private rooms: {e}")
    raise HTTPException(status_code=500, detail="Failed to get user private rooms")


@app.get("/")
async def root():
  return {"message": "Export Game API is running"}


@app.get("/health")
async def health_check():
  cache_stats = await export_data_manager.get_cache_stats()
  return {
      "status": "healthy",
      "active_games": len(game_manager.games),
      "waiting_players": len(game_manager.waiting_players),
      "data_cache": cache_stats
  }


@app.get("/test-oec")
async def test_oec_api():
  """Test endpoint to verify OEC API integration"""
  try:
    from oec_client import oec_client

    async with oec_client as client:
      # Test with crude oil exports
      export_data = await client.fetch_export_data("52709")

      return {
          "status": "success",
          "message": "OEC API is working",
          "sample_data": {
              "product": "Crude Petroleum (52709)",
              "countries_count": len(export_data),
              "top_exporters": sorted(
                  [(country_id, round(value, 2)) for country_id, value in export_data.items()],
                  key=lambda x: x[1],
                  reverse=True
              )[:5]
          }
      }
  except Exception as e:
    return {
        "status": "error",
        "message": f"OEC API test failed: {str(e)}"
    }


@app.post("/admin/refresh-data")
async def force_refresh_data():
  """Admin endpoint to force refresh export data"""
  try:
    await export_data_manager.force_refresh()
    cache_stats = await export_data_manager.get_cache_stats()
    return {
        "status": "success",
        "message": "Export data refreshed successfully",
        "cache_stats": cache_stats
    }
  except Exception as e:
    return {
        "status": "error",
        "message": f"Failed to refresh data: {str(e)}"
    }

if __name__ == "__main__":
  import uvicorn
  uvicorn.run(
      "main:socket_app",
      host="0.0.0.0",
      port=8000,
      reload=True,
      log_level="info"
  )
