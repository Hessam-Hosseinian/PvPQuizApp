# app/routes/games_bp.py

import time
from flask import Blueprint, request, jsonify, abort
from app.db import get_db, query_db, modify_db
import psycopg2
import random
from datetime import datetime, timedelta

games_bp = Blueprint("games_bp", __name__, url_prefix="/games")


@games_bp.route("/queue", methods=["POST"])
def enqueue_for_duel():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    game_type_id = data.get("game_type_id")
    if not user_id or not game_type_id:
        return jsonify({"error": "Missing user_id or game_type_id"}), 400

    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود کاربر
    cur.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {user_id} not found"}), 404

    # 2. بررسی نوع بازی
    cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id,))
    gt = cur.fetchone()
    if not gt:
        cur.close()
        return jsonify({"error": f"GameType {game_type_id} not found"}), 404

    # 3. بررسی اینکه کاربر در حال حاضر در صف نباشد
    cur.execute("SELECT 1 FROM match_queue WHERE user_id = %s AND game_type_id = %s", (user_id, game_type_id))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "User already in queue"}), 400

    # 4. درج در صف انتظار
    try:
        cur.execute("""
            INSERT INTO match_queue (user_id, game_type_id)
            VALUES (%s, %s)
            RETURNING id, enqueued_at
        """, (user_id, game_type_id))
        queue_entry = cur.fetchone()
        
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 400

    # 5. جستجوی هم‌جنس در صف: (یعنی کاربر دیگری با همین game_type_id)
    cur.execute("""
        SELECT id, user_id 
        FROM match_queue 
        WHERE game_type_id = %s AND user_id <> %s
        ORDER BY enqueued_at ASC
        LIMIT 1
    """, (game_type_id, user_id))
    match_row = cur.fetchone()
    

    if match_row:
        other_queue_id, other_user_id = match_row['id'], match_row['user_id']
        try:
            # ایجاد رکورد جدید در games
            cur.execute("""
                INSERT INTO games (game_type_id, status)
                VALUES (%s, 'pending')
                RETURNING id
            """, (game_type_id,))
            new_game_id = cur.fetchone()["id"]
            
            # حذف دو نفر از صف
            cur.execute(
                "DELETE FROM match_queue WHERE id IN (%s, %s)",
                (queue_entry["id"], other_queue_id)
            )
            

            # درج در game_participants
            cur.execute("""
                INSERT INTO game_participants (game_id, user_id)
                VALUES (%s, %s), (%s, %s)
            """, (new_game_id, user_id, new_game_id, other_user_id))

            conn.commit()
        except psycopg2.Error as e:
            conn.rollback()
            cur.close()
            return jsonify({"error": str(e)}), 500

        cur.close()
        return jsonify({
            "message": "Matched and game created",
            "game_id": new_game_id,
            "players": [user_id, other_user_id]
        }), 201

    cur.close()
    return jsonify({
        "message": "Enqueued for matching",
        "queue_id": queue_entry["id"],
        "enqueued_at": queue_entry["enqueued_at"].isoformat()
    }), 200


