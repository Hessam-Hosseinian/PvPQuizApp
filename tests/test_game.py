# tests/test_games_endpoints.py

import pytest
import json
import time
from app.db import get_db
from werkzeug.security import generate_password_hash


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
        # cur.execute("DELETE FROM game_types;")
        cur.execute("DELETE FROM users;")
        db.commit()
        
        cur.close()

def seed_base_data(client):
    """Insert users, categories, questions, choices, and game_types."""
    with client.application.app_context():
        db = get_db()
        # اگر می‌خواهید هنگام fetch کردن به‌صورت دیکشنری کار کنید،
        # از RealDictCursor استفاده کنید. در غیر این صورت کافیست
        # از Cursor پیش‌فرض استفاده کنید و از row[0] برای id بهره ببرید.
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
        global user_ids 
        user_ids = {}  # اگر در آینده لازم شد از این‌ها استفاده کنید
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
            row = cur.fetchone()         # برمی‌گردد مثلاً (5,)
            new_user_id = row["id"]      # عدد id جدید
            user_ids[username] = new_user_id
        
        # ------------------------------------------------------------------
        # ۲) INSERT دسته‌بندی‌ها و ذخیره‌ی idِ هر دسته‌بندی
        # ------------------------------------------------------------------
        categories = [
            ("History", "World history questions"),
            ("Science", "Science-related questions"),
        ]
        global category_ids
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
            row = cur.fetchone()          # مثلاً (3,)
            new_cat_id = row["id"]
            category_ids[name] = new_cat_id

        # ------------------------------------------------------------------
        # ۳) INSERT سوالات و گزینه‌ها برای هر دسته (۴ سؤال در هر دسته)
        # ------------------------------------------------------------------
        # -------------------
        # Category "History"
        # -------------------
        history_id = category_ids["History"]
        created_by_user = user_ids["alice"]  # سازندهٔ سؤالات تاریخ: alice
        global question_ids
        question_ids = {}
        global choice_ids
        choice_ids = {}
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
                VALUES (%s, %s, %s, %s) RETURNING id ;
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


        # ------------------------------------------------------------------
        # ۴) INSERT نوع‌های بازی
        # ------------------------------------------------------------------
        # (همان کد قبلی؛ تغییری نکرده‌ایم)
        # cur.execute(
        #     """
        #     INSERT INTO game_types (name, description, total_rounds)
        #     VALUES
        #       ('duel', 'One-on-one quiz', 5),
        #       ('group', 'Multiplayer quiz', 10);
        #     """
        # )

        # ------------------------------------------------------------------
        # ۵) COMMIT و بستن کرسر
        # ------------------------------------------------------------------
        db.commit()
        
        cur.close()




@pytest.fixture(autouse=True)
def setup_and_teardown(client):
    clear_tables(client)
    seed_base_data(client)
    yield
    clear_tables(client)


def test_enqueue_and_match_duel(client):
    

    # Alice enqueues for duel
    response1 = client.post(
        "/games/queue",
        data=json.dumps({"user_id": user_ids["alice"], "game_type_id": 1}),
        content_type="application/json"
    )
    
    assert response1.status_code == 200
    data1 = response1.get_json()
  
    assert data1["message"] == "Enqueued for matching"
    assert "queue_id" in data1
    
    # Bob enqueues; should match with Alice and create game
    response2 = client.post(
        "/games/queue",
        data=json.dumps({"user_id": user_ids["bob"], "game_type_id": 1}),
        content_type="application/json"
    )
    
    assert response2.status_code == 201
    data2 = response2.get_json()
    assert data2["message"] == "Matched and game created"

    assert "game_id" in data2
    assert set(data2["players"]) == {user_ids["alice"], user_ids["bob"]}
    
    # Ensure match_queue is empty now
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM match_queue;")
        count = cur.fetchone()
        
        cur.close()
    assert count['count'] == 0


