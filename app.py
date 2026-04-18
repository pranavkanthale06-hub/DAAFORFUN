from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
DB_PATH = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/scores', methods=['POST'])
def submit_score():
    data = request.get_json()
    moves = data.get('moves')
    time_seconds = data.get('time_seconds')
    full_name = data.get('full_name')
    user_id_name = data.get('user_id_name')

    if moves is None or time_seconds is None or not full_name or not user_id_name:
        return jsonify({'error': 'Moves, time, full name, and user ID name are required'}), 400

    conn = get_db_connection()
    conn.execute('''
        INSERT INTO scores (full_name, user_id_name, moves, time_seconds) 
        VALUES (?, ?, ?, ?)
    ''', (full_name, user_id_name, moves, time_seconds))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Score submitted successfully'}), 201

@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    # Weekly leaderboard: scores since the most recent Monday
    today = datetime.date.today()
    last_monday = today - datetime.timedelta(days=today.weekday())
    
    conn = get_db_connection()
    scores = conn.execute('''
        SELECT user_id_name as username, moves, time_seconds, timestamp 
        FROM scores 
        WHERE date(timestamp) >= date(?)
        ORDER BY moves ASC, time_seconds ASC 
        LIMIT 10
    ''', (last_monday.isoformat(),)).fetchall()
    conn.close()

    result = [dict(row) for row in scores]
    return jsonify(result)

@app.route('/api/records', methods=['GET'])
def records():
    # All-time top 10 records
    conn = get_db_connection()
    scores = conn.execute('''
        SELECT user_id_name as username, moves, time_seconds, timestamp 
        FROM scores 
        ORDER BY moves ASC, time_seconds ASC 
        LIMIT 10
    ''').fetchall()
    conn.close()

    result = [dict(row) for row in scores]
    return jsonify(result)

if __name__ == '__main__':
    # Initialize DB if it doesn't exist
    if not os.path.exists(DB_PATH):
        import init_db
        init_db.init_db()
    
    app.run(host='0.0.0.0', debug=True, port=5000)
