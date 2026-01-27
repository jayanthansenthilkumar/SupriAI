import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import threading
from textblob import TextBlob
import random
import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
DB_CONFIG = {
    'user': 'root',
    'password': '',
    'host': 'localhost',
    'database': 'supriai'
}

# Pre-check: Ensure Database Exists
def init_db():
    try:
        # Connect without DB first to create it
        conn = mysql.connector.connect(
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            host=DB_CONFIG['host']
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        conn.close()
        
        # Now connect to the DB and create tables
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Tables
        tables = [
            """CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT 1,
                url TEXT NOT NULL,
                title TEXT,
                domain VARCHAR(255),
                visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                duration_seconds INT DEFAULT 0,
                topic VARCHAR(100) DEFAULT 'General',
                engagement_score INT DEFAULT 0,
                source VARCHAR(50) DEFAULT 'extension',
                processed_by_ai BOOLEAN DEFAULT FALSE,
                ai_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT 1,
                title VARCHAR(255),
                content TEXT,
                tags VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS bookmarks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT 1,
                url TEXT NOT NULL,
                title TEXT,
                topic VARCHAR(100),
                resource_type VARCHAR(50) DEFAULT 'Article',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS goals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT 1,
                title VARCHAR(255) NOT NULL,
                target_value INT NOT NULL,
                current_value INT DEFAULT 0,
                goal_type VARCHAR(50) DEFAULT 'daily',
                icon VARCHAR(50) DEFAULT 'ri-flag-line',
                color VARCHAR(20) DEFAULT '#1a73e8',
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS ai_insights (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT 1,
                insight_type VARCHAR(50),
                content TEXT,
                confidence_score INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        ]
        
        for table_sql in tables:
            cursor.execute(table_sql)
            
        conn.commit()
        conn.close()
        print("✅ Database and tables initialized successfully.")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'online', 
        'message': 'SupriAI Backend is running', 
        'version': '1.0',
        'endpoints': ['/api/health', '/api/history', '/api/analytics/summary', '/api/bookmarks', '/api/notes', '/api/goals']
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    conn = get_db_connection()
    status = 'connected' if conn else 'disconnected'
    if conn: conn.close()
    return jsonify({'status': 'online', 'database': status})

# --- HISTORY ---
@app.route('/api/history', methods=['GET', 'POST'])
def handle_history():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.json
        if not isinstance(data, list):
            data = [data]
        
        inserted = 0
        for item in data:
            try:
                sql = "INSERT INTO activity_logs (url, title, domain, visit_time, duration_seconds, topic, source) VALUES (%s, %s, %s, %s, %s, %s, %s)"
                domain = item.get('url', '').split('/')[2] if '//' in item.get('url', '') else ''
                visit_time = item.get('visited_at', datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                
                val = (item.get('url'), item.get('title'), domain, visit_time, item.get('duration_seconds', 0), item.get('topic', 'General'), item.get('source', 'extension'))
                cursor.execute(sql, val)
                inserted += 1
            except Exception as e:
                pass # Skip duplicates or errors
        
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'inserted': inserted})

    else: # GET
        limit = request.args.get('limit', 20)
        cursor.execute(f"SELECT * FROM activity_logs ORDER BY visit_time DESC LIMIT {limit}")
        rows = cursor.fetchall()
        
        # Format dates
        for row in rows:
            if isinstance(row['visit_time'], datetime.datetime):
                row['visit_time'] = row['visit_time'].isoformat()
            if isinstance(row['created_at'], datetime.datetime):
                row['created_at'] = row['created_at'].isoformat()
            # Rename visit_time to visited_at for frontend compat
            row['visited_at'] = row['visit_time']
                
        conn.close()
        return jsonify(rows)

# --- ANALYTICS ---
@app.route('/api/analytics/summary', methods=['GET'])
def analytics_summary():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor()
    
    # Total Duration
    cursor.execute("SELECT SUM(duration_seconds) FROM activity_logs WHERE visit_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
    total_duration = cursor.fetchone()[0] or 0
    
    # Avg Duration
    cursor.execute("SELECT AVG(duration_seconds) FROM activity_logs WHERE duration_seconds > 5")
    avg_duration = cursor.fetchone()[0] or 0
    
    # Top Domains
    cursor.execute("SELECT domain, COUNT(*) as count FROM activity_logs GROUP BY domain ORDER BY count DESC LIMIT 5")
    top_domains = cursor.fetchall()
    
    # Topics
    cursor.execute("SELECT topic, COUNT(*) as count FROM activity_logs GROUP BY topic ORDER BY count DESC LIMIT 10")
    topics = cursor.fetchall()
    
    # Total Visits
    cursor.execute("SELECT COUNT(*) FROM activity_logs")
    total_visits = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total_duration_seconds': int(total_duration),
        'avg_duration_seconds': int(avg_duration),
        'top_domains': top_domains,
        'topics': topics,
        'total_visits': total_visits,
        'total_domains': len(top_domains)
    })

@app.route('/api/analytics/time-distribution', methods=['GET'])
def time_distribution():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT 
            DATE(visit_time) as visit_date, 
            SUM(duration_seconds) as total_seconds,
            COUNT(*) as visit_count
        FROM activity_logs 
        WHERE visit_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(visit_time)
        ORDER BY visit_date ASC
    """)
    results = cursor.fetchall()
    
    # Normalize dates
    for r in results:
        r['visit_date'] = str(r['visit_date'])
        r['duration_seconds'] = int(r['total_seconds'])
        r['visits'] = r['visit_count']
        del r['total_seconds']
        del r['visit_count']
        
    conn.close()
    return jsonify(results)

# --- BOOKMARKS ---
@app.route('/api/bookmarks', methods=['GET', 'POST'])
def handle_bookmarks():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.json
        sql = "INSERT INTO bookmarks (url, title, topic, resource_type) VALUES (%s, %s, %s, %s)"
        val = (data['url'], data.get('title', 'Untitled'), data.get('topic', 'General'), data.get('resource_type', 'Article'))
        cursor.execute(sql, val)
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'status': 'success', 'id': new_id})
    else:
        cursor.execute("SELECT * FROM bookmarks ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return jsonify(rows)

@app.route('/api/bookmarks/<int:id>', methods=['DELETE'])
def delete_bookmark(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bookmarks WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

# --- NOTES ---
@app.route('/api/notes', methods=['GET', 'POST'])
def handle_notes():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.json
        tags = ','.join(data.get('tags', [])) if isinstance(data.get('tags'), list) else data.get('tags', '')
        sql = "INSERT INTO notes (title, content, tags) VALUES (%s, %s, %s)"
        val = (data.get('title', 'Reflection'), data.get('content', ''), tags)
        cursor.execute(sql, val)
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'status': 'success', 'id': new_id})
    else:
        cursor.execute("SELECT * FROM notes ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return jsonify(rows)

# --- GOALS ---
@app.route('/api/goals', methods=['GET', 'POST'])
def handle_goals():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        data = request.json
        if data.get('action') == 'progress':
            cursor.execute("UPDATE goals SET current_value = current_value + %s WHERE id = %s", (data.get('value', 1), data.get('id')))
            conn.commit()
            conn.close()
            return jsonify({'status': 'updated'})
        else:
            sql = "INSERT INTO goals (title, target_value, goal_type, icon, color) VALUES (%s, %s, %s, %s, %s)"
            val = (data['title'], data.get('target_value', 1), data.get('goal_type', 'daily'), data.get('icon', 'ri-flag-line'), data.get('color', '#1a73e8'))
            cursor.execute(sql, val)
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            return jsonify({'status': 'success', 'id': new_id})
    else:
        cursor.execute("SELECT * FROM goals WHERE status = 'active' ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return jsonify(rows)

# --- INSIGHTS ---
@app.route('/api/insights', methods=['GET'])
def get_insights():
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'DB connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT 10")
    rows = cursor.fetchall()
    conn.close()
    return jsonify({'status': 'success', 'insights': rows})

# ============================================
# AI BACKGROUND PROCESSOR
# ============================================

def analyze_logs():
    print("🧠 AI Processor Started...")
    while True:
        try:
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT id, title, url FROM activity_logs WHERE topic = 'General' AND source != 'system' LIMIT 10")
                logs = cursor.fetchall()
                
                for log in logs:
                    title = log['title'].lower() if log['title'] else ""
                    url = log['url'].lower()
                    
                    new_topic = 'General'
                    if 'python' in title or 'python' in url: new_topic = 'Programming'
                    elif 'javascript' in title or 'js' in url: new_topic = 'Web Development'
                    elif 'datascience' in title or 'data' in url: new_topic = 'Data Science'
                    elif 'design' in title: new_topic = 'Design'
                    elif 'youtube' in url: new_topic = 'Video Learning'
                    
                    if new_topic != 'General':
                        cursor.execute("UPDATE activity_logs SET topic = %s, processed_by_ai = 1 WHERE id = %s", (new_topic, log['id']))
                        conn.commit()
                        print(f"✨ AI Categorized Log {log['id']} -> {new_topic}")
                
                cursor.close()
                conn.close()
        except Exception as e:
            print(f"AI Loop Error: {e}")
            
        time.sleep(10)

threading.Thread(target=analyze_logs, daemon=True).start()

if __name__ == '__main__':
    init_db()  # Initialize database on start
    print("🚀 SupriAI Python Backend Running on Port 5000")
    app.run(port=5000, debug=True, use_reloader=False)
