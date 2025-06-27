# app/routes/users_bp.py

from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from psycopg2 import IntegrityError
from app.db import query_db, modify_db
# from decorators import requires_admin

users_bp = Blueprint(
    'users',
    __name__,
    url_prefix='/users'
)

# -----------------------------------------------
# GET   /users           ← List all users
# -----------------------------------------------
@users_bp.route('', methods=['GET'])
# @requires_admin
def list_users():
    users = query_db("""
        SELECT 
            id, 
            username, 
            email, 
            created_at, 
            last_login, 
            is_active, 
            role, 
            current_level, 
            total_xp 
        FROM users
    """)
    return jsonify(users), 200

# -----------------------------------------------
# POST  /users           ← Create a new user
# -----------------------------------------------
@users_bp.route('', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    required_fields = ['username', 'email', 'password']
    missing_fields = [f for f in required_fields if f not in data or not data.get(f)]
    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "details": f"{', '.join(missing_fields)}"
        }), 400

    if "@" not in data["email"]:
        return jsonify({"error": "Invalid email address"}), 400

    password_hash = generate_password_hash(data['password'])
    try:
        result = modify_db(
            """
            INSERT INTO users (username, email, password_hash) 
            VALUES (%s, %s, %s) 
            RETURNING id
            """,
            (data['username'], data['email'], password_hash)
        )
        new_id = result if isinstance(result, int) else result.get("id")
        return jsonify({
            "message": "User created successfully",
            "user_id": new_id
        }), 201

    except IntegrityError as e:
        msg = str(e).lower()
        if "users_username_key" in msg:
            return jsonify({"error": "Username already exists"}), 409
        elif "users_email_key" in msg:
            return jsonify({"error": "Email already registered"}), 409
        else:
            return jsonify({"error": "Database integrity error"}), 400

    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# ------------------------------------------------------
# GET   /users/<int:user_id>   ← Get user details
# ------------------------------------------------------
@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = query_db(
        """
        SELECT 
            id, 
            username, 
            email, 
            created_at, 
            last_login, 
            is_active, 
            role, 
            current_level, 
            total_xp 
        FROM users 
        WHERE id = %s
        """,
        (user_id,),
        one=True
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user), 200

# -----------------------------------------------------------------------
# PUT   /users/<int:user_id>   ← Update user details (PATCH-like)
# -----------------------------------------------------------------------
@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json() or {}
    fields = []
    values = []

    if 'username' in data:
        fields.append("username = %s")
        values.append(data['username'])
    if 'email' in data:
        fields.append("email = %s")
        values.append(data['email'])
    if 'password' in data:
        pwd_hash = generate_password_hash(data['password'])
        fields.append("password_hash = %s")
        values.append(pwd_hash)
    if 'is_active' in data:
        fields.append("is_active = %s")
        values.append(data['is_active'])
    if 'role' in data:
        fields.append("role = %s")
        values.append(data['role'])
    if 'current_level' in data:
        fields.append("current_level = %s")
        values.append(data['current_level'])
    if 'total_xp' in data:
        fields.append("total_xp = %s")
        values.append(data['total_xp'])

    if not fields:
        return jsonify({"error": "No valid fields to update"}), 400

    values.append(user_id)
    sql = f"""
        UPDATE users 
        SET {', '.join(fields)} 
        WHERE id = %s 
        RETURNING id
    """
    try:
        updated_id = modify_db(sql, tuple(values))
        if updated_id is None:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# -----------------------------------------------------
# DELETE  /users/<int:user_id>   ← Delete a user
# -----------------------------------------------------
@users_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        deleted = modify_db(
            "DELETE FROM users WHERE id = %s RETURNING id",
            (user_id,)
        )
        if not deleted:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# -----------------------------------------------
# POST  /users/login   ← User Login
# body JSON: { "username": "...", "password": "..." }
# -----------------------------------------------
@users_bp.route('/login', methods=['POST'])
def login_user():
    data = request.get_json() or {}
  
    username = data.get('username')
    password = data.get('password')
 

    if not username or not password:
        return jsonify({"error": "Username and password fields are required"}), 400

    user = query_db(
        """
        SELECT id, username, password_hash, is_active
        FROM users
        WHERE username = %s
        """,
        (username,),
        one=True
    )
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    user_id = user['id']
    username = user['username']
    pwd_hash = user['password_hash']
    is_active = user['is_active']

    if not is_active:
        return jsonify({"error": "Your account is inactive"}), 403

    if not check_password_hash(pwd_hash, password):
        return jsonify({"error": "Invalid username or password"}), 401

    # Successful login: Set session and update last_login
    session.clear()
    session['user_id'] = user_id
    session['username'] = username

    try:
        modify_db(
            "UPDATE users SET last_login = NOW() WHERE id = %s",
            (user_id,)
        )
    except Exception:
        pass

    return jsonify({
        "message": "Logged in successfully",
        "user_id": user_id,
        "username": username
    }), 200

# -----------------------------------------------
# POST  /users/logout  ← User Logout
# -----------------------------------------------
@users_bp.route('/logout', methods=['POST'])
def logout_user():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

# -----------------------------------------------
# Example Protected Route (Login Required)
# -----------------------------------------------
from functools import wraps

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Login required to access this resource"}), 401
        return f(*args, **kwargs)
    return decorated_function

@users_bp.route('/profile', methods=['GET'])
@login_required
def user_profile():
    user_id = session['user_id']
    user = query_db(
        """
        SELECT id, username, email, created_at, last_login, current_level, total_xp
        FROM users
        WHERE id = %s
        """,
        (user_id,),
        one=True
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user), 200
