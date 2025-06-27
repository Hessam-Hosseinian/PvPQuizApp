from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from psycopg2 import IntegrityError
from functools import wraps
from app.db import query_db, modify_db

users_bp = Blueprint('users', __name__, url_prefix='/users')

# ---------------- Helper Functions ---------------- #

def extract_json(fields):
    """ Extract and validate fields from request JSON """
    data = request.get_json() or {}
    missing = [f for f in fields if not data.get(f)]
    return data, missing

def error_response(message, code=400, **kwargs):
    return jsonify({"error": message, **kwargs}), code

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return error_response("Login required to access this resource", 401)
        return f(*args, **kwargs)
    return wrapper

# ---------------- API Routes ---------------- #

@users_bp.route('', methods=['GET'])
def list_users():
    users = query_db("""
        SELECT id, username, email, created_at, last_login, is_active, role, current_level, total_xp 
        FROM users
    """)
    return jsonify(users), 200


@users_bp.route('', methods=['POST'])
def create_user():
    data, missing = extract_json(['username', 'email', 'password'])
    if missing:
        return error_response("Missing required fields", details=', '.join(missing))
    if '@' not in data['email']:
        return error_response("Invalid email address")

    password_hash = generate_password_hash(data['password'])
    try:
        user_id = modify_db("""
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (data['username'], data['email'], password_hash))
        return jsonify({"message": "User created successfully", "user_id": user_id}), 201

    except IntegrityError as e:
        msg = str(e).lower()
        if "users_username_key" in msg:
            return error_response("Username already exists", 409)
        elif "users_email_key" in msg:
            return error_response("Email already registered", 409)
        return error_response("Database integrity error")

    except Exception:
        return error_response("Internal server error", 500)


@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = query_db("""
        SELECT id, username, email, created_at, last_login, is_active, role, current_level, total_xp
        FROM users WHERE id = %s
    """, (user_id,), one=True)
    if not user:
        return error_response("User not found", 404)
    return jsonify(user), 200


@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json() or {}
    fields, values = [], []

    mapping = {
        'username': "username = %s",
        'email': "email = %s",
        'is_active': "is_active = %s",
        'role': "role = %s",
        'current_level': "current_level = %s",
        'total_xp': "total_xp = %s",
        'password': "password_hash = %s"
    }

    for key, clause in mapping.items():
        if key in data:
            val = generate_password_hash(data[key]) if key == 'password' else data[key]
            fields.append(clause)
            values.append(val)

    if not fields:
        return error_response("No valid fields to update")

    values.append(user_id)
    try:
        result = modify_db(f"""
            UPDATE users SET {', '.join(fields)}
            WHERE id = %s RETURNING id
        """, tuple(values))
        if not result:
            return error_response("User not found", 404)
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        return error_response(str(e))


@users_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        result = modify_db("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        if not result:
            return error_response("User not found", 404)
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return error_response(str(e))


@users_bp.route('/login', methods=['POST'])
def login_user():
    data, missing = extract_json(['username', 'password'])
    if missing:
        return error_response("Username and password fields are required")

    user = query_db("""
        SELECT id, username, password_hash, is_active
        FROM users WHERE username = %s
    """, (data['username'],), one=True)
    
    if not user or not check_password_hash(user['password_hash'], data['password']):
        return error_response("Invalid username or password", 401)

    if not user['is_active']:
        return error_response("Your account is inactive", 403)

    session.clear()
    session['user_id'] = user['id']
    session['username'] = user['username']

    try:
        modify_db("UPDATE users SET last_login = NOW() WHERE id = %s", (user['id'],))
    except:
        pass

    return jsonify({
        "message": "Logged in successfully",
        "user_id": user['id'],
        "username": user['username']
    }), 200


@users_bp.route('/logout', methods=['POST'])
def logout_user():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


@users_bp.route('/profile', methods=['GET'])
@login_required
def user_profile():
    user = query_db("""
        SELECT id, username, email, created_at, last_login, current_level, total_xp
        FROM users WHERE id = %s
    """, (session['user_id'],), one=True)

    if not user:
        return error_response("User not found", 404)
    return jsonify(user), 200
