import json
import pytest
import psycopg2
from werkzeug.security import generate_password_hash
from app.db import get_db

# Hold seeded IDs
user_ids = {}
game_ids = {}
room_ids = {}
message_ids = {}
membership_ids = {}

def clear_tables(client):
    """Clear tables relevant to chat testing."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Delete in order due to FK constraints
        cur.execute("DELETE FROM chat_messages;")
        cur.execute("DELETE FROM chat_room_members;")
        cur.execute("DELETE FROM chat_rooms;")
        cur.execute("DELETE FROM games;")
        cur.execute("DELETE FROM users;")
        db.commit()
        cur.close()

def seed_chat_data(client):
    """
    Seed:
      - Two users: alice, bob
      - One game: dummy_game
      - One chat room: existing_room (public)
      - One message in that room from alice
      - One membership: alice in existing_room
      - One direct message between alice and bob
    """
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()

        # 1) Insert users
        users = [
            ("alice", "alice@example.com", "password1"),
            ("bob",   "bob@example.com",   "password2"),
            ("carol", "carol@example.com", "password3"),
        ]
        for username, email, pw in users:
            pw_hash = generate_password_hash(pw)
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (username, email, pw_hash)
            )
            row = cur.fetchone()
            user_ids[username] = row["id"]

        # 2) Insert a game (for type='game' room tests)
        cur.execute(
            """
            INSERT INTO games (game_type_id, status)
            VALUES (%s, 'completed')
            RETURNING id;
            """,
            (1,)  # assume game_type 1 exists or FK not enforced here
        )
        row = cur.fetchone()
        game_ids["dummy_game"] = row["id"]

        # 3) Insert an existing public room
        cur.execute(
            """
            INSERT INTO chat_rooms (name, type, game_id)
            VALUES (%s, %s, NULL)
            RETURNING id;
            """,
            ("existing_room", "public")
        )
        row = cur.fetchone()
        room_ids["existing_room"] = row["id"]

        # 4) Insert membership: alice in existing_room
        cur.execute(
            """
            INSERT INTO chat_room_members (room_id, user_id)
            VALUES (%s, %s)
            RETURNING room_id, user_id;
            """,
            (room_ids["existing_room"], user_ids["alice"])
        )
        membership_ids["alice_existing"] = {
            "room_id": cur.fetchone()["room_id"],
            "user_id": user_ids["alice"]
        }

        # 5) Insert a message in existing_room by alice
        cur.execute(
            """
            INSERT INTO chat_messages (room_id, sender_id, message)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (room_ids["existing_room"], user_ids["alice"], "Hello World")
        )
        row = cur.fetchone()
        message_ids["msg1"] = row["id"]
        

        # 6) Insert a direct message from alice to bob
        cur.execute(
            """
            INSERT INTO chat_messages (sender_id, recipient_id, message)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (user_ids["alice"], user_ids["bob"], "DM Hello")
        )
        
        row = cur.fetchone()
        message_ids["dm1"] = row["id"]

        db.commit()
        cur.close()

@pytest.fixture(autouse=True)
def setup_and_teardown(client):
    clear_tables(client)
    seed_chat_data(client)
    yield
    clear_tables(client)


# ======================
# Tests for GET /chat/rooms
# ======================

def test_list_rooms_non_empty(client):
    response = client.get("/chat/rooms")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    
    # We seeded one room: existing_room
    assert len(data) == 1
    assert data[0]["id"] == room_ids["existing_room"]
    assert data[0]["name"] == "existing_room"
    assert data[0]["type"] == "public"

def test_list_rooms_empty(client):
    # Clear and then test empty
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("DELETE FROM chat_rooms;")
        db.commit()
        cur.close()
    response = client.get("/chat/rooms")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []


# ======================
# Tests for POST /chat/rooms
# ======================

def test_create_room_missing_type(client):
    payload = {"name": "roomA"}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_create_room_invalid_type(client):
    payload = {"type": "protected"}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_create_room_game_missing_game_id(client):
    payload = {"type": "game", "name": "game_room"}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_create_room_game_nonexistent_game(client):
    payload = {"type": "game", "name": "gr", "game_id": 9999}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_create_room_public_success(client):
    payload = {"type": "public", "name": "new_public"}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
   
    assert response.status_code == 201
    created = response.get_json()
    assert created["name"] == "new_public"
    assert created["type"] == "public"
    assert created["game_id"] is None

def test_create_room_private_success(client):
    payload = {"type": "private", "name": "secret_room"}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    created = response.get_json()
    assert created["name"] == "secret_room"
    assert created["type"] == "private"
    assert created["game_id"] is None

def test_create_room_game_success(client):
    gid = game_ids["dummy_game"]
    payload = {"type": "game", "name": "game_room", "game_id": gid}
    response = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    created = response.get_json()
    assert created["name"] == "game_room"
    assert created["type"] == "game"
    assert created["game_id"] == gid


# ======================
# Tests for POST /chat/rooms/<room_id>/members
# ======================

def test_join_room_missing_user_id(client):
    rid = room_ids["existing_room"]
    response = client.post(
        f"/chat/rooms/{rid}/members",
        data=json.dumps({}),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_join_room_nonexistent_room(client):
    response = client.post(
        "/chat/rooms/9999/members",
        data=json.dumps({"user_id": user_ids["alice"]}),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_join_room_nonexistent_user(client):
    rid = room_ids["existing_room"]
    response = client.post(
        f"/chat/rooms/{rid}/members",
        data=json.dumps({"user_id": 9999}),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_join_room_success_and_duplicate(client):
    rid = room_ids["existing_room"]
    # Bob joins existing_room
    payload = {"user_id": user_ids["bob"]}
    response = client.post(
        f"/chat/rooms/{rid}/members",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    membership = response.get_json()
    assert membership["room_id"] == rid
    assert membership["user_id"] == user_ids["bob"]

    # Bob tries to join again → IntegrityError → 400
    response2 = client.post(
        f"/chat/rooms/{rid}/members",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response2.status_code == 400


# # ======================
# # Tests for GET /chat/rooms/<room_id>/messages
# # ======================

def test_list_messages_nonexistent_room(client):
    response = client.get("/chat/rooms/9999/messages")
    assert response.status_code == 404

def test_list_messages_empty(client):
    # Create a new empty room
    payload = {"type": "public", "name": "empty_room"}
    res = client.post(
        "/chat/rooms",
        data=json.dumps(payload),
        content_type="application/json"
    )
    new_room = res.get_json()
    new_rid = new_room["id"]

    response = client.get(f"/chat/rooms/{new_rid}/messages")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []

def test_list_messages_non_empty(client):
    rid = room_ids["existing_room"]
    # We seeded one message (msg1). Insert a second message with later timestamp
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO chat_messages (room_id, sender_id, message)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (rid, user_ids["bob"], "Second Message")
        )
        row = cur.fetchone()
        message_ids["msg2"] = row["id"]
        db.commit()
        cur.close()

    response = client.get(f"/chat/rooms/{rid}/messages")
    assert response.status_code == 200
    data = response.get_json()
    # Two messages in ascending sent_at order
    assert len(data) == 2
    texts = [msg["message"] for msg in data]
    assert texts == ["Hello World", "Second Message"]


# ======================
# Tests for POST /chat/rooms/<room_id>/messages
# ======================

def test_send_message_missing_fields(client):
    rid = room_ids["existing_room"]
    response = client.post(
        f"/chat/rooms/{rid}/messages",
        data=json.dumps({"sender_id": user_ids["alice"]}),
        content_type="application/json"
    )
    assert response.status_code == 400

    response2 = client.post(
        f"/chat/rooms/{rid}/messages",
        data=json.dumps({"message": "No sender"}),
        content_type="application/json"
    )
    assert response2.status_code == 400

def test_send_message_nonexistent_room(client):
    payload = {"sender_id": user_ids["alice"], "message": "Test"}
    response = client.post(
        "/chat/rooms/9999/messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_send_message_nonexistent_sender(client):
    rid = room_ids["existing_room"]
    payload = {"sender_id": 9999, "message": "Hi"}
    response = client.post(
        f"/chat/rooms/{rid}/messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_send_message_invalid_reply_to(client):
    rid = room_ids["existing_room"]
    payload = {"sender_id": user_ids["alice"], "message": "Reply test", "reply_to_id": 9999}
    response = client.post(
        f"/chat/rooms/{rid}/messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_send_message_success_no_reply(client):
    rid = room_ids["existing_room"]
    payload = {"sender_id": user_ids["bob"], "message": "Hello again"}
    response = client.post(
        f"/chat/rooms/{rid}/messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    new_msg = response.get_json()
    assert new_msg["room_id"] == rid
    assert new_msg["sender_id"] == user_ids["bob"]
    assert new_msg["message"] == "Hello again"

def test_send_message_success_with_reply(client):
    rid = room_ids["existing_room"]
    # Use existing msg1 as reply_to_id
    payload = {"sender_id": user_ids["bob"], "message": "Replying", "reply_to_id": message_ids["msg1"]}
    response = client.post(
        f"/chat/rooms/{rid}/messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    new_msg = response.get_json()
    assert new_msg["reply_to_id"] == message_ids["msg1"]


# ======================
# Tests for GET /chat/users/<user_id>/messages
# ======================

def test_get_user_messages_nonexistent_user(client):
    response = client.get("/chat/users/9999/messages")
    assert response.status_code == 404

def test_get_user_messages_returns_dms(client):
    # We seeded one DM (dm1 from alice to bob)
    response = client.get(f"/chat/users/{user_ids['alice']}/messages")
    assert response.status_code == 200
    data = response.get_json()
    # Should include the DM where alice is sender
    assert any(msg["id"] == message_ids["dm1"] for msg in data)

    response2 = client.get(f"/chat/users/{user_ids['bob']}/messages")
    assert response2.status_code == 200
    data2 = response2.get_json()
    # Should include the DM where bob is recipient
    assert any(msg["id"] == message_ids["dm1"] for msg in data2)

def test_get_user_messages_empty(client):
    # carol has no DMs
    response = client.get(f"/chat/users/{user_ids['carol']}/messages")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []


# # ======================
# # Tests for POST /chat/direct-messages
# # ======================

def test_send_direct_message_missing_fields(client):
    response = client.post(
        "/chat/direct-messages",
        data=json.dumps({"sender_id": user_ids["alice"]}),
        content_type="application/json"
    )
    assert response.status_code == 400

    response2 = client.post(
        "/chat/direct-messages",
        data=json.dumps({"recipient_id": user_ids["bob"]}),
        content_type="application/json"
    )
    assert response2.status_code == 400

    response3 = client.post(
        "/chat/direct-messages",
        data=json.dumps({"sender_id": user_ids["alice"], "recipient_id": user_ids["bob"]}),
        content_type="application/json"
    )
    assert response3.status_code == 400

def test_send_direct_message_nonexistent_sender(client):
    payload = {"sender_id": 9999, "recipient_id": user_ids["bob"], "message": "Hi"}
    response = client.post(
        "/chat/direct-messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_send_direct_message_nonexistent_recipient(client):
    payload = {"sender_id": user_ids["alice"], "recipient_id": 9999, "message": "Hi"}
    response = client.post(
        "/chat/direct-messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_send_direct_message_success(client):
    payload = {"sender_id": user_ids["bob"], "recipient_id": user_ids["alice"], "message": "DM Back"}
    response = client.post(
        "/chat/direct-messages",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    new_dm = response.get_json()
    assert new_dm["sender_id"] == user_ids["bob"]
    assert new_dm["recipient_id"] == user_ids["alice"]
    assert new_dm["message"] == "DM Back"
