import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional
import aiofiles

from oec_client import oec_client

logger = logging.getLogger(__name__)

class ExportDataManager:
    """
    Manages export data with smart caching, persistence, and automatic updates
    """
    
    def __init__(self, data_dir: str = "data", cache_hours: int = 24):
        self.data_dir = Path(data_dir)
        self.cache_hours = cache_hours
        self.data_file = self.data_dir / "export_data.json"
        self.metadata_file = self.data_dir / "metadata.json"
        
        # In-memory cache for fast access
        self.cache: Dict[str, Dict[str, float]] = {}
        self.last_updated: Optional[datetime] = None
        
        # Ensure data directory exists
        self.data_dir.mkdir(exist_ok=True)
        
    async def initialize(self) -> None:
        """Initialize data manager - load existing data or fetch fresh"""
        logger.info("Initializing Export Data Manager...")
        
        # Try to load existing data
        if await self._load_from_disk():
            if self._is_cache_valid():
                logger.info("✅ Using cached export data")
                return
            else:
                logger.info("⏰ Cached data is stale, refreshing...")
        else:
            logger.info("📥 No cached data found, fetching fresh data...")
        
        # Fetch fresh data
        await self._fetch_and_cache_all_products()
    
    async def get_export_data(self, product_oec_id: str) -> Dict[str, float]:
        """
        Get export data for a product
        Returns dict mapping country_oec_id -> export_value_usd
        """
        if product_oec_id in self.cache:
            return self.cache[product_oec_id].copy()
        
        # If not in cache, try to fetch just this product
        logger.warning(f"Product {product_oec_id} not in cache, fetching...")
        try:
            async with oec_client as client:
                data = await client.fetch_export_data(product_oec_id)
                self.cache[product_oec_id] = data
                await self._save_to_disk()  # Persist the update
                return data.copy()
        except Exception as e:
            logger.error(f"Failed to fetch data for {product_oec_id}: {e}")
            return {}
    
    async def _fetch_and_cache_all_products(self) -> None:
        """Fetch and cache data for all game products"""
        # Get all product IDs from OEC client
        product_ids = list(oec_client.PRODUCTS.keys())
        
        logger.info(f"Fetching export data for {len(product_ids)} products...")
        
        try:
            async with oec_client as client:
                # Fetch all product data
                export_data = await client.preload_game_data(product_ids)
                
                # Update cache
                self.cache.update(export_data)
                self.last_updated = datetime.now()
                
                # Persist to disk
                await self._save_to_disk()
                
                logger.info(f"✅ Successfully cached data for {len(export_data)} products")
                
        except Exception as e:
            logger.error(f"Failed to fetch export data: {e}")
            # If we have some cached data, continue with that
            if not self.cache:
                logger.warning("Using fallback data generation")
                self._generate_fallback_data()
    
    def _generate_fallback_data(self) -> None:
        """Generate fallback data when API is unavailable"""
        import random
        
        logger.warning("Generating fallback export data")
        
        for product_id in oec_client.PRODUCTS.keys():
            product_data = {}
            for country_id in oec_client.COUNTRIES.keys():
                # Generate realistic values based on known patterns
                base_value = random.uniform(0.1, 100.0)
                
                # Add realism for major exporters
                multipliers = {
                    ("52709", "sabra"): 3.0,  # Saudi oil
                    ("52709", "eurus"): 2.8,  # Russian oil
                    ("178703", "eudeu"): 3.5,  # German cars
                    ("178703", "asjpn"): 3.0,  # Japanese cars
                    ("168517", "aschn"): 4.0,  # Chinese phones
                    ("63004", "eudeu"): 2.5,  # German medicine
                    ("42204", "eufra"): 3.0,  # French wine
                }
                
                multiplier = multipliers.get((product_id, country_id), 1.0)
                product_data[country_id] = base_value * multiplier
            
            self.cache[product_id] = product_data
        
        self.last_updated = datetime.now()
    
    async def _save_to_disk(self) -> None:
        """Save current cache to disk"""
        try:
            # Save export data
            async with aiofiles.open(self.data_file, 'w') as f:
                await f.write(json.dumps(self.cache, indent=2))
            
            # Save metadata
            metadata = {
                "last_updated": self.last_updated.isoformat() if self.last_updated else None,
                "cache_hours": self.cache_hours,
                "product_count": len(self.cache),
                "version": "1.0"
            }
            
            async with aiofiles.open(self.metadata_file, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))
            
            logger.debug("💾 Export data saved to disk")
            
        except Exception as e:
            logger.error(f"Failed to save data to disk: {e}")
    
    async def _load_from_disk(self) -> bool:
        """Load cached data from disk"""
        try:
            if not self.data_file.exists() or not self.metadata_file.exists():
                return False
            
            # Load metadata
            async with aiofiles.open(self.metadata_file, 'r') as f:
                metadata = json.loads(await f.read())
            
            if metadata.get("last_updated"):
                self.last_updated = datetime.fromisoformat(metadata["last_updated"])
            
            # Load export data
            async with aiofiles.open(self.data_file, 'r') as f:
                self.cache = json.loads(await f.read())
            
            logger.info(f"📁 Loaded {len(self.cache)} products from disk cache")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load data from disk: {e}")
            return False
    
    def _is_cache_valid(self) -> bool:
        """Check if cached data is still valid"""
        if not self.last_updated:
            return False
        
        age = datetime.now() - self.last_updated
        is_valid = age < timedelta(hours=self.cache_hours)
        
        if not is_valid:
            logger.info(f"Cache is {age.total_seconds()/3600:.1f} hours old (limit: {self.cache_hours}h)")
        
        return is_valid
    
    async def force_refresh(self) -> None:
        """Force refresh all export data"""
        logger.info("🔄 Force refreshing export data...")
        self.cache.clear()
        await self._fetch_and_cache_all_products()
    
    async def get_cache_stats(self) -> Dict:
        """Get statistics about the cached data"""
        return {
            "products_cached": len(self.cache),
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "cache_age_hours": (datetime.now() - self.last_updated).total_seconds() / 3600 if self.last_updated else None,
            "cache_valid": self._is_cache_valid(),
            "cache_expires_in_hours": self.cache_hours - ((datetime.now() - self.last_updated).total_seconds() / 3600) if self.last_updated else None,
            "data_file_exists": self.data_file.exists(),
            "data_file_size_kb": self.data_file.stat().st_size / 1024 if self.data_file.exists() else 0
        }

# Background task for automatic data updates
class DataUpdateScheduler:
    """Handles automatic background updates of export data"""
    
    def __init__(self, data_manager: ExportDataManager, update_interval_hours: int = 24):
        self.data_manager = data_manager
        self.update_interval_hours = update_interval_hours
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    def start(self) -> None:
        """Start the background update scheduler"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._update_loop())
        logger.info(f"📅 Started data update scheduler (every {self.update_interval_hours}h)")
    
    def stop(self) -> None:
        """Stop the background update scheduler"""
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("⏹️ Stopped data update scheduler")
    
    async def _update_loop(self) -> None:
        """Background loop for updating data"""
        while self._running:
            try:
                # Wait for update interval
                await asyncio.sleep(self.update_interval_hours * 3600)
                
                if self._running:
                    logger.info("🔄 Scheduled data update starting...")
                    await self.data_manager.force_refresh()
                    logger.info("✅ Scheduled data update completed")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduled data update: {e}")
                # Continue running even if update fails

# Global instances
export_data_manager = ExportDataManager()
update_scheduler = DataUpdateScheduler(export_data_manager)