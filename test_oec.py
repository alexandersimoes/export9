#!/usr/bin/env python3
"""
Test script for OEC API integration
Run this to verify the API is working before starting the game
"""

import asyncio
import sys
import os

# Add backend to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.oec_client import oec_client

async def test_oec_integration():
    print("🧪 Testing OEC API Integration...")
    print("=" * 50)
    
    try:
        async with oec_client as client:
            # Test 1: Fetch crude oil data
            print("📊 Test 1: Fetching Crude Petroleum exports...")
            oil_data = await client.fetch_export_data("52709")
            
            if oil_data:
                print(f"✅ Success! Retrieved data for {len(oil_data)} countries")
                
                # Show top 5 exporters
                top_exporters = sorted(
                    oil_data.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]
                
                print("\n🏆 Top 5 Crude Oil Exporters (2023):")
                for i, (country_id, value) in enumerate(top_exporters, 1):
                    country_name = client.COUNTRIES.get(country_id, None)
                    name = country_name.name if country_name else country_id
                    print(f"   {i}. {name}: ${value:.1f}B USD")
            else:
                print("❌ No data received")
                return False
            
            print("\n" + "-" * 50)
            
            # Test 2: Fetch cars data
            print("📊 Test 2: Fetching Cars exports...")
            cars_data = await client.fetch_export_data("178703")
            
            if cars_data:
                print(f"✅ Success! Retrieved data for {len(cars_data)} countries")
                
                top_exporters = sorted(
                    cars_data.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]
                
                print("\n🚗 Top 5 Car Exporters (2023):")
                for i, (country_id, value) in enumerate(top_exporters, 1):
                    country_name = client.COUNTRIES.get(country_id, None)
                    name = country_name.name if country_name else country_id
                    print(f"   {i}. {name}: ${value:.1f}B USD")
            else:
                print("❌ No data received")
                return False
                
            print("\n" + "-" * 50)
            
            # Test 3: Preload multiple products
            print("📊 Test 3: Preloading multiple products...")
            test_products = ["52709", "178703", "168517"]  # Oil, Cars, Phones
            preload_data = await client.preload_game_data(test_products)
            
            print(f"✅ Preloaded data for {len(preload_data)} products")
            for product_id, data in preload_data.items():
                product_name = client.PRODUCTS.get(product_id, None)
                name = product_name.name if product_name else product_id
                print(f"   📦 {name}: {len(data)} countries")
            
            print("\n🎉 All tests passed! OEC API integration is working correctly.")
            print("\n💡 You can now start the game server with real export data!")
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("   1. Check your internet connection")
        print("   2. Verify OEC API is accessible")
        print("   3. The game will use fallback data if API is unavailable")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_oec_integration())
    sys.exit(0 if success else 1)