from decimal import Decimal
from typing import Any, Dict, List
from flask import Blueprint, jsonify

from ..db import get_db, query_db

# Blueprint for statistics-related endpoints
stats_bp = Blueprint("stats", __name__, url_prefix="/stats")


def _convert_decimal(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert Decimal fields in a row to float.
    """
    return {key: (float(value) if isinstance(value, Decimal) else value)
            for key, value in row.items()}


@stats_bp.route("/top10-winrate", methods=["GET"])
def get_top10_winrate() -> Any:
    """
    Return the top 10 users by win rate.
    """
    sql = """
        SELECT
          u.id           AS user_id,
          u.username     AS username,
          us.games_won   AS games_won,
          us.games_played AS games_played,
          ROUND(
            (us.games_won::numeric / NULLIF(us.games_played, 0)) * 100
          , 2)           AS win_rate
        FROM users u
        JOIN user_stats us ON u.id = us.user_id
        WHERE us.games_played > 0
        ORDER BY us.games_won::numeric / us.games_played DESC
        LIMIT 10;
    """
    rows = query_db(sql)
    if not rows:
        return jsonify({"message": "No user statistics found."}), 404

    result = [_convert_decimal(row) for row in rows]
    return jsonify(result), 200


@stats_bp.route("/most-played-categories", methods=["GET"])
def get_most_played_categories() -> Any:
    """
    Return the 10 most-played categories by number of times used in rounds.
    """
    sql = """
        SELECT
          c.id           AS category_id,
          c.name         AS category_name,
          COUNT(*)       AS times_played
        FROM categories c
        JOIN questions q ON q.category_id = c.id
        JOIN game_round_questions grq ON grq.question_id = q.id
        JOIN game_rounds gr ON gr.id = grq.game_round_id
        GROUP BY c.id, c.name
        ORDER BY times_played DESC
        LIMIT 10;
    """
    rows = query_db(sql)
    result = [dict(row) for row in rows]
    return jsonify(result), 200


@stats_bp.route("/user-winloss/<int:user_id>", methods=["GET"])
def get_user_winloss(user_id: int) -> Any:
    """
    Return win/loss statistics for a single user.
    """
    sql = """
        SELECT
          us.user_id,
          us.games_won,
          us.games_played - us.games_won AS games_lost,
          ROUND(
            CASE WHEN us.games_played = 0 THEN 0
                 ELSE (us.games_won::numeric / us.games_played) * 100
            END, 2
          ) AS win_rate_percentage,
          us.correct_answers,
          us.total_answers
        FROM user_stats us
        WHERE us.user_id = %s;
    """
    rows = query_db(sql, (user_id,))
    if not rows:
        return jsonify({"message": "User not found."}), 404

    data = _convert_decimal(rows[0])
    return jsonify(data), 200


@stats_bp.route("/user-count", methods=["GET"])
def get_user_count() -> Any:
    """
    Return the total number of registered users.
    """
    sql = "SELECT COUNT(*)::integer AS total_users FROM users;"
    rows = query_db(sql)
    return jsonify(rows[0]), 200
