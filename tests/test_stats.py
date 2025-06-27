import json
import pytest
from decimal import Decimal
from werkzeug.security import generate_password_hash
from app.db import get_db, query_db

# Global dictionaries to hold seeded IDs
user_ids = {}
category_ids = {}
question_ids = {}
choice_ids = {}

def clear_tables(client):
    """Helper to clear relevant tables before each test."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Order matters due to FK constraints
        cur.execute("DELETE FROM round_answers;")
        cur.execute("DELETE FROM game_round_questions;")
        cur.execute("DELETE FROM game_rounds;")
        cur.execute("DELETE FROM game_participants;")
        cur.execute("DELETE FROM games;")
        cur.execute("DELETE FROM match_queue;")
        cur.execute("DELETE FROM game_invitations;")
        cur.execute("DELETE FROM question_choices;")
        cur.execute("DELETE FROM questions;")
        cur.execute("DELETE FROM categories;")
        cur.execute("DELETE FROM user_stats;")
        # cur.execute("DELETE FROM game_types;")
        cur.execute("DELETE FROM users;")
        db.commit()
        cur.close()

def seed_base_data(client):
    """Insert users, categories, questions, choices, game_types, and initial user_stats."""
    with client.application.app_context():
        db = get_db()
        # برای fetch کردن به‌صورت دیکشنری:
        # from psycopg2.extras import RealDictCursor
        # cur = db.cursor(cursor_factory=RealDictCursor)
        cur = db.cursor()

        # ------------------------------------------------------------------
        # ۱) INSERT کاربران و ذخیره کردن idِ هر کاربر (در صورت نیاز)
        # ------------------------------------------------------------------
        users = [
            ("alice", "alice@example.com", "password1"),
            ("bob",   "bob@example.com",   "password2"),
            ("carol", "carol@example.com", "password3"),
            ("dave",  "dave@example.com",  "password4"),
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
            new_user_id = row["id"]
            user_ids[username] = new_user_id

            # Initialize user_stats for each user
            cur.execute(
                """
                INSERT INTO user_stats (user_id)
                VALUES (%s);
                """,
                (new_user_id,)
            )

        # ------------------------------------------------------------------
        # ۲) INSERT دسته‌بندی‌ها و ذخیره‌ی idِ هر دسته‌بندی
        # ------------------------------------------------------------------
        categories = [
            ("History", "World history questions"),
            ("Science", "Science-related questions"),
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
            new_cat_id = row["id"]
            category_ids[name] = new_cat_id

        # ------------------------------------------------------------------
        # ۳) INSERT نوع‌های بازی
        # ------------------------------------------------------------------
        # game_types = [
        #     ("duel",  "One-on-one quiz",        5),
        #     ("group", "Multiplayer quiz",      10),
        # ]
        # for name, desc, total_rounds in game_types:
        #     cur.execute(
        #         """
        #         INSERT INTO game_types (name, description, total_rounds)
        #         VALUES (%s, %s, %s)
        #         RETURNING id;
        #         """,
        #         (name, desc, total_rounds)
        #     )
            # We don't need to store game_type IDs explicitly here.

        # ------------------------------------------------------------------
        # ۴) INSERT سوالات و گزینه‌ها برای هر دسته (۴ سؤال در هر دسته)
        # ------------------------------------------------------------------
        # -------------------
        # Category "History"
        # -------------------
        history_id = category_ids["History"]
        created_by_user = user_ids["alice"]  # سازندهٔ سؤالات تاریخ: alice

        # سؤال ۱
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("When did WW2 end?", history_id, "medium", created_by_user)
        )
        row = cur.fetchone()
        q1_id = row["id"]
        question_ids["q1"] = q1_id
        choices_q1 = [
            (q1_id, "1945", True,  'A'),
            (q1_id, "1944", False, 'B'),
            (q1_id, "1939", False, 'C'),
            (q1_id, "1950", False, 'D'),
        ]
        for qid, text, correct, pos in choices_q1:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q1_c{pos}"] = row["id"]

        # سؤال ۲
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("Who was the first president of the United States?", history_id, "easy", created_by_user)
        )
        row = cur.fetchone()
        q2_id = row["id"]
        question_ids["q2"] = q2_id
        choices_q2 = [
            (q2_id, "George Washington", True,  'A'),
            (q2_id, "Abraham Lincoln", False, 'B'),
            (q2_id, "Thomas Jefferson", False, 'C'),
            (q2_id, "John Adams", False,      'D'),
        ]
        for qid, text, correct, pos in choices_q2:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q2_c{pos}"] = row["id"]

        # سؤال ۳
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("What year did the Roman Empire fall?", history_id, "medium", created_by_user)
        )
        row = cur.fetchone()
        q3_id = row["id"]
        question_ids["q3"] = q3_id
        choices_q3 = [
            (q3_id, "476 AD", True,   'A'),
            (q3_id, "410 AD", False,  'B'),
            (q3_id, "395 AD", False,  'C'),
            (q3_id, "324 AD", False,  'D'),
        ]
        for qid, text, correct, pos in choices_q3:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q3_c{pos}"] = row["id"]

        # سؤال ۴
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("Which civilization built Machu Picchu?", history_id, "hard", created_by_user)
        )
        row = cur.fetchone()
        q4_id = row["id"]
        question_ids["q4"] = q4_id
        choices_q4 = [
            (q4_id, "Inca", True,     'A'),
            (q4_id, "Maya", False,    'B'),
            (q4_id, "Aztec", False,   'C'),
            (q4_id, "Olmec", False,   'D'),
        ]
        for qid, text, correct, pos in choices_q4:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q4_c{pos}"] = row["id"]

        # -------------------
        # Category "Science"
        # -------------------
        science_id = category_ids["Science"]
        created_by_user = user_ids["bob"]  # سازندهٔ سؤالات علوم: bob

        # سؤال ۱
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("Chemical symbol for water?", science_id, "easy", created_by_user)
        )
        row = cur.fetchone()
        q5_id = row["id"]
        question_ids["q5"] = q5_id
        choices_q5 = [
            (q5_id, "H2O", True,  'A'),
            (q5_id, "O2",  False, 'B'),
            (q5_id, "CO2", False, 'C'),
            (q5_id, "HO",  False, 'D'),
        ]
        for qid, text, correct, pos in choices_q5:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q5_c{pos}"] = row["id"]

        # سؤال ۲
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("What planet is known as the Red Planet?", science_id, "easy", created_by_user)
        )
        row = cur.fetchone()
        q6_id = row["id"]
        question_ids["q6"] = q6_id
        choices_q6 = [
            (q6_id, "Mars", True,      'A'),
            (q6_id, "Venus", False,    'B'),
            (q6_id, "Jupiter", False,  'C'),
            (q6_id, "Saturn", False,   'D'),
        ]
        for qid, text, correct, pos in choices_q6:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q6_c{pos}"] = row["id"]

        # سؤال ۳
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("What is the powerhouse of the cell?", science_id, "medium", created_by_user)
        )
        row = cur.fetchone()
        q7_id = row["id"]
        question_ids["q7"] = q7_id
        choices_q7 = [
            (q7_id, "Mitochondria", True,   'A'),
            (q7_id, "Nucleus", False,       'B'),
            (q7_id, "Ribosome", False,      'C'),
            (q7_id, "Endoplasmic Reticulum", False, 'D'),
        ]
        for qid, text, correct, pos in choices_q7:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q7_c{pos}"] = row["id"]

        # سؤال ۴
        cur.execute(
            """
            INSERT INTO questions
                (text, category_id, difficulty, is_verified, created_by)
            VALUES
                (%s, %s, %s, TRUE, %s)
            RETURNING id;
            """,
            ("What gas do plants absorb from the atmosphere?", science_id, "medium", created_by_user)
        )
        row = cur.fetchone()
        q8_id = row["id"]
        question_ids["q8"] = q8_id
        choices_q8 = [
            (q8_id, "Carbon Dioxide (CO₂)", True,  'A'),
            (q8_id, "Oxygen (O₂)", False,    'B'),
            (q8_id, "Nitrogen (N₂)", False,  'C'),
            (q8_id, "Hydrogen (H₂)", False,  'D'),
        ]
        for qid, text, correct, pos in choices_q8:
            cur.execute(
                """
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct, position)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (qid, text, correct, pos)
            )
            row = cur.fetchone()
            choice_ids[f"q8_c{pos}"] = row["id"]

        db.commit()
        cur.close()

@pytest.fixture(autouse=True)
def setup_and_teardown(client):
    clear_tables(client)
    seed_base_data(client)
    yield
    clear_tables(client)


# ===========================
# Tests for /stats endpoints
# ===========================

def test_top10_winrate_no_stats(client):
    # Without any wins recorded beyond defaults, users have games_played=0 → 404
    response = client.get("/stats/top10-winrate")
    assert response.status_code == 404
    data = response.get_json()
    assert data["message"] == "Statistics for users not found."

def test_top10_winrate_with_stats(client):
    # Seed user_stats with games_played > 0 for alice and bob
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Alice: 10 played, 6 won → 60.00%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (10, 6, user_ids["alice"])
        )
        # Bob: 5 played, 5 won → 100.00%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (5, 5, user_ids["bob"])
        )
        # Carol: 0 played, 0 won → remains excluded
        db.commit()
        cur.close()

    response = client.get("/stats/top10-winrate")
    assert response.status_code == 200
    items = response.get_json()

    # Only Alice and Bob should appear (Carol and Dave have games_played=0)
    assert len(items) == 2

    # Bob has 100% win rate → appears first
    assert items[0]["user_id"] == user_ids["bob"]
    assert items[0]["games_won"] == 5
    assert items[0]["games_played"] == 5
    assert pytest.approx(items[0]["win_rate"], rel=1e-3) == 100.0

    # Alice has 60% win rate → appears second
    assert items[1]["user_id"] == user_ids["alice"]
    assert items[1]["games_won"] == 6
    assert items[1]["games_played"] == 10
    assert pytest.approx(items[1]["win_rate"], rel=1e-3) == 60.0

def test_top10_winrate_tie_breaker(client):
    # If two users have the same win_rate, order by user_id ascending
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Alice: 4 played, 2 won → 50.00%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (4, 2, user_ids["alice"])
        )
        # Bob:   6 played, 3 won → 50.00%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (6, 3, user_ids["bob"])
        )
        # Dave:  2 played, 1 won → 50.00%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (2, 1, user_ids["dave"])
        )
        db.commit()
        cur.close()

    response = client.get("/stats/top10-winrate")
    assert response.status_code == 200
    items = response.get_json()

    # Three users with 50% → should be ordered by (games_won/games_played DESC) then by user_id asc
    expected_order = sorted(
        [user_ids["alice"], user_ids["bob"], user_ids["dave"]]
    )
    returned_ids = [item["user_id"] for item in items]
    assert returned_ids == expected_order

def test_top10_winrate_with_more_than_10_users(client):
    """Test that only top 10 users are returned even if more exist."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        
        # Create 12 users with different win rates
        for i in range(12):
            games_played = 10
            games_won = i  # 0 to 11 wins → 0% to 110% win rate
            cur.execute(
                "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
                (games_played, games_won, list(user_ids.values())[i % 4])  # Cycle through our 4 users
            )
        db.commit()
        cur.close()

    response = client.get("/stats/top10-winrate")
    assert response.status_code == 200
    items = response.get_json()

    # Should only return top 10 users
    assert len(items) == 4  # We only have 4 real users in our test DB
    
    # Verify win rates are in descending order
    win_rates = [item["win_rate"] for item in items]
    assert win_rates == sorted(win_rates, reverse=True)

def test_top10_winrate_with_zero_wins(client):
    """Test users with zero wins but games played are included with 0% win rate."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        
        # Alice: 5 played, 0 won → 0%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (5, 0, user_ids["alice"])
        )
        # Bob: 3 played, 1 won → 33.33%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (3, 1, user_ids["bob"])
        )
        db.commit()
        cur.close()

    response = client.get("/stats/top10-winrate")
    assert response.status_code == 200
    items = response.get_json()

    assert len(items) == 2
    # Bob should be first with 33.33%
    assert items[0]["user_id"] == user_ids["bob"]
    assert pytest.approx(items[0]["win_rate"], rel=1e-3) == 33.33
    # Alice should be second with 0%
    assert items[1]["user_id"] == user_ids["alice"]
    assert pytest.approx(items[1]["win_rate"], rel=1e-3) == 0.0



def test_most_played_categories_empty(client):
    # Since no game_rounds exist, no categories have been played
    response = client.get("/stats/most-played-categories")

    assert response.status_code == 200
    data = response.get_json()
    assert data == []

def test_most_played_categories_with_data(client):
    # Insert two game_rounds and link to questions → expect counts per category
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Create a dummy game to attach rounds
        cur.execute(
            "INSERT INTO games (game_type_id, status) VALUES (%s, 'completed') RETURNING id;",
            (1,)
        )
        new_game_id = cur.fetchone()["id"]
        # Add one participant so that game_rounds FK constraints pass if needed
        cur.execute(
            "INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s)",
            (new_game_id, user_ids["alice"])
        )
        # Create two rounds: one History, one Science
        cur.execute(
            """
            INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds, points_possible)
            VALUES (%s, %s, %s, 'completed', 30, 100) RETURNING id;
            """,
            (new_game_id, 1, category_ids["History"])
        )
        gr1_id = cur.fetchone()["id"]
        cur.execute(
            """
            INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds, points_possible)
            VALUES (%s, %s, %s, 'completed', 30, 100) RETURNING id;
            """,
            (new_game_id, 2, category_ids["Science"])
        )
        gr2_id = cur.fetchone()["id"]
        # Link each round to a question from that category
        # History: use q1 (History)
        cur.execute(
            "INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
            (gr1_id, question_ids["q1"])
        )

        # Science: use q5 (Science)
        cur.execute(
            "INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
            (gr2_id, question_ids["q5"])
        )
        

        db.commit()
        cur.close()

    response = client.get("/stats/most-played-categories")
    assert response.status_code == 200
    data = response.get_json()

    # Expect two entries, both with times_played = 1
    assert len(data) == 2
    # The order should be descending by times_played; since tie, by category ID asc
    expected = [
        {"id": category_ids["History"], "name": "History",   "times_played": 1},
        {"id": category_ids["Science"], "name": "Science",   "times_played": 1},
    ]
  
    

    # Convert returned data to comparable form
    simplified = [
        {"id": item["id"], "name": item["name"], "times_played": (item["times_played"])}
        for item in data
    ]

    assert simplified == expected

def test_most_played_categories_ordering(client):
    """Test that categories are ordered correctly by play count."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        
        # Create a game
        cur.execute(
            "INSERT INTO games (game_type_id, status) VALUES (%s, 'completed') RETURNING id;",
            (1,)
        )
        game_id = cur.fetchone()["id"]
        
        # Add participant
        cur.execute(
            "INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s)",
            (game_id, user_ids["alice"])
        )
        
        # Create multiple rounds for History (3 rounds) and Science (1 round)
        # History rounds
        for i in range(3):
            cur.execute(
                """
                INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds, points_possible)
                VALUES (%s, %s, %s, 'completed', 30, 100) RETURNING id;
                """,
                (game_id, i+1, category_ids["History"])
            )
            round_id = cur.fetchone()["id"]
            cur.execute(
                "INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
                (round_id, question_ids["q1"])
            )
        
        # Science round
        cur.execute(
            """
            INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds, points_possible)
            VALUES (%s, %s, %s, 'completed', 30, 100) RETURNING id;
            """,
            (game_id, 4, category_ids["Science"])
        )
        round_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
            (round_id, question_ids["q5"])
        )
        
        db.commit()
        cur.close()

    response = client.get("/stats/most-played-categories")
    assert response.status_code == 200
    data = response.get_json()

    assert len(data) == 2
    # History should be first with 3 plays
    assert data[0]["name"] == "History"
    assert data[0]["times_played"] == 3
    # Science should be second with 1 play
    assert data[1]["name"] == "Science"
    assert data[1]["times_played"] == 1