@games_bp.route("/invite", methods=["POST"])
def send_invitation():
    data = request.get_json() or {}
    inviter_id = data.get("inviter_id")
    invitee_id = data.get("invitee_id")
    if not inviter_id or not invitee_id:
        return jsonify({"error": "Missing inviter_id or invitee_id"}), 400
    if inviter_id == invitee_id:
        return jsonify({"error": "Cannot invite yourself"}), 400

    conn = get_db()
    cur = conn.cursor()
    
    # 1. بررسی وجود inviter و invitee
    cur.execute("SELECT 1 FROM users WHERE id = %s", (inviter_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {inviter_id} not found"}), 404
    cur.execute("SELECT 1 FROM users WHERE id = %s", (invitee_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {invitee_id} not found"}), 404

    # 2. بررسی این‌که invitee در یک بازی فعال یا صف انتظار نباشد
    cur.execute("""
        SELECT 1 
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.id
        WHERE gp.user_id = %s AND g.status IN ('pending','active')
    """, (invitee_id,))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Invitee currently in another game"}), 400

    cur.execute("SELECT 1 FROM match_queue WHERE user_id = %s", (invitee_id,))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Invitee currently in match queue"}), 400

    # 3. بررسی اینکه دعوت‌نامه‌ی درحال انتظار مشابه وجود نداشته باشد
    cur.execute("""
        SELECT 1 
        FROM game_invitations 
        WHERE inviter_id = %s AND invitee_id = %s AND status = 'pending'
    """, (inviter_id, invitee_id))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Already invited"}), 400

    # 4. درج دعوت‌نامه
    try:
        cur.execute("""
            INSERT INTO game_invitations (inviter_id, invitee_id, status)
            VALUES (%s, %s, 'pending')
            RETURNING id, created_at
        """, (inviter_id, invitee_id))
        inv_row = cur.fetchone()
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Invitation sent",
        "invitation_id": inv_row['id'   ],
        "created_at": inv_row['created_at'].isoformat()
    }), 201


@games_bp.route("/invite/respond", methods=["POST"])
def respond_to_invitation():
    data = request.get_json() or {}
    inv_id = data.get("invitation_id")
    invitee_id = data.get("invitee_id")
    action = data.get("action")  # "accept", "decline", or "reject"

    if not inv_id or not invitee_id or action not in ("accept", "decline", "reject"):
        return jsonify({"error": "Missing or invalid fields"}), 400

    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود دعوت‌نامه و تطبیق invitee
    cur.execute("""
        SELECT inviter_id, invitee_id, status 
        FROM game_invitations
        WHERE id = %s
    """, (inv_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Invitation not found"}), 404
    
    inviter_id_db, invitee_id_db, status_db = row['inviter_id'], row['invitee_id'], row['status']
    if invitee_id_db != invitee_id:
        cur.close()
        return jsonify({"error": "Invitee mismatch"}), 403
    if status_db != 'pending':
        cur.close()
        return jsonify({"error": f"Invitation already {status_db}"}), 400

    # 2. رد دعوت‌نامه
    if action in ("decline", "reject"):
        try:
            cur.execute("DELETE FROM game_invitations WHERE id = %s", (inv_id,))
            conn.commit()
        except psycopg2.Error as e:
            conn.rollback()
            cur.close()
            return jsonify({"error": str(e)}), 500

        cur.close()
        return jsonify({"message": "Invitation rejected"}), 200

    # action == "accept"
    try:
        # تغییر وضعیت دعوت‌نامه به 'accepted'
        cur.execute("""
            UPDATE game_invitations
            SET status = 'accepted'
            WHERE id = %s
        """, (inv_id,))

        # ایجاد بازی دو نفره (فرض game_type_id = 1 برای duel)
        cur.execute("""
            INSERT INTO games (game_type_id, status)
            VALUES (1, 'pending')
            RETURNING id
        """)
        new_game_id = cur.fetchone()['id']

        # درج هر دو شرکت‌کننده
        cur.execute("""
            INSERT INTO game_participants (game_id, user_id)
            VALUES (%s, %s), (%s, %s)
        """, (new_game_id, inviter_id_db, new_game_id, invitee_id_db))

        # بروزرسانی game_id در invitation
        cur.execute("""
            UPDATE game_invitations
            SET game_id = %s
            WHERE id = %s
        """, (new_game_id, inv_id))

        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Invitation accepted, game created",
        "game_id": new_game_id,
        "players": [inviter_id_db, invitee_id_db]
    }), 201


@games_bp.route("/<int:game_id>/start", methods=["POST"])
def start_duel_game(game_id):
    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود بازی و وضعیت pending
    cur.execute("SELECT game_type_id, status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": f"Game {game_id} not found"}), 404
    game_type_id_db, status_db = row['game_type_id'], row['status']
    if status_db != 'pending':
        cur.close()
        return jsonify({"error": f"Cannot start game in status {status_db}"}), 400

    try:
        # 2. تغییر وضعیت به active و ثبت start_time
        cur.execute("""
            UPDATE games
            SET status = 'active', start_time = NOW()
            WHERE id = %s
        """, (game_id,))

        # 3. تعداد راندها را از game_types بگیریم
        cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id_db,))
        total_rounds = cur.fetchone()['total_rounds']

        # 4. درج راندهای خالی با category_id = NULL
        for r in range(1, total_rounds + 1):
            cur.execute("""
                INSERT INTO game_rounds 
                  (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                VALUES 
                  (%s, %s, NULL, NULL, 'pending', 30, 100)
            """, (game_id, r))

        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Game started",
        "game_id": game_id,
        "total_rounds": total_rounds
    }), 200


