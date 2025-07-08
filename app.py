from flask import request, url_for, jsonify, session
from app import create_app
from config import Config
from app.db import get_db
from app import socketio
from flask_socketio import join_room, leave_room, emit
app, socketio = create_app()

@socketio.on('connect', namespace='/chat')
def handle_connect():
    """Handle new client connection for the chat namespace"""
    user_id = session.get('user_id')
    if user_id:
        join_room(str(user_id))
        print(f"User {user_id} connected and joined room {user_id} in /chat namespace")

@socketio.on('disconnect', namespace='/chat')
def handle_disconnect():
    """Handle client disconnection for the chat namespace"""
    user_id = session.get('user_id')
    if user_id:
        leave_room(str(user_id))
        print(f"User {user_id} disconnected and left room {user_id} in /chat namespace")

@socketio.on('connect')
def handle_game_connect():
    """Handle new client connection for the game namespace (default)"""
    user_id = session.get('user_id')
    if user_id:
        print(f"User {user_id} connected to game namespace")

@socketio.on('disconnect')
def handle_game_disconnect():
    """Handle client disconnection for the game namespace (default)"""
    user_id = session.get('user_id')
    if user_id:
        print(f"User {user_id} disconnected from game namespace")

# Game socket handlers
@socketio.on('join_game')
def on_join_game(data):
    game_id = data['game_id']
    room = f'game_{game_id}'
    join_room(room)
    print(f"Client joined game room: {room}")
    # Send current game state to the newly joined client
    from app.routes.games import get_full_game_state_data
    game_state = get_full_game_state_data(int(game_id))
    if game_state:
        socketio.emit('game_update', game_state, room=room)

@socketio.on('leave_game')
def on_leave_game(data):
    game_id = data['game_id']
    room = f'game_{game_id}'
    leave_room(room)
    print(f"Client left game room: {room}")

def list_routes():
   
    routes = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'OPTIONS', 'HEAD'}))
        routes.append({
            'endpoint': rule.endpoint,
            'methods': methods,
            'route': str(rule)
        })
    return sorted(routes, key=lambda x: x['route'])

@app.route('/routes')
def show_routes():

    return jsonify(list_routes())


@app.route('/')
def home():
    return "ddd"

@app.route('/health')
def health_check():
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute('SELECT 1')
        cur.fetchone()
        cur.close()
        return jsonify({'status': 'ok', 'database': 'connected'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'database': 'disconnected', 'error': str(e)}), 500

    
if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000)
 

