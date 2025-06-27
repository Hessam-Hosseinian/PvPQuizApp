# File: app/routes/chat.py

import psycopg2
from flask import Blueprint, request, jsonify, abort
from ..db import get_db  # Assuming get_db returns a Psycopg2 connection
from app.db import query_db, modify_db

# ===========================
# 1) Blueprint Definition with prefix
# ===========================
chat_bp = Blueprint("chat", __name__, url_prefix="/chat")





# ===========================
# 3) List All Chat Rooms
# ===========================
@chat_bp.route("/rooms", methods=["GET"])
def list_rooms():
    """
    GET /chat/rooms
    Return list of all chat rooms
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, type, created_at, game_id FROM chat_rooms;")
    
    rooms = cur.fetchall()
    cur.close()
    return jsonify(rooms), 200


# ===========================
# 4) Create New Room
# ===========================
@chat_bp.route("/rooms", methods=["POST"])
def create_room():
    """
    POST /chat/rooms
    Create a new chat room
    JSON Body:
    {
      "name": "Room Name",       # Optional but recommended
      "type": "public",          # Required value: one of ['public','private','game']
      "game_id": 5               # Only if type == 'game'
    }
    """
    data = request.get_json() or {}
    room_type = data.get("type")
    if not room_type or room_type not in ("public", "private", "game"):
        abort(400, "Missing or invalid 'type' field. Must be one of 'public', 'private', 'game'.")

    # If type == 'game' and game_id not provided, return error
    if room_type == "game" and "game_id" not in data:
        abort(400, "When type='game', 'game_id' is required.")

    conn = get_db()
    cur = conn.cursor()

    # (Optional) We can check if the provided game_id exists in the games table
    if room_type == "game":
        cur.execute("SELECT 1 FROM games WHERE id = %s;", (data["game_id"],))
        if cur.fetchone() is None:
            cur.close()
            abort(404, f"Game with id={data['game_id']} not found.")

    try:
        cur.execute(
            """
            INSERT INTO chat_rooms (name, type, game_id)
            VALUES (%s, %s, %s)
            RETURNING id, name, type, created_at, game_id;
            """,
            (
                data.get("name"), 
                room_type, 
                data.get("game_id")
            )
        )
        new_room_row = cur.fetchone()
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        cur.close()
        abort(400, f"Integrity error: {e.pgerror}")
    finally:
        # If cur is still open, close it
        if not cur.closed:
            cur.close()
    
     
    return jsonify(new_room_row), 201


# ===========================
# 5) Join User to a Specific Room
# ===========================
@chat_bp.route("/rooms/<int:room_id>/members", methods=["POST"])
def join_room(room_id):
    """
    POST /chat/rooms/<room_id>/members
    User join to a specific room
    JSON Body: { "user_id": <int> }
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if user_id is None:
        abort(400, "Missing 'user_id' in request body.")

    conn = get_db()
    cur = conn.cursor()

    # 5.1) Check room existence
    cur.execute("SELECT 1 FROM chat_rooms WHERE id = %s;", (room_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Room with id={room_id} not found.")

    # 5.2) Check user existence
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (user_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"User with id={user_id} not found.")

    try:
        cur.execute(
            """
            INSERT INTO chat_room_members (room_id, user_id)
            VALUES (%s, %s)
            RETURNING room_id, user_id, joined_at;
            """,
            (room_id, user_id)
        )
        membership_row = cur.fetchone()
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        cur.close()
        # It's possible (user was already a member of the room)
        abort(400, f"Integrity error: {e.pgerror}")
    finally:
        if not cur.closed:
            cur.close()

  
    return jsonify(membership_row), 201


# ===========================
# 6) List Room Messages (Ascending by Send Time)
# ===========================
@chat_bp.route("/rooms/<int:room_id>/messages", methods=["GET"])
def list_messages(room_id):
    """
    GET /chat/rooms/<room_id>/messages
    Return all messages in the specified room (sorted by sent_at ASC)
    """
    conn = get_db()
    cur = conn.cursor()

    # 6.1) Validate room existence
    cur.execute("SELECT 1 FROM chat_rooms WHERE id = %s;", (room_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Room with id={room_id} not found.")

    cur.execute(
        """
        SELECT id, room_id, sender_id, reply_to_id, message, is_edited, is_deleted, sent_at
        FROM chat_messages
        WHERE room_id = %s
        ORDER BY sent_at ASC;
        """,
        (room_id,)
    )
    msgs = cur.fetchall()
    cur.close()
    return jsonify(msgs), 200


# ===========================
# 7) Send New Message in a Room
# ===========================
@chat_bp.route("/rooms/<int:room_id>/messages", methods=["POST"])
def send_message(room_id):
    """
    POST /chat/rooms/<room_id>/messages
    Send a new message in the specified room
    JSON Body:
    {
      "sender_id": <int>,
      "message": "<message text>", 
      "reply_to_id": <int> (optional)
    }
    """
    data = request.get_json() or {}
    sender_id = data.get("sender_id")
    message_text = data.get("message")

    if sender_id is None or not message_text:
        abort(400, "Missing 'sender_id' or 'message' in request body.")

    conn = get_db()
    cur = conn.cursor()

    # 7.1) Validate room existence
    cur.execute("SELECT 1 FROM chat_rooms WHERE id = %s;", (room_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Room with id={room_id} not found.")

    # 7.2) Validate sender existence
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (sender_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Sender with id={sender_id} not found.")

    # 7.3) If reply_to_id exists, validate that the message exists in the specified room
    reply_to_id = data.get("reply_to_id")
    if reply_to_id is not None:
        cur.execute(
            """
            SELECT 1 FROM chat_messages 
            WHERE id = %s AND room_id = %s;
            """,
            (reply_to_id, room_id)
        )
        if cur.fetchone() is None:
            cur.close()
            abort(400, f"Invalid 'reply_to_id': no message with id={reply_to_id} in room {room_id}.")

    try:
        cur.execute(
            """
            INSERT INTO chat_messages (room_id, sender_id, reply_to_id, message)
            VALUES (%s, %s, %s, %s)
            RETURNING id, room_id, sender_id, reply_to_id, message, is_edited, is_deleted, sent_at;
            """,
            (room_id, sender_id, reply_to_id, message_text)
        )
        new_msg_row = cur.fetchone()
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        cur.close()
        abort(400, f"Integrity error: {e.pgerror}")
    finally:
        if not cur.closed:
            cur.close()

    return jsonify(new_msg_row), 201


# ===========================
# 8) Get User's Direct Messages
# ===========================
@chat_bp.route("/users/<int:user_id>/messages", methods=["GET"])
def get_user_messages(user_id):
    """
    GET /chat/users/<user_id>/messages
    Return all direct messages that the user has sent or received
    (For simplicity, we assume direct messages are rows where recipient_id in chat_messages is not NULL.)
    """
    # In this design, we must add recipient_id column in chat_messages table
    # (Otherwise, direct message is not the same as message in the room).
    conn = get_db()
    cur = conn.cursor()

    # 8.1) Check user existence
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (user_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"User with id={user_id} not found.")

    # 8.2) Get direct messages (sender or recipient is the user)
    cur.execute(
        """
        SELECT id, sender_id, recipient_id, message, is_edited, is_deleted, sent_at
        FROM chat_messages
        WHERE recipient_id = %s OR sender_id = %s
        ORDER BY sent_at ASC;
        """,
        (user_id, user_id)
    )
    msgs = cur.fetchall()
    cur.close()
    return jsonify(msgs), 200


# ===========================
# 9) Send Direct Message
# ===========================
@chat_bp.route("/direct-messages", methods=["POST"])
def send_direct_message():
    """
    POST /chat/direct-messages
    Send a direct message between two users
    JSON Body:
    {
      "sender_id": <int>,
      "recipient_id": <int>,
      "message": "<message text>"
    }
    """
    data = request.get_json() or {}
    required_fields = ["sender_id", "recipient_id", "message"]
    if not all(field in data for field in required_fields):
        abort(400, "Missing required fields: 'sender_id', 'recipient_id' or 'message'.")

    sender_id = data["sender_id"]
    recipient_id = data["recipient_id"]
    message_text = data["message"]

    conn = get_db()
    cur = conn.cursor()

    # 9.1) Validate sender and recipient existence
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (sender_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Sender with id={sender_id} not found.")

    cur.execute("SELECT 1 FROM users WHERE id = %s;", (recipient_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Recipient with id={recipient_id} not found.")

    try:
        cur.execute(
            """
            INSERT INTO chat_messages (sender_id, recipient_id, message)
            VALUES (%s, %s, %s)
            RETURNING id, sender_id, recipient_id, message, is_edited, is_deleted, sent_at;
            """,
            (sender_id, recipient_id, message_text)
        )
        new_dm_row = cur.fetchone()
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        cur.close()
        abort(400, f"Integrity error: {e.pgerror}")
    finally:
        if not cur.closed:
            cur.close()

    return jsonify(new_dm_row), 201
