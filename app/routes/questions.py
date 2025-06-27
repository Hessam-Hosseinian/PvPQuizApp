import time
from flask import Blueprint, request, jsonify
import psycopg2
from ..db import get_db
from app.db import query_db, modify_db
# from decorators import requires_admin

# All question-related endpoints live under /questions
questions_bp = Blueprint("questions_bp", __name__, url_prefix="/questions")


@questions_bp.route("/", methods=["GET"])
# @requires_admin
def list_questions():
    """
    List all questions (preferably only verified ones).
    Optional query-string parameters:
      - ?verified=true
      - ?difficulty=easy
      - ?category_id=3
    """
    args = request.args
    conditions = []
    params = []

    # If "verified=true" is passed, only return verified questions
    if args.get("verified") == "true":
        conditions.append("is_verified = TRUE")
    # Filter by difficulty if provided
    if args.get("difficulty"):
        conditions.append("difficulty = %s")
        params.append(args["difficulty"])
    # Filter by category_id if provided
    if args.get("category_id"):
        conditions.append("category_id = %s")
        params.append(int(args["category_id"]))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = (
        "SELECT id, text, category_id, difficulty, is_verified, created_at, created_by "
        f"FROM questions {where_clause};"
    )

    conn = get_db()
    cur = conn.cursor()
    cur.execute(sql, tuple(params))
    qs = cur.fetchall()
    cur.close()
    return jsonify(qs), 200


@questions_bp.route("/", methods=["POST"])
# @requires_admin
def create_question():
    """
    Create a new question (unverified by default).
    Expected JSON body:
    {
      "text": "...",
      "category_id": 1,
      "difficulty": "medium",
      "created_by": 4
    }
    """
    data = request.get_json() or {}
    required = ["text", "category_id", "difficulty"]
    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields."}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO questions (text, category_id, difficulty, is_verified, created_by)
            VALUES (%s, %s, %s, FALSE, %s)
            RETURNING id, text, category_id, difficulty, is_verified, created_at, created_by;
            """,
            (data["text"], data["category_id"], data["difficulty"], data.get("created_by"))
        )
        new_q = cur.fetchone()
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        return jsonify({"error": f"Integrity error: {e}"}), 400
    finally:
        cur.close()

    return jsonify(new_q), 201


@questions_bp.route("/<int:q_id>", methods=["GET"])
def get_question(q_id):
    """
    Retrieve details of a specific question along with its choices.
    """
    conn = get_db()
    cur = conn.cursor()
    # First, fetch the question itself
    cur.execute(
        "SELECT id, text, category_id, difficulty, is_verified, created_at, created_by "
        "FROM questions WHERE id = %s;",
        (q_id,)
    )
    question = cur.fetchone()
    
    if not question:
        cur.close()
        return jsonify({"error": f"Question {q_id} not found."}), 404

    # Then fetch its choices
    cur.execute(
        "SELECT id, choice_text, is_correct, position "
        "FROM question_choices "
        "WHERE question_id = %s ORDER BY position;",
        (q_id,)
    )
    choices = cur.fetchall()
   
    cur.close()
    
    # Build a response dict (depending on how your DB driver returns rows;
    # you may need to manually map tuple → dict keys).
    # Here I'll assume 'question' is a tuple; adjust accordingly.
    question_dict = {
        "id": question["id"],
        "text": question["text"],
        "category_id": question["category_id"],
        "difficulty": question["difficulty"],
        "is_verified": question["is_verified"],
        "created_at": question["created_at"],
        "created_by": question["created_by"],
        "choices": [
            {
                "id": choice["id"],
                "choice_text": choice["choice_text"],
                "is_correct": choice["is_correct"],
                "position": choice["position"]
            } for choice in choices
        ]
    }

    return jsonify(question_dict), 200


@questions_bp.route("/<int:q_id>", methods=["PUT"])
# @requires_admin
def update_question(q_id):
    """
    Update a question (e.g., mark as verified or change text).
    JSON body may include any of:
      - text
      - category_id
      - difficulty
      - is_verified
      - created_by
    """
    data = request.get_json() or {}
    allowed_fields = {"text", "category_id", "difficulty", "is_verified", "created_by"}
    fields_to_update = {k: data[k] for k in data if k in allowed_fields}

    if not fields_to_update:
        return jsonify({"error": "No valid fields to update."}), 400

    set_clause = ", ".join(f"{k} = %s" for k in fields_to_update)
    params = list(fields_to_update.values()) + [q_id]

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            f"""
            UPDATE questions
            SET {set_clause}
            WHERE id = %s
            RETURNING id, text, category_id, difficulty, is_verified, created_at, created_by;
            """,
            params
        )
        updated = cur.fetchone()
        if not updated:
            conn.rollback()
            return jsonify({"error": f"Question {q_id} not found."}), 404
        conn.commit()
    except psycopg2.IntegrityError as e:
        conn.rollback()
        return jsonify({"error": f"Integrity error: {e}"}), 400
    finally:
        cur.close()

    return jsonify(updated), 200


@questions_bp.route("/<int:q_id>", methods=["DELETE"])
#   @requires_admin
def delete_question(q_id):
    """
    Delete a question by its ID.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM questions CASCADE WHERE id = %s RETURNING id;", (q_id,))
    deleted = cur.fetchone()
    print(deleted)
    if not deleted:
        conn.rollback()
        cur.close()
        return jsonify({"error": f"Question {q_id} not found."}), 404
    conn.commit()
    cur.close()
    return jsonify({"deleted_id": deleted["id"]}), 200
