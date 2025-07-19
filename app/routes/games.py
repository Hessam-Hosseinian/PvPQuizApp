# app/routes/games_bp.py

import time
from flask import Blueprint, request, jsonify, abort
from app.db import get_db, query_db, modify_db
import psycopg2
import random
from datetime import datetime, timedelta
from app import socketio

games_bp = Blueprint("games_bp", __name__, url_prefix="/games")

# --- Helper Function to get full game state ---
def get_full_game_state_data(game_id, user_id=None):
    """
    A helper function to fetch the complete game state. 
    Can be called from both HTTP endpoints and SocketIO events.
    """
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT g.id, g.game_type_id, g.status, gt.total_rounds
        FROM games g
        JOIN game_types gt ON g.game_type_id = gt.id
        WHERE g.id = %s
    """, (game_id,))
    game = cur.fetchone()
    if not game:
        cur.close()
        return None

    cur.execute("""
        SELECT gp.user_id, u.username, u.avatar, gp.score
        FROM game_participants gp
        JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = %s 
        ORDER BY gp.join_time ASC
    """, (game_id,))
    participants = [dict(row) for row in cur.fetchall()]
    
    scores = {p['user_id']: p['score'] for p in participants}

    cur.execute("""
        SELECT id, round_number, category_id, category_picker_id, status, start_time
        FROM game_rounds 
        WHERE game_id = %s 
        ORDER BY round_number ASC
    """, (game_id,))
    rounds = cur.fetchall()
    
    current_round_data = None
    active_round = next((r for r in rounds if r['status'] in ('pending', 'active')), None)
    
    # If no active round, check if all rounds are completed
    if not active_round:
        completed_rounds = [r for r in rounds if r['status'] == 'completed']
        if len(completed_rounds) == len(rounds):
            cur.close()
            return {
                "game": dict(game),
                "participants": participants,
                "game_status": game['status'],
                "total_rounds": game['total_rounds'],
                "scores": scores,
                "current_round": None
            }
    
    if active_round:
        round_id = active_round['id']
        category_id = active_round['category_id']
        
        category_options = []
        if not category_id:
            cur.execute("SELECT id, name, description FROM categories ORDER BY RANDOM() LIMIT 3")
            category_options = [dict(row) for row in cur.fetchall()]

        questions = []
        if category_id:
            cur.execute("""
                SELECT grq.question_id, q.text, qc.id as choice_id, qc.choice_text
                FROM game_round_questions grq
                JOIN questions q ON grq.question_id = q.id
                JOIN question_choices qc ON q.id = qc.question_id
                WHERE grq.game_round_id = %s
                ORDER BY grq.question_id, qc.id
            """, (round_id,))
            
            question_map = {}
            for row in cur.fetchall():
                qid = row['question_id']
                if qid not in question_map:
                    question_map[qid] = {'question_id': qid, 'text': row['text'], 'choices': []}
                question_map[qid]['choices'].append({'choice_id': row['choice_id'], 'choice_text': row['choice_text']})
            questions = list(question_map.values())

        current_round_data = {
            "round_number": active_round['round_number'],
            "status": active_round['status'],
            "category_id": category_id,
            "category_picker_id": active_round['category_picker_id'],
            "category_options": category_options,
            "questions": questions,
            "time_limit_seconds": 1000
        }
        


    cur.close()

    return {
        "game": dict(game),
        "participants": participants,
        "game_status": game['status'],
        "total_rounds": game['total_rounds'],
        "scores": scores,
        "current_round": current_round_data
    }


# --- SocketIO Event Handlers ---
# Moved to app.py for better namespace management


@games_bp.route("/queue", methods=["POST"])
def enqueue_for_duel():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    game_type_id = data.get("game_type_id")
    if not user_id or not game_type_id:
        return jsonify({"error": "Missing user_id or game_type_id"}), 400

    conn = get_db()
    cur = conn.cursor()

    # 1. Check if user exists
    cur.execute("SELECT 1 FROM users WHERE id = %s", (user_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {user_id} not found"}), 404

    # 2. Check game type
    cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id,))
    gt = cur.fetchone()
    if not gt:
        cur.close()
        return jsonify({"error": f"GameType {game_type_id} not found"}), 404

    # 3. Check if user is already in queue
    cur.execute("SELECT 1 FROM match_queue WHERE user_id = %s AND game_type_id = %s", (user_id, game_type_id))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "User already in queue"}), 400

    # 4. Insert into match queue
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

    # 5. Search for a match in the queue (another user with the same game_type_id)
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
            # Create a new record in the games table
            cur.execute("""
                INSERT INTO games (game_type_id, status)
                VALUES (%s, 'pending')
                RETURNING id
            """, (game_type_id,))
            new_game_id = cur.fetchone()["id"]
            
            # Remove both users from the queue
            cur.execute(
                "DELETE FROM match_queue WHERE id IN (%s, %s)",
                (queue_entry["id"], other_queue_id)
            )
            

            # Insert into game_participants
            cur.execute("""
                INSERT INTO game_participants (game_id, user_id)
                VALUES (%s, %s), (%s, %s)
            """, (new_game_id, user_id, new_game_id, other_user_id))

            # Create rounds and activate the game
            cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id,))
            total_rounds = cur.fetchone()['total_rounds']
            
            player_ids = [user_id, other_user_id]
            picker_id = random.choice(player_ids) # Randomly choose the first picker

            for r in range(1, total_rounds + 1):
                cur.execute("""
                    INSERT INTO game_rounds 
                      (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                    VALUES 
                      (%s, %s, NULL, %s, 'pending', 1000, 100)
                """, (new_game_id, r, picker_id))
                # Switch picker for the next round
                picker_id = player_ids[0] if picker_id == player_ids[1] else player_ids[1]

            # Change game status to active and set the start_time
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
    
    # 1. Check if inviter and invitee exist
    cur.execute("SELECT 1 FROM users WHERE id = %s", (inviter_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {inviter_id} not found"}), 404
    cur.execute("SELECT 1 FROM users WHERE id = %s", (invitee_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {invitee_id} not found"}), 404

    # 2. Check if invitee is in an active game or queue
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

    # 3. Check for an existing pending invitation
    cur.execute("""
        SELECT 1 
        FROM game_invitations 
        WHERE inviter_id = %s AND invitee_id = %s AND status = 'pending'
    """, (inviter_id, invitee_id))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Already invited"}), 400

    # 4. Insert the invitation
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

    # 1. Check for invitation existence and match invitee
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

    # 2. Reject the invitation
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
        # Change invitation status to 'accepted'
        cur.execute("""
            UPDATE game_invitations
            SET status = 'accepted'
            WHERE id = %s
        """, (inv_id,))

        # Create a duel game (assuming game_type_id = 1 for duel)
        cur.execute("""
            INSERT INTO games (game_type_id, status)
            VALUES (1, 'pending')
            RETURNING id
        """)
        new_game_id = cur.fetchone()['id']

        # Insert both participants
        cur.execute("""
            INSERT INTO game_participants (game_id, user_id)
            VALUES (%s, %s), (%s, %s)
        """, (new_game_id, inviter_id_db, new_game_id, invitee_id_db))

        # Update the game_id in the invitation
        cur.execute("""
            UPDATE game_invitations
            SET game_id = %s
            WHERE id = %s
        """, (new_game_id, inv_id))

        # Create rounds and activate the game
        cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (1,))
        total_rounds = cur.fetchone()['total_rounds']
        
        player_ids = [inviter_id_db, invitee_id_db]
        picker_id = random.choice(player_ids) # Randomly choose the first picker

        for r in range(1, total_rounds + 1):
            cur.execute("""
                INSERT INTO game_rounds 
                  (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                VALUES 
                  (%s, %s, NULL, %s, 'pending', 1000, 100)
            """, (new_game_id, r, picker_id))
            # Switch picker for the next round
            picker_id = player_ids[0] if picker_id == player_ids[1] else player_ids[1]

        # Change game status to active and set start_time
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
        "message": "Invitation accepted, game created",
        "game_id": new_game_id,
        "players": [inviter_id_db, invitee_id_db]
    }), 201


@games_bp.route("/<int:game_id>/start", methods=["POST"])
def start_duel_game(game_id):
    conn = get_db()
    cur = conn.cursor()

    # 1. Check for game existence and pending status
    cur.execute("SELECT game_type_id, status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": f"Game {game_id} not found"}), 404
    game_type_id_db, status_db = row['game_type_id'], row['status']
    if status_db != 'pending':
        cur.close()
        return jsonify({"error": f"Cannot start game in status {status_db}"}), 400

    # 2. Get number of rounds from game_type
    cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id_db,))
    total_rounds_row = cur.fetchone()
    if not total_rounds_row:
        cur.close()
        return jsonify({"error": "Game type not found"}), 404
    total_rounds = total_rounds_row['total_rounds']

    try:
        # 3. Change status to active and set start_time
        cur.execute("""
            UPDATE games
            SET status = 'active', start_time = NOW()
            WHERE id = %s
        """, (game_id,))

        # 4. Create empty rounds with category_id = NULL
        for r in range(1, total_rounds + 1):
            cur.execute("""
                INSERT INTO game_rounds 
                  (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                VALUES 
                  (%s, %s, NULL, NULL, 'pending', 1000, 100)
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

    # 1. Check for game existence and active status
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row or row['status'] != 'active':
        cur.close(); return jsonify({"error": "Game not found or not active"}), 404

    # 2. Check if user_id is a participant of the game
    cur.execute("SELECT 1 FROM game_participants WHERE game_id = %s AND user_id = %s", (game_id, user_id))
    if not cur.fetchone():
        cur.close(); return jsonify({"error": "User not a participant"}), 403

    # 3. Check for round existence and empty category_id
    cur.execute("SELECT id, category_id, status, category_picker_id FROM game_rounds WHERE game_id = %s AND round_number = %s", (game_id, round_number))
    rnd = cur.fetchone()
    if not rnd:
        cur.close(); return jsonify({"error": "Round not found"}), 404
    round_id_db, category_id_db, picker_id_db = rnd['id'], rnd['category_id'], rnd['category_picker_id']
    
    # Check if it's the user's turn to pick
    if picker_id_db != user_id:
        cur.close(); return jsonify({"error": "Not your turn to pick"}), 403
        
    if category_id_db is not None:
        cur.close(); return jsonify({"error": "Category already picked"}), 400

    # 4. Check for a valid category
    cur.execute("SELECT 1 FROM categories WHERE id = %s", (category_id,))
    if not cur.fetchone():
        cur.close(); return jsonify({"error": "Category not found"}), 404

    try:
        # 5. Update the category and round status
        cur.execute("UPDATE game_rounds SET category_id = %s, status = 'active', start_time = NOW() WHERE id = %s", (category_id, round_id_db))
        
        cur.execute("SELECT id FROM questions WHERE category_id = %s AND is_verified = TRUE ORDER BY RANDOM() LIMIT 3", (category_id,))
        questions_sample = cur.fetchall()
        question_ids = [q['id'] for q in questions_sample]

        for qid in question_ids:
            cur.execute("INSERT INTO game_round_questions (game_round_id, question_id) VALUES (%s, %s)", (round_id_db, qid))

        conn.commit()

        # Emit update to all clients in the game room
        game_state = get_full_game_state_data(game_id)
        room_name = f'game_{game_id}'

        socketio.emit('game_update', game_state, room=room_name)

    except psycopg2.Error as e:
        conn.rollback(); cur.close(); return jsonify({"error": str(e)}), 500

    cur.close()
    return jsonify({"message": "Category picked"}), 200


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

    # 1. Check game status
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row_game = cur.fetchone()
    if not row_game:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    if row_game['status'] != 'active':
        cur.close()
        return jsonify({"error": "Game is not active"}), 400

    # 2. Check round status and get points_possible and time_limit
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

    # Check if the round is active
    cur.execute("SELECT status FROM game_rounds WHERE id = %s", (round_id_db,))
    if cur.fetchone()['status'] != 'active':
        cur.close()
        return jsonify({"error": "Round is not active"}), 400


    # 3. Check for time expiration
    if time_limit_seconds is not None and round_start is not None:
        grace_period = 5  # 5-second grace period for API calls / client-side lag
        elapsed = (datetime.now() - round_start).total_seconds()
        if elapsed > (time_limit_seconds + grace_period):
            cur.close()
            return jsonify({"error": "Time limit exceeded"}), 400

    # 4. Check if user_id is an active participant
    cur.execute("""
        SELECT 1 
        FROM game_participants 
        WHERE game_id = %s AND user_id = %s AND status = 'active'
    """, (game_id, user_id))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": "User not active participant"}), 403

    # 5. Find game_round_question_id
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

    # 6. Check for duplicate answer submission
    cur.execute("""
        SELECT 1 
        FROM round_answers 
        WHERE game_round_question_id = %s AND user_id = %s
    """, (game_round_question_id, user_id))
    if cur.fetchone():
        cur.close()
        return jsonify({"error": "Already answered"}), 400

    # 7. Validate choice_id and determine is_correct
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

    # 7.1. Get correct choice ID, regardless of the user's answer
    cur.execute("""
        SELECT id FROM question_choices
        WHERE question_id = %s AND is_correct = TRUE
        LIMIT 1
    """, (question_id,))
    correct_choice_row = cur.fetchone()
    # This should always find a correct answer if the question is well-formed
    correct_choice_id = correct_choice_row['id'] if correct_choice_row else None


    # 8. Insert into round_answers and update participant's score
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
        "points_earned": points,
        "correct_choice_id": correct_choice_id
    }), 200


@games_bp.route("/<int:game_id>/rounds/<int:round_number>/complete", methods=["POST"])
def complete_round(game_id, round_number):
    conn = get_db()
    cur = conn.cursor()

    try:
        # 1. Find round ID and check status
        cur.execute("""
            SELECT id, status, category_id
            FROM game_rounds 
            WHERE game_id = %s AND round_number = %s
        """, (game_id, round_number))
        row = cur.fetchone()
        if not row:
            cur.close()
            return jsonify({"error": "Round not found"}), 404
        
        round_id_db = row['id']
        round_status = row['status']
        category_id = row['category_id']
        
        # If the round is already completed, return a success message
        if round_status == 'completed':
            cur.close()
            return jsonify({"message": f"Round {round_number} already completed"}), 200
        
        # Check that the round is active and a category has been selected
        if round_status != 'active':
            cur.close()
            return jsonify({"error": f"Cannot complete round in status {round_status}"}), 400
        
        if not category_id:
            cur.close()
            return jsonify({"error": "Category not selected for this round"}), 400
        
        # 2. Count the number of participants and questions in this round
        cur.execute("SELECT COUNT(*) FROM game_participants WHERE game_id = %s", (game_id,))
        num_players = cur.fetchone()['count']

        cur.execute("SELECT COUNT(*) FROM game_round_questions WHERE game_round_id = %s", (round_id_db,))
        num_questions = cur.fetchone()['count']

        expected_answers = num_players * num_questions

        # 3. Count the answers
        cur.execute("""
            SELECT COUNT(*) 
            FROM round_answers 
            WHERE game_round_question_id IN (
                SELECT id FROM game_round_questions WHERE game_round_id = %s
            )
        """, (round_id_db,))
        answer_count = cur.fetchone()['count']


        if answer_count < expected_answers:
            cur.close()
            return jsonify({"error": f"Not all answers submitted yet. Expected: {expected_answers}, Submitted: {answer_count}"}), 400
             
        # 4. Update the round status
        cur.execute("""
            UPDATE game_rounds
            SET status = 'completed', end_time = NOW()
            WHERE id = %s
        """, (round_id_db,))
        
        # 5. Check if this is the last round
        cur.execute("""
            SELECT COUNT(*) as total_rounds
            FROM game_rounds 
            WHERE game_id = %s
        """, (game_id,))
        total_rounds = cur.fetchone()['total_rounds']
        
        if round_number < total_rounds:
            # Activate the next round if it exists
            cur.execute("""
                SELECT id, round_number 
                FROM game_rounds 
                WHERE game_id = %s AND round_number = %s AND status = 'pending'
            """, (game_id, round_number + 1))
            next_round = cur.fetchone()
            
            if next_round:

                # Activate the next round with 'pending' status for category selection
                cur.execute("""
                    UPDATE game_rounds
                    SET status = 'pending', start_time = NOW()
                    WHERE id = %s
                """, (next_round['id'],))
            else:
                # Check what rounds exist
                cur.execute("SELECT round_number, status FROM game_rounds WHERE game_id = %s ORDER BY round_number", (game_id,))
                all_rounds = cur.fetchall()
        else:
            print(f"This was the last round ({round_number}/{total_rounds}), game should be completed")
        
        conn.commit()
        
        # Emit update to all clients in the game room
        game_state = get_full_game_state_data(game_id)
        room_name = f'game_{game_id}'
        socketio.emit('game_update', game_state, room=room_name)
        
    except psycopg2.Error as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": "Internal server error"}), 500

    cur.close()
    return jsonify({"message": f"Round {round_number} completed"}), 200


@games_bp.route("/<int:game_id>/complete", methods=["POST"])
def complete_duel_game(game_id):
    conn = get_db()
    cur = conn.cursor()

    # 1. Check for game existence and active status
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    if row['status'] != 'active':
        cur.close()
        return jsonify({"error": f"Cannot complete game in status {row['status']}"}), 400

    # 2. Check if all rounds have been completed
    cur.execute("""
        SELECT COUNT(*) 
        FROM game_rounds 
        WHERE game_id = %s AND status <> 'completed'
    """, (game_id,))
    pending = cur.fetchone()['count']
    if pending > 0:
        cur.close()
        return jsonify({"error": "Pending rounds remain"}), 400

    # 3. Find the user with the highest score
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
    
    # 4. Update the games table
    try:
        cur.execute("""
            UPDATE games
            SET status = 'completed', end_time = NOW(), winner_id = %s
            WHERE id = %s
            RETURNING id, winner_id
        """, (winner_id, game_id))
        result = cur.fetchone()
        
        # --- XP LOGIC: Update XP for all participants ---
        cur.execute("SELECT user_id, score FROM game_participants WHERE game_id = %s", (game_id,))
        participants = cur.fetchall()
        for p in participants:
            user_id = p['user_id']
            score = p['score']
            bonus = 0
            if user_id == winner_id:
                bonus = int(score * 0.2)  # 20% XP bonus for winner
            xp_earned = score + bonus
            cur.execute("""
                UPDATE users
                SET total_xp = COALESCE(total_xp, 0) + %s
                WHERE id = %s
            """, (xp_earned, user_id))
        # --- END XP LOGIC ---
        
        conn.commit()
        
        # Emit final update
        game_state = get_full_game_state_data(game_id)
        room_name = f'game_{game_id}'

        socketio.emit('game_update', game_state, room=room_name)

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

    # 1. Check for existence of creator_id and each participant_id
    cur.execute("SELECT 1 FROM users WHERE id = %s", (creator_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {creator_id} not found"}), 404

    for pid in participant_ids:
        cur.execute("SELECT 1 FROM users WHERE id = %s", (pid,))
        if not cur.fetchone():
            cur.close()
            return jsonify({"error": f"User {pid} not found"}), 404

    # 2. Create the group game
    try:
        cur.execute("""
            INSERT INTO games (game_type_id, status)
            VALUES (%s, 'pending')
            RETURNING id
        """, (game_type_id,))
        new_game_id = cur.fetchone()['id']

        # 3. Insert participants
        for pid in participant_ids:
            cur.execute("""
                INSERT INTO game_participants (game_id, user_id)
                VALUES (%s, %s)
            """, (new_game_id, pid))

        # 4. Get number of rounds from game_types
        cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id,))
        total_rounds = cur.fetchone()['total_rounds']

        # 5. Create each round with category_id = NULL
        for r in range(1, total_rounds + 1):
            cur.execute("""
                INSERT INTO game_rounds 
                  (game_id, round_number, category_id, category_picker_id, status, time_limit_seconds, points_possible)
                VALUES (%s, %s, NULL, NULL, 'pending', 1000, 100)
            """, (new_game_id, r))

        # 6. Change game status to active and set start_time
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

    # 1. Check for game existence and active status
    cur.execute("SELECT status, game_type_id FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    status_db, game_type_id_db = row['status'], row['game_type_id']
    if status_db != 'active':
        cur.close()
        return jsonify({"error": "Game is not active"}), 400

    # 2. Number of rounds
    cur.execute("SELECT total_rounds FROM game_types WHERE id = %s", (game_type_id_db,))
    total_rounds = cur.fetchone()['total_rounds']

    # 3. List of categories
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

            # 4. Update game_rounds
            cur.execute("""
                UPDATE game_rounds
                SET category_id = %s, category_picker_id = NULL, status = 'active', start_time = NOW()
                WHERE game_id = %s AND round_number = %s
                RETURNING id
            """, (chosen_cat, game_id, r))
            round_id_db = cur.fetchone()['id']

            # 5. Select one random question from that category
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

            # Insert into game_round_questions
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

    # 1. Check for game existence and active status
    cur.execute("SELECT status FROM games WHERE id = %s", (game_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": "Game not found"}), 404
    if row['status'] != 'active':
        cur.close()
        return jsonify({"error": f"Cannot complete game in status {row['status']}"}), 400

    # 2. Check if all rounds are completed
    cur.execute("""
        SELECT COUNT(*) 
        FROM game_rounds 
        WHERE game_id = %s AND status <> 'completed'
    """, (game_id,))
    incomplete_rounds = cur.fetchone()['count']
    if incomplete_rounds > 0:
        cur.close()
        return jsonify({"error": "Not all rounds completed"}), 400

    # 3. Find the participant with the highest score
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

    # 4. Update the games table
    try:
        cur.execute("""
            UPDATE games
            SET status = 'completed', end_time = NOW(), winner_id = %s
            WHERE id = %s
            RETURNING id, winner_id
        """, (winner_id, game_id))
        result = cur.fetchone()
        # --- XP LOGIC: Update XP for all participants ---
        cur.execute("SELECT user_id, score FROM game_participants WHERE game_id = %s", (game_id,))
        participants = cur.fetchall()
        for p in participants:
            user_id = p['user_id']
            score = p['score']
            bonus = 0
            if user_id == winner_id:
                bonus = int(score * 0.2)  # 20% XP bonus for winner
            xp_earned = score + bonus
            cur.execute("""
                UPDATE users
                SET total_xp = COALESCE(total_xp, 0) + %s
                WHERE id = %s
            """, (xp_earned, user_id))
        # --- END XP LOGIC ---
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


@games_bp.route("/<int:game_id>/state", methods=["GET"])
def get_game_state(game_id):
    user_id = request.args.get("user_id", type=int)
    state = get_full_game_state_data(game_id, user_id)
    if not state:
        return jsonify({"error": "Game not found"}), 404
    return jsonify(state)


@games_bp.route("/queue/status", methods=["GET"])
def queue_status():
    user_id = request.args.get("user_id", type=int)
    game_type_id = request.args.get("game_type_id", type=int)
    if not user_id or not game_type_id:
        return jsonify({"error": "Missing user_id or game_type_id"}), 400

    conn = get_db()
    cur = conn.cursor()

    # Check if user is still in queue
    cur.execute("SELECT id, enqueued_at FROM match_queue WHERE user_id = %s AND game_type_id = %s", (user_id, game_type_id))
    queue_row = cur.fetchone()
    if queue_row:
        cur.close()
        return jsonify({
            "status": "waiting",
            "queue_id": queue_row["id"],
            "enqueued_at": queue_row["enqueued_at"].isoformat()
        }), 200

    # Check if user has been matched and a game is created (pending or active)
    cur.execute("""
        SELECT g.id as game_id, g.status
        FROM games g
        JOIN game_participants gp ON gp.game_id = g.id
        WHERE gp.user_id = %s AND g.game_type_id = %s AND g.status IN ('pending', 'active')
        ORDER BY g.id DESC LIMIT 1
    """, (user_id, game_type_id))
    game_row = cur.fetchone()
    cur.close()
    if game_row:
        return jsonify({
            "status": "matched",
            "game_id": game_row["game_id"],
            "game_status": game_row["status"]
        }), 200

    return jsonify({"status": "not_found"}), 404