def test_send_and_accept_invitation(client):
    # Alice invites Carol
    response1 = client.post(
        "/games/invite",
        data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["carol"]}),
        content_type="application/json"
    )
    
    assert response1.status_code == 201
   
    data1 = response1.get_json()
    assert data1["message"] == "Invitation sent"
    inv_id = data1["invitation_id"]
    
    # Carol accepts
    response2 = client.post(
        "/games/invite/respond",
        data=json.dumps({"invitation_id": inv_id, "invitee_id": user_ids["carol"], "action": "accept"}),
        content_type="application/json"
    )

    assert response2.status_code == 201
    data2 = response2.get_json()
    assert data2["message"] == "Invitation accepted, game created"
    assert set(data2["players"]) == {user_ids["alice"], user_ids["carol"]}
    game_id = data2["game_id"]

    # Verify game and participants
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT status FROM games WHERE id = %s;", (game_id,))
        status = cur.fetchone()['status']
        assert status == "pending"
        cur.execute("SELECT user_id FROM game_participants WHERE game_id = %s;", (game_id,))
        participants = {row['user_id'] for row in cur.fetchall()}
        assert participants == {user_ids["alice"], user_ids["carol"]}
        cur.close()


def test_start_duel_game_creates_rounds(client):
    # Manually create duel game with Alice and Bob
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'pending') RETURNING id;")
        game_id = cur.fetchone()['id']
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        db.commit()
        cur.close()

    # Start the game
    response = client.post(f"/games/{game_id}/start")
    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Game started"
    assert data["total_rounds"] == 5

    # Verify 5 rounds created with pending status and NULL category
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM game_rounds WHERE game_id = %s;", (game_id,))
        count = cur.fetchone()['count']
        assert count == 5
        cur.execute("SELECT status, category_id FROM game_rounds WHERE game_id = %s;", (game_id,))
        for row in cur.fetchall():
            assert row['status'] == "pending"
            assert row['category_id'] is None
        cur.close()


