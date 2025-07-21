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
      "euswe": OECCountry("euswe", "Sweden"),
      "eunor": OECCountry("eunor", "Norway"),
      "eubel": OECCountry("eubel", "Belgium"),
      "euaut": OECCountry("euaut", "Austria"),
      "asare": OECCountry("asare", "United Arab Emirates"),
      "astur": OECCountry("astur", "Turkey"),
      "saarg": OECCountry("saarg", "Argentina"),
      "asvnm": OECCountry("asvnm", "Vietnam"),
      "aspak": OECCountry("aspak", "Pakistan"),
      "asbgd": OECCountry("asbgd", "Bangladesh"),
      "assgp": OECCountry("assgp", "Singapore"),
      "ashkg": OECCountry("ashkg", "Hong Kong"),
      "asisr": OECCountry("asisr", "Israel"),
      "ocnzl": OECCountry("ocnzl", "New Zealand"),
      "asphl": OECCountry("asphl", "Philippines"),
      "afken": OECCountry("afken", "Kenya"),
      "afmar": OECCountry("afmar", "Morocco"),
      "askaz": OECCountry("askaz", "Kazakhstan"),
      "asqat": OECCountry("asqat", "Qatar"),
      "afdza": OECCountry("afdza", "Algeria"),
      "afegy": OECCountry("afegy", "Egypt"),
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
      "17870380": OECProduct("17870380", "Electric Motor Vehicles", "automotive"),
      "20950450": OECProduct("20950450", "Video Game Consoles and Machines", "electronics"),
      "2070700": OECProduct("2070700", "Cucumbers", "agriculture"),
      "16851810": OECProduct("16851810", "Microphones", "electronics"),
      "11630231": OECProduct("11630231", "Bed Linen", "clothing"),
      "16851110": OECProduct("16851110", "Spark Plugs", "automotive"),
      "2080510": OECProduct("2080510", "Oranges", "agriculture"),
      "2080450": OECProduct("2080450", "Guavas and Mangoes", "agriculture"),
      "6330790": OECProduct("6330790", "Perfumes", "cosmetics"),
      "1030389": OECProduct("1030389", "Frozen Whole Fish", "agriculture"),
      "2081010": OECProduct("2081010", "Strawberries", "agriculture"),
      "2080550": OECProduct("2080550", "Lemons and Limes", "agriculture"),
      "11620630": OECProduct("11620630", "Womens Blouses and Shirts", "clothing"),
      "1030481": OECProduct("1030481", "Frozen Salmon Fillets", "agriculture"),
      "2120740": OECProduct("2120740", "Sesame seeds", "agriculture"),
      "6280461": OECProduct("6280461", "Silicon", "materials"),
      "4240412": OECProduct("4240412", "E-cigarettes (vapes)", "tobacco"),
      "5250100": OECProduct("5250100", "Salt", "food"),
      "6300450": OECProduct("6300450", "Vitamins", "healthcare"),
      "4240319": OECProduct("4240319", "Smoking Tobacco", "tobacco"),
      "6340600": OECProduct("6340600", "Candles", "household"),
      "16842131": OECProduct("16842131", "Intake Air Filters for Cars", "automotive"),
      "15730830": OECProduct("15730830", "Doors and Windows", "construction"),
      "6300410": OECProduct("6300410", "Penicillins and Streptomycins", "healthcare"),
      "13700910": OECProduct("13700910", "Rear-view Mirrors", "automotive"),
      "11610443": OECProduct("11610443", "Women's Dresses", "clothing"),
      "9440122": OECProduct("9440122", "Wood Chips", "materials"),
      "13680293": OECProduct("13680293", "Worked Granite", "construction"),
      "10481810": OECProduct("10481810", "Toilet Paper", "household"),
      "6330720": OECProduct("6330720", "Personal Deodorants and Antiperspirants", "cosmetics"),
      "18903210": OECProduct("18903210", "Thermostats", "electronics"),
      "16851650": OECProduct("16851650", "Microwave Ovens", "electronics"),
      "6330410": OECProduct("6330410", "Lipsticks", "cosmetics"),
      "16847050": OECProduct("16847050", "Cash Registers", "electronics"),
      "6330420": OECProduct("6330420", "Eye make-up", "cosmetics"),
      "18902212": OECProduct("18902212", "X-ray Machines (including CT Scans)", "healthcare"),
      "14711019": OECProduct("14711019", "Platinum", "materials"),
      "4200290": OECProduct("4200290", "Tomatoes", "food"),
      "2120600": OECProduct("2120600", "Sunflower Seeds", "agriculture"),
      "16842211": OECProduct("16842211", "Dish Washing Machines", "electronics"),
      "17880212": OECProduct("17880212", "Helicopters", "transportation"),
      "11611120": OECProduct("11611120", "Babies Garments", "clothing"),
      "4210500": OECProduct("4210500", "Ice Cream", "food"),
      "6330510": OECProduct("6330510", "Hair Shampoos", "cosmetics"),
      "14710391": OECProduct("14710391", "Rubies, Sapphires and Emeralds", "luxury"),
      "18902150": OECProduct("18902150", "Pacemakers", "healthcare"),
      "18900130": OECProduct("18900130", "Contact Lenses", "healthcare"),
      "2080810": OECProduct("2080810", "Apples", "agriculture"),
      "18901320": OECProduct("18901320", "Lasers", "electronics"),
      "4160100": OECProduct("4160100", "Sausages", "food"),
      "2080440": OECProduct("2080440", "Avocados", "agriculture"),
      "16851671": OECProduct("16851671", "Electric Coffee and Tea Makers", "electronics"),
      "6300431": OECProduct("6300431", "Insulin", "healthcare"),
      "1040510": OECProduct("1040510", "Butter", "food"),
      "18900410": OECProduct("18900410", "Sunglasses", "accessories"),
      "6380892": OECProduct("6380892", "Fungicides", "chemicals"),
      "17870892": OECProduct("17870892", "Mufflers and Exhaust Pipes", "automotive"),
      "17871120": OECProduct("17871120", "Motorcycles", "transportation"),
      "3151110": OECProduct("3151110", "Palm Oil", "food"),
      "4220830": OECProduct("4220830", "Whiskies", "beverages"),
      "11520100": OECProduct("11520100", "Cotton", "materials"),
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
    product_depth = "HS6" if len(product_id) > 6 else "HS4"
    url = (
        f"{self.BASE_URL}?"
        f"cube=trade_i_baci_a_22&"
        f"locale=en&"
        f"drilldowns={product_depth},Exporter+Country,Year&"
        f"measures=Trade+Value&"
        f"include={product_depth}:{product_id};"
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
