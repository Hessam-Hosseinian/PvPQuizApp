#!/usr/bin/env python3
"""
Test script to verify round transitions work correctly
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def test_round_transition():
    print("Testing round transition...")
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/categories")
        if response.status_code == 200:
            print("✓ Server is running")
        else:
            print("✗ Server is not responding correctly")
            return
    except Exception as e:
        print(f"✗ Cannot connect to server: {e}")
        return
    
    # Test 2: Get game state for a specific game (you'll need to replace with actual game ID)
    game_id = 1  # Replace with actual game ID from your database
    user_id = 1  # Replace with actual user ID
    
    try:
        response = requests.get(f"{BASE_URL}/games/{game_id}/state?user_id={user_id}")
        if response.status_code == 200:
            game_state = response.json()
            print(f"✓ Game state retrieved for game {game_id}")
            print(f"  Current round: {game_state.get('current_round', {}).get('round_number', 'None')}")
            print(f"  Round status: {game_state.get('current_round', {}).get('status', 'None')}")
            print(f"  Category ID: {game_state.get('current_round', {}).get('category_id', 'None')}")
            print(f"  Picker turn: {game_state.get('current_round', {}).get('picker_turn', 'None')}")
            print(f"  Category options: {len(game_state.get('current_round', {}).get('category_options', []))}")
        else:
            print(f"✗ Failed to get game state: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error getting game state: {e}")

if __name__ == "__main__":
    test_round_transition() 