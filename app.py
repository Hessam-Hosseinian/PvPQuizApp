from flask import request, url_for, jsonify
from app import create_app
from config import Config
from app.db import get_db

app, socketio = create_app()

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
 

