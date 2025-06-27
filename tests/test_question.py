import json
import pytest
import psycopg2
from werkzeug.security import generate_password_hash
from app.db import get_db

# Dictionaries to hold seeded IDs
user_ids = {}
category_ids = {}
question_ids = {}
choice_ids = {}

def clear_tables(client):
    """Helper to clear tables relevant for questions testing."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Delete in order due to FK constraints
        cur.execute("DELETE FROM question_choices;")
        cur.execute("DELETE FROM questions;")
        cur.execute("DELETE FROM categories;")
        cur.execute("DELETE FROM users;")
        db.commit()
        cur.close()

def seed_questions_data(client):
    """
    Insert sample users, categories, questions, and choices.
    - Alice (user_id = X)
    - Bob   (user_id = Y)
    - Category "Math" (category_id = A)
    - Category "History" (category_id = B)
    - Question q1: "2+2=?" (Math, easy, verified=True, created_by=Alice)
    - Choices for q1: 4 (correct), 3, 5
    - Question q2: "Who discovered America?" (History, medium, verified=False, created_by=Bob)
    - Choices for q2: Columbus (correct), Magellan, Vespucci
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
            row = cur.fetchone()
            new_user_id = row['id']
            user_ids[username] = new_user_id

        # 2) Insert categories
        categories = [
            ("Math",    "Mathematics questions"),
            ("History", "History questions"),
        ]
        for name, desc in categories:
            cur.execute(
                """
                INSERT INTO categories (name, description)
                VALUES (%s, %s)
                RETURNING id;
                """,
                (name, desc)
            )
            row = cur.fetchone()
            new_cat_id = row['id']
            category_ids[name] = new_cat_id

        # 3) Insert question q1 (verified=True)
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("2 + 2 = ?", category_ids["Math"], "easy", user_ids["alice"])
        )
        row = cur.fetchone()
        q1_id = row['id']
        question_ids["q1"] = q1_id

        # Choices for q1
        choices_q1 = [
            (q1_id, "4",  True,  "A"),
            (q1_id, "3",  False, "B"),
            (q1_id, "5",  False, "C"),
        ]
        for qid, text, correct, pos in choices_q1:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q1_c{pos}"] = row['id']

        # 4) Insert question q2 (verified=False)
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, FALSE, %s)
            RETURNING id;
            """,
            ("Who discovered America?", category_ids["History"], "medium", user_ids["bob"])
        )
        row = cur.fetchone()
        q2_id = row['id']
        question_ids["q2"] = q2_id

        # Choices for q2
        choices_q2 = [
            (q2_id, "Christopher Columbus", True,   "A"),
            (q2_id, "Ferdinand Magellan",  False,  "B"),
            (q2_id, "Amerigo Vespucci",    False,  "C"),
        ]
        for qid, text, correct, pos in choices_q2:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q2_c{pos}"] = row['id']

        db.commit()
        cur.close()

@pytest.fixture(autouse=True)
def setup_and_teardown(client):
    clear_tables(client)
    seed_questions_data(client)
    yield
    clear_tables(client)


# ======================
# Tests for GET /questions
# ======================

def test_list_all_questions(client):
    response = client.get("/questions/")
    assert response.status_code == 200
    data = response.get_json()
    # We seeded two questions: q1 and q2
    assert isinstance(data, list)
    # Each element is a tuple-like (cursor.fetchall returns list of rows)
    # We expect 2 entries
    assert len(data) == 2

    returned_ids = {item["id"] for item in data}
    assert returned_ids == {question_ids["q1"], question_ids["q2"]}

def test_list_verified_filter(client):
    # Only q1 is verified
    response = client.get("/questions/?verified=true")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["id"] == question_ids["q1"]

def test_list_difficulty_filter(client):
    # Filter difficulty=medium should return only q2
    response = client.get("/questions/?difficulty=medium")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["id"] == question_ids["q2"]

def test_list_category_filter(client):
    # category_id=Math should return only q1
    math_cat = category_ids["Math"]
    response = client.get(f"/questions/?category_id={math_cat}")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["id"] == question_ids["q1"]

def test_list_combined_filters(client):
    # Combine verified and difficulty filters: verified=true & difficulty=easy returns q1
    response = client.get("/questions/?verified=true&difficulty=easy")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["id"] == question_ids["q1"]

    # Combine verified and wrong difficulty: verified=true & difficulty=medium → empty
    response2 = client.get("/questions/?verified=true&difficulty=medium")
    assert response2.status_code == 200
    data2 = response2.get_json()
    assert data2 == []

# ======================
# Tests for POST /questions
# ======================

def test_create_question_success(client):
    payload = {
        "text": "What is 10 / 2?",
        "category_id": category_ids["Math"],
        "difficulty": "easy",
        "created_by": user_ids["alice"]
    }
    response = client.post(
        "/questions/",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201
    created = response.get_json()
    # Inspect returned fields
    assert created["text"] == payload["text"]
    assert created["category_id"] == payload["category_id"]
    assert created["difficulty"] == payload["difficulty"]
    assert created["is_verified"] is False
    assert created["created_by"] == payload["created_by"]
    # Now verify it exists in database
    new_id = created["id"]
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT text, category_id, difficulty, is_verified, created_by FROM questions WHERE id = %s;", (new_id,))
        row = cur.fetchone()
        cur.close()
    assert row["text"] == payload["text"]
    assert row["category_id"] == payload["category_id"]
    assert row["difficulty"] == payload["difficulty"]
    assert row["is_verified"] is False
    assert row["created_by"] == payload["created_by"]

def test_create_question_missing_fields(client):
    # Omit 'difficulty'
    payload = {
        "text": "Incomplete question",
        "category_id": category_ids["Math"],
    }
    response = client.post(
        "/questions/",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Missing required fields." in data["error"]

def test_create_question_invalid_category(client):
    # Use a non-existent category_id to trigger IntegrityError
    payload = {
        "text": "Invalid category test",
        "category_id": 9999,
        "difficulty": "hard",
        "created_by": user_ids["alice"]
    }
    response = client.post(
        "/questions/",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Integrity error" in data["error"]

# ======================
# Tests for GET /questions/<q_id>
# ======================

def test_get_question_success(client):
    q_id = question_ids["q1"]
    response = client.get(f"/questions/{q_id}")
    assert response.status_code == 200
    data = response.get_json()
    # Verify basic fields
    assert data["id"] == q_id
    assert data["text"] == "2 + 2 = ?"
    assert data["category_id"] == category_ids["Math"]
    assert data["difficulty"] == "easy"
    assert data["is_verified"] is True
    assert data["created_by"] == user_ids["alice"]
    # Verify choices list
    assert "choices" in data
    assert isinstance(data["choices"], list)
    returned_choice_texts = {c["choice_text"] for c in data["choices"]}
    assert returned_choice_texts == {"4", "3", "5"}

def test_get_question_not_found(client):
    response = client.get("/questions/9999")
    assert response.status_code == 404
    data = response.get_json()
    assert "not found" in data["error"].lower()

# ======================
# Tests for PUT /questions/<q_id>
# ======================

def test_update_question_text_and_verify(client):
    q_id = question_ids["q2"]  # initially is_verified=False
    payload = {
        "text": "Who first set foot in America?",
        "is_verified": True
    }
    response = client.put(
        f"/questions/{q_id}",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 200
    updated = response.get_json()
    assert updated["id"] == q_id
    assert updated["text"] == payload["text"]
    assert updated["is_verified"] is True

    # Check in DB
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT text, is_verified FROM questions WHERE id = %s;", (q_id,))
        row = cur.fetchone()
        cur.close()
    assert row["text"] == payload["text"]
    assert row["is_verified"] is True

def test_update_question_invalid_field(client):
    q_id = question_ids["q1"]
    # Field 'foo' is not allowed
    payload = {"foo": "bar"}
    response = client.put(
        f"/questions/{q_id}",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "No valid fields to update" in data["error"]

def test_update_question_not_found(client):
    payload = {"text": "Non-existent"}
    response = client.put(
        "/questions/9999",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404
    data = response.get_json()
    assert "not found" in data["error"].lower()

def test_update_question_integrity_error(client):
    q_id = question_ids["q1"]
    # Attempt to set category_id to non-existent
    payload = {"category_id": 9999}
    response = client.put(
        f"/questions/{q_id}",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Integrity error" in data["error"]

# ======================
# Tests for DELETE /questions/<q_id>
# ======================

def test_delete_question_success(client):
    q_id = question_ids["q1"]
    # Delete q1
    response = client.delete(f"/questions/{q_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["deleted_id"] == q_id

    # Subsequent GET should yield 404
    response2 = client.get(f"/questions/{q_id}")
    assert response2.status_code == 404

def test_delete_question_not_found(client):
    response = client.delete("/questions/9999")
    assert response.status_code == 404
    data = response.get_json()
    assert "not found" in data["error"].lower()
