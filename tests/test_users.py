# tests/test_user_endpoints.py

import pytest
import json
from app.db import get_db
from werkzeug.security import check_password_hash


def clear_users_table(client):
    """
    Remove all records from the users table.
    Uses client.application.app_context() to access get_db().
    """
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM users;")
        conn.commit()
        cur.close()


def test_list_users_empty(client):
    """Test listing users when the database is empty."""
    clear_users_table(client)

    response = client.get("/users")
    assert response.status_code == 200
    assert response.json == []


def test_create_user(client):
    """Test creating a new user."""
    clear_users_table(client)

    new_user = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }
    response = client.post(
        "/users",
        data=json.dumps(new_user),
        content_type="application/json"
    )

    assert response.status_code == 201
    assert "user_id" in response.json
    assert "message" in response.json
    assert response.json["message"] == "User created successfully"


def test_create_user_missing_fields(client):
    """Test creating a user with missing required fields."""
    clear_users_table(client)

    incomplete_user = {"username": "testuser"}
    response = client.post(
        "/users",
        data=json.dumps(incomplete_user),
        content_type="application/json"
    )

    assert response.status_code == 400
    assert "error" in response.json


def test_get_user(client):
    """Test retrieving a specific user after creation."""
    clear_users_table(client)

    # Create a user first
    new_user = {
        "username": "getuser",
        "email": "get@example.com",
        "password": "testpass123"
    }
    create_resp = client.post(
        "/users",
        data=json.dumps(new_user),
        content_type="application/json"
    )
    assert create_resp.status_code == 201
    user_id = create_resp.json.get("user_id")
    assert user_id is not None

    # Verify the record exists directly in the database
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, username, email FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
    assert row is not None, f"No record found in users table for id={user_id}"
    assert row.get("username") == new_user["username"]
    assert row.get("email") == new_user["email"]

    # Now hit the GET endpoint
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json["username"] == new_user["username"]
    assert response.json["email"] == new_user["email"]


def test_get_nonexistent_user(client):
    """Test retrieving a user that does not exist."""
    clear_users_table(client)

    response = client.get("/users/99999")
    assert response.status_code == 404
    assert "error" in response.json


