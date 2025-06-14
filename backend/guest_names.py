"""
Guest user name generation for Export 9
Generates fun, trade-themed random usernames for guest players
"""

import random
from typing import List

# Trade and export themed adjectives
ADJECTIVES = [
    "Swift", "Global", "Premium", "Elite", "Dynamic", "Strategic", "Maritime", 
    "Continental", "Express", "Direct", "Prime", "Royal", "Imperial", "Summit",
    "Sterling", "Platinum", "Golden", "Diamond", "Supreme", "Ultra", "Mega",
    "Turbo", "Rapid", "Lightning", "Thunder", "Stellar", "Cosmic", "Quantum",
    "Advanced", "Superior", "Executive", "Professional", "Master", "Champion",
    "Legendary", "Epic", "Mighty", "Powerful", "Brilliant", "Genius", "Savvy",
    "Sharp", "Smart", "Clever", "Wise", "Bold", "Brave", "Fearless", "Daring",
    "Ambitious", "Relentless", "Unstoppable", "Invincible", "Victorious"
]

# Trade and business related nouns
TRADE_NOUNS = [
    "Trader", "Exporter", "Merchant", "Dealer", "Broker", "Agent", "Shipper",
    "Navigator", "Captain", "Admiral", "Commodore", "Baron", "Tycoon", "Mogul",
    "Magnate", "Executive", "Director", "Manager", "Strategist", "Analyst",
    "Specialist", "Expert", "Master", "Champion", "Ace", "Pro", "Guru",
    "Wizard", "Genius", "Maverick", "Pioneer", "Innovator", "Visionary",
    "Leader", "Chief", "Boss", "Commander", "General", "Marshal"
]

# Country/region themed nouns
GEOGRAPHY_NOUNS = [
    "Explorer", "Voyager", "Nomad", "Wanderer", "Traveler", "Pioneer",
    "Ambassador", "Diplomat", "Envoy", "Emissary", "Representative",
    "Continental", "Islander", "Mountaineer", "Coastal", "Nordic",
    "Atlantic", "Pacific", "Arctic", "Tropic", "Equatorial"
]

# Product category themed nouns  
PRODUCT_NOUNS = [
    "Craftsman", "Artisan", "Manufacturer", "Producer", "Creator", "Maker",
    "Designer", "Builder", "Engineer", "Architect", "Inventor", "Developer",
    "Specialist", "Technician", "Operator", "Supervisor", "Controller"
]

# Fun/gaming themed nouns
GAMING_NOUNS = [
    "Player", "Gamer", "Challenger", "Competitor", "Rival", "Contender",
    "Warrior", "Fighter", "Hunter", "Scout", "Ranger", "Guardian",
    "Knight", "Paladin", "Rogue", "Mage", "Sage", "Oracle",
    "Phoenix", "Dragon", "Tiger", "Eagle", "Falcon", "Hawk",
    "Lion", "Wolf", "Bear", "Shark", "Panther", "Viper"
]

ALL_NOUNS = TRADE_NOUNS + GEOGRAPHY_NOUNS + PRODUCT_NOUNS + GAMING_NOUNS

def generate_guest_username() -> str:
    """
    Generate a random guest username
    
    Returns:
        Random username in format "AdjectiveNoun"
    """
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(ALL_NOUNS)
    return f"{adjective}{noun}"

def generate_guest_display_name() -> str:
    """
    Generate a more readable display name for guests
    
    Returns:
        Display name in format "Adjective Noun"
    """
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(ALL_NOUNS)
    return f"{adjective} {noun}"

def generate_multiple_guest_names(count: int) -> List[str]:
    """
    Generate multiple unique guest usernames
    
    Args:
        count: Number of names to generate
        
    Returns:
        List of unique usernames
    """
    names = set()
    max_attempts = count * 3  # Prevent infinite loop
    attempts = 0
    
    while len(names) < count and attempts < max_attempts:
        names.add(generate_guest_username())
        attempts += 1
    
    return list(names)

def is_guest_username(username: str) -> bool:
    """
    Check if a username follows guest naming pattern
    
    Args:
        username: Username to check
        
    Returns:
        True if username appears to be auto-generated guest name
    """
    # Simple heuristic: check if it's two words without spaces/numbers
    return (
        len(username) > 6 and 
        username.isalpha() and
        username[0].isupper() and
        any(c.isupper() for c in username[1:])  # Has internal capital
    )

# Preset guest names for testing/fallback
PRESET_GUEST_NAMES = [
    "SwiftTrader", "GlobalExporter", "PremiumMerchant", "EliteDealer",
    "DynamicBroker", "StrategicAgent", "MaritimeShipper", "ExpressNavigator",
    "DirectCaptain", "PrimeAdmiral", "RoyalTycoon", "ImperialMogul",
    "SummitMagnate", "SterlingExecutive", "PlatinumStrategist", "GoldenAnalyst",
    "DiamondSpecialist", "SupremeExpert", "UltraMaster", "MegaChampion",
    "TurboExplorer", "RapidVoyager", "LightningNomad", "ThunderWanderer",
    "StellarTraveler", "CosmicPioneer", "QuantumAmbassador", "AdvancedDiplomat"
]

def get_fallback_guest_name() -> str:
    """
    Get a fallback guest name from preset list
    
    Returns:
        Random preset guest name
    """
    return random.choice(PRESET_GUEST_NAMES)

# Example usage and testing
if __name__ == "__main__":
    print("Guest Name Generator Testing")
    print("=" * 40)
    
    print("\nGenerated Usernames:")
    for i in range(10):
        username = generate_guest_username()
        display_name = generate_guest_display_name()
        is_guest = is_guest_username(username)
        print(f"  {username:20} | {display_name:25} | Guest: {is_guest}")
    
    print(f"\nMultiple unique names (5):")
    unique_names = generate_multiple_guest_names(5)
    for name in unique_names:
        print(f"  {name}")
    
    print(f"\nFallback name: {get_fallback_guest_name()}")