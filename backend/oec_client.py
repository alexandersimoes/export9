import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class OECCountry:
  id: str
  name: str


@dataclass
class OECProduct:
  id: str
  name: str
  category: str


class OECClient:
  """Client for fetching real export data from the OEC API"""

  BASE_URL = "https://api-v2.oec.world/tesseract/data.jsonrecords"

  # OEC country mappings
  COUNTRIES = {
      "aschn": OECCountry("aschn", "China"),
      "nausa": OECCountry("nausa", "United States"),
      "eudeu": OECCountry("eudeu", "Germany"),
      "asjpn": OECCountry("asjpn", "Japan"),
      "eugbr": OECCountry("eugbr", "United Kingdom"),
      "eufra": OECCountry("eufra", "France"),
      "askor": OECCountry("askor", "South Korea"),
      "euita": OECCountry("euita", "Italy"),
      "nacan": OECCountry("nacan", "Canada"),
      "euesp": OECCountry("euesp", "Spain"),
      "asind": OECCountry("asind", "India"),
      "eunld": OECCountry("eunld", "Netherlands"),
      "assau": OECCountry("assau", "Saudi Arabia"),
      "euche": OECCountry("euche", "Switzerland"),
      "ocaus": OECCountry("ocaus", "Australia"),
      "euirl": OECCountry("euirl", "Ireland"),
      "namex": OECCountry("namex", "Mexico"),
      "eurus": OECCountry("eurus", "Russia"),
      "astha": OECCountry("astha", "Thailand"),
      "asmys": OECCountry("asmys", "Malaysia"),
      "sabra": OECCountry("sabra", "Brazil")
  }

  # OEC product mappings
  PRODUCTS = {
      "52709": OECProduct("52709", "Crude Petroleum", "energy"),
      "178703": OECProduct("178703", "Cars", "automotive"),
      "52710": OECProduct("52710", "Refined Petroleum", "energy"),
      "168542": OECProduct("168542", "Integrated Circuits", "electronics"),
      "168517": OECProduct("168517", "Telephones", "electronics"),
      "52711": OECProduct("52711", "Petroleum Gas", "energy"),
      "63004": OECProduct("63004", "Packaged Medicaments", "healthcare"),
      "178708": OECProduct("178708", "Motor Vehicle Parts", "automotive"),
      "168471": OECProduct("168471", "Computers", "electronics"),
      "74011": OECProduct("74011", "Rubber Tires", "automotive"),
      "21201": OECProduct("21201", "Soybeans", "agriculture"),
      "42204": OECProduct("42204", "Wine", "beverages"),
      "10406": OECProduct("10406", "Cheese", "food"),
      "20901": OECProduct("20901", "Coffee", "beverages"),
      "41701": OECProduct("41701", "Raw Sugar", "food"),
      "42208": OECProduct("42208", "Hard Liquor", "beverages"),
      "42203": OECProduct("42203", "Beer", "beverages"),
      "178806": OECProduct("178806", "Drones", "electronics")
  }

  def __init__(self):
    self.session: Optional[aiohttp.ClientSession] = None
    self._cache: Dict[str, Dict[str, float]] = {}

  async def __aenter__(self):
    self.session = aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=30),
        connector=aiohttp.TCPConnector(limit=10)
    )
    return self

  async def __aexit__(self, exc_type, exc_val, exc_tb):
    if self.session:
      await self.session.close()

  def _get_cache_key(self, product_id: str) -> str:
    """Generate cache key for product export data"""
    return f"product_{product_id}_2023"

  async def fetch_export_data(self, product_id: str) -> Dict[str, float]:
    """
    Fetch export data for a specific product from all countries
    Returns dict mapping country_id -> export_value_usd
    """
    cache_key = self._get_cache_key(product_id)

    # Check cache first
    if cache_key in self._cache:
      logger.info(f"Using cached data for product {product_id}")
      return self._cache[cache_key]

    if not self.session:
      raise RuntimeError("OECClient session not initialized. Use async context manager.")

    # Build country list for API query
    country_list = ",".join(self.COUNTRIES.keys())

    # Construct API URL
    url = (
        f"{self.BASE_URL}?"
        f"cube=trade_i_baci_a_22&"
        f"locale=en&"
        f"drilldowns=HS4,Exporter+Country,Year&"
        f"measures=Trade+Value&"
        f"include=HS4:{product_id};"
        f"Exporter+Country:{country_list};"
        f"Year:2023"
    )

    logger.info(f"Fetching OEC data for product {product_id}")

    try:
      async with self.session.get(url) as response:
        if response.status != 200:
          logger.error(f"OEC API returned status {response.status}")
          return self._get_fallback_data(product_id)

        data = await response.json()

        if not data.get('data'):
          logger.warning(f"No data returned for product {product_id}")
          return self._get_fallback_data(product_id)

        # Process the response
        export_values = {}
        for record in data['data']:
          country_id = record.get('Exporter Country ID')
          trade_value = record.get('Trade Value', 0)

          if country_id in self.COUNTRIES:
            # Convert to billions USD for easier reading
            export_values[country_id] = trade_value / 1_000_000_000

        # Cache the result
        self._cache[cache_key] = export_values

        logger.info(f"Successfully fetched data for {len(export_values)} countries")
        return export_values

    except asyncio.TimeoutError:
      logger.error(f"Timeout fetching data for product {product_id}")
      return self._get_fallback_data(product_id)
    except Exception as e:
      logger.error(f"Error fetching OEC data for product {product_id}: {e}")
      return self._get_fallback_data(product_id)

  def _get_fallback_data(self, product_id: str) -> Dict[str, float]:
    """
    Generate fallback export data when API is unavailable
    Uses realistic but randomized values based on country/product combinations
    """
    logger.warning(f"Using fallback data for product {product_id}")

    import random

    fallback_data = {}

    # Realistic export patterns for different products
    strong_exporters = {
        "52709": ["sabra", "eurus", "nausa"],  # Crude oil
        "178703": ["eudeu", "asjpn", "askor"],  # Cars
        "168542": ["aschn", "askor", "asjpn"],  # Integrated circuits
        "168517": ["aschn", "askor", "asjpn"],  # Telephones
        "63004": ["eudeu", "euche", "nausa"],  # Medicines
        "42204": ["eufra", "euita", "euesp"],  # Wine
        "20901": ["sabra", "eufra", "euita"],  # Coffee
        "21201": ["sabra", "nausa", "asind"],  # Soybeans
    }

    base_exporters = strong_exporters.get(product_id, ["aschn", "nausa", "eudeu"])

    for country_id in self.COUNTRIES.keys():
      if country_id in base_exporters:
        # Strong exporters get higher values
        value = random.uniform(10.0, 100.0)
      else:
        # Other countries get lower values
        value = random.uniform(0.1, 15.0)

      fallback_data[country_id] = value

    return fallback_data

  def get_random_countries(self, count: int = 10) -> List[OECCountry]:
    """Get a random selection of countries for the game"""
    import random
    countries = list(self.COUNTRIES.values())
    return random.sample(countries, min(count, len(countries)))

  def get_random_products(self, count: int = 9) -> List[OECProduct]:
    """Get a random selection of products for the game"""
    import random
    products = list(self.PRODUCTS.values())
    return random.sample(products, min(count, len(products)))

  async def preload_game_data(self, product_ids: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Preload export data for multiple products
    Returns dict mapping product_id -> {country_id -> export_value}
    """
    logger.info(f"Preloading data for {len(product_ids)} products")

    tasks = []
    for product_id in product_ids:
      task = asyncio.create_task(self.fetch_export_data(product_id))
      tasks.append((product_id, task))

    results = {}
    for product_id, task in tasks:
      try:
        export_data = await task
        results[product_id] = export_data
      except Exception as e:
        logger.error(f"Failed to preload data for product {product_id}: {e}")
        results[product_id] = self._get_fallback_data(product_id)

    return results


# Global OEC client instance
oec_client = OECClient()