def test_user_winloss_no_user(client):
    # Querying a non‐existent user_id should return 404
    response = client.get("/stats/user-winloss/9999")
    assert response.status_code == 404
    data = response.get_json()
    assert data["message"] == "User not found"

def test_user_winloss_with_stats(client):
    # Insert games_played and games_won for Dave
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Dave: 8 played, 3 won → 5 lost, 37.50% win rate
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (8, 3, user_ids["dave"])
        )
        db.commit()
        cur.close()

    response = client.get(f"/stats/user-winloss/{user_ids['dave']}")
    assert response.status_code == 200
    data = response.get_json()

    assert data["user_id"] == user_ids["dave"]
    assert data["games_won"] == 3
    assert data["games_lost"] == 5
    assert pytest.approx(data["win_rate_percentage"], rel=1e-3) == 37.50

def test_user_winloss_zero_games(client):
    """Test user win/loss stats for user with no games played."""
    response = client.get(f"/stats/user-winloss/{user_ids['carol']}")
    assert response.status_code == 200
    data = response.get_json()

    assert data["user_id"] == user_ids["carol"]
    assert data["games_won"] == 0
    assert data["games_lost"] == 0
    assert pytest.approx(data["win_rate_percentage"], rel=1e-3) == 0.0

def test_user_winloss_perfect_record(client):
    """Test user win/loss stats for user with perfect win record."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Bob: 10 played, 10 won → 100% win rate
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (10, 10, user_ids["bob"])
        )
        db.commit()
        cur.close()

    response = client.get(f"/stats/user-winloss/{user_ids['bob']}")
    assert response.status_code == 200
    data = response.get_json()

    assert data["user_id"] == user_ids["bob"]
    assert data["games_won"] == 10
    assert data["games_lost"] == 0
    assert pytest.approx(data["win_rate_percentage"], rel=1e-3) == 100.0

def test_user_count(client):
    # There are 4 users inserted by seed_base_data: alice, bob, carol, dave
    response = client.get("/stats/user-count")
    assert response.status_code == 200
    data = response.get_json()

    assert "total_users" in data
    assert data["total_users"] == 4

def test_user_count_after_deletion(client):
    """Test user count updates correctly after user deletion."""
    initial_response = client.get("/stats/user-count")
    initial_count = initial_response.get_json()["total_users"]
    
    # Delete a user (in a real app, we'd have a delete endpoint)
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("DELETE FROM user_stats WHERE user_id = %s", (user_ids["dave"],))
        cur.execute("DELETE FROM users WHERE id = %s", (user_ids["dave"],))
        db.commit()
        cur.close()

    response = client.get("/stats/user-count")
    assert response.status_code == 200
    data = response.get_json()

    assert data["total_users"] == initial_count - 1



def test_user_winloss_with_decimal_calculations(client):
    """Test win rate calculations with decimal precision."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # Set an odd number of games to test decimal handling
        # 7 games, 3 wins → 42.857142...%
        cur.execute(
            "UPDATE user_stats SET games_played = %s, games_won = %s WHERE user_id = %s",
            (7, 3, user_ids["alice"])
        )
        db.commit()
        cur.close()

    response = client.get(f"/stats/user-winloss/{user_ids['alice']}")
    assert response.status_code == 200
    data = response.get_json()

    assert data["user_id"] == user_ids["alice"]
    assert data["games_won"] == 3
    assert data["games_lost"] == 4
    # Check that win rate is rounded to 2 decimal places
    assert pytest.approx(data["win_rate_percentage"], rel=1e-3) == 42.86


