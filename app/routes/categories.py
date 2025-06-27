from flask import Blueprint, request, jsonify, abort, url_for
from app.db import query_db, modify_db
# from decorators import requires_admin

categories_bp = Blueprint('categories_bp', __name__, url_prefix='/categories')

@categories_bp.route('', methods=['GET'])
def list_categories():
    """
    Return list of all categories
    """
    # Only read necessary columns
    sql = "SELECT id, name, description, created_at FROM categories ORDER BY name"
    categories = query_db(sql)
    return jsonify(categories), 200

@categories_bp.route('/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """
    Return a category by ID
    """
    sql = "SELECT id, name, description, created_at FROM categories WHERE id = %s"
    category = query_db(sql, (category_id,), one=True)
    if not category:
        # If category not found, return 404
        abort(404, description="Category not found")
    return jsonify(category), 200

@categories_bp.route('', methods=['POST'])
# @requires_admin
def create_category():
    """
    Create a new category
    """
    # 1) Ensure request is JSON
    if not request.is_json:
        abort(400, description="Request must be in JSON format")

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')

    # 2) Validate required fields
    if not name or not description:
        abort(400, description="Missing required fields: name and description")

    # 3) Insert into database with RETURNING id
    try:
        sql_insert = """
            INSERT INTO categories (name, description)
            VALUES (%s, %s)
            RETURNING id
        """
        result = query_db(sql_insert, (name, description), one=True)
        new_id = result.get('id')

        # 4) Create resource URL (for Location header)
        location = url_for('categories_bp.get_category', category_id=new_id)

        return (
            jsonify({"id": new_id, "message": "Category created"}),
            201,
            {"Location": location}
        )
    except Exception as e:
        # If name is duplicate or any other error occurs
        return jsonify({"error": str(e)}), 400

@categories_bp.route('/<int:category_id>', methods=['PUT'])
# @requires_admin
def update_category(category_id):
    """
    Update an existing category
    """
    if not request.is_json:
        return jsonify({"error": "Request must be in JSON format"}), 400

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')

    # At least one field must be provided
    if name is None and description is None:
        return jsonify({"error": "At least one of 'name' or 'description' must be provided"}), 400

    # Check if category exists
    existing = query_db("SELECT id FROM categories WHERE id = %s", (category_id,), one=True)
    if not existing:
        return jsonify({"error": "Category not found"}), 404

    # Build dynamic UPDATE based on provided fields
    try:
        parts = []
        params = []

        if name is not None:
            parts.append("name = %s")
            params.append(name)
        if description is not None:
            parts.append("description = %s")
            params.append(description)

        sql_update = f"UPDATE categories SET {', '.join(parts)} WHERE id = %s"
        params.append(category_id)
        print(sql_update, tuple(params))
        modify_db(sql_update, tuple(params))
        return jsonify({"message": "Category updated"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@categories_bp.route('/<int:category_id>', methods=['DELETE'])
#   @requires_admin
def delete_category(category_id):
    """
    Delete a category
    """
    # Check if category exists
    existing = query_db("SELECT id FROM categories WHERE id = %s", (category_id,), one=True)
    if not existing:
        return jsonify({"error": "Category not found"}), 404

    try:
        modify_db("DELETE FROM categories WHERE id = %s", (category_id,))
        return jsonify({"message": "Category deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
