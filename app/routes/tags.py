from flask import Blueprint, request, jsonify, abort
from ..db import get_db
from app.db import query_db, modify_db

tags_bp = Blueprint('tags', __name__, url_prefix='/tags')

@tags_bp.route('/', methods=['GET'])
def get_tags():
    tags = query_db("SELECT * FROM tags")
    return jsonify(tags)

@tags_bp.route('/', methods=['POST'])
def create_tag():
    data = request.get_json()
    required_fields = ['name']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        result = modify_db(
            "INSERT INTO tags (name) VALUES (%s) RETURNING id",
            (data['name'],)
        )
        return jsonify({"message": "Tag created", "id": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@tags_bp.route("/<int:tag_id>/questions", methods=["GET"])
def get_questions_by_tag(tag_id):
    """
    Display all questions associated with this tag.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT q.id, q.text, q.category_id, q.difficulty, q.created_at
        FROM questions q
        JOIN question_tags qt ON q.id = qt.question_id
        WHERE qt.tag_id = %s AND q.is_verified = TRUE;
    """, (tag_id,))
    qs = cur.fetchall()
    cur.close()
    return jsonify(qs), 200
