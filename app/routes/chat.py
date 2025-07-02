# File: app/routes/chat.py

import psycopg2
from flask import Blueprint, request, jsonify, abort, session
from ..db import get_db  # Assuming get_db returns a Psycopg2 connection
from app.db import query_db, modify_db
from .users import login_required # Import the login_required decorator

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
@login_required
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
    creator_id = session['user_id']

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
        
        # Add creator to the room members
        cur.execute(
            """
            INSERT INTO chat_room_members (room_id, user_id)
            VALUES (%s, %s);
            """,
            (new_room_row['id'], creator_id)
        )

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
@login_required
def join_room(room_id):
    """
    POST /chat/rooms/<room_id>/members
    User join to a specific room
    JSON Body: { "user_id": <int> }
    """
    user_id = session['user_id'] # Get user_id from session

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
@login_required
def list_messages(room_id):
    """
    GET /chat/rooms/<room_id>/messages
    Return all messages in the specified room (sorted by sent_at ASC)
    """
    user_id = session['user_id']
    conn = get_db()
    cur = conn.cursor()

    # 6.1) Validate room existence and user membership
    cur.execute("""
        SELECT 1 FROM chat_room_members 
        WHERE room_id = %s AND user_id = %s
    """, (room_id, user_id))
    if cur.fetchone() is None:
        cur.close()
        abort(403, f"User is not a member of room {room_id} or room does not exist.")

    cur.execute(
        """
        SELECT m.id, m.room_id, m.sender_id, u.username as sender_username, u.avatar as sender_avatar, 
               m.reply_to_id, m.message, m.is_edited, m.is_deleted, m.sent_at
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.room_id = %s
        ORDER BY m.sent_at ASC;
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
@login_required
def send_message(room_id):
    """
    POST /chat/rooms/<room_id>/messages
    Send a new message in the specified room
    JSON Body:
    {
      "message": "<message text>", 
      "reply_to_id": <int> (optional)
    }
    """
    data = request.get_json() or {}
    sender_id = session['user_id'] # Get sender_id from session
    message_text = data.get("message")

    if not message_text:
        abort(400, "Missing 'message' in request body.")

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
# 8) Get All Messages From a Specific User
# ===========================
@chat_bp.route("/users/<int:user_id>/messages", methods=["GET"])
@login_required
def get_user_messages(user_id):
    """
    GET /chat/users/<user_id>/messages
    Return all messages sent by the specified user
    """
    # Security: Only allow user to see their own messages.
    # (Future enhancement: allow admins to see anyone's messages)
    if session['user_id'] != user_id:
        abort(403, "You are not authorized to view these messages.")

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
# 9) Send Direct Message to a User
# ===========================
@chat_bp.route("/direct-messages", methods=["POST"])
@login_required
def send_direct_message():
    """
    POST /chat/direct-messages
    Send a direct message to a user
    JSON Body:
    {
      "recipient_id": <int>,
      "message": "<message text>", 
      "reply_to_id": <int> (optional)
    }
    """
    data = request.get_json() or {}
    sender_id = session['user_id']
    recipient_id = data.get("recipient_id")
    message_text = data.get("message")

    if recipient_id is None or not message_text:
        abort(400, "Missing 'recipient_id' or 'message' in request body.")

    if sender_id == recipient_id:
        abort(400, "Sender and recipient cannot be the same person.")

    conn = get_db()
    cur = conn.cursor()

    # 9.1) Validate sender existence
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (sender_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Sender with id={sender_id} not found.")

    # 9.2) Check recipient existence
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (recipient_id,))
    if cur.fetchone() is None:
        cur.close()
        abort(404, f"Recipient with id={recipient_id} not found.")

    # 9.3) If reply_to_id exists, validate that the message exists and involves the sender/recipient
    reply_to_id = data.get("reply_to_id")
    if reply_to_id is not None:
        cur.execute(
            """
            SELECT 1 FROM chat_messages 
            WHERE id = %s AND (sender_id = %s OR recipient_id = %s);
            """,
            (reply_to_id, sender_id, recipient_id)
        )
        if cur.fetchone() is None:
            cur.close()
            abort(400, f"Invalid 'reply_to_id': message not found or not part of this conversation.")

    try:
        cur.execute(
            """
            INSERT INTO chat_messages (sender_id, recipient_id, reply_to_id, message)
            VALUES (%s, %s, %s, %s)
            RETURNING id, room_id, sender_id, recipient_id, reply_to_id, message, is_edited, is_deleted, sent_at;
            """,
            (sender_id, recipient_id, reply_to_id, message_text)
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
# 10) List User's Conversations
# ===========================
@chat_bp.route("/direct-messages/conversations", methods=["GET"])
@login_required
def list_conversations():
    """
    GET /chat/direct-messages/conversations
    Lists all of a user's direct message conversations.
    A conversation is defined by unique pairs of sender/recipient.
    """
    user_id = session['user_id']
    
    # This query is complex. It finds the last message for each conversation.
    # It uses a window function `ROW_NUMBER()` to partition messages by conversation partners
    # and pick the most recent one.
    query = """
    WITH last_messages AS (
        SELECT
            id,
            sender_id,
            recipient_id,
            message,
            sent_at,
            ROW_NUMBER() OVER(PARTITION BY
                CASE WHEN sender_id = %s THEN recipient_id ELSE sender_id END
                ORDER BY sent_at DESC
            ) as rn
        FROM chat_messages
        WHERE
            (sender_id = %s OR recipient_id = %s) AND recipient_id IS NOT NULL
    )
    SELECT
        lm.message as last_message,
        lm.sent_at as last_message_at,
        CASE WHEN lm.sender_id = %s THEN lm.recipient_id ELSE lm.sender_id END as other_user_id,
        u.username as other_user_username,
        u.avatar as other_user_avatar,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.sender_id = u.id AND cm.recipient_id = %s AND cm.is_read = FALSE) as unread_count
    FROM last_messages lm
    JOIN users u ON u.id = (CASE WHEN lm.sender_id = %s THEN lm.recipient_id ELSE lm.sender_id END)
    WHERE lm.rn = 1
    ORDER BY last_message_at DESC;
    """
    
    conversations = query_db(query, (user_id, user_id, user_id, user_id, user_id, user_id))
    return jsonify(conversations), 200


# ===========================
# 11) Get Direct Message History with Another User
# ===========================
@chat_bp.route("/direct-messages/<int:other_user_id>", methods=["GET"])
@login_required
def get_direct_message_history(other_user_id):
    """
    GET /chat/direct-messages/<other_user_id>
    Gets the message history between the logged-in user and another user.
    """
    user_id = session['user_id']
    
    # Mark messages as read
    modify_db(
        "UPDATE chat_messages SET is_read = TRUE WHERE sender_id = %s AND recipient_id = %s",
        (other_user_id, user_id)
    )

    query = """
    SELECT m.id, m.room_id, m.sender_id, u.username as sender_username, u.avatar as sender_avatar, 
           m.reply_to_id, m.message, m.is_edited, m.is_deleted, m.sent_at
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = %s AND m.recipient_id = %s) OR (m.sender_id = %s AND m.recipient_id = %s)
    ORDER BY m.sent_at ASC;
    """
    
    messages = query_db(query, (user_id, other_user_id, other_user_id, user_id))
    return jsonify(messages), 200