def test_update_user(client):
    """Test updating an existing user."""
    clear_users_table(client)

    # Create a user first
    new_user = {
        "username": "updateuser",
        "email": "update@example.com",
        "password": "testpass123"
    }
    create_resp = client.post(
        "/users",
        data=json.dumps(new_user),
        content_type="application/json"
    )
    assert create_resp.status_code == 201
    user_id = create_resp.json.get("user_id")
    assert user_id is not None

    # Confirm the record exists before update
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
    assert row is not None, "User did not exist before update"

    # Perform the update
    update_data = {"username": "updateduser", "email": "updated@example.com"}
    response = client.put(
        f"/users/{user_id}",
        data=json.dumps(update_data),
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json["message"] == "User updated successfully"

    # Verify that the database row was updated
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT username, email FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
    assert row.get("username") == update_data["username"]
    assert row.get("email") == update_data["email"]

    # Finally confirm the GET endpoint returns updated values
    get_resp = client.get(f"/users/{user_id}")
    assert get_resp.status_code == 200
    assert get_resp.json["username"] == update_data["username"]
    assert get_resp.json["email"] == update_data["email"]


def test_delete_user(client):
    """Test deleting a user."""
    clear_users_table(client)

    # Create a user first
    new_user = {
        "username": "deleteuser",
        "email": "delete@example.com",
        "password": "testpass123"
    }
    create_resp = client.post(
        "/users",
        data=json.dumps(new_user),
        content_type="application/json"
    )
    assert create_resp.status_code == 201
    user_id = create_resp.json.get("user_id")
    assert user_id is not None

    # Confirm the record exists before delete
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
    assert row is not None, "User did not exist before delete"

    # Perform the delete
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 200
    assert response.json["message"] == "User deleted successfully"

    # Confirm the row is gone from the database
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
    assert row is None, "User still exists in database after delete"

    # Finally confirm GET returns 404
    get_resp = client.get(f"/users/{user_id}")
    assert get_resp.status_code == 404


def test_delete_nonexistent_user(client):
    """Test deleting a user that does not exist."""
    clear_users_table(client)

    response = client.delete("/users/99999")
    assert response.status_code == 404
    assert "error" in response.json


def create_test_user(client, username="testuser", email="test@example.com", password="testpass123"):
    """Helper function to create a test user and return the user_id."""
    user_data = {
        "username": username,
        "email": email,
        "password": password
    }
    response = client.post(
        "/users",
        data=json.dumps(user_data),
        content_type="application/json"
    )
    assert response.status_code == 201
    return response.json["user_id"]


def test_create_user_duplicate_email(client):
    """Test creating a user with duplicate email."""
    clear_users_table(client)
    
    # Create first user
    create_test_user(client, username="user1", email="same@example.com")
    
    # Try to create second user with same email
    user_data = {
        "username": "user2",
        "email": "same@example.com",
        "password": "pass123"
    }
    response = client.post(
        "/users",
        data=json.dumps(user_data),
        content_type="application/json"
    )
    assert response.status_code == 409
    assert "error" in response.json
    assert "email already registered" in response.json["error"].lower()


def test_create_user_duplicate_username(client):
    """Test creating a user with duplicate username."""
    clear_users_table(client)
    
    # Create first user
    create_test_user(client, username="sameuser", email="user1@example.com")
    
    # Try to create second user with same username
    user_data = {
        "username": "sameuser",
        "email": "user2@example.com",
        "password": "pass123"
    }
    response = client.post(
        "/users",
        data=json.dumps(user_data),
        content_type="application/json"
    )
    assert response.status_code == 409
    assert "error" in response.json
    assert "username already exists" in response.json["error"].lower()


def test_create_user_invalid_email(client):
    """Test creating a user with invalid email format."""
    clear_users_table(client)
    
    # Create first user
    user_data = {
        "username": "sad",
        "email": "sad",
        "password": "s123123ad"
    }
    response = client.post(
        "/users",
        data=json.dumps(user_data),
        content_type="application/json"
    )

    assert response.status_code == 400
    assert "error" in response.json
    assert "invalid email address" in response.json["error"].lower()

def test_list_users_non_empty(client):
    """Test listing users when there are existing users."""
    clear_users_table(client)

    # Create two users
    user1_id = create_test_user(client, username="alice", email="alice@example.com")
    user2_id = create_test_user(client, username="bob", email="bob@example.com")

    response = client.get("/users")
    assert response.status_code == 200

    users = response.json
    assert isinstance(users, list)
    assert len(users) == 2

    usernames = {u["username"] for u in users}
    emails = {u["email"] for u in users}
    assert usernames == {"alice", "bob"}
    assert emails == {"alice@example.com", "bob@example.com"}


def test_update_user_no_fields(client):
    """Test updating a user with no valid fields in the payload."""
    clear_users_table(client)
    user_id = create_test_user(client, username="charlie", email="charlie@example.com")

    response = client.put(
        f"/users/{user_id}",
        data=json.dumps({}),  # no updatable fields
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "error" in response.json
    assert "no valid fields" in response.json["error"].lower()


def test_update_nonexistent_user_returns_404(client):
    """Test updating a non-existent user returns 404."""
    clear_users_table(client)

    update_data = {"username": "doesnotmatter"}
    response = client.put(
        "/users/99999",
        data=json.dumps(update_data),
        content_type="application/json"
    )
    assert response.status_code == 404
    assert "error" in response.json
    assert "not found" in response.json["error"].lower()


def test_update_user_duplicate_username(client):
    """Test that updating a user to a username that already exists returns 400."""
    clear_users_table(client)

    # Create two users
    user1_id = create_test_user(client, username="dave", email="dave@example.com")
    user2_id = create_test_user(client, username="eve", email="eve@example.com")

    # Attempt to update user2's username to "dave", which is already taken
    response = client.put(
        f"/users/{user2_id}",
        data=json.dumps({"username": "dave"}),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "error" in response.json
    # The exact error string may vary depending on the DB driver, so we check for "duplicate" or "already"
    assert any(keyword in response.json["error"].lower() for keyword in ["duplicate", "already"])


def test_update_user_duplicate_email(client):
    """Test that updating a user to an email that already exists returns 400."""
    clear_users_table(client)

    # Create two users
    user1_id = create_test_user(client, username="frank", email="frank@example.com")
    user2_id = create_test_user(client, username="grace", email="grace@example.com")

    # Attempt to update user2's email to frank@example.com, which is already taken
    response = client.put(
        f"/users/{user2_id}",
        data=json.dumps({"email": "frank@example.com"}),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "error" in response.json
    assert any(keyword in response.json["error"].lower() for keyword in ["duplicate", "already"])


def test_update_user_password_change(client):
    """Test that updating a user's password actually changes the stored hash."""
    clear_users_table(client)

    # Create a user and get their initial password_hash
    user_id = create_test_user(client, username="heidi", email="heidi@example.com", password="oldpass123")
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM users WHERE id = %s;", (user_id,))
        before_hash = cur.fetchone()["password_hash"]
        cur.close()

    # Update password
    response = client.put(
        f"/users/{user_id}",
        data=json.dumps({"password": "newsecure!@#"}),
        content_type="application/json"
    )
    assert response.status_code == 200

    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM users WHERE id = %s;", (user_id,))
        after_hash = cur.fetchone()["password_hash"]
        cur.close()

    assert before_hash != after_hash
    assert check_password_hash(after_hash, "newsecure!@#")


def test_update_user_other_fields(client):
    """Test updating is_active, role, current_level, and total_xp fields."""
    clear_users_table(client)

    user_id = create_test_user(client, username="ivan", email="ivan@example.com")
    update_payload = {
        "is_active": False,
        "role": "admin",
        "current_level": 5,
        "total_xp": 1500
    }
    response = client.put(
        f"/users/{user_id}",
        data=json.dumps(update_payload),
        content_type="application/json"
    )
    assert response.status_code == 200

    # Fetch via GET and verify fields
    get_resp = client.get(f"/users/{user_id}")
    assert get_resp.status_code == 200
    data = get_resp.json
    assert data["is_active"] is False
    assert data["role"] == "admin"
    assert data["current_level"] == 5
    assert data["total_xp"] == 1500


def test_get_user_list_fields_structure(client):
    """
    Test that GET /users returns the expected field names for each user.
    Assumes at least one user exists.
    """
    clear_users_table(client)
    user_id = create_test_user(client, username="jack", email="jack@example.com")

    response = client.get("/users")
    assert response.status_code == 200

    users = response.json
    assert isinstance(users, list)
    assert len(users) == 1

    user_obj = users[0]
    expected_keys = {
        "id", "username", "email", "created_at",
        "last_login", "is_active", "role",
        "current_level", "total_xp"
    }
    assert set(user_obj.keys()) == expected_keys


def test_delete_user_AFTER_updates(client):
    """
    Test deleting a user after updating some fields; ensure DELETE still works.
    """
    clear_users_table(client)
    user_id = create_test_user(client, username="kelly", email="kelly@example.com")

    # Update a field first
    response = client.put(
        f"/users/{user_id}",
        data=json.dumps({"role": "moderator"}),
        content_type="application/json"
    )
    assert response.status_code == 200

    # Now delete
    del_resp = client.delete(f"/users/{user_id}")
    assert del_resp.status_code == 200
    assert del_resp.json["message"] == "User deleted successfully"

    # GET should now return 404
    get_resp = client.get(f"/users/{user_id}")
    assert get_resp.status_code == 404


def test_login_success(client):
    """Test successful user login."""
    clear_users_table(client)
    
    # Create a test user
    password = "testpass123"
    user_id = create_test_user(client, 
                              username="logintest", 
                              email="login@example.com", 
                              password=password)
    
    # Attempt login
    login_data = {
        "email": "login@example.com",
        "password": password
    }
    response = client.post(
        "/users/login",
        data=json.dumps(login_data),
        content_type="application/json"
    )
    
    assert response.status_code == 200
    assert "message" in response.json
    assert response.json["message"] == "Logged in successfully"
    assert response.json["user_id"] == user_id
    assert response.json["username"] == "logintest"
    
    # Check if session is set
    with client.session_transaction() as session:
        assert session["user_id"] == user_id
        assert session["username"] == "logintest"


def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    clear_users_table(client)
    
    # Create a test user
    create_test_user(client, 
                    username="logintest", 
                    email="login@example.com", 
                    password="correctpass")
    
    # Test wrong password
    login_data = {
        "email": "login@example.com",
        "password": "wrongpass"
    }
    response = client.post(
        "/users/login",
        data=json.dumps(login_data),
        content_type="application/json"
    )
    
    assert response.status_code == 401
    assert "error" in response.json
    assert "Invalid email or password" in response.json["error"]
    
    # Test wrong email
    login_data = {
        "email": "wrong@example.com",
        "password": "correctpass"
    }
    response = client.post(
        "/users/login",
        data=json.dumps(login_data),
        content_type="application/json"
    )
    
    assert response.status_code == 401
    assert "error" in response.json
    assert "Invalid email or password" in response.json["error"]


def test_login_inactive_user(client):
    """Test login attempt with an inactive user account."""
    clear_users_table(client)
    
    # Create a test user
    user_id = create_test_user(client, 
                              username="inactive", 
                              email="inactive@example.com", 
                              password="testpass")
    
    # Deactivate the user
    client.put(
        f"/users/{user_id}",
        data=json.dumps({"is_active": False}),
        content_type="application/json"
    )
    
    # Attempt login
    login_data = {
        "email": "inactive@example.com",
        "password": "testpass"
    }
    response = client.post(
        "/users/login",
        data=json.dumps(login_data),
        content_type="application/json"
    )
    
    assert response.status_code == 403
    assert "error" in response.json
    assert "Your account is inactive" in response.json["error"]


def test_login_missing_fields(client):
    """Test login with missing required fields."""
    clear_users_table(client)
    
    # Test missing password
    response = client.post(
        "/users/login",
        data=json.dumps({"email": "test@example.com"}),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "error" in response.json
    assert "Email and password fields are required" in response.json["error"]
    
    # Test missing email
    response = client.post(
        "/users/login",
        data=json.dumps({"password": "testpass"}),
        content_type="application/json"
    )
    assert response.status_code == 400
    assert "error" in response.json
    assert "Email and password fields are required" in response.json["error"]


def test_logout(client):
    """Test user logout functionality."""
    clear_users_table(client)
    
    # Create and login a user
    password = "testpass123"
    create_test_user(client, 
                    username="logouttest", 
                    email="logout@example.com", 
                    password=password)
    
    client.post(
        "/users/login",
        data=json.dumps({
            "email": "logout@example.com",
            "password": password
        }),
        content_type="application/json"
    )
    
    # Verify session exists before logout
    with client.session_transaction() as session:
        assert "user_id" in session
    
    # Test logout
    response = client.post("/users/logout")
    assert response.status_code == 200
    assert response.json["message"] == "Logged out successfully"
    
    # Verify session is cleared
    with client.session_transaction() as session:
        assert "user_id" not in session
        assert "username" not in session


def test_protected_route_with_login(client):
    """Test accessing protected route with valid login."""
    clear_users_table(client)
    
    # Create and login a user
    password = "testpass123"
    user_id = create_test_user(client, 
                              username="protectedtest", 
                              email="protected@example.com", 
                              password=password)
    
    client.post(
        "/users/login",
        data=json.dumps({
            "email": "protected@example.com",
            "password": password
        }),
        content_type="application/json"
    )
    
    # Access protected route
    response = client.get("/users/profile")
    assert response.status_code == 200
    assert response.json["id"] == user_id
    assert response.json["username"] == "protectedtest"
    assert response.json["email"] == "protected@example.com"


def test_protected_route_without_login(client):
    """Test accessing protected route without login."""
    clear_users_table(client)
    
    response = client.get("/users/profile")
    assert response.status_code == 401
    assert "error" in response.json
    assert "Login required to access this resource" in response.json["error"]


def test_login_updates_last_login(client):
    """Test that successful login updates the last_login timestamp."""
    clear_users_table(client)
    
    # Create a user
    password = "testpass123"
    user_id = create_test_user(client, 
                              username="lastlogin", 
                              email="lastlogin@example.com", 
                              password=password)
    
    # Get initial last_login
    initial_response = client.get(f"/users/{user_id}")
    initial_last_login = initial_response.json["last_login"]
    
    # Wait a second to ensure timestamp would be different
    import time
    time.sleep(1)
    
    # Login
    client.post(
        "/users/login",
        data=json.dumps({
            "email": "lastlogin@example.com",
            "password": password
        }),
        content_type="application/json"
    )
    
    # Check updated last_login
    final_response = client.get(f"/users/{user_id}")
    final_last_login = final_response.json["last_login"]
    
    assert initial_last_login != final_last_login