def test_pick_category_and_assign_questions_for_round(client):
    # Setup: create game, participants, and one round
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # create game
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()['id']
        # participants
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        # one round with round_number=1, pending status
        cur.execute("""
            INSERT INTO game_rounds (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
            VALUES (%s, 1, NULL, NULL, 'pending', 30, 100);
        """, (game_id,))
        db.commit()
        cur.close()

    # Alice picks category=1 (History) for round 1
    response = client.post(
        f"/games/{game_id}/rounds/1/pick_category",
        data=json.dumps({"user_id": user_ids["alice"], "category_id": category_ids["History"]}),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Category picked and questions assigned"
    assert "round_id" in data
    # assert len(data["question_ids"]) == 3

    # Verify that game_rounds status changed to active and category_id set
    round_id = data["round_id"]
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT status, category_id, category_picker_id FROM game_rounds WHERE id = %s;", (round_id,))
        rnd = cur.fetchone()
        
        assert rnd['status'] == "active"
        assert rnd['category_id'] == category_ids["History"]
        assert rnd['category_picker_id'] == user_ids["alice"]
        # verify 3 questions related
        cur.execute("SELECT COUNT(*) FROM game_round_questions WHERE game_round_id = %s;", (round_id,))
        cnt = cur.fetchone()
        # assert cnt['count'] == 3
        cur.close()


def test_submit_answer_and_complete_round_and_game_duel(client):
    # Setup: create game, participants, and one active round with 3 questions
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # game
        
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        
        game_id = cur.fetchone()['id']
        # participants
        cur.execute("INSERT INTO game_participants (game_id, user_id, score) VALUES "
                    "(%s, %s, 0), (%s, %s, 0);", (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        # round
        
        cur.execute("""
            INSERT INTO game_rounds (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
            VALUES (%s, 1, %s, %s, 'active', 30, 100) RETURNING id;
        """, (game_id, category_ids["History"], user_ids["alice"]))
       
        round_id = cur.fetchone()['id']
        # choose specific questions for consistency: question_id = 1, 2, fallback 1 if not enough
        cur.execute("SELECT id FROM questions WHERE category_id = %s AND is_verified = TRUE LIMIT 3;", (category_ids["History"],))
        qrows = cur.fetchall()
        
   
        selected_qs = [qrows[i]['id'] if i < len(qrows) else qrows[0]['id'] for i in range(3)]
        
        for qid in selected_qs:
            cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
                        (round_id, qid))
        db.commit()
        
       
        cur.close()
    
    # Each participant answers 3 questions
    for user_id in (user_ids["alice"], user_ids["bob"]):
       
        for question_id in selected_qs:
            # find correct choice for question
            with client.application.app_context():
                db = get_db()
                cur = db.cursor()
                cur.execute(
                    "SELECT id FROM question_choices WHERE question_id = %s AND is_correct = TRUE LIMIT 1;",
                    (question_id,)
                )
                correct_choice = cur.fetchone()['id']
                cur.close()
                
            response = client.post(
                f"/games/{game_id}/rounds/1/answer",
                data=json.dumps({
                    "user_id": user_id,
                    "question_id": question_id,
                    "choice_id": correct_choice,
                    "response_time_ms": 500
                }),
                content_type="application/json"
            )
            assert response.status_code == 200
            rd = response.get_json()
            assert "is_correct" in rd and rd["is_correct"] is True
            assert "points_earned" in rd and rd["points_earned"] == 100

    # Attempt to complete round before all answers (should be done now: 2 players × 3 questions = 6)
    response_complete = client.post(f"/games/{game_id}/rounds/1/complete")
    assert response_complete.status_code == 200
    dc = response_complete.get_json()
    assert dc["message"] == "Round 1 completed"

    # Create remaining 4 rounds to simulate all 5 rounds completion
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        for r in range(2, 6):
            cur.execute("""
                INSERT INTO game_rounds (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                VALUES (%s, %s, %s, %s, 'completed', 30, 100);
            """, (game_id, r, category_ids["History"], user_ids["alice"]))
        db.commit()
        cur.close()
    # Complete game
    
    response_game_complete = client.post(f"/games/{game_id}/complete")


    assert response_game_complete.status_code == 200
    gd = response_game_complete.get_json()
    assert gd["message"] == "Game completed"
    assert gd["winner_id"] in (user_ids["alice"], user_ids["bob"])
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT status, winner_id FROM games WHERE id = %s;", (game_id,))
        data = cur.fetchone()
        status, winner_id_db = data['status'], data['winner_id']
        assert status == "completed"
       
        assert winner_id_db == gd["winner_id"]
        cur.close()
# -------------------------------------------------------------------------------------------

def test_create_and_complete_group_game(client):
    # Create group game with Alice, Bob, Carol
    response = client.post(
        "/games",
        data=json.dumps({
            "game_type_id": 2,
            "creator_id": user_ids["alice"],
            "participant_ids": [user_ids["bob"], user_ids["carol"], user_ids["alice"]]
        }),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Group game created and started"
    game_id = data["game_id"]
    total_rounds = data["total_rounds"]
    assert total_rounds == 10

    # with client.application.app_context():
    #     db = get_db()
    #     cur = db.cursor()
    #     cur.execute("Update games set status = 'active' where id = %s;", (game_id,))
    #     db.commit()
    #     cur.close()

  
    # Assign categories and questions
    response_assign = client.post(f"/games/{game_id}/assign_categories")
  
    assert response_assign.status_code == 200
    assigned = response_assign.get_json()["assigned_rounds"]
    assert len(assigned) == 10

    # Each participant answers each round's single question
    for r_info in assigned:
       
        round_id = r_info["round_id"]
        question_id = r_info["question_id"]
        for user_id in (user_ids["alice"], user_ids["bob"], user_ids["carol"]):
            # get correct choice
            with client.application.app_context():
                db = get_db()
                cur = db.cursor()
                cur.execute(
                    "SELECT id FROM question_choices WHERE question_id = %s AND is_correct = TRUE LIMIT 1;",
                    (question_id,)
                )
                correct_choice = cur.fetchone()['id']
                cur.close()

            response_ans = client.post(
                f"/games/{game_id}/rounds/{r_info['round_number']}/answer",
                data=json.dumps({
                    "user_id": user_id,
                    "question_id": question_id,
                    "choice_id": correct_choice,
                    "response_time_ms": 400
                }),
                content_type="application/json"
            )
            # assert response_ans.status_code == 200
            ans_data = response_ans.get_json()
            
            assert ans_data["is_correct"] is True
        
        # Complete this round

        response_complete = client.post(f"/games/{game_id}/rounds/{r_info['round_number']}/complete")
    
        assert response_complete.status_code == 200

    # Now complete the group game
    response_group_complete = client.post(f"/games/{game_id}/complete_group")
    assert response_group_complete.status_code == 200
    gd = response_group_complete.get_json()
    assert gd["message"] == "Group game completed"
    assert "winner_id" in gd

    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT status, winner_id FROM games WHERE id = %s;", (game_id,))
        data = cur.fetchone()
        status, winner_id_db = data['status'], data['winner_id']
        assert status == "completed"
        assert winner_id_db == gd["winner_id"]
        cur.close()


def test_enqueue_invalid_user(client):
    """Test enqueueing with invalid user ID"""
    response = client.post(
        "/games/queue",
        data=json.dumps({"user_id": 999, "game_type_id": 1}),
        content_type="application/json"
    )
    assert response.status_code == 404
    data = response.get_json()
    
    assert "error" in data
    assert "not found" in data["error"].lower()


def test_enqueue_invalid_game_type(client):
    """Test enqueueing with invalid game type"""
    response = client.post(
        "/games/queue",
        data=json.dumps({"user_id": 1, "game_type_id": 999}),
        content_type="application/json"
    )
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert "not found" in data["error"].lower()


def test_enqueue_same_user_twice(client):
    """Test that same user cannot be enqueued twice"""
    # First enqueue
    response1 = client.post(
        "/games/queue",
        data=json.dumps({"user_id": user_ids["alice"], "game_type_id": 1}),
        content_type="application/json"
    )
    assert response1.status_code == 200

    # Try to enqueue same user again
    response2 = client.post(
        "/games/queue",
        data=json.dumps({"user_id": user_ids["alice"], "game_type_id": 1}),
        content_type="application/json"
    )
    assert response2.status_code == 400
    data = response2.get_json()
    
    assert "error" in data
    assert "already in queue" in data["error"].lower()


def test_invite_invalid_user(client):
    """Test sending invitation to invalid user"""
    response = client.post(
        "/games/invite",
        data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": 999}),
        content_type="application/json"
    )
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert "not found" in data["error"].lower()


def test_invite_self(client):
    """Test that user cannot invite themselves"""
    response = client.post(
        "/games/invite",
        data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["alice"]}),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "cannot invite yourself" in data["error"].lower()


def test_invite_already_invited(client):
    """Test that same user cannot be invited twice"""
    # First invitation
    response1 = client.post(
        "/games/invite",
        data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["bob"]}),
        content_type="application/json"
    )
    assert response1.status_code == 201

    # Second invitation
    response2 = client.post(
        "/games/invite",
        data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["bob"]}),
        content_type="application/json"
    )
    assert response2.status_code == 400
    data = response2.get_json()
    assert "error" in data
    assert "already invited" in data["error"].lower()


