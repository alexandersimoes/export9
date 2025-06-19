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
from database import db, User, GameRecord, coerce_user_id
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


class GameResultRequest(BaseModel):
  player1_id: str
  player2_id: str
  player1_score: int
  player2_score: int
  game_duration: Optional[int] = None


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
  """Get ELO leaderboard"""
  try:
    leaderboard = db.get_leaderboard(limit)
    return [LeaderboardEntry(**entry) for entry in leaderboard]
  except Exception as e:
    logger.error(f"Failed to get leaderboard: {e}")
    raise HTTPException(status_code=500, detail="Failed to get leaderboard")


@app.post("/api/games/result")
async def record_game_result(request: GameResultRequest):
  """Record game result and update ELO ratings"""
  try:
    # Get players
    player1 = db.get_user_by_id(request.player1_id)
    player2 = db.get_user_by_id(request.player2_id)

    if not player1 or not player2:
      raise HTTPException(status_code=404, detail="Player not found")

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

    # Update player ELOs
    db.update_user_elo(player1.id, elo_result.player1_new_elo, player1_result)
    db.update_user_elo(player2.id, elo_result.player2_new_elo, player2_result)

    # Save game record
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
