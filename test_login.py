import requests
import json

# Test the login functionality
def test_login():
    base_url = "http://localhost:5000"
    
    # Test data
    test_user = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    # First, try to create a user
    print("Creating test user...")
    try:
        response = requests.post(f"{base_url}/users", json=test_user)
        print(f"Create user response: {response.status_code}")
        if response.status_code == 201:
            print("User created successfully")
        elif response.status_code == 409:
            print("User already exists")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error creating user: {e}")
    
    # Try to login
    print("\nAttempting login...")
    try:
        response = requests.post(f"{base_url}/users/login", 
                               json={"username": test_user["username"], "password": test_user["password"]},
                               headers={'Content-Type': 'application/json'})
        print(f"Login response: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        if response.status_code == 200:
            print("Login successful!")
            print(f"Response: {response.json()}")
            
            # Now try to get profile
            print("\nAttempting to get profile...")
            profile_response = requests.get(f"{base_url}/users/profile", 
                                          cookies=response.cookies,
                                          headers={'Content-Type': 'application/json'})
            print(f"Profile response: {profile_response.status_code}")
            if profile_response.status_code == 200:
                print("Profile retrieved successfully!")
                print(f"Profile: {profile_response.json()}")
            else:
                print(f"Profile error: {profile_response.text}")
        else:
            print(f"Login failed: {response.text}")
    except Exception as e:
        print(f"Error during login: {e}")

if __name__ == "__main__":
    test_login() 