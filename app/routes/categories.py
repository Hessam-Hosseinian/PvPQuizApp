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
