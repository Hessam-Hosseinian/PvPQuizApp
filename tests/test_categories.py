# tests/test_categories_endpoints.py

import pytest
import json
from app.db import get_db

def clear_categories_table(client):
    """
    Remove all records from the categories table.
    Uses client.application.app_context() to access get_db().
    """
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("DELETE FROM categories;")
        conn.commit()
        cur.close()

def insert_category(client, name="TestCategory", description="Test description"):
    """
    Helper to insert a category directly into the database and return its id.
    """
    with client.application.app_context():
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO categories (name, description) VALUES (%s, %s) RETURNING id;",
            (name, description)
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        cur.close()
    return new_id

def test_list_categories_empty(client):
    """
    Test listing categories when the database is empty.
    """
    clear_categories_table(client)

    response = client.get("/categories")
    assert response.status_code == 200
    assert response.json == []

def test_create_category_success(client):
    """
    Test creating a new category (valid payload).
    """
    clear_categories_table(client)

    payload = {
        "name": "Science",
        "description": "All science-related questions"
    }
    response = client.post(
        "/categories",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 201

    data = response.json
    assert "id" in data
    assert data["message"] == "Category created"

    

def test_create_category_missing_fields(client):
    """
    Test creating a category with missing required fields.
    """
    clear_categories_table(client)

    # Missing both name and description
    response = client.post(
        "/categories",
        data=json.dumps({}),
        content_type="application/json"
    )
    assert response.status_code == 400

    # Missing description only
    payload = {"name": "OnlyName"}
    response = client.post(
        "/categories",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400

    # Missing name only
    payload = {"description": "OnlyDescription"}
    response = client.post(
        "/categories",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_get_category_not_found(client):
    """
    Test retrieving a category that does not exist.
    """
    clear_categories_table(client)
    response = client.get("/categories/9999")
    assert response.status_code == 404

def test_get_category_success(client):
    """
    Test retrieving a category that exists.
    """
    clear_categories_table(client)
    new_id = insert_category(client, name="History", description="Historical questions")

    response = client.get(f"/categories/{new_id}")
    assert response.status_code == 200

    data = response.json
    assert data["id"] == new_id
    assert data["name"] == "History"
    assert data["description"] == "Historical questions"
    assert "created_at" in data

def test_update_category_success(client):
    """
    Test updating both fields of an existing category.
    """
    clear_categories_table(client)
    new_id = insert_category(client, name="OldName", description="Old description")

    payload = {
        "name": "NewName",
        "description": "New description"
    }
    response = client.put(
        f"/categories/{new_id}",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json["message"] == "Category updated"

    # Verify changes in the database
    get_resp = client.get(f"/categories/{new_id}")
    assert get_resp.status_code == 200
    fetched = get_resp.json
    assert fetched["name"] == "NewName"
    assert fetched["description"] == "New description"

def test_update_category_partial_fields(client):
    """
    Test updating only one field (name or description) of an existing category.
    """
    clear_categories_table(client)
    new_id = insert_category(client, name="PartialOld", description="Partial old description")

    # Update only name
    response = client.put(
        f"/categories/{new_id}",
        data=json.dumps({"name": "PartialNewName"}),
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json["message"] == "Category updated"

    get_resp = client.get(f"/categories/{new_id}")
    fetched = get_resp.json
    assert fetched["name"] == "PartialNewName"
    assert fetched["description"] == "Partial old description"

    # Update only description
    response = client.put(
        f"/categories/{new_id}",
        data=json.dumps({"description": "Partial new description"}),
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json["message"] == "Category updated"

    get_resp = client.get(f"/categories/{new_id}")
    fetched = get_resp.json
    assert fetched["name"] == "PartialNewName"
    assert fetched["description"] == "Partial new description"

def test_update_category_not_found(client):
    """
    Test updating a non-existent category.
    """
    clear_categories_table(client)

    payload = {
        "name": "DoesNotExist",
        "description": "No description"
    }
    response = client.put(
        "/categories/5555",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 404

def test_update_category_no_fields_provided(client):
    """
    Test updating a category with an empty JSON payload (no fields to update).
    """
    clear_categories_table(client)
    new_id = insert_category(client)

    response = client.put(
        f"/categories/{new_id}",
        data=json.dumps({}),
        content_type="application/json"
    )
    assert response.status_code == 400

def test_delete_category_success(client):
    """
    Test deleting an existing category.
    """
    clear_categories_table(client)
    new_id = insert_category(client)

    response = client.delete(f"/categories/{new_id}")
    assert response.status_code == 200
    assert response.json["message"] == "Category deleted"

    # Verify that GET now returns 404
    get_resp = client.get(f"/categories/{new_id}")
    assert get_resp.status_code == 404

def test_delete_category_not_found(client):
    """
    Test deleting a category that does not exist.
    """
    clear_categories_table(client)
    response = client.delete("/categories/12345")
    assert response.status_code == 404
