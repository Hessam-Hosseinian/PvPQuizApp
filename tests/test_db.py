import pytest
from app.db import get_db, query_db
import psycopg2

def test_get_db(app):
    """Test database connection."""
    with app.app_context():
        db = get_db()
        assert db is not None
        # Test that get_db returns the same connection each time
        assert get_db() is db
        
def test_db_connection_parameters(app):
    """Test database connection parameters are correctly set from config."""
    with app.app_context():
        db = get_db()
        assert db.info.host == app.config['DB_HOST']
        assert db.info.port == int(app.config['DB_PORT'])
        assert db.info.dbname == app.config['DB_NAME']
        assert db.info.user == app.config['DB_USER']

def test_query_execution(app):
    """Test that we can execute a simple query."""
    with app.app_context():
        # Try a simple SELECT query
        result = query_db("SELECT 1 as test")
        assert result is not None
        assert len(result) == 1
        assert result[0]['test'] == 1

def test_db_connection_error():
    """Test that invalid connection parameters raise an error."""
    from flask import Flask
    from config import TestConfig
    
    # Create a test app with invalid database credentials
    class InvalidDBConfig(TestConfig):
        DB_HOST = "invalid_host"
        DB_PORT = "5432"
        DB_NAME = "invalid_db"
        DB_USER = "invalid_user"
        DB_PASSWORD = "invalid_password"
    
    app = Flask(__name__)
    app.config.from_object(InvalidDBConfig)
    
    with app.app_context():
        with pytest.raises(psycopg2.OperationalError):
            get_db() 