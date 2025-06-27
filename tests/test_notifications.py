import json
import pytest
from werkzeug.security import generate_password_hash
from app.db import get_db

# Will hold seeded IDs
user_ids = {}
type_ids = {}
note_ids = {}

def clear_tables(client):
    """Clear tables relevant to notifications testing."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Delete in order due to FK constraints (if any)
        cur.execute("DELETE FROM notifications;")
        cur.execute("DELETE FROM notification_types;")
        cur.execute("DELETE FROM users;")
        db.commit()
        cur.close()

def seed_notifications_data(client):
    """
    Seed:
      - One user: alice
      - Two notification types: friend_request, game_invite
      - Two notifications for alice: one unread, one already read
    """
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()

        # 1) Insert user
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            ("alice", "alice@example.com", generate_password_hash("password1"))
        )
        user_ids["alice"] = cur.fetchone()['id']

        # 2) Insert notification types
        types = [
            ("friend_request", "User {from} sent you a friend request.", "normal"),
            ("game_invite",     "User {from} invited you to a game.",       "high"),
        ]
        for name, template, importance in types:
            cur.execute(
                """
                INSERT INTO notification_types (name, template, importance)
                VALUES (%s, %s, %s)
                RETURNING id;
                """,
                (name, template, importance)
            )
            type_id = cur.fetchone()['id']
            type_ids[name] = type_id

        # 3) Insert notifications for alice
        # One unread (is_read = FALSE), one already read (is_read = TRUE).
        # We provide type_id, user_id, data JSON, rely on defaults for created_at, related_game_id.
        cur.execute(
            """
            INSERT INTO notifications (type_id, user_id, data, is_read)
            VALUES (%s, %s, %s, FALSE)
            RETURNING id;
            """,
            (type_ids["friend_request"], user_ids["alice"], json.dumps({"from": "bob"}))
        )
        note_ids["unread"] = cur.fetchone()['id']

        cur.execute(
            """
            INSERT INTO notifications (type_id, user_id, data, is_read)
            VALUES (%s, %s, %s, TRUE)
            RETURNING id;
            """,
            (type_ids["game_invite"], user_ids["alice"], json.dumps({"from": "carol"}))
        )
        note_ids["read"] = cur.fetchone()['id']

        db.commit()
        cur.close()

@pytest.fixture(autouse=True)
def setup_and_teardown(client):
    clear_tables(client)
    seed_notifications_data(client)
    yield
    clear_tables(client)


# ==========================
# Tests for GET /types
# ==========================

def test_list_notification_types_non_empty(client):
    response = client.get("notifications/types")
    assert response.status_code == 200
    data = response.get_json()
    # We seeded two types
    assert isinstance(data, list)
    returned_names = {item["name"] for item in data}
    assert returned_names == {"friend_request", "game_invite"}




# ==========================
# Tests for POST /types
# ==========================

def test_create_notification_type_success(client):
    payload = {
        "name": "achievement",
        "template": "Congratulations, {user} unlocked an achievement!",
        "importance": "low"
    }
    response = client.post(
        "notifications/types",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    created = response.get_json()
    assert created["name"] == payload["name"]
    assert created["template"] == payload["template"]
    assert created["importance"] == payload["importance"]

    # Verify in DB
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT name, template, importance FROM notification_types WHERE id = %s;",
                    (created["id"],))
        row = cur.fetchone()
        cur.close()
    assert row["name"] == payload["name"]
    assert row["template"] == payload["template"]
    assert row["importance"] == payload["importance"]

def test_create_notification_type_missing_fields(client):
    payload = {"name": "bug_report"}
    response = client.post(
        "notifications/types",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Missing required fields." in data["error"]



# ===================================
# Tests for GET / (list_notifications)
# ===================================

def test_list_notifications_missing_user_id(client):
    response = client.get("notifications/")
    assert response.status_code == 400

def test_list_notifications_no_unread(client):
    # Mark existing unread as read, so alice has no unread
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s;", (note_ids["unread"],))
        db.commit()
        cur.close()
    response = client.get(f"notifications/?user_id={user_ids['alice']}")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []

def test_list_notifications_with_unread(client):
    response = client.get(f"notifications/?user_id={user_ids['alice']}")
    assert response.status_code == 200
    data = response.get_json()
    # Should contain only the unread notification
    assert len(data) == 1
    note = data[0]
    assert note["id"] == note_ids["unread"]
    assert note["user_id"] == user_ids["alice"]
    assert note["is_read"] is False


# =======================================
# Tests for POST /<note_id>/read (mark_as_read)
# =======================================

def test_mark_as_read_success(client):
    nid = note_ids["unread"]
    response = client.post(f"notifications/{nid}/read")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == nid
    assert data["is_read"] is True

    # Verify in DB
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT is_read FROM notifications WHERE id = %s;", (nid,))
        row = cur.fetchone()
        cur.close()
    assert row["is_read"] is True

def test_mark_as_read_not_found(client):
    response = client.post("notifications/9999/read")
    assert response.status_code == 404


# ============================================
# Tests for GET /user/<user_id> (get_user_notifications)
# ============================================

def test_get_user_notifications_nonexistent_user(client):
    response = client.get("notifications/user/9999")
    assert response.status_code == 200  # query_db returns [] even if no user
    data = response.get_json()
    assert data == []

def test_get_user_notifications_returns_all(client):
    response = client.get(f"notifications/user/{user_ids['alice']}")
    assert response.status_code == 200
    data = response.get_json()
    # Should include both notifications (read and unread)
    returned_ids = {item["id"] for item in data}
    assert returned_ids == {note_ids["unread"], note_ids["read"]}


# ====================================
# Tests for POST / (create_notification)
# ====================================

def test_create_notification_success(client):
    payload = {"user_id": user_ids["alice"], "data": "New test notification" , "type_id": type_ids["friend_request"]}
    response = client.post(
        "notifications/",
        data=json.dumps(payload),
        content_type="application/json"
    )
   
    assert response.status_code == 201
    data = response.get_json()

    new_id = data["id"]

    # Verify in DB
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT user_id, data FROM notifications WHERE id = %s;", (new_id,))
        row = cur.fetchone()
        cur.close()
    assert row["user_id"] == user_ids["alice"]
    # Since create_notification stores message into 'message' column, but list endpoint selects 'data',
    # we check that 'data' contains the message string if the schema maps it directly.
    assert "New test notification" in row["data"]

def test_create_notification_missing_fields(client):
    payload = {"user_id": user_ids["alice"]}
    response = client.post(
        "notifications/",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Missing required fields" in data["error"]

def test_create_notification_nonexistent_user(client):
    payload = {"user_id": 9999, "message": "Invalid user test"}
    response = client.post(
        "notifications/",
        data=json.dumps(payload),
        content_type="application/json"
    )
    # Depending on modify_db implementation, this may raise FK violation or generic error
    assert response.status_code == 400
