import json
import pytest
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from app.db import get_db

# Dictionaries to hold seeded IDs
user_ids = {}
leaderboard_entry_ids = {}

def clear_tables(client):
    """Clear tables relevant to leaderboards testing."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Delete in order due to possible FK constraints
        cur.execute("DELETE FROM leaderboards;")
        cur.execute("DELETE FROM users;")
        cur.execute("DELETE FROM categories;")
        db.commit()
        cur.close()

def seed_leaderboards_data(client):
    """
    Seed:
      - Two users: alice, bob
      - Two categories: Math (id=...), History (id=...)
      - Multiple leaderboard entries:
          * alice: alltime, Math, rank 1, score 150
          * alice: weekly, History, rank 2, score 80
          * bob: alltime, NULL (no category), rank 2, score 120
          * bob: monthly, Math, rank 1, score 200
    """
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()

        # 1) Insert users
        users = [
            ("alice", "alice@example.com", "password1"),
            ("bob",   "bob@example.com",   "password2"),
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
            uid = cur.fetchone()['id']
            user_ids[username] = uid

        # 2) Insert categories
        categories = [
            ("Math",    "Math questions"),
            ("History", "History questions"),
        ]
        category_ids = {}
        for name, desc in categories:
            cur.execute(
                """
                INSERT INTO categories (name, description)
                VALUES (%s, %s)
                RETURNING id;
                """,
                (name, desc)
            )
            cid = cur.fetchone()['id']
            category_ids[name] = cid

        # 3) Insert leaderboard entries with generated_at offsets
        now = datetime.utcnow()
        entries = [
            # alice, alltime, Math
            {
                "user_id": user_ids["alice"],
                "scope": "alltime",
                "category_id": category_ids["Math"],
                "rank": 1,
                "score": 150,
                "generated_at": now - timedelta(days=2)
            },
            # alice, weekly, History
            {
                "user_id": user_ids["alice"],
                "scope": "weekly",
                "category_id": category_ids["History"],
                "rank": 2,
                "score": 80,
                "generated_at": now - timedelta(days=1)
            },
            # bob, alltime, no category
            {
                "user_id": user_ids["bob"],
                "scope": "alltime",
                "category_id": None,
                "rank": 2,
                "score": 120,
                "generated_at": now - timedelta(days=3)
            },
            # bob, monthly, Math
            {
                "user_id": user_ids["bob"],
                "scope": "monthly",
                "category_id": category_ids["Math"],
                "rank": 1,
                "score": 200,
                "generated_at": now - timedelta(days=5)
            },
        ]

        for i, entry in enumerate(entries, start=1):
            cur.execute(
                """
                INSERT INTO leaderboards
                  (user_id, scope, category_id, rank, score, generated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    entry["user_id"],
                    entry["scope"],
                    entry["category_id"],
                    entry["rank"],
                    entry["score"],
                    entry["generated_at"]
                )
            )
            lid = cur.fetchone()['id']
            leaderboard_entry_ids[f"entry_{i}"] = lid

        db.commit()
        cur.close()

@pytest.fixture(autouse=True)
def setup_and_teardown(client):
    clear_tables(client)
    seed_leaderboards_data(client)
    yield
    clear_tables(client)


# ==========================
# Tests for GET /leaderboards
# ==========================

def test_list_leaderboards_default_scope(client):
    """
    Default: scope=alltime, limit=10, no category filter.
    Should return two entries: alice (rank 1), bob (rank 2), ordered by rank ASC.
    """
    response = client.get("/leaderboards")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    # Expect two entries for scope=alltime
    assert len(data) == 2
    
    # Check order by rank
    assert data[0]["user_id"] == user_ids["alice"]
    assert data[0]["scope"] == "alltime"
    assert data[0]["category_id"] is not None
    assert data[0]["rank"] == 1
    assert data[0]["score"] == 150

    assert data[1]["user_id"] == user_ids["bob"]
    assert data[1]["scope"] == "alltime"
    assert data[1]["category_id"] is None
    assert data[1]["rank"] == 2
    assert data[1]["score"] == 120

def test_list_leaderboards_invalid_scope(client):
    """
    Invalid scope parameter should return 400.
    """
    response = client.get("/leaderboards?scope=yearly")
    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid scope" in data["error"]

def test_list_leaderboards_with_category_filter(client):
    """
    Filter by category_id=Math. For alltime scope, only alice entry matches.
    """
    # First, fetch the Math category_id from seeded entries
    # Since we know entry_1 is Alice, Math, scope=alltime
    entry1_id = leaderboard_entry_ids["entry_1"]
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute(
            "SELECT category_id FROM leaderboards WHERE id = %s;",
            (entry1_id,)
        )
        math_cid = cur.fetchone()['category_id']
        cur.close()

    response = client.get(f"/leaderboards?category_id={math_cid}")
    assert response.status_code == 200
    data = response.get_json()
    # Only alice's alltime, Math entry should appear
    assert len(data) == 1
    assert data[0]["user_id"] == user_ids["alice"]
    assert data[0]["category_id"] == math_cid
    assert data[0]["scope"] == "alltime"

def test_list_leaderboards_limit(client):
    """
    Set limit=1 for default scope=alltime.
    Should return only the top-ranked (alice).
    """
    response = client.get("/leaderboards?limit=1")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["user_id"] == user_ids["alice"]
    assert data[0]["rank"] == 1

def test_list_leaderboards_different_scope(client):
    """
    Filter by scope=weekly. Only alice weekly entry should appear.
    """
    response = client.get("/leaderboards?scope=weekly")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["user_id"] == user_ids["alice"]
    assert data[0]["scope"] == "weekly"
    assert data[0]["score"] == 80

def test_list_leaderboards_no_results(client):
    """
    Filter by scope=monthly and category_id that does not match (History).
    In seeded data, bob has monthly Math, so History filter yields empty.
    """
    # Get History category_id
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id FROM categories WHERE name = %s;", ("History",))
        history_cid = cur.fetchone()['id']
        cur.close()

    response = client.get(f"/leaderboards?scope=monthly&category_id={history_cid}")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []


# =================================
# Tests for GET /leaderboards/user/<id>
# =================================

def test_get_user_leaderboards_success(client):
    """
    For user alice: should return both entries for alice,
    ordered by generated_at DESC: weekly then alltime.
    """
    uid = user_ids["alice"]
    response = client.get(f"/leaderboards/user/{uid}")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    # Two entries for alice
    assert len(data) == 2
    # First should be the more recent: weekly (entry_2)
    assert data[0]["scope"] == "weekly"
    assert data[0]["score"] == 80
    # Second: alltime (entry_1)
    assert data[1]["scope"] == "alltime"
    assert data[1]["score"] == 150

def test_get_user_leaderboards_no_entries(client):
    """
    Create a new user with no leaderboard entries.
    Should return empty list.
    """
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            ("charlie", "charlie@example.com", generate_password_hash("password3"))
        )
        new_uid = cur.fetchone()['id']
        db.commit()
        cur.close()

    response = client.get(f"/leaderboards/user/{new_uid}")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []

def test_get_user_leaderboards_user_not_found(client):
    """
    Query for a non-existent user should return 404.
    """
    response = client.get("/leaderboards/user/9999")
    assert response.status_code == 404
    data = response.get_json()
    assert "not found" in data["error"].lower()
