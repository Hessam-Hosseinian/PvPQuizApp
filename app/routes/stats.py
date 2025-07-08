from decimal import Decimal
from typing import Any, Dict, List
from flask import Blueprint, jsonify
from datetime import datetime, date

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
            (us.correct_answers::numeric / NULLIF(us.total_answers, 0)) * 100
          , 2)           AS accuracy_rate,
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
          us.current_streak,
          us.best_streak,
          ROUND(
            CASE WHEN us.games_played = 0 THEN 0
                 ELSE (us.games_won::numeric / us.games_played) * 100
            END, 2
          ) AS win_rate_percentage,
          us.correct_answers,
          us.total_answers,
          us.total_points
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


@stats_bp.route("/question-count", methods=["GET"])
def get_question_count() -> Any:
    """
    Return the total number of questions.
    """
    sql = "SELECT COUNT(*)::integer AS total_questions FROM questions;"
    rows = query_db(sql)
    return jsonify(rows[0]), 200


@stats_bp.route("/daily-stats", methods=["GET"])
def get_daily_stats() -> Any:
    """
    Return daily statistics including games played, new users, and questions answered today.
    """
    today = date.today()
    
    # Games played today
    games_sql = """
        SELECT COUNT(*)::integer AS games_played_today
        FROM games
        WHERE DATE(created_at) = %s AND status = 'completed';
    """
    
    # New users today
    users_sql = """
        SELECT COUNT(*)::integer AS new_users_today
        FROM users
        WHERE DATE(created_at) = %s;
    """
    
    # Questions answered today
    questions_sql = """
        SELECT COUNT(*)::integer AS questions_answered_today
        FROM round_answers
        WHERE DATE(answer_time) = %s;
    """
    
    games_result = query_db(games_sql, (today,))
    users_result = query_db(users_sql, (today,))
    questions_result = query_db(questions_sql, (today,))
    
    daily_stats = {
        "games_played_today": games_result[0]['games_played_today'] if games_result else 0,
        "new_users_today": users_result[0]['new_users_today'] if users_result else 0,
        "questions_answered_today": questions_result[0]['questions_answered_today'] if questions_result else 0
    }
    
    return jsonify(daily_stats), 200


@stats_bp.route("/recent-games", methods=["GET"])
def get_recent_games() -> Any:
    """
    Return recent completed games with player information.
    """
    sql = """
        SELECT 
            g.id,
            u1.username AS player1,
            u2.username AS player2,
            CASE 
                WHEN g.winner_id = u1.id THEN u1.username
                WHEN g.winner_id = u2.id THEN u2.username
                ELSE 'Draw'
            END AS winner,
            c.name AS category,
            EXTRACT(EPOCH FROM (g.end_time - g.start_time))::integer AS duration_seconds,
            g.created_at
        FROM games g
        JOIN game_participants gp1 ON g.id = gp1.game_id AND gp1.user_id = (
            SELECT MIN(user_id) FROM game_participants WHERE game_id = g.id
        )
        JOIN game_participants gp2 ON g.id = gp2.game_id AND gp2.user_id = (
            SELECT MAX(user_id) FROM game_participants WHERE game_id = g.id
        )
        JOIN users u1 ON gp1.user_id = u1.id
        JOIN users u2 ON gp2.user_id = u2.id
        LEFT JOIN game_rounds gr ON g.id = gr.game_id AND gr.round_number = 1
        LEFT JOIN categories c ON gr.category_id = c.id
        WHERE g.status = 'completed'
        ORDER BY g.end_time DESC
        LIMIT 10;
    """
    
    rows = query_db(sql)
    recent_games = []
    
    for row in rows:
        duration_minutes = row['duration_seconds'] // 60 if row['duration_seconds'] else 0
        duration_seconds = row['duration_seconds'] % 60 if row['duration_seconds'] else 0
        duration_str = f"{duration_minutes}:{duration_seconds:02d}"
        
        recent_games.append({
            "id": row['id'],
            "player1": row['player1'],
            "player2": row['player2'],
            "winner": row['winner'],
            "category": row['category'] or "Mixed",
            "duration": duration_str,
            "created_at": row['created_at'].isoformat() if row['created_at'] else None
        })
    
    return jsonify(recent_games), 200


@stats_bp.route("/popular-categories", methods=["GET"])
def get_popular_categories() -> Any:
    """
    Return popular categories with game and question counts.
    """
    sql = """
        SELECT 
            c.id,
            c.name,
            COUNT(DISTINCT g.id) AS games_count,
            COUNT(DISTINCT q.id) AS questions_count
        FROM categories c
        LEFT JOIN questions q ON c.id = q.category_id
        LEFT JOIN game_rounds gr ON c.id = gr.category_id
        LEFT JOIN games g ON gr.game_id = g.id AND g.status = 'completed'
        GROUP BY c.id, c.name
        HAVING COUNT(DISTINCT g.id) > 0
        ORDER BY games_count DESC
        LIMIT 8;
    """
    
    rows = query_db(sql)
    popular_categories = []
    
    for row in rows:
        popular_categories.append({
            "id": row['id'],
            "name": row['name'],
            "games": row['games_count'],
            "questions": row['questions_count']
        })
    
    return jsonify(popular_categories), 200