def test_reject_invitation(client):
    """Test rejecting a game invitation"""
    # Send invitation
    response1 = client.post(
        "/games/invite",
        data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["bob"]}),
        content_type="application/json"
    )
    inv_id = response1.get_json()["invitation_id"]

    # Reject invitation
    response2 = client.post(
        "/games/invite/respond",
        data=json.dumps({"invitation_id": inv_id, "invitee_id": user_ids["bob"], "action": "reject"}),
        content_type="application/json"
    )
    assert response2.status_code == 200
    data = response2.get_json()
    assert data["message"] == "Invitation rejected"

    # Verify invitation is deleted
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM game_invitations WHERE id = %s;", (inv_id,))
        count = cur.fetchone()["count"]
        assert count == 0
        cur.close()


def test_invalid_round_category(client):
    """Test picking invalid category for round"""
    # Setup game and round
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        cur.execute("""
            INSERT INTO game_rounds (game_id, round_number, status)
            VALUES (%s, 1, 'pending');
        """, (game_id,))
        db.commit()
        cur.close()

    # Try to pick invalid category
    response = client.post(
        f"/games/{game_id}/rounds/1/pick_category",
        data=json.dumps({"user_id": user_ids["alice"], "category_id": 999}),
        content_type="application/json"
    )
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert "category not found" in data["error"].lower()