@games_bp.route("/<int:game_id>/rounds/<int:round_number>/pick_category", methods=["POST"])
def pick_category_for_round(game_id, round_number):
    data = request.get_json() or {}
    user_id = data.get("user_id")
    category_id = data.get("category_id")
    if not user_id or not category_id:
        return jsonify({"error": "Missing user_id or category_id"}), 400

    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود بازی و وضعیت active
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    game_status = row['status']
    if game_status != 'active':
        cur.close()
        return jsonify({"error": f"Cannot pick category in game status {game_status}"}), 400

    # 2. بررسی این‌که user_id شرکت‌کنندهٔ بازی باشد
    cur.execute("""
        SELECT 1 FROM game_participants 
        WHERE game_id = %s AND user_id = %s
    """, (game_id, user_id))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": "User not a participant of this game"}), 403

    # 3. بررسی وجود راند و خالی بودن category_id
    cur.execute("""
        SELECT id, category_id, status 
        FROM game_rounds 
        WHERE game_id = %s AND round_number = %s
    """, (game_id, round_number))
    rnd = cur.fetchone()
    if not rnd:
        cur.close()
        return jsonify({"error": "Round not found"}), 404
    round_id_db, category_id_db, round_status_db = rnd['id'], rnd['category_id'], rnd['status']
    if category_id_db is not None:
        cur.close()
        return jsonify({"error": "Category already picked"}), 400
    if round_status_db != 'pending':
        cur.close()
        return jsonify({"error": f"Cannot pick category in round status {round_status_db}"}), 400

    # 4. بررسی وجود دسته‌بندی معتبر
    cur.execute("SELECT 1 FROM categories WHERE id = %s", (category_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": "Category not found"}), 404

    try:
        # 5. به‌روزرسانی دسته‌بندی و وضعیت راند
        cur.execute("""
            UPDATE game_rounds
            SET category_id = %s, category_picker_id = %s, status = 'active', start_time = NOW()
            WHERE id = %s
            RETURNING id
        """, (category_id, user_id, round_id_db))
        updated_round_id = cur.fetchone()['id']

        # 6. انتخاب ۳ سؤال تصادفی از آن دسته‌بندی
        cur.execute("""
            SELECT id 
            FROM questions 
            WHERE category_id = %s AND is_verified = TRUE
            ORDER BY RANDOM()
            LIMIT 3
        """, (category_id,))
        questions_sample = cur.fetchall()
       
        question_ids = [q['id'] for q in questions_sample]

        # 7. درج در game_round_questions
        for qid in question_ids:
            cur.execute("""
                INSERT INTO game_round_questions (game_round_id, question_id)
                VALUES (%s, %s)
            """, (updated_round_id, qid))

        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Category picked and questions assigned",
        "round_id": updated_round_id,
        "question_ids": question_ids
    }), 200


