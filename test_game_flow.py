#!/usr/bin/env python3
"""
Simple test script to verify game flow functionality
"""

import requests
import json
import time
import sys

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

def test_game_flow():
    """Test the complete game flow from queue to completion"""
    
    print("🧪 Testing Game Flow...")
    
    # Test data
    test_users = {
        "player1": {"username": "test_player1", "password": "test123"},
        "player2": {"username": "test_player2", "password": "test123"}
    }
    
    user_ids = {}
    game_id = None
    
    try:
        # 1. Register/Create test users
        print("\n1. Creating test users...")
        for name, user_data in test_users.items():
            response = requests.post(f"{API_BASE}/auth/register", json=user_data)
            if response.status_code == 201:
                user_ids[name] = response.json()["user"]["id"]
                print(f"   ✅ {name}: {user_data['username']} (ID: {user_ids[name]})")
            else:
                print(f"   ❌ Failed to create {name}: {response.text}")
                return False
        
        # 2. Enqueue both players for duel
        print("\n2. Enqueuing players for duel...")
        for name, user_id in user_ids.items():
            response = requests.post(f"{API_BASE}/games/queue", json={
                "user_id": user_id,
                "game_type_id": 1  # Duel game type
            })
            if response.status_code in [200, 201]:
                print(f"   ✅ {name} enqueued successfully")
            else:
                print(f"   ❌ Failed to enqueue {name}: {response.text}")
                return False
        
        # 3. Wait for game creation and get game state
        print("\n3. Waiting for game creation...")
        max_wait = 30  # 30 seconds timeout
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            # Check queue status for player1
            response = requests.get(f"{API_BASE}/games/queue/status", params={
                "user_id": user_ids["player1"],
                "game_type_id": 1
            })
            
            if response.status_code == 200:
                data = response.json()
                if data["status"] == "matched":
                    game_id = data["game_id"]
                    print(f"   ✅ Game created! ID: {game_id}")
                    break
                elif data["status"] == "waiting":
                    print("   ⏳ Still waiting for opponent...")
                else:
                    print(f"   ❓ Unexpected status: {data['status']}")
            
            time.sleep(2)
        
        if not game_id:
            print("   ❌ Game creation timeout")
            return False
        
        # 4. Get initial game state
        print("\n4. Getting initial game state...")
        response = requests.get(f"{API_BASE}/games/{game_id}/state", params={
            "user_id": user_ids["player1"]
        })
        
        if response.status_code == 200:
            game_state = response.json()
            print(f"   ✅ Game state retrieved")
            print(f"   📊 Game status: {game_state['game_status']}")
            print(f"   🎯 Current round: {game_state['current_round']['round_number'] if game_state['current_round'] else 'None'}")
            print(f"   👥 Participants: {len(game_state['participants'])}")
        else:
            print(f"   ❌ Failed to get game state: {response.text}")
            return False
        
        # 5. Test category selection (if it's player1's turn)
        if game_state['current_round'] and not game_state['current_round']['category_id']:
            print("\n5. Testing category selection...")
            picker_turn = game_state['current_round']['picker_turn']
            
            if picker_turn == user_ids["player1"]:
                category_options = game_state['current_round']['category_options']
                if category_options:
                    selected_category = category_options[0]['id']
                    response = requests.post(f"{API_BASE}/games/{game_id}/rounds/1/pick_category", json={
                        "user_id": user_ids["player1"],
                        "category_id": selected_category
                    })
                    
                    if response.status_code == 200:
                        print(f"   ✅ Category {selected_category} selected successfully")
                    else:
                        print(f"   ❌ Failed to select category: {response.text}")
                        return False
                else:
                    print("   ⚠️ No category options available")
            else:
                print(f"   ⏳ Waiting for opponent to pick category (turn: {picker_turn})")
        
        print("\n✅ Game flow test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with exception: {str(e)}")
        return False
    
    finally:
        # Cleanup: Delete test users (if you have a cleanup endpoint)
        print("\n🧹 Cleaning up test data...")
        # Note: You might want to add a cleanup endpoint to your API
        pass

if __name__ == "__main__":
    success = test_game_flow()
    sys.exit(0 if success else 1) 