def test_answer_timeout(client):
    """Test submitting answer after time limit"""
    
    # Setup game with short time limit
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        
        game_id = cur.fetchone()["id"]
        
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        cur.execute("""
            INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds)
            VALUES (%s, 1, %s, 'active', 1) RETURNING id;
        """, (game_id, category_ids["History"]))
        round_id = cur.fetchone()["id"]
        
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
                    (round_id, question_ids["q1"]))
        db.commit()
        cur.close()

    # Wait for time limit to expire
    time.sleep(2)
   
    # Try to submit answer
    response = client.post(
        f"/games/{game_id}/rounds/1/answer",
        data=json.dumps({
            "user_id": user_ids["alice"],
            "question_id": question_ids["q1"],
            "choice_id": choice_ids["q1_cA"],
            "response_time_ms": 2500
        }),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

    assert "time limit" in data["error"].lower()


def test_double_answer_attempt(client):
    """Test that user cannot answer same question twice"""
    # Setup game and round with question
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        cur.execute("""
            INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds)
            VALUES (%s, 1, %s, 'active', 30) RETURNING id;
        """, (game_id, category_ids["History"]))
        round_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
                    (round_id, question_ids["q1"]))
        db.commit()
        cur.close()
  
    # First answer
    response1 = client.post(
        f"/games/{game_id}/rounds/1/answer",
        data=json.dumps({
            "user_id": user_ids["alice"],
            "question_id": question_ids["q1"],
            "choice_id": choice_ids["q1_cA"],
            "response_time_ms": 500
        }),
        content_type="application/json"
    )
  
    assert response1.status_code == 200

    # Try to answer again
    response2 = client.post(
        f"/games/{game_id}/rounds/1/answer",
        data=json.dumps({
            "user_id": user_ids["alice"],
            "question_id": question_ids["q1"],
            "choice_id": choice_ids["q1_cB"],
            "response_time_ms": 1000
        }),
        content_type="application/json"
    )
   
    assert response2.status_code == 400
    data = response2.get_json()
    assert "error" in data
    assert "already answered" in data["error"].lower()


def test_complete_round_early(client):
    """Test completing round before all answers are submitted"""
    # Setup game with one round
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        cur.execute("""
            INSERT INTO game_rounds (game_id, round_number, category_id, status)
            VALUES (%s, 1, %s, 'active') RETURNING id;
        """, (game_id, category_ids["History"]))
        round_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s);",
                    (round_id, question_ids["q1"]))
        db.commit()
        cur.close()

    # Try to complete round before answers
    response = client.post(f"/games/{game_id}/rounds/1/complete")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "not all answers submitted" in data["error"].lower()


