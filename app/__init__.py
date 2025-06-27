from flask import Flask
from flask_cors import CORS
from config import Config
from . import db
from flask_login import LoginManager
from app.models.user import User

login_manager = LoginManager()

def create_app(config_class=Config):
    app = Flask(__name__)

    CORS(
        app,
        supports_credentials=True,
        resources={
            # Adjust this pattern if your login endpoint lives under /auth or /users
            r"/*": {"origins": "http://localhost:5173"}
        }
    )

    app.config.from_object(config_class)
    
    # Initialize database
    db.init_app(app)
   
    # Always initialize schema on app start
    with app.app_context():
        try:
            db.init_db()
        except Exception as e:
            print(f"Schema initialization error: {e}")

    login_manager.init_app(app)
    login_manager.login_view = "users.login_user"

    # # Register blueprints
    from .routes import (
        users, stats, questions,    
        questions, stats, notifications,
        chat, games, game_types, tags, categories, leaderboards
    )
    
    app.register_blueprint(users.users_bp)
    app.register_blueprint(questions.questions_bp)
    app.register_blueprint(stats.stats_bp)
    app.register_blueprint(notifications.notifications_bp)
    app.register_blueprint(chat.chat_bp)
    app.register_blueprint(games.games_bp)
    app.register_blueprint(game_types.game_types_bp)
    app.register_blueprint(tags.tags_bp)
    app.register_blueprint(categories.categories_bp)
    app.register_blueprint(leaderboards.leaderboards_bp)
    return app

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)
