from decimal import Decimal
from flask import Blueprint, request, jsonify
from ..db import get_db
from app.db import query_db

# Blueprint for statistics-related endpoints
stats_bp = Blueprint("stats", __name__, url_prefix="/stats")


@stats_bp.route("/top10-winrate", methods=["GET"])
def get_top10_winrate():
    """
    Return the top 10 users by win rate.
    """
    conn = get_db()

    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
              u.id         AS user_id,
              u.username   AS username,
              us.games_won AS games_won,
              us.games_played AS games_played,
              ROUND(
                (us.games_won::numeric / NULLIF(us.games_played, 0)) * 100
              , 2) AS win_rate
            FROM users u
            JOIN user_stats us ON u.id = us.user_id
            WHERE us.games_played > 0
            ORDER BY (us.games_won::numeric / us.games_played) DESC
            LIMIT 10;
        """)
        rows = cur.fetchall() 
        if not rows:
            return jsonify({"message": "Statistics for users not found."}), 404


    cleaned = []
    for item in rows:

        data = dict(item)

        if isinstance(data.get("win_rate"), Decimal):
            data["win_rate"] = float(data["win_rate"])

        cleaned.append(data)

    return jsonify(cleaned), 200

@stats_bp.route("/most-played-categories", methods=["GET"])
def get_most_played_categories():
    """
    Return the 10 most-played categories, based on how often questions
    in each category have been used in game rounds.
    """
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
              c.id,
              c.name,
              COUNT(*) AS times_played
            FROM categories c
            JOIN questions q 
              ON q.category_id = c.id
            JOIN game_round_questions grq 
              ON grq.question_id = q.id
            JOIN game_rounds gr 
              ON gr.id = grq.game_round_id
            GROUP BY c.id, c.name
            ORDER BY COUNT(*) DESC
            LIMIT 10;
        """)
        rows = cur.fetchall()
        
        columns = [desc[0] for desc in cur.description]
    data = [row for row in rows]
    
    return jsonify(data), 200



@stats_bp.route("/user-winloss/<int:user_id>", methods=["GET"])
def get_user_winloss(user_id):
    """
    Return win/loss statistics for a single user.
    """
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
              us.user_id,
              us.games_won,
              (us.games_played - us.games_won) AS games_lost,
              ROUND(
                CASE 
                  WHEN us.games_played = 0 THEN 0
                  ELSE (us.games_won::numeric / us.games_played) * 100
                END
              , 2) AS win_rate_percentage,
              us.correct_answers,
              us.total_answers
            FROM user_stats us
            WHERE us.user_id = %s;
        """, (user_id,))
        row = cur.fetchone()
        
        
        if not row:
            return jsonify({"message": "User not found"}), 404
   
    data = dict(row)  


    if isinstance(data.get("win_rate_percentage"), Decimal):
        data["win_rate_percentage"] = float(data["win_rate_percentage"])

    return jsonify(data), 200


@stats_bp.route("/user-count", methods=["GET"])
def get_user_count():
    """
    Return the total number of registered users.
    """
    # Using query_db, which returns a list of dictionaries
    stats = query_db("SELECT COUNT(*) AS total_users FROM users;")
    return jsonify(stats[0]), 200