def test_complete_game_with_pending_rounds(client):
    """Test completing game with pending rounds"""
    # Setup game with pending rounds
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);",
                    (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        for r in range(1, 6):
            cur.execute("""
                INSERT INTO game_rounds (game_id, round_number, status)
                VALUES (%s, %s, 'pending');
            """, (game_id, r))
        db.commit()
        cur.close()

    # Try to complete game
    response = client.post(f"/games/{game_id}/complete")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "pending rounds" in data["error"].lower()


# ==============================================
# Additional tests to catch edge cases / bugs
# ==============================================

def test_enqueue_missing_fields(client):
    """Test enqueue endpoint with missing user_id or game_type_id"""
    # Missing both
    response = client.post("/games/queue", data=json.dumps({}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    # Missing game_type_id
    response2 = client.post("/games/queue", data=json.dumps({"user_id": user_ids["alice"]}), content_type="application/json")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2
    # Missing user_id
    response3 = client.post("/games/queue", data=json.dumps({"game_type_id": 1}), content_type="application/json")
    assert response3.status_code == 400
    data3 = response3.get_json()
    assert "error" in data3


def test_send_invitation_missing_fields_and_invalid_inviter(client):
    """Test invitation endpoint with missing fields and inviter not found"""
    # Missing both fields
    response = client.post("/games/invite", data=json.dumps({}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

    # Missing invitee_id
    response2 = client.post("/games/invite", data=json.dumps({"inviter_id": 1}), content_type="application/json")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2

    # Inviter not found
    response3 = client.post("/games/invite", data=json.dumps({"inviter_id": 999, "invitee_id": 2}), content_type="application/json")
    assert response3.status_code == 404
    data3 = response3.get_json()
    assert "error" in data3
    assert "user 999 not found" in data3["error"].lower()


def test_send_invitation_invitee_in_game_or_queue(client):
    """Test that sending an invitation fails if invitee is already in a game or in queue"""
    # Put Carol into queue
    client.post("/games/queue", data=json.dumps({"user_id": user_ids["carol"], "game_type_id": 1}), content_type="application/json")
    # Now Alice tries to invite Carol
    response = client.post("/games/invite", data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["carol"]}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "invitee currently in match queue" in data["error"].lower()

    # Clear queue and put Carol into a game
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # create a pending game and add Carol
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'pending') RETURNING id;")
        g_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s);", (g_id, user_ids["carol"]))
        db.commit()
        cur.close()
    # Now Alice tries to invite Carol again
    response2 = client.post("/games/invite", data=json.dumps({"inviter_id": user_ids["alice"], "invitee_id": user_ids["carol"]}), content_type="application/json")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2
    assert "invitee currently in another game" in data2["error"].lower()


def test_respond_invitation_missing_fields_and_errors(client):
    """Test respond endpoint with missing fields, invitation not found, and invitee mismatch"""
    # Missing all
    response = client.post("/games/invite/respond", data=json.dumps({}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

    # Invitation ID not found
    response2 = client.post("/games/invite/respond", data=json.dumps({"invitation_id": 999, "invitee_id": user_ids["alice"], "action": "accept"}), content_type="application/json")
    assert response2.status_code == 404
    data2 = response2.get_json()
    assert "error" in data2

    # Create a valid invitation to test mismatch
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO game_invitations (inviter_id, invitee_id, status) VALUES (%s, %s, 'pending') RETURNING id;", (user_ids["alice"], user_ids["bob"]))
        inv_id = cur.fetchone()["id"]
        db.commit()
        cur.close()
    # Wrong invitee_id
    response3 = client.post("/games/invite/respond", data=json.dumps({"invitation_id": inv_id, "invitee_id": user_ids["carol"], "action": "accept"}), content_type="application/json")
    assert response3.status_code == 403
    data3 = response3.get_json()
    assert "error" in data3
    assert "invitee mismatch" in data3["error"].lower()

    # Already responded invitation
    # First accept properly
    response4 = client.post("/games/invite/respond", data=json.dumps({"invitation_id": inv_id, "invitee_id": user_ids["bob"], "action": "accept"}), content_type="application/json")
    assert response4.status_code == 201
    # Try to accept again
    response5 = client.post("/games/invite/respond", data=json.dumps({"invitation_id": inv_id, "invitee_id": user_ids["bob"], "action": "accept"}), content_type="application/json")
    assert response5.status_code == 400
    data5 = response5.get_json()
    assert "error" in data5
    assert "invitation already accepted" in data5["error"].lower()


def test_start_duel_game_errors(client):
    """Test start game endpoint with nonexistent game and invalid status"""
    # Nonexistent game
    response = client.post("/games/999/start")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data

    # Create a game with status 'active' and try to start again
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        active_game_id = cur.fetchone()["id"]
        db.commit()
        cur.close()
    response2 = client.post(f"/games/{active_game_id}/start")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2


def test_pick_category_errors(client):
    """Test pick category endpoint with various invalid scenarios"""
    # Missing fields
    response = client.post("/games/1/rounds/1/pick_category", data=json.dumps({}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

    # Game not found
    response2 = client.post("/games/999/rounds/1/pick_category", data=json.dumps({"user_id": user_ids["alice"], "category_id": category_ids["History"]}), content_type="application/json")
    assert response2.status_code == 404
    data2 = response2.get_json()
    assert "error" in data2

    # Create game but don't add participants, try to pick category
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_rounds (game_id, round_number, status) VALUES (%s, 1, 'pending');", (game_id,))
        db.commit()
        cur.close()
    # User 3 is not a participant
    response3 = client.post(f"/games/{game_id}/rounds/1/pick_category", data=json.dumps({"user_id": user_ids["carol"], "category_id": category_ids["History"]}), content_type="application/json")
    assert response3.status_code == 403
    data3 = response3.get_json()
    assert "error" in data3
    assert "not a participant" in data3["error"].lower()

    # Add participant but set round status to 'active', then try to pick
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s);", (game_id, user_ids["alice"]))
        cur.execute("UPDATE game_rounds SET status = 'active' WHERE game_id = %s AND round_number = 1;", (game_id,))
        db.commit()
        cur.close()
    response4 = client.post(f"/games/{game_id}/rounds/1/pick_category", data=json.dumps({"user_id": user_ids["alice"], "category_id": category_ids["History"]}), content_type="application/json")
    assert response4.status_code == 400
    data4 = response4.get_json()
    assert "error" in data4
    assert "cannot pick category in round status active" in data4["error"].lower()


def test_submit_answer_errors(client):
    """Test submit answer endpoint with various invalid scenarios"""
    # Missing fields
    response = client.post("/games/1/rounds/1/answer", data=json.dumps({}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

    # Game not found
    response2 = client.post("/games/999/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q1"], "choice_id": choice_ids["q1_cA"]}), content_type="application/json")
    assert response2.status_code == 404
    data2 = response2.get_json()
    assert "error" in data2

    # Setup a pending game and try to answer
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'pending') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_rounds (game_id, round_number, category_id, status) VALUES (%s, 1, %s, 'active');", (game_id, category_ids["History"]))
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s);", (game_id, user_ids["alice"]))
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES ((SELECT id FROM game_rounds WHERE game_id = %s AND round_number = 1), %s);", (game_id, question_ids["q1"]))
        db.commit()
        cur.close()
    # Game is not active
    response3 = client.post(f"/games/{game_id}/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q1"], "choice_id": choice_ids["q1_cA"]}), content_type="application/json")
    assert response3.status_code == 400
    data3 = response3.get_json()
    assert "error" in data3
    assert "game is not active" in data3["error"].lower()

    # Activate game but remove round to test round not found
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("UPDATE games SET status = 'active' WHERE id = %s;", (game_id,))
        cur.execute("DELETE FROM game_rounds WHERE game_id = %s;", (game_id,))
        db.commit()
        cur.close()
    response4 = client.post(f"/games/{game_id}/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q1"], "choice_id": choice_ids["q1_cA"]}), content_type="application/json")
    assert response4.status_code == 404
    data4 = response4.get_json()
    assert "error" in data4
    assert "round not found" in data4["error"].lower()

    # Recreate round but set status to 'pending' to test "Round is not active"
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO game_rounds (game_id, round_number, category_id, status, time_limit_seconds, points_possible) VALUES (%s, 1, %s, 'pending', 30, 100);", (game_id, category_ids["History"]))
        db.commit()
        cur.close()
    response5 = client.post(f"/games/{game_id}/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q1"], "choice_id": choice_ids["q1_cA"]}), content_type="application/json")
    assert response5.status_code == 400
    data5 = response5.get_json()
    assert "error" in data5
    assert "round is not active" in data5["error"].lower()

    # Activate round but user not participant
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("UPDATE game_rounds SET status = 'active', start_time = NOW() WHERE game_id = %s AND round_number = 1;", (game_id,))
        cur.execute("DELETE FROM game_participants WHERE game_id = %s AND user_id = %s;", (game_id, user_ids["alice"]))
        db.commit()
        cur.close()
    response6 = client.post(f"/games/{game_id}/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q1"], "choice_id": choice_ids["q1_cA"]}), content_type="application/json")
    assert response6.status_code == 403
    data6 = response6.get_json()
    assert "error" in data6
    assert "user not active participant" in data6["error"].lower()

    # Add participant back and test question not in this round
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # re-add participant
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s);", (game_id, user_ids["alice"]))
        # ensure no question matches that ID
        cur.execute("DELETE FROM game_round_questions WHERE game_round_id = (SELECT id FROM game_rounds WHERE game_id = %s AND round_number = 1);", (game_id,))
        db.commit()
        cur.close()
    response7 = client.post(f"/games/{game_id}/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q2"], "choice_id": choice_ids["q2_cB"], "response_time_ms": 200}), content_type="application/json")
    assert response7.status_code == 400
    data7 = response7.get_json()
    assert "error" in data7
    assert "question not found in this round" in data7["error"].lower()
    # Insert a question into round but send invalid choice_id
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES ((SELECT id FROM game_rounds WHERE game_id = %s AND round_number = 1), %s);", (game_id, question_ids["q1"]))
        db.commit()
        cur.close()

    response8 = client.post(f"/games/{game_id}/rounds/1/answer", data=json.dumps({"user_id": user_ids["alice"], "question_id": question_ids["q1"], "choice_id": 213312312, "response_time_ms": 200}), content_type="application/json")
    
    assert response8.status_code == 400
    data8 = response8.get_json()
    assert "error" in data8
    assert "invalid choice for this question" in data8["error"].lower()


