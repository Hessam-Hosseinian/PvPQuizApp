from flask import Blueprint, request, jsonify, abort
import psycopg2
from ..db import get_db
from app.db import query_db, modify_db

notifications_bp = Blueprint("notifications", __name__ , url_prefix="/notifications")

@notifications_bp.route("/types", methods=["GET"])
def list_notification_types():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, template, importance FROM notification_types;")
    types = cur.fetchall()
    cur.close()
    return jsonify(types), 200

@notifications_bp.route("/types", methods=["POST"])
def create_notification_type():
    """
    Create a new notification type.
    JSON:
    {
      "name": "friend_request",
      "template": "User {from} sent you a friend request.",
      "importance": "normal"
    }
    """
    data = request.get_json() or {}
    required = ["name", "template"]
    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields."}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO notification_types (name, template, importance)
            VALUES (%s, %s, %s)
            RETURNING id, name, template, importance;
            """,
            (data["name"], data["template"], data.get("importance", "normal"))
        )
        new_type = cur.fetchone()
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        abort(400, f"Integrity error: {e}")
    finally:
        cur.close()
    return jsonify(new_type), 201

@notifications_bp.route("/", methods=["GET"])
def list_notifications():
    """
    Display all unread notifications.
    You can send the user_id parameter with ?user_id=3
    """
    user_id = request.args.get("user_id")
    if not user_id:
        abort(400, "Missing 'user_id' query parameter.")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, type_id, user_id, data, is_read, created_at, related_game_id
        FROM notifications
        WHERE user_id = %s AND is_read = FALSE
        ORDER BY created_at DESC;
        """,
        (int(user_id),)
    )
    notes = cur.fetchall()
    cur.close()
    return jsonify(notes), 200

@notifications_bp.route("/<int:note_id>/read", methods=["POST"])
def mark_as_read(note_id):
    """
    Mark a notification as read
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE notifications SET is_read = TRUE WHERE id = %s RETURNING id, is_read;",
        (note_id,)
    )
    updated = cur.fetchone()
    if not updated:
        conn.rollback()
        cur.close()
        abort(404, f"Notification {note_id} not found.")
    conn.commit()
    cur.close()
    return jsonify(updated), 200

@notifications_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_notifications(user_id):
    notifications = query_db("SELECT * FROM notifications WHERE user_id = %s", (user_id,))
    return jsonify(notifications)

@notifications_bp.route('/', methods=['POST'])
def create_notification():
    data = request.get_json()
    required_fields = ['user_id', 'data', 'type_id']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        result = modify_db(
            "INSERT INTO notifications (user_id, data, type_id) VALUES (%s, %s, %s) RETURNING id",
            (data['user_id'], data['data'], data['type_id'])
        )
        return jsonify({"message": "Notification created", "id": result['id']}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