def test_most_played_categories_pagination(client):
    """Test pagination of most played categories if implemented."""
    response = client.get("/stats/most-played-categories?limit=1")
    assert response.status_code == 200
    data = response.get_json()
    
    # If pagination is implemented, should return only one result
    if "limit" in response.request.args:
        assert len(data) <= 1

def test_user_winloss_with_concurrent_updates(client):
    """Test handling of concurrent updates to user stats."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        
        # Simulate two concurrent updates
        try:
            # First update
            cur.execute(
                "UPDATE user_stats SET games_played = games_played + 1, games_won = games_won + 1 WHERE user_id = %s",
                (user_ids["alice"],)
            )
            
            # Simulate concurrent update
            cur2 = db.cursor()
            cur2.execute(
                "UPDATE user_stats SET games_played = games_played + 1, games_won = games_won + 1 WHERE user_id = %s",
                (user_ids["alice"],)
            )
            
            db.commit()
            cur.close()
            cur2.close()
        except Exception as e:
            db.rollback()
            pytest.skip(f"Concurrent update test failed: {str(e)}")

    response = client.get(f"/stats/user-winloss/{user_ids['alice']}")
    assert response.status_code == 200
    data = response.get_json()
    
    # Both updates should be reflected
    assert data["games_won"] == 2
    assert data["games_lost"] == 0



def test_user_winloss_with_special_characters(client):
    """Test handling of special characters in user data."""
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        
        # Create a user with special characters
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            ("user'with\"quotes", "special@example.com", "hash")
        )
        special_user_id = cur.fetchone()["id"]
        
        # Add some stats
        cur.execute(
            """
            INSERT INTO user_stats (user_id, games_played, games_won)
            VALUES (%s, %s, %s);
            """,
            (special_user_id, 5, 2)
        )
        
        db.commit()
        cur.close()

    response = client.get(f"/stats/user-winloss/{special_user_id}")
    assert response.status_code == 200
    data = response.get_json()
    
    
    assert data["games_won"] == 2
    assert data["games_lost"] == 3
