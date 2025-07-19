import os
from dotenv import load_dotenv
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv()




class Config:
   
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "quizdb")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "your_password")
    

    SECRET_KEY = os.getenv("SECRET_KEY", "a-very-secret-key")

    # SESSION_COOKIE_SAMESITE = "None"
    # SESSION_COOKIE_SECURE = False
    # SESSION_COOKIE_HTTPONLY = False
class TestConfig(Config):
    TESTING = True

    DB_HOST = os.getenv("TEST_DB_HOST", "T")
    DB_PORT = os.getenv("TEST_DB_PORT", "T")
    DB_NAME = os.getenv("TEST_DB_NAME", "T")
    DB_USER = os.getenv("TEST_DB_USER", "T")
    DB_PASSWORD = os.getenv("TEST_DB_PASSWORD", "T")
    # Application secret key
    SECRET_KEY = os.getenv("TEST_SECRET_KEY", "test-T-key")
    WTF_CSRF_ENABLED = False
