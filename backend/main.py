import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from dotenv import load_dotenv
import os

from models import GameManager
from socket_handlers import register_socket_handlers
from data_manager import export_data_manager, update_scheduler

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://export9.oec.world"],
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
    allow_origins=["http://localhost:3000", "https://export9.oec.world"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize game manager
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