@games_bp.route("/<int:game_id>/rounds/<int:round_number>/answer", methods=["POST"])
def submit_answer(game_id, round_number):
    data = request.get_json() or {}
    user_id = data.get("user_id")
    question_id = data.get("question_id")
    choice_id = data.get("choice_id")
    if not user_id or not question_id or not choice_id:
        return jsonify({"error": "Missing fields"}), 400

    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وضعیت بازی
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row_game = cur.fetchone()
    if not row_game:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    if row_game['status'] != 'active':
        cur.close()
        return jsonify({"error": "Game is not active"}), 400

    # 2. بررسی وضعیت راند و گرفتن points_possible و time_limit
    cur.execute("""
        SELECT id, points_possible, start_time, time_limit_seconds 
        FROM game_rounds 
        WHERE game_id = %s AND round_number = %s
    """, (game_id, round_number))
    row_rnd = cur.fetchone()
    if not row_rnd:
        cur.close()
        return jsonify({"error": "Round not found"}), 404
    round_id_db, points_possible, round_start, time_limit_seconds = row_rnd['id'], row_rnd['points_possible'], row_rnd['start_time'], row_rnd['time_limit_seconds']

    # بررسی اینکه راند فعال باشد
    cur.execute("SELECT status FROM game_rounds WHERE id = %s", (round_id_db,))
    if cur.fetchone()['status'] != 'active':
        cur.close()
        return jsonify({"error": "Round is not active"}), 400


    # 3. بررسی منقضی بودن زمان
    if time_limit_seconds is not None and round_start is not None:
        elapsed = (datetime.now() - round_start).total_seconds()
        if elapsed > time_limit_seconds:
            cur.close()
            return jsonify({"error": "Time limit exceeded"}), 400

    # 4. بررسی شرکت‌کننده بودن user_id
    cur.execute("""
        SELECT 1 
        FROM game_participants 
        WHERE game_id = %s AND user_id = %s AND status = 'active'
    """, (game_id, user_id))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": "User not active participant"}), 403

    # 5. یافتن game_round_question_id
    cur.execute("""
        SELECT grq.id 
        FROM game_round_questions grq
        JOIN game_rounds gr ON grq.game_round_id = gr.id
        WHERE gr.game_id = %s AND gr.round_number = %s AND grq.question_id = %s
    """, (game_id, round_number, question_id))
    grq_row = cur.fetchone()
    if not grq_row:
        cur.close()
        return jsonify({"error": "Question not found in this round"}), 400
    game_round_question_id = grq_row['id']

    # 6. بررسی ارسال دوبارهٔ پاسخ
    cur.execute("""
        SELECT 1 
        FROM round_answers 
        WHERE game_round_question_id = %s AND user_id = %s
    """, (game_round_question_id, user_id))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Already answered"}), 400

    # 7. اعتبارسنجی choice_id و تعیین is_correct
    cur.execute("""
        SELECT is_correct 
        FROM question_choices 
        WHERE id = %s AND question_id = %s
    """, (choice_id, question_id))
    choice_row = cur.fetchone()
    if not choice_row:
        cur.close()
        return jsonify({"error": "Invalid choice for this question"}), 400
    is_correct = choice_row['is_correct']
    points = points_possible if is_correct else 0

    # 8. درج در round_answers و به‌روزرسانی امتیاز شرکت‌کننده
    try:
        cur.execute("""
            INSERT INTO round_answers 
              (game_round_question_id, user_id, choice_id, is_correct, points_earned, response_time_ms)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            game_round_question_id,
            user_id,
            choice_id,
            is_correct,
            points,
            data.get("response_time_ms", None)
        ))

        cur.execute("""
            UPDATE game_participants
            SET score = score + %s
            WHERE game_id = %s AND user_id = %s
        """, (points, game_id, user_id))

        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Answer recorded",
        "is_correct": is_correct,
        "points_earned": points
    }), 200


@games_bp.route("/<int:game_id>/rounds/<int:round_number>/complete", methods=["POST"])
def complete_round(game_id, round_number):
    conn = get_db()
    cur = conn.cursor()

    # 1. یافتن id راند
    cur.execute("""
        SELECT id 
        FROM game_rounds 
        WHERE game_id = %s AND round_number = %s
    """, (game_id, round_number))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Round not found"}), 404
    round_id_db = row['id']
    
    # 2. شمارش پاسخ‌ها
    cur.execute("""
        SELECT COUNT(*) 
        FROM round_answers 
        WHERE game_round_question_id IN (
            SELECT id FROM game_round_questions WHERE game_round_id = %s
        )
    """, (round_id_db,))
    answer_count = cur.fetchone()['count']
 
    # 3. بررسی تعداد شرکت‌کننده‌ها
    cur.execute("SELECT COUNT(*) FROM game_participants WHERE game_id = %s", (game_id,))
    num_players = cur.fetchone()['count']
   
    # اگر بازی رودررو (۲ کاربر) باشد، انتظار داریم 2×3 پاسخ؛ در گروهی، انتظار برابر num_players
    expected_answers = num_players * (3 if num_players == 2 else 1)
  
    if answer_count < expected_answers:
        cur.close()
        return jsonify({"error": "Not all answers submitted yet"}), 400
         
    # 4. بروزرسانی وضعیت راند
    
    try:
        cur.execute("""
            UPDATE game_rounds
            SET status = 'completed', end_time = NOW()
            WHERE id = %s
        """, (round_id_db,))
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    
    return jsonify({"message": f"Round {round_number} completed"}), 200


@games_bp.route("/<int:game_id>/complete", methods=["POST"])
def complete_duel_game(game_id):
    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود بازی و وضعیت active
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    if row['status'] != 'active':
        cur.close()
        return jsonify({"error": f"Cannot complete game in status {row['status']}"}), 400

    # 2. بررسی اینکه همهٔ راندها به پایان رسیده باشند
    cur.execute("""
        SELECT COUNT(*) 
        FROM game_rounds 
        WHERE game_id = %s AND status <> 'completed'
    """, (game_id,))
    pending = cur.fetchone()['count']
    if pending > 0:
        cur.close()
        return jsonify({"error": "Pending rounds remain"}), 400

    # 3. یافتن کاربر با بیشترین امتیاز
    cur.execute("""
        SELECT user_id, score 
        FROM game_participants 
        WHERE game_id = %s
        ORDER BY score DESC, join_time ASC
        LIMIT 1
    """, (game_id,))
    winner_row = cur.fetchone()
    if not winner_row:
        cur.close()
        return jsonify({"error": "No participants found"}), 400
    winner_id, winner_score = winner_row['user_id'], winner_row['score']
    
    # 4. بروزرسانی جدول games
    try:
        cur.execute("""
            UPDATE games
            SET status = 'completed', end_time = NOW(), winner_id = %s
            WHERE id = %s
            RETURNING id, winner_id
        """, (winner_id, game_id))
        result = cur.fetchone()
        
        conn.commit()
     

    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Game completed",
        "game_id": result['id'],
        "winner_id": result['winner_id'],
        "winner_score": winner_score
    }), 200


@games_bp.route("", methods=["POST"])
def create_group_game():
    data = request.get_json() or {}
    game_type_id = data.get("game_type_id")
    creator_id = data.get("creator_id")
    participant_ids = data.get("participant_ids")

    if not game_type_id or not creator_id or not isinstance(participant_ids, list) or len(participant_ids) < 2:
        return jsonify({"error": "Missing fields or invalid participant_ids"}), 400

    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود creator_id و هر participant_id
    cur.execute("SELECT 1 FROM users WHERE id = %s", (creator_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {creator_id} not found"}), 404

    for pid in participant_ids:
        cur.execute("SELECT 1 FROM users WHERE id = %s", (pid,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"error": f"User {pid} not found"}), 404

    # 2. ساخت بازی گروهی
    try:
        cur.execute("""
            INSERT INTO games (game_type_id, status)
            VALUES (%s, 'pending')
            RETURNING id
        """, (game_type_id,))
        new_game_id = cur.fetchone()['id']

        # 3. درج شرکت‌کننده‌ها
        for pid in participant_ids:
            cur.execute("""
                INSERT INTO game_participants (game_id, user_id)
                VALUES (%s, %s)
            """, (new_game_id, pid))

        # 4. گرفتن تعداد راندها از game_types
        cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id,))
        total_rounds = cur.fetchone()['total_rounds']

        # 5. ایجاد هر راند با category_id = NULL
        for r in range(1, total_rounds + 1):
            cur.execute("""
                INSERT INTO game_rounds 
                  (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                VALUES (%s, %s, NULL, NULL, 'pending', 30, 100)
            """, (new_game_id, r))

        # 6. تغییر وضعیت بازی به active و درج start_time
        cur.execute("""
            UPDATE games
            SET status = 'active', start_time = NOW()
            WHERE id = %s
        """, (new_game_id,))

        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Group game created and started",
        "game_id": new_game_id,
        "participant_ids": participant_ids,
        "total_rounds": total_rounds
    }), 201


@games_bp.route("/<int:game_id>/assign_categories", methods=["POST"])
def assign_categories_group(game_id):
    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود بازی و وضعیت active
    cur.execute("SELECT status, game_type_id FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    status_db, game_type_id_db = row['status'], row['game_type_id']
    if status_db != 'active':
        cur.close()
        return jsonify({"error": "Game is not active"}), 400

    # 2. تعداد راندها
    cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id_db,))
    total_rounds = cur.fetchone()['total_rounds']

    # 3. فهرست دسته‌بندی‌ها
    cur.execute("SELECT id FROM categories")
    cat_rows = cur.fetchall()
    category_ids = [c['id'] for c in cat_rows]
    if not category_ids:
        cur.close()
        return jsonify({"error": "No categories available"}), 400

    assigned = []
    try:
        for r in range(1, total_rounds + 1):
            chosen_cat = random.choice(category_ids)

            # 4. به‌روزرسانی game_rounds
            cur.execute("""
                UPDATE game_rounds
                SET category_id = %s, category_picker_id = NULL, status = 'active', start_time = NOW()
                WHERE game_id = %s AND round_number = %s
                RETURNING id
            """, (chosen_cat, game_id, r))
            round_id_db = cur.fetchone()['id']

            # 5. انتخاب یک سؤال تصادفی از آن دسته
            cur.execute("""
                SELECT id 
                FROM questions 
                WHERE category_id = %s AND is_verified = TRUE
                ORDER BY RANDOM()
                LIMIT 1
            """, (chosen_cat,))
            q_row = cur.fetchone()
            if not q_row:
                raise Exception(f"No verified questions in category {chosen_cat}")
            question_id = q_row['id']

            # درج در game_round_questions
            cur.execute("""
                INSERT INTO game_round_questions (game_round_id, question_id)
                VALUES (%s, %s)
            """, (round_id_db, question_id))

            assigned.append({
                "round_number": r,
                "round_id": round_id_db,
                "category_id": chosen_cat,
                "question_id": question_id
            })

        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Categories and questions assigned for all rounds",
        "assigned_rounds": assigned
    }), 200


@games_bp.route("/<int:game_id>/complete_group", methods=["POST"])
def complete_group_game(game_id):
    conn = get_db()
    cur = conn.cursor()

    # 1. بررسی وجود بازی و وضعیت active
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    if row['status'] != 'active':
        cur.close()
        return jsonify({"error": f"Cannot complete game in status {row['status']}"}), 400

    # 2. بررسی اینکه همهٔ راندها completed شده باشند
    cur.execute("""
        SELECT COUNT(*) 
        FROM game_rounds 
        WHERE game_id = %s AND status <> 'completed'
    """, (game_id,))
    incomplete_rounds = cur.fetchone()['count']
    if incomplete_rounds > 0:
        cur.close()
        return jsonify({"error": "Not all rounds completed"}), 400

    # 3. یافتن شرکت‌کننده با بیشترین امتیاز
    cur.execute("""
        SELECT user_id, score 
        FROM game_participants 
        WHERE game_id = %s
        ORDER BY score DESC
        LIMIT 1
    """, (game_id,))
    winner_row = cur.fetchone()
    if not winner_row:
        cur.close()
        return jsonify({"error": "No participants found"}), 400
    winner_id, winner_score = winner_row['user_id'], winner_row['score']

    # 4. بروزرسانی در جدول games
    try:
        cur.execute("""
            UPDATE games
            SET status = 'completed', end_time = NOW(), winner_id = %s
            WHERE id = %s
            RETURNING id, winner_id
        """, (winner_id, game_id))
        result = cur.fetchone()
        conn.commit()
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({
        "message": "Group game completed",
        "game_id": result['id'],
        "winner_id": result['winner_id'],
        "winner_score": winner_score
    }), 200
