def test_app_is_created(app):
    """Test if app is created successfully."""
    assert app is not None

def test_request_returns_404(client):
    """Test if app returns 404 for unknown routes."""
    response = client.get("/non_existent_route")
    assert response.status_code == 404 