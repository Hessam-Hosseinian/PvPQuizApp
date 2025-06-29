from decimal import Decimal
from typing import Any, Dict, List, Optional
from flask import Blueprint, request, jsonify, abort

from app.db import query_db, modify_db

categories_bp = Blueprint('categories_bp', __name__, url_prefix='/categories')


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


@categories_bp.route('', methods=['GET'])
def list_categories() -> Any:
    """
    List all categories.
    """
    sql = "SELECT id, name, description, created_at FROM categories ORDER BY name;"
    categories = query_db(sql)
    # Convert any Decimal fields
    return jsonify([_convert_decimal(cat) for cat in categories]), 200


@categories_bp.route('', methods=['POST'])
def create_category() -> Any:
    """
    Create a new category.
    JSON body must include: name (str).
    Optional: description (str).
    Returns the created category record.
    """
    if not request.is_json:
        abort(400, description='Request must be JSON')
    data = request.get_json()
    required = {'name'}
    if not required.issubset(data):
        abort(400, description='Missing required fields: name')

    sql = (
        "INSERT INTO categories(name, description) "
        "VALUES(%s, %s) "
        "RETURNING id, name, description, created_at"
    )
    params = (data['name'], data.get('description'))
    try:
        new_cat = query_db(sql, params, one=True)
    except Exception as e:
        abort(400, description=str(e))

    return jsonify(_convert_decimal(new_cat)), 201


@categories_bp.route('/<int:c_id>', methods=['GET'])
def get_category(c_id: int) -> Any:
    """
    Retrieve a category by ID.
    """
    sql = (
        "SELECT id, name, description, created_at "
        "FROM categories WHERE id = %s"
    )
    category = query_db(sql, (c_id,), one=True)
    if not category:
        abort(404, description=f'Category {c_id} not found')

    return jsonify(_convert_decimal(category)), 200


@categories_bp.route('/<int:c_id>', methods=['PUT'])
def update_category(c_id: int) -> Any:
    """
    Update fields of a category.
    Allowed JSON fields: name, description.
    Returns the updated category record.
    """
    if not request.is_json:
        abort(400, description='Request must be JSON')
    data = request.get_json()
    allowed = {'name', 'description'}
    fields = {k: data[k] for k in data if k in allowed}
    if not fields:
        abort(400, description='No valid fields to update')

    sql, params = _build_update_clause(fields, 'categories', 'id')
    params.append(c_id)
    try:
        updated = query_db(
            sql + ' RETURNING id, name, description, created_at',
            tuple(params),
            one=True
        )
        if not updated:
            abort(404, description=f'Category {c_id} not found')
    except Exception as e:
        abort(400, description=str(e))

    return jsonify(_convert_decimal(updated)), 200


@categories_bp.route('/<int:c_id>', methods=['DELETE'])
def delete_category(c_id: int) -> Any:
    """
    Delete a category by ID.
    Returns the deleted category ID.
    """
    sql = 'DELETE FROM categories WHERE id = %s RETURNING id'
    try:
        deleted = query_db(sql, (c_id,), one=True)
    except Exception as e:
        abort(400, description=str(e))

    if not deleted:
        abort(404, description=f'Category {c_id} not found')

    return jsonify({'deleted_id': deleted['id']}), 200


@categories_bp.route('/<int:c_id>/stats', methods=['GET'])
def get_category_stats(c_id: int) -> Any:
    """
    Get comprehensive statistics for a category.
    """
    # First check if category exists
    category_sql = "SELECT id FROM categories WHERE id = %s"
    category = query_db(category_sql, (c_id,), one=True)
    if not category:
        abort(404, description=f'Category {c_id} not found')

    # Get question statistics
    questions_sql = """
        SELECT 
            COUNT(*) as total_questions,
            COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_questions,
            COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as easy_questions,
            COUNT(CASE WHEN difficulty = 'medium' THEN 1 END) as medium_questions,
            COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as hard_questions
        FROM questions 
        WHERE category_id = %s
    """
    question_stats = query_db(questions_sql, (c_id,), one=True)

    # Get game statistics - using game_rounds table
    games_sql = """
        SELECT 
            COUNT(DISTINCT g.id) as total_games,
            COUNT(DISTINCT gr.id) as total_rounds,
            AVG(gr.points_possible) as avg_points_possible
        FROM games g
        JOIN game_rounds gr ON g.id = gr.game_id
        WHERE gr.category_id = %s AND g.status = 'completed'
    """
    game_stats = query_db(games_sql, (c_id,), one=True)

    # Get player statistics - using game_participants and game_rounds
    players_sql = """
        SELECT 
            COUNT(DISTINCT gp.user_id) as total_players,
            COUNT(DISTINCT CASE WHEN g.end_time > NOW() - INTERVAL '7 days' THEN gp.user_id END) as active_players
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.id
        JOIN game_rounds gr ON g.id = gr.game_id
        WHERE gr.category_id = %s AND g.status = 'completed'
    """
    player_stats = query_db(players_sql, (c_id,), one=True)

    # Get score statistics - using round_answers and game_round_questions
    scores_sql = """
        SELECT 
            AVG(ra.points_earned) as average_score,
            MAX(ra.points_earned) as best_score,
            AVG(EXTRACT(EPOCH FROM (gr.end_time - gr.start_time))) as average_completion_time
        FROM round_answers ra
        JOIN game_round_questions grq ON ra.game_round_question_id = grq.id
        JOIN game_rounds gr ON grq.game_round_id = gr.id
        JOIN games g ON gr.game_id = g.id
        WHERE gr.category_id = %s AND g.status = 'completed' AND gr.end_time IS NOT NULL
    """
    score_stats = query_db(scores_sql, (c_id,), one=True)

    # Combine all statistics
    stats = {
        'total_questions': question_stats['total_questions'] or 0,
        'verified_questions': question_stats['verified_questions'] or 0,
        'easy_questions': question_stats['easy_questions'] or 0,
        'medium_questions': question_stats['medium_questions'] or 0,
        'hard_questions': question_stats['hard_questions'] or 0,
        'total_players': player_stats['total_players'] or 0,
        'active_players': player_stats['active_players'] or 0,
        'average_score': float(score_stats['average_score']) if score_stats['average_score'] else 0,
        'best_score': float(score_stats['best_score']) if score_stats['best_score'] else 0,
        'total_games': game_stats['total_games'] or 0,
        'average_completion_time': float(score_stats['average_completion_time']) if score_stats['average_completion_time'] else 0
    }

    return jsonify(_convert_decimal(stats)), 200