def test_complete_round_not_found_and_invalid_state(client):
    """Test complete round endpoint with nonexistent round and invalid conditions"""
    
    # Round not found
    response = client.post(f"/games/99999/rounds/1/complete")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert "round not found" in data["error"].lower()

    # Create game and round but do not insert any answers or participants to test early completion
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        game_id = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s);", (game_id, user_ids["alice"], game_id, user_ids["bob"]))
        cur.execute("INSERT INTO game_rounds (game_id, round_number, category_id, status) VALUES (%s, 1, %s, 'active');", (game_id, category_ids["History"]))
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES ((SELECT id FROM game_rounds WHERE game_id = %s AND round_number = 1), %s);", (game_id, question_ids["q1"]))
        db.commit()
        cur.close()

    response2 = client.post(f"/games/{game_id}/rounds/1/complete")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2
    assert "not all answers submitted" in data2["error"].lower()


def test_complete_duel_game_errors(client):
    """Test complete duel game endpoint with nonexistent game and invalid status"""
    # Nonexistent game
    response = client.post("/games/99999/complete")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data

    # Create a game but status != active
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'pending') RETURNING id;")
        g_id = cur.fetchone()["id"]
        db.commit()
        cur.close()
        response2 = client.post(f"/games/{g_id}/complete")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2


