import pytest
from flask import json

def test_get_game_types(client):
    """Test getting all game types."""
    response = client.get('/game-types/')
    assert response.status_code == 200
    assert isinstance(response.json, list)
