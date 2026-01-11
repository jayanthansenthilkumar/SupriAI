import sqlite3
import json
from datetime import datetime

DB_NAME = "learning_data.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS learning_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            title TEXT,
            topic TEXT,
            confidence REAL,
            duration REAL,
            engagement_score REAL,
            timestamp TEXT
        )
    ''')
    # Performance Optimization: Indices
    conn.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON learning_logs(timestamp)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_topic ON learning_logs(topic)')
    
    conn.commit()
    conn.close()

def insert_log(data):
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO learning_logs (url, title, topic, confidence, duration, engagement_score, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['url'],
        data['title'],
        data['topic'],
        data['confidence'],
        data['duration'],
        data['engagement_score'],
        data['timestamp']
    ))
    conn.commit()
    conn.close()

def get_recent_logs(days=7):
    # Logic to filter by date would happen here or in SQL
    # For simplicity, returning last 100 rows
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM learning_logs ORDER BY id DESC LIMIT 100').fetchall()
    conn.close()
    return [dict(row) for row in logs]
