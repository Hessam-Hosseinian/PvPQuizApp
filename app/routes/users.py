from flask import Blueprint, request, jsonify, session, current_app, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from psycopg2 import IntegrityError
from functools import wraps
import os
import uuid
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

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_avatar(file):
    """Save uploaded avatar file and return filename"""
    if file and allowed_file(file.filename):
        # Generate unique filename
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.root_path, '..', 'static', 'uploads', 'avatars')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        return unique_filename
    return None

# ---------------- API Routes ---------------- #

@users_bp.route('', methods=['GET'])
def list_users():
    users = query_db("""
        SELECT id, username, email, created_at, last_login, is_active, role, current_level, total_xp, avatar
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
    
    from app.db import get_db
    db = get_db()
    cur = db.cursor()
    
    try:
        # Start transaction
        cur.execute("BEGIN")
        
        # Create user and get the user_id
        cur.execute("""
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (data['username'], data['email'], password_hash))
        
        user_id = cur.fetchone()['id']
        
        # Initialize user_stats for the new user
        cur.execute("""
            INSERT INTO user_stats (user_id)
            VALUES (%s)
        """, (user_id,))
        
        # Commit transaction
        db.commit()
        cur.close()
        
        return jsonify({"message": "User created successfully", "user_id": user_id}), 201

    except IntegrityError as e:
        # Rollback transaction
        db.rollback()
        cur.close()
        
        msg = str(e).lower()
        if "users_username_key" in msg:
            return error_response("Username already exists", 409)
        elif "users_email_key" in msg:
            return error_response("Email already registered", 409)
        return error_response("Database integrity error")

    except Exception as e:
        # Rollback transaction
        db.rollback()
        cur.close()
        return error_response("Internal server error", 500)


@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = query_db("""
        SELECT id, username, email, created_at, last_login, is_active, role, current_level, total_xp, avatar
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
        'password': "password_hash = %s",
        'avatar': "avatar = %s"
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
        SELECT id, username, email, created_at, last_login, current_level, total_xp, role, avatar
        FROM users WHERE id = %s
    """, (session['user_id'],), one=True)

    if not user:
        return error_response("User not found", 404)
    return jsonify(user), 200


@users_bp.route('/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """Upload user avatar"""
    if 'avatar' not in request.files:
        return error_response("No avatar file provided")
    
    file = request.files['avatar']
    if file.filename == '':
        return error_response("No file selected")
    
    # Save the new avatar
    filename = save_avatar(file)
    if not filename:
        return error_response("Invalid file type. Allowed: png, jpg, jpeg, gif, webp")
    
    # Get current avatar to delete old file
    current_user = query_db("SELECT avatar FROM users WHERE id = %s", (session['user_id'],), one=True)
    old_avatar = current_user.get('avatar') if current_user else None
    
    # Update database
    try:
        modify_db("UPDATE users SET avatar = %s WHERE id = %s", (filename, session['user_id']))
        
        # Delete old avatar file if it exists
        if old_avatar:
            old_avatar_path = os.path.join(
                current_app.root_path, '..', 'static', 'uploads', 'avatars', old_avatar
            )
            if os.path.exists(old_avatar_path):
                os.remove(old_avatar_path)
        
        return jsonify({
            "message": "Avatar uploaded successfully",
            "avatar": filename
        }), 200
        
    except Exception as e:
        # Delete the new file if database update failed
        new_avatar_path = os.path.join(
            current_app.root_path, '..', 'static', 'uploads', 'avatars', filename
        )
        if os.path.exists(new_avatar_path):
            os.remove(new_avatar_path)
        return error_response("Failed to update avatar", 500)


@users_bp.route('/avatar', methods=['DELETE'])
@login_required
def delete_avatar():
    """Delete user avatar"""
    # Get current avatar
    current_user = query_db("SELECT avatar FROM users WHERE id = %s", (session['user_id'],), one=True)
    if not current_user or not current_user.get('avatar'):
        return error_response("No avatar to delete", 404)
    
    avatar_filename = current_user['avatar']
    
    # Update database
    try:
        modify_db("UPDATE users SET avatar = NULL WHERE id = %s", (session['user_id'],))
        
        # Delete avatar file
        avatar_path = os.path.join(
            current_app.root_path, '..', 'static', 'uploads', 'avatars', avatar_filename
        )
        if os.path.exists(avatar_path):
            os.remove(avatar_path)
        
        return jsonify({"message": "Avatar deleted successfully"}), 200
        
    except Exception as e:
        return error_response("Failed to delete avatar", 500)


@users_bp.route('/avatar/<filename>', methods=['GET'])
def serve_avatar(filename):
    """Serve avatar file from static/uploads/avatars directory"""
    avatar_path = os.path.join(current_app.root_path, '..', 'static', 'uploads', 'avatars', filename)
    if not os.path.exists(avatar_path):
        return error_response("Avatar not found", 404)
    return send_from_directory(os.path.dirname(avatar_path), os.path.basename(avatar_path))