@categories_bp.route('/<int:c_id>/players', methods=['GET'])
def get_category_players(c_id: int) -> Any:
    """
    Get top players for a category.
    """
    # First check if category exists
    category_sql = "SELECT id FROM categories WHERE id = %s"
    category = query_db(category_sql, (c_id,), one=True)
    if not category:
        abort(404, description=f'Category {c_id} not found')

    # Get top players with their statistics using the correct schema
    players_sql = """
        SELECT 
            u.id as user_id,
            u.username,
            COUNT(DISTINCT g.id) as games_played,
            MAX(ra.points_earned) as best_score,
            AVG(ra.points_earned) as average_score,
            MAX(g.end_time) as last_played_at,
            ROW_NUMBER() OVER (ORDER BY MAX(ra.points_earned) DESC) as rank
        FROM users u
        JOIN game_participants gp ON u.id = gp.user_id
        JOIN games g ON gp.game_id = g.id
        JOIN game_rounds gr ON g.id = gr.game_id
        JOIN game_round_questions grq ON gr.id = grq.game_round_id
        JOIN round_answers ra ON grq.id = ra.game_round_question_id AND ra.user_id = u.id
        WHERE gr.category_id = %s AND g.status = 'completed'
        GROUP BY u.id, u.username
        ORDER BY best_score DESC, games_played DESC
        LIMIT 10
    """
    players = query_db(players_sql, (c_id,))

    # Convert to proper format
    formatted_players = []
    for player in players:
        formatted_players.append({
            'user_id': player['user_id'],
            'username': player['username'],
            'games_played': player['games_played'],
            'best_score': float(player['best_score']) if player['best_score'] else 0,
            'average_score': float(player['average_score']) if player['average_score'] else 0,
            'last_played_at': player['last_played_at'].isoformat() if player['last_played_at'] else None,
            'rank': player['rank']
        })

    return jsonify(formatted_players), 200


@categories_bp.route('/<int:c_id>/leaderboard', methods=['GET'])
def get_category_leaderboard(c_id: int) -> Any:
    """
    Get leaderboard for a category.
    """
    # First check if category exists
    category_sql = "SELECT id FROM categories WHERE id = %s"
    category = query_db(category_sql, (c_id,), one=True)
    if not category:
        abort(404, description=f'Category {c_id} not found')

    # Get leaderboard data using the correct schema
    leaderboard_sql = """
        SELECT 
            u.id as user_id,
            u.username,
            COUNT(DISTINCT g.id) as games_played,
            SUM(ra.points_earned) as total_score,
            AVG(ra.points_earned) as average_score,
            MAX(ra.points_earned) as best_score,
            ROW_NUMBER() OVER (ORDER BY SUM(ra.points_earned) DESC) as rank
        FROM users u
        JOIN game_participants gp ON u.id = gp.user_id
        JOIN games g ON gp.game_id = g.id
        JOIN game_rounds gr ON g.id = gr.game_id
        JOIN game_round_questions grq ON gr.id = grq.game_round_id
        JOIN round_answers ra ON grq.id = ra.game_round_question_id AND ra.user_id = u.id
        WHERE gr.category_id = %s AND g.status = 'completed'
        GROUP BY u.id, u.username
        ORDER BY total_score DESC, best_score DESC
        LIMIT 20
    """
    leaderboard = query_db(leaderboard_sql, (c_id,))

    # Convert to proper format
    formatted_leaderboard = []
    for entry in leaderboard:
        formatted_leaderboard.append({
            'user_id': entry['user_id'],
            'username': entry['username'],
            'games_played': entry['games_played'],
            'total_score': float(entry['total_score']) if entry['total_score'] else 0,
            'average_score': float(entry['average_score']) if entry['average_score'] else 0,
            'best_score': float(entry['best_score']) if entry['best_score'] else 0,
            'rank': entry['rank']
        })

    return jsonify(formatted_leaderboard), 200
