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
      "sabra": OECCountry("sabra", "Brazil"),
      "sachl": OECCountry("sachl", "Chile"),
      "afzaf": OECCountry("afzaf", "South Africa"),
      "afsle": OECCountry("afsle", "Sierra Leone"),
      "afnga": OECCountry("afnga", "Nigeria"),
      "afken": OECCountry("afken", "Kenya"),
      "asidn": OECCountry("asidn", "Indonesia"),
      "saecu": OECCountry("saecu", "Ecuador"),
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
      "178806": OECProduct("178806", "Drones", "electronics"),
      "2080920": OECProduct("2080920", "Cherries", "agriculture"),
      "147102": OECProduct("147102", "Diamonds", "mining"),
      "52603": OECProduct("52603", "Copper Ore", "mining"),
      "41801": OECProduct("41801", "Cocoa Beans", "agriculture"),
      "116109": OECProduct("116109", "T-shirts", "clothing"),
      "20902": OECProduct("20902", "Tea", "clothing"),
      "126403": OECProduct("126403", "Leather Footwear", "clothing"),
      "178712": OECProduct("178712", "Bicycles", "transportation"),
      "20803": OECProduct("20803", "Bananas", "agriculture"),
      "63102": OECProduct("63102", "Nitrogenous Fertilizers", "agriculture"),
      "10304": OECProduct("10304", "Fish Fillets", "agriculture"),
      "21005": OECProduct("21005", "Corn", "agriculture"),
      "52701": OECProduct("52701", "Coal Briquettes", "energy"),
      "178704": OECProduct("178704", "Cargo Trucks", "automotive"),
      "168411": OECProduct("168411", "Gas Turbines", "energy"),
      "189018": OECProduct("189018", "Medical Instruments", "healthcare"),
      "52601": OECProduct("52601", "Iron Ore", "mining"),
      "168544": OECProduct("168544", "Insulated Wire", "electronics"),
      "168507": OECProduct("168507", "Electric Batteries", "electronics"),
      "168541": OECProduct("168541", "Semiconductors: Diodes, Transistors, LEDs & Photovoltaics", "electronics"),
      "168504": OECProduct("168504", "Electrical Transformers", "energy"),
      "178802": OECProduct("178802", "Airplanes", "transportation"),
      "147113": OECProduct("147113", "Jewellery", "luxury"),
      "168536": OECProduct("168536", "Low-voltage Protection Equipment", "electronics"),
      "168473": OECProduct("168473", "Office Machine Parts", "electronics"),
      "168486": OECProduct("168486", "Semiconductor Manufacturing Equipment", "electronics"),
      "168481": OECProduct("168481", "Valves", "industrial"),
      "62933": OECProduct("62933", "Nitrogen Heterocyclic Compounds", "chemicals"),
      "168479": OECProduct("168479", "Specialized Industrial Machines", "industrial"),
      "168421": OECProduct("168421", "Centrifuges", "industrial"),
      "168537": OECProduct("168537", "Electrical Control Boards", "electronics"),
      "168414": OECProduct("168414", "Air Pumps", "industrial"),
      "209401": OECProduct("209401", "Seats", "furniture"),
      "178701": OECProduct("178701", "Tractors", "agriculture"),
      "168528": OECProduct("168528", "Video Displays", "electronics"),
      "157403": OECProduct("157403", "Refined Copper", "materials"),
      "73901": OECProduct("73901", "Ethylene Polymers", "chemicals"),
      "84202": OECProduct("84202", "Trunks and Cases", "accessories"),
      "178807": OECProduct("178807", "Aircraft parts for spacecraft, UAVs, and ground equipment", "aerospace"),
      "168443": OECProduct("168443", "Industrial Printers", "electronics"),
      "168413": OECProduct("168413", "Liquid Pumps", "industrial"),
      "189021": OECProduct("189021", "Orthopedic Appliances", "healthcare"),
      "157601": OECProduct("157601", "Raw Aluminium", "materials"),
      "168524": OECProduct("168524", "Flat Panel Displays", "electronics"),
      "52716": OECProduct("52716", "Electricity", "energy"),
      "157208": OECProduct("157208", "Hot-Rolled Iron", "materials"),
      "168429": OECProduct("168429", "Large Construction Vehicles", "construction"),
      "168431": OECProduct("168431", "Excavation Machinery", "construction"),
      "168483": OECProduct("168483", "Transmissions", "automotive"),
      "168409": OECProduct("168409", "Engine Parts", "automotive"),
      "168501": OECProduct("168501", "Electric Motors", "electronics"),
      "116204": OECProduct("116204", "Non-Knit Women's Suits", "clothing"),
      "63304": OECProduct("63304", "Beauty Products", "cosmetics"),
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
