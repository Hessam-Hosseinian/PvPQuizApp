from flask import Flask
from flask_cors import CORS
from config import Config
from . import db
from flask_login import LoginManager
# from app.models.user import User

login_manager = LoginManager()

def create_app(config_class=Config):
    app = Flask(__name__)

    # Configure CORS to allow requests from multiple origins
    from flask_cors import CORS

    # origins = [
    #     "http://localhost:5173",
    #     "http://localhost:3000", 
    #     "http://127.0.0.1:5173",
    #     "http://127.0.0.1:3000",
    #     "http://192.168.204.179:5173",
    #     "http://192.168.204.179:3000",
    #     "http://192.168.1.110:5173",
    #     "http://192.168.1.110:3000"
    # ]
    origins = ["*"]

    CORS(
        app,
        resources={r"/*": {"origins": origins}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=3600,
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
