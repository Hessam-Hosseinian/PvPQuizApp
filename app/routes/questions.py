from decimal import Decimal
from typing import Any, Dict, List, Optional
from flask import Blueprint, request, jsonify, abort

from app.db import query_db, modify_db

questions_bp = Blueprint('questions_bp', __name__, url_prefix='/questions')


def _convert_decimal(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert Decimal values in a dict to floats for JSON serialization.
    """
    return {k: (float(v) if isinstance(v, Decimal) else v) for k, v in row.items()}


def _build_update_clause(fields: Dict[str, Any], table: str, key: str) -> (str, List[Any]):
    """
    Build dynamic SQL UPDATE clause and parameters.
    Returns SQL string (without RETURNING) and parameters.
    """
    parts: List[str] = []
    params: List[Any] = []
    for col, val in fields.items():
        parts.append(f"{col} = %s")
        params.append(val)
    sql = f"UPDATE {table} SET {', '.join(parts)} WHERE {key} = %s"
    return sql, params


@questions_bp.route('', methods=['GET'])
def list_questions() -> Any:
    """
    List questions with optional filters: verified, difficulty, category_id.
    Query params:
      - verified=true
      - difficulty=<easy|medium|hard>
      - category_id=<int>
    """
    args = request.args
    conditions: List[str] = []
    params: List[Any] = []

    if args.get('verified') == 'true':
        conditions.append('is_verified = TRUE')
    if difficulty := args.get('difficulty'):
        conditions.append('difficulty = %s')
        params.append(difficulty)
    if cat := args.get('category_id'):
        conditions.append('category_id = %s')
        params.append(int(cat))

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ''
    sql = (
        "SELECT id, text, category_id, difficulty, is_verified, created_at, created_by "
        f"FROM questions {where};"
    )
    questions = query_db(sql, tuple(params))
    # Convert any Decimal fields
    return jsonify([_convert_decimal(q) for q in questions]), 200


@questions_bp.route('', methods=['POST'])
def create_question() -> Any:
    """
    Create a new unverified question.
    JSON body must include: text (str), category_id (int), difficulty (str).
    Optional: created_by (int).
    Returns the created question record.
    """
    if not request.is_json:
        abort(400, description='Request must be JSON')
    data = request.get_json()
    required = {'text', 'category_id', 'difficulty'}
    if not required.issubset(data):
        abort(400, description='Missing required fields: text, category_id, difficulty')

    sql = (
        "INSERT INTO questions(text, category_id, difficulty, is_verified, created_by) "
        "VALUES(%s, %s, %s, FALSE, %s) "
        "RETURNING id, text, category_id, difficulty, is_verified, created_at, created_by"
    )
    params = (
        data['text'], data['category_id'], data['difficulty'], data.get('created_by')
    )
    try:
        new_q = query_db(sql, params, one=True)
    except Exception as e:
        abort(400, description=str(e))

    return jsonify(_convert_decimal(new_q)), 201


@questions_bp.route('/<int:q_id>', methods=['GET'])
def get_question(q_id: int) -> Any:
    """
    Retrieve a question and its choices by question ID.
    """
    sql_q = (
        "SELECT id, text, category_id, difficulty, is_verified, created_at, created_by "
        "FROM questions WHERE id = %s"
    )
    question = query_db(sql_q, (q_id,), one=True)
    if not question:
        abort(404, description=f'Question {q_id} not found')

    sql_c = (
        "SELECT id, choice_text, is_correct, position "
        "FROM question_choices WHERE question_id = %s ORDER BY position"
    )
    choices = query_db(sql_c, (q_id,))

    question = _convert_decimal(question)
    question['choices'] = choices
    return jsonify(question), 200


@questions_bp.route('/<int:q_id>', methods=['PUT'])
def update_question(q_id: int) -> Any:
    """
    Update fields of a question.
    Allowed JSON fields: text, category_id, difficulty, is_verified, created_by.
    Returns the updated question record.
    """
    if not request.is_json:
        abort(400, description='Request must be JSON')
    data = request.get_json()
    allowed = {'text', 'category_id', 'difficulty', 'is_verified', 'created_by'}
    fields = {k: data[k] for k in data if k in allowed}
    if not fields:
        abort(400, description='No valid fields to update')

    sql, params = _build_update_clause(fields, 'questions', 'id')
    params.append(q_id)
    try:
        updated = query_db(
            sql + ' RETURNING id, text, category_id, difficulty, is_verified, created_at, created_by',
            tuple(params),
            one=True
        )
        if not updated:
            abort(404, description=f'Question {q_id} not found')
    except Exception as e:
        abort(400, description=str(e))

    return jsonify(_convert_decimal(updated)), 200


@questions_bp.route('/<int:q_id>', methods=['DELETE'])
def delete_question(q_id: int) -> Any:
    """
    Delete a question by ID.
    Returns the deleted question ID.
    """
    sql = 'DELETE FROM questions WHERE id = %s RETURNING id'
    try:
        deleted = query_db(sql, (q_id,), one=True)
    except Exception as e:
        abort(400, description=str(e))

    if not deleted:
        abort(404, description=f'Question {q_id} not found')

    return jsonify({'deleted_id': deleted['id']}), 200


@questions_bp.route('/difficulty-stats', methods=['GET'])
def get_difficulty_stats() -> Any:
    """
    Get difficulty statistics for questions.
    Query params:
      - category_id=<int> (optional, filter by category)
      - verified=true (optional, only verified questions)
    Returns difficulty distribution for questions.
    """
    args = request.args
    conditions: List[str] = []
    params: List[Any] = []

    if args.get('verified') == 'true':
        conditions.append('is_verified = TRUE')
    if cat := args.get('category_id'):
        conditions.append('category_id = %s')
        params.append(int(cat))

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ''
    
    sql = (
        "SELECT difficulty, COUNT(*) as count "
        f"FROM questions {where} "
        "GROUP BY difficulty "
        "ORDER BY difficulty"
    )
    
    try:
        stats = query_db(sql, tuple(params))
        # Convert to a more convenient format
        result = {
            'easy': 0,
            'medium': 0,
            'hard': 0,
            'total': 0
        }
        
        for stat in stats:
            difficulty = stat['difficulty']
            count = stat['count']
            result[difficulty] = count
            result['total'] += count
            
        return jsonify(result), 200
    except Exception as e:
        abort(400, description=str(e))