def test_create_group_game_errors(client):
    """Test create group game endpoint with missing fields, invalid creator, invalid participants"""
    # Missing fields
    response = client.post("/games", data=json.dumps({}), content_type="application/json")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

    # Invalid creator
    response2 = client.post("/games", data=json.dumps({"game_type_id": 2, "creator_id": 999, "participant_ids": [user_ids["alice"], user_ids["bob"]]}), content_type="application/json")
    assert response2.status_code == 404
    data2 = response2.get_json()
    assert "error" in data2
    assert "user 999 not found" in data2["error"].lower()

    # Participants list too short
    response3 = client.post("/games", data=json.dumps({"game_type_id": 2, "creator_id": user_ids["alice"], "participant_ids": [user_ids["bob"]]}), content_type="application/json")
    assert response3.status_code == 400
    data3 = response3.get_json()
    assert "error" in data3

    # One participant invalid
    response4 = client.post("/games", data=json.dumps({"game_type_id": 2, "creator_id": user_ids["alice"], "participant_ids": [user_ids["bob"], 999]}), content_type="application/json")
    assert response4.status_code == 404
    data4 = response4.get_json()
    assert "error" in data4
    assert "user 999 not found" in data4["error"].lower()


def test_assign_categories_group_errors(client):
    """Test assign categories endpoint with nonexistent game and invalid status"""
    # Game not found
    response = client.post("/games/999/assign_categories")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data

    # Create a game in pending status, try to assign
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'pending') RETURNING id;")
        g_id = cur.fetchone()["id"]
        db.commit()
        cur.close()
    response2 = client.post(f"/games/{g_id}/assign_categories")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2
    assert "game is not active" in data2["error"].lower()


def test_complete_group_game_errors(client):
    """Test complete group game endpoint with nonexistent game, invalid status, and incomplete rounds"""
    # Game not found
    response = client.post("/games/999/complete_group")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data

    # Create a game in pending status, try to complete
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'pending') RETURNING id;")
        g_id = cur.fetchone()["id"]
        db.commit()
        cur.close()
    response2 = client.post(f"/games/{g_id}/complete_group")
    assert response2.status_code == 400
    data2 = response2.get_json()
    assert "error" in data2
    assert "cannot complete game in status pending" in data2["error"].lower()

    # Create an active group game but with incomplete rounds
    with client.application.app_context():
        db = get_db()
        cur = db.cursor()
        # create game and participants
        cur.execute("INSERT INTO games (game_type_id, status) VALUES (1, 'active') RETURNING id;")
        g_id2 = cur.fetchone()["id"]
        cur.execute("INSERT INTO game_participants (game_id, user_id) VALUES (%s, %s), (%s, %s), (%s, %s);", (g_id2, user_ids["alice"], g_id2, user_ids["bob"], g_id2, user_ids["carol"]))
        # insert only one round active but not completed
        cur.execute("INSERT INTO game_rounds (game_id, round_number, category_id, status) VALUES (%s, 1, %s, 'active');", (g_id2, category_ids["History"]))
        cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES ((SELECT id FROM game_rounds WHERE game_id = %s AND round_number = 1), %s);", (g_id2, question_ids["q1"]))
        db.commit()
        cur.close()
    response3 = client.post(f"/games/{g_id2}/complete_group")
    assert response3.status_code == 400
    data3 = response3.get_json()
    assert "error" in data3
    assert "not all rounds completed" in data3["error"].lower()
