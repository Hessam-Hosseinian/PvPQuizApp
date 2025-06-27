from flask import Blueprint, request, jsonify
from app.db import query_db, modify_db

game_types_bp = Blueprint('game_types', __name__, url_prefix='/game-types')

@game_types_bp.route('/', methods=['GET'])
def get_game_types():
    types = query_db("SELECT * FROM game_types")
    return jsonify(types)

@game_types_bp.route('/', methods=['POST'])
def create_game_type():
    data = request.get_json()
    required_fields = ['name', 'description']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        result = modify_db(
            "INSERT INTO game_types (name, description) VALUES (%s, %s) RETURNING id",
            (data['name'], data['description'])
        )
        return jsonify({"message": "Game type created", "id": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
