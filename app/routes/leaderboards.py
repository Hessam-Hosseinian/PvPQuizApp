from flask import Blueprint, request, jsonify, abort
from app.db import get_db

leaderboards_bp = Blueprint("leaderboards", __name__, url_prefix="/leaderboards")





@leaderboards_bp.route("", methods=["GET"])
def list_leaderboards():
    """
    Return leaderboard entries, optionally filtered by scope and/or category_id.
    Query Parameters (all optional):
      - scope:      one of 'alltime', 'weekly', 'monthly' (default: 'alltime')
      - category_id: integer ID of the category to filter by
      - limit:      maximum number of entries to return (default: 10)
    Response JSON: a list of objects with fields:
      - id
      - user_id
      - username
      - scope
      - category_id
      - rank
      - score
      - generated_at
    """
    scope = request.args.get("scope", "alltime")
    category_id = request.args.get("category_id", type=int)
    limit = request.args.get("limit", default=10, type=int)

    # Validate scope
    if scope not in ("alltime", "weekly", "monthly"):
        return jsonify({"error": "Invalid scope. Must be 'alltime', 'weekly', or 'monthly'."}), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        if category_id is not None:
            # Filter by both scope and category_id
            cur.execute(
                """
                SELECT
                  l.id,
                  l.user_id,
                  u.username,
                  l.scope,
                  l.category_id,
                  l.rank,
                  l.score,
                  l.generated_at
                FROM leaderboards l
                JOIN users u ON l.user_id = u.id
                WHERE l.scope = %s
                  AND l.category_id = %s
                ORDER BY l.rank ASC
                LIMIT %s;
                """,
                (scope, category_id, limit),
            )
        else:
            # Filter only by scope
            cur.execute(
                """
                SELECT
                  l.id,
                  l.user_id,
                  u.username,
                  l.scope,
                  l.category_id,
                  l.rank,
                  l.score,
                  l.generated_at
                FROM leaderboards l
                JOIN users u ON l.user_id = u.id
                WHERE l.scope = %s
                ORDER BY l.rank ASC
                LIMIT %s;
                """,
                (scope, limit),
            )

        rows = cur.fetchall()
        return jsonify(rows), 200

    finally:
        cur.close()


@leaderboards_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_leaderboards(user_id):
    """
    Return all leaderboard entries for a specific user, across all scopes.
    Path Parameter:
      - user_id: integer ID of the user
    Response JSON: a list of objects with fields:
      - id
      - user_id
      - username
      - scope
      - category_id
      - rank
      - score
      - generated_at
    """
    conn = get_db()
    cur = conn.cursor()

    # Check that the user exists
    cur.execute("SELECT 1 FROM users WHERE id = %s;", (user_id,))
    if not cur.fetchone():
        cur.close()
        return jsonify({"error": f"User {user_id} not found."}), 404

    try:
        cur.execute(
            """
            SELECT
              l.id,
              l.user_id,
              u.username,
              l.scope,
              l.category_id,
              l.rank,
              l.score,
              l.generated_at
            FROM leaderboards l
            JOIN users u ON l.user_id = u.id
            WHERE l.user_id = %s
            ORDER BY l.generated_at DESC;
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        return jsonify(rows), 200

    finally:
        cur.close()
