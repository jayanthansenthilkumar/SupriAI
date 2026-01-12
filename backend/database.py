"""
SupriAI - Database Module
SQLite Database for Learning Analytics System
Enhanced with connection pooling and transaction management
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from contextlib import contextmanager
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database file path
DB_PATH = os.path.join(os.path.dirname(__file__), "supri_learning.db")

# Connection pool
_connection_pool = []
MAX_POOL_SIZE = 5


def get_connection() -> sqlite3.Connection:
    """Get a database connection from pool or create new"""
    if _connection_pool:
        conn = _connection_pool.pop()
        try:
            # Test if connection is still valid
            conn.execute("SELECT 1")
            return conn
        except:
            pass  # Connection is invalid, create new
    
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")  # Write-Ahead Logging for better concurrency
    return conn


def return_connection(conn: sqlite3.Connection):
    """Return connection to pool"""
    if len(_connection_pool) < MAX_POOL_SIZE:
        _connection_pool.append(conn)
    else:
        conn.close()


@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        return_connection(conn)


def init_db():
    """Initialize all database tables with indexes for performance"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # ==========================================
        # Users Table
        # ==========================================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                display_name TEXT,
                avatar_initial TEXT,
                plan_type TEXT DEFAULT 'free',
                streak_days INTEGER DEFAULT 0,
                total_points INTEGER DEFAULT 0,
                settings TEXT DEFAULT '{}',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ==========================================
        # Learning Logs Table (Activity Tracking)
        # ==========================================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                url TEXT NOT NULL,
                title TEXT,
                topic TEXT,
                confidence REAL DEFAULT 0,
                duration REAL DEFAULT 0,
                max_scroll REAL DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                mouse_distance REAL DEFAULT 0,
                engagement_score REAL DEFAULT 0,
                content_preview TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create indexes for better query performance
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_learning_logs_timestamp 
            ON learning_logs(timestamp DESC)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_learning_logs_topic 
            ON learning_logs(topic)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_learning_logs_user_id 
            ON learning_logs(user_id)
        ''')
    
    # ==========================================
    # Goals Table
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            description TEXT,
            goal_type TEXT DEFAULT 'weekly',
            target_value INTEGER DEFAULT 0,
            current_value INTEGER DEFAULT 0,
            unit TEXT DEFAULT 'count',
            topic TEXT,
            icon TEXT DEFAULT 'ri-target-line',
            color TEXT DEFAULT '#1a73e8',
            is_completed INTEGER DEFAULT 0,
            due_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Bookmarks / Saved Resources
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            url TEXT NOT NULL,
            title TEXT,
            topic TEXT,
            resource_type TEXT DEFAULT 'article',
            description TEXT,
            reading_time INTEGER DEFAULT 0,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Notes / Reflections
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT,
            content TEXT NOT NULL,
            tags TEXT DEFAULT '[]',
            mood TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Schedule / Calendar Events
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedule_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            description TEXT,
            topic TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            color TEXT DEFAULT '#188038',
            is_recurring INTEGER DEFAULT 0,
            recurrence_rule TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Achievements / Badges
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            badge_name TEXT NOT NULL,
            badge_icon TEXT,
            badge_color TEXT DEFAULT '#f9ab00',
            description TEXT,
            unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Daily Stats (Aggregated)
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            date TEXT NOT NULL,
            total_time REAL DEFAULT 0,
            total_sessions INTEGER DEFAULT 0,
            avg_engagement REAL DEFAULT 0,
            topics_studied TEXT DEFAULT '{}',
            pages_visited INTEGER DEFAULT 0,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # User Settings / Preferences
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1 UNIQUE,
            tracking_enabled INTEGER DEFAULT 1,
            dark_mode INTEGER DEFAULT 0,
            sync_enabled INTEGER DEFAULT 1,
            notification_enabled INTEGER DEFAULT 1,
            blocked_sites TEXT DEFAULT '[]',
            daily_goal_minutes INTEGER DEFAULT 60,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Tasks / Todos (Productivity)
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            due_date TEXT,
            due_time TEXT,
            topic TEXT,
            estimated_minutes INTEGER DEFAULT 30,
            actual_minutes INTEGER DEFAULT 0,
            tags TEXT DEFAULT '[]',
            is_recurring INTEGER DEFAULT 0,
            recurrence_rule TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Pomodoro Sessions (Focus Timer)
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            task_id INTEGER,
            session_type TEXT DEFAULT 'focus',
            duration_minutes INTEGER DEFAULT 25,
            actual_duration INTEGER DEFAULT 0,
            status TEXT DEFAULT 'completed',
            topic TEXT,
            notes TEXT,
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            ended_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (task_id) REFERENCES tasks(id)
        )
    ''')
    
    # ==========================================
    # Focus Mode Settings
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS focus_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1 UNIQUE,
            focus_duration INTEGER DEFAULT 25,
            short_break INTEGER DEFAULT 5,
            long_break INTEGER DEFAULT 15,
            sessions_before_long_break INTEGER DEFAULT 4,
            auto_start_breaks INTEGER DEFAULT 0,
            auto_start_focus INTEGER DEFAULT 0,
            sound_enabled INTEGER DEFAULT 1,
            notification_enabled INTEGER DEFAULT 1,
            blocked_sites_during_focus TEXT DEFAULT '[]',
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Reminders
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            title TEXT NOT NULL,
            message TEXT,
            reminder_time TEXT NOT NULL,
            reminder_type TEXT DEFAULT 'once',
            recurrence_rule TEXT,
            is_active INTEGER DEFAULT 1,
            task_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (task_id) REFERENCES tasks(id)
        )
    ''')
    
    # ==========================================
    # Daily Focus Stats
    # ==========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS focus_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            date TEXT NOT NULL,
            total_focus_minutes INTEGER DEFAULT 0,
            total_break_minutes INTEGER DEFAULT 0,
            completed_pomodoros INTEGER DEFAULT 0,
            completed_tasks INTEGER DEFAULT 0,
            focus_score INTEGER DEFAULT 0,
            UNIQUE(user_id, date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # ==========================================
    # Create Indexes for Performance
    # ==========================================
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON learning_logs(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_topic ON learning_logs(topic)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_user ON learning_logs(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)')
    
    # ==========================================
    # Insert Default User if not exists
    # ==========================================
    cursor.execute('''
        INSERT OR IGNORE INTO users (id, email, display_name, avatar_initial, plan_type)
        VALUES (1, 'user@supri.ai', 'Supriya', 'S', 'Premium')
    ''')
    
    # Ensure existing user is updated (migration fix)
    cursor.execute('''
        UPDATE users SET display_name = 'Supriya', avatar_initial = 'S' WHERE id = 1
    ''')
    
    cursor.execute('''
        INSERT OR IGNORE INTO settings (user_id) VALUES (1)
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")


# ==========================================
# LEARNING LOGS OPERATIONS
# ==========================================

def insert_log(data: Dict) -> int:
    """Insert a learning activity log"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO learning_logs 
        (url, title, topic, confidence, duration, max_scroll, clicks, 
         mouse_distance, engagement_score, content_preview, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('url', ''),
        data.get('title', ''),
        data.get('topic', 'General'),
        data.get('confidence', 0),
        data.get('duration', 0),
        data.get('max_scroll', 0),
        data.get('clicks', 0),
        data.get('mouse_distance', 0),
        data.get('engagement_score', 0),
        data.get('content_preview', ''),
        data.get('timestamp', datetime.now().isoformat())
    ))
    
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Update daily stats
    update_daily_stats(data)
    
    return log_id


def bulk_insert_logs(logs: List[Dict]) -> int:
    """Bulk insert multiple logs (for offline sync)"""
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    
    for data in logs:
        cursor.execute('''
            INSERT INTO learning_logs 
            (url, title, topic, confidence, duration, max_scroll, clicks, 
             mouse_distance, engagement_score, content_preview, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('url', ''),
            data.get('title', ''),
            data.get('topic', 'General'),
            data.get('confidence', 0),
            data.get('duration', 0),
            data.get('max_scroll', 0),
            data.get('clicks', 0),
            data.get('mouse_distance', 0),
            data.get('engagement_score', 0),
            data.get('content_preview', ''),
            data.get('timestamp', datetime.now().isoformat())
        ))
        count += 1
    
    conn.commit()
    conn.close()
    return count


def get_recent_logs(days: int = 7, limit: int = 100) -> List[Dict]:
    """Get recent learning logs within specified days"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    cursor.execute('''
        SELECT * FROM learning_logs 
        WHERE timestamp >= ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (cutoff_date, limit))
    
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs


def get_logs_by_topic(topic: str, limit: int = 50) -> List[Dict]:
    """Get logs filtered by topic"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM learning_logs 
        WHERE topic = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (topic, limit))
    
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs


def search_logs(query: str, limit: int = 50) -> List[Dict]:
    """Search logs by title or URL"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM learning_logs 
        WHERE title LIKE ? OR url LIKE ?
        ORDER BY timestamp DESC 
        LIMIT ?
    ''', (f'%{query}%', f'%{query}%', limit))
    
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs


def delete_all_logs(user_id: int = 1) -> bool:
    """Clear all learning logs for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM learning_logs WHERE user_id = ?', (user_id,))
    cursor.execute('DELETE FROM daily_stats WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
    return True


# ==========================================
# DAILY STATS OPERATIONS
# ==========================================

def update_daily_stats(log_data: Dict):
    """Update or create daily aggregated stats"""
    conn = get_connection()
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Check if entry exists
    cursor.execute('SELECT * FROM daily_stats WHERE date = ?', (today,))
    existing = cursor.fetchone()
    
    if existing:
        # Update existing stats
        topics_dict = json.loads(existing['topics_studied'] or '{}')
        topic = log_data.get('topic', 'General')
        topics_dict[topic] = topics_dict.get(topic, 0) + 1
        
        cursor.execute('''
            UPDATE daily_stats SET
                total_time = total_time + ?,
                total_sessions = total_sessions + 1,
                avg_engagement = (avg_engagement * total_sessions + ?) / (total_sessions + 1),
                topics_studied = ?,
                pages_visited = pages_visited + 1
            WHERE date = ?
        ''', (
            log_data.get('duration', 0),
            log_data.get('engagement_score', 0),
            json.dumps(topics_dict),
            today
        ))
    else:
        # Create new entry
        topics_dict = {log_data.get('topic', 'General'): 1}
        cursor.execute('''
            INSERT INTO daily_stats 
            (date, total_time, total_sessions, avg_engagement, topics_studied, pages_visited)
            VALUES (?, ?, 1, ?, ?, 1)
        ''', (
            today,
            log_data.get('duration', 0),
            log_data.get('engagement_score', 0),
            json.dumps(topics_dict)
        ))
    
    conn.commit()
    conn.close()


def get_weekly_stats(user_id: int = 1) -> List[Dict]:
    """Get stats for the past 7 days"""
    conn = get_connection()
    cursor = conn.cursor()
    
    week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT * FROM daily_stats 
        WHERE user_id = ? AND date >= ?
        ORDER BY date ASC
    ''', (user_id, week_ago))
    
    stats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return stats


# ==========================================
# GOALS OPERATIONS
# ==========================================

def create_goal(data: Dict) -> int:
    """Create a new goal"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO goals 
        (title, description, goal_type, target_value, unit, topic, icon, color, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', ''),
        data.get('description', ''),
        data.get('goal_type', 'weekly'),
        data.get('target_value', 0),
        data.get('unit', 'count'),
        data.get('topic', ''),
        data.get('icon', 'ri-target-line'),
        data.get('color', '#1a73e8'),
        data.get('due_date', '')
    ))
    
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return goal_id


def get_goals(user_id: int = 1, active_only: bool = True) -> List[Dict]:
    """Get all goals for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if active_only:
        cursor.execute('''
            SELECT * FROM goals 
            WHERE user_id = ? AND is_completed = 0
            ORDER BY created_at DESC
        ''', (user_id,))
    else:
        cursor.execute('''
            SELECT * FROM goals 
            WHERE user_id = ?
            ORDER BY created_at DESC
        ''', (user_id,))
    
    goals = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return goals


def update_goal_progress(goal_id: int, progress: int) -> bool:
    """Update goal progress"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE goals SET current_value = ? WHERE id = ?
    ''', (progress, goal_id))
    
    # Check if completed
    cursor.execute('SELECT target_value FROM goals WHERE id = ?', (goal_id,))
    goal = cursor.fetchone()
    if goal and progress >= goal['target_value']:
        cursor.execute('UPDATE goals SET is_completed = 1 WHERE id = ?', (goal_id,))
    
    conn.commit()
    conn.close()
    return True


def delete_goal(goal_id: int) -> bool:
    """Delete a goal"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM goals WHERE id = ?', (goal_id,))
    conn.commit()
    conn.close()
    return True


# ==========================================
# BOOKMARKS OPERATIONS
# ==========================================

def add_bookmark(data: Dict) -> int:
    """Add a bookmark"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO bookmarks 
        (url, title, topic, resource_type, description, reading_time)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('url', ''),
        data.get('title', ''),
        data.get('topic', 'General'),
        data.get('resource_type', 'article'),
        data.get('description', ''),
        data.get('reading_time', 0)
    ))
    
    bookmark_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return bookmark_id


def get_bookmarks(user_id: int = 1, topic: str = None) -> List[Dict]:
    """Get bookmarks for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if topic:
        cursor.execute('''
            SELECT * FROM bookmarks 
            WHERE user_id = ? AND topic = ?
            ORDER BY created_at DESC
        ''', (user_id, topic))
    else:
        cursor.execute('''
            SELECT * FROM bookmarks 
            WHERE user_id = ?
            ORDER BY created_at DESC
        ''', (user_id,))
    
    bookmarks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return bookmarks


def delete_bookmark(bookmark_id: int) -> bool:
    """Delete a bookmark"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM bookmarks WHERE id = ?', (bookmark_id,))
    conn.commit()
    conn.close()
    return True


# ==========================================
# NOTES OPERATIONS
# ==========================================

def create_note(data: Dict) -> int:
    """Create a reflection note"""
    conn = get_connection()
    cursor = conn.cursor()
    
    tags = json.dumps(data.get('tags', []))
    
    cursor.execute('''
        INSERT INTO notes (title, content, tags, mood)
        VALUES (?, ?, ?, ?)
    ''', (
        data.get('title', ''),
        data.get('content', ''),
        tags,
        data.get('mood', '')
    ))
    
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return note_id


def get_notes(user_id: int = 1, limit: int = 50) -> List[Dict]:
    """Get notes for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM notes 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    ''', (user_id, limit))
    
    notes = [dict(row) for row in cursor.fetchall()]
    # Parse tags JSON
    for note in notes:
        note['tags'] = json.loads(note.get('tags', '[]'))
    
    conn.close()
    return notes


def update_note(note_id: int, data: Dict) -> bool:
    """Update a note"""
    conn = get_connection()
    cursor = conn.cursor()
    
    tags = json.dumps(data.get('tags', []))
    
    cursor.execute('''
        UPDATE notes SET 
            title = ?, content = ?, tags = ?, mood = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        data.get('title', ''),
        data.get('content', ''),
        tags,
        data.get('mood', ''),
        note_id
    ))
    
    conn.commit()
    conn.close()
    return True


def delete_note(note_id: int) -> bool:
    """Delete a note"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()
    return True


# ==========================================
# SCHEDULE OPERATIONS
# ==========================================

def create_event(data: Dict) -> int:
    """Create a schedule event"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO schedule_events 
        (title, description, topic, start_time, end_time, color, is_recurring, recurrence_rule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', ''),
        data.get('description', ''),
        data.get('topic', ''),
        data.get('start_time', ''),
        data.get('end_time', ''),
        data.get('color', '#188038'),
        data.get('is_recurring', 0),
        data.get('recurrence_rule', '')
    ))
    
    event_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return event_id


def get_events(user_id: int = 1, start_date: str = None, end_date: str = None) -> List[Dict]:
    """Get schedule events"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if start_date and end_date:
        cursor.execute('''
            SELECT * FROM schedule_events 
            WHERE user_id = ? AND start_time >= ? AND end_time <= ?
            ORDER BY start_time ASC
        ''', (user_id, start_date, end_date))
    else:
        cursor.execute('''
            SELECT * FROM schedule_events 
            WHERE user_id = ?
            ORDER BY start_time ASC
        ''', (user_id,))
    
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return events


def delete_event(event_id: int) -> bool:
    """Delete a schedule event"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM schedule_events WHERE id = ?', (event_id,))
    conn.commit()
    conn.close()
    return True


# ==========================================
# ACHIEVEMENTS OPERATIONS
# ==========================================

def unlock_achievement(user_id: int, badge_name: str, badge_icon: str, description: str) -> int:
    """Unlock an achievement for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if already unlocked
    cursor.execute('''
        SELECT id FROM achievements WHERE user_id = ? AND badge_name = ?
    ''', (user_id, badge_name))
    
    if cursor.fetchone():
        conn.close()
        return 0  # Already unlocked
    
    cursor.execute('''
        INSERT INTO achievements (user_id, badge_name, badge_icon, description)
        VALUES (?, ?, ?, ?)
    ''', (user_id, badge_name, badge_icon, description))
    
    achievement_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return achievement_id


def get_achievements(user_id: int = 1) -> List[Dict]:
    """Get all achievements for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM achievements 
        WHERE user_id = ?
        ORDER BY unlocked_at DESC
    ''', (user_id,))
    
    achievements = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return achievements


# ==========================================
# USER & SETTINGS OPERATIONS
# ==========================================

def get_user(user_id: int = 1) -> Optional[Dict]:
    """Get user profile"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    return dict(user) if user else None


def update_user(user_id: int, data: Dict) -> bool:
    """Update user profile"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users SET 
            email = ?, display_name = ?, avatar_initial = ?, 
            streak_days = ?, total_points = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        data.get('email', ''),
        data.get('display_name', ''),
        data.get('avatar_initial', 'U'),
        data.get('streak_days', 0),
        data.get('total_points', 0),
        user_id
    ))
    
    conn.commit()
    conn.close()
    return True


def get_settings(user_id: int = 1) -> Dict:
    """Get user settings"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM settings WHERE user_id = ?', (user_id,))
    settings = cursor.fetchone()
    conn.close()
    
    if settings:
        result = dict(settings)
        result['blocked_sites'] = json.loads(result.get('blocked_sites', '[]'))
        return result
    return {}


def update_settings(user_id: int, data: Dict) -> bool:
    """Update user settings"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE settings SET
            productivity_mode = ?, break_reminder = ?, deep_focus_mode = ?,
            daily_goal_minutes = ?, break_interval_minutes = ?,
            blocked_sites = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
    ''', (
        data.get('productivity_mode', True),
        data.get('break_reminder', True),
        data.get('deep_focus_mode', False),
        data.get('daily_goal_minutes', 120),
        data.get('break_interval_minutes', 25),
        json.dumps(data.get('blocked_sites', [])),
        user_id
    ))
    
    conn.commit()
    conn.close()
    return True


# ==========================================
# COMMUNITY & LEADERBOARD OPERATIONS
# ==========================================

def get_leaderboard(timeframe: str = 'all', limit: int = 10) -> List[Dict]:
    """Get community leaderboard"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Build query based on timeframe
    if timeframe == 'week':
        time_filter = "AND l.timestamp >= datetime('now', '-7 days')"
    elif timeframe == 'month':
        time_filter = "AND l.timestamp >= datetime('now', '-30 days')"
    else:
        time_filter = ""
    
    query = f'''
        SELECT 
            u.id,
            u.display_name,
            u.avatar_initial,
            u.total_points,
            u.streak_days,
            COUNT(DISTINCT l.id) as sessions,
            CAST(SUM(IFNULL(l.duration, 0)) / 60.0 AS INTEGER) as total_minutes
        FROM users u
        LEFT JOIN learning_logs l ON u.id = l.user_id {time_filter}
        GROUP BY u.id
        ORDER BY u.total_points DESC
        LIMIT ?
    '''
    
    cursor.execute(query, (limit,))
    leaderboard = [dict(row) for row in cursor.fetchall()]
    
    # Add rank
    for i, user in enumerate(leaderboard, 1):
        user['rank'] = i
    
    conn.close()
    return leaderboard


def get_user_rank(user_id: int) -> Dict:
    """Get user's rank in leaderboard"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE total_points > (SELECT total_points FROM users WHERE id = ?)
    ''', (user_id,))
    
    result = cursor.fetchone()
    rank = result['rank'] if result else 0
    
    # Get user data
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user_data = cursor.fetchone()
    
    conn.close()
    
    if user_data:
        return {
            "rank": rank,
            "display_name": user_data['display_name'],
            "total_points": user_data['total_points'],
            "streak_days": user_data['streak_days']
        }
    return {"rank": 0, "total_points": 0}


def get_total_users() -> int:
    """Get total number of users"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM users')
    result = cursor.fetchone()
    conn.close()
    return result['count'] if result else 0


def get_total_learning_hours() -> int:
    """Get total learning hours across all users"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT SUM(duration) / 3600 as total_hours FROM learning_logs')
    result = cursor.fetchone()
    conn.close()
    return int(result['total_hours']) if result and result['total_hours'] else 0


def get_total_achievements_unlocked() -> int:
    """Get total achievements unlocked"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM achievements')
    result = cursor.fetchone()
    conn.close()
    return result['count'] if result else 0


def get_active_users_today() -> int:
    """Get number of active users today"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT COUNT(DISTINCT user_id) as count
        FROM learning_logs
        WHERE DATE(timestamp) = DATE('now')
    ''')
    result = cursor.fetchone()
    conn.close()
    return result['count'] if result else 0


def update_settings(user_id: int, data: Dict) -> bool:
    """Update user settings"""
    conn = get_connection()
    cursor = conn.cursor()
    
    blocked_sites = json.dumps(data.get('blocked_sites', []))
    
    cursor.execute('''
        UPDATE settings SET 
            tracking_enabled = ?,
            dark_mode = ?,
            sync_enabled = ?,
            notification_enabled = ?,
            blocked_sites = ?,
            daily_goal_minutes = ?
        WHERE user_id = ?
    ''', (
        data.get('tracking_enabled', 1),
        data.get('dark_mode', 0),
        data.get('sync_enabled', 1),
        data.get('notification_enabled', 1),
        blocked_sites,
        data.get('daily_goal_minutes', 60),
        user_id
    ))
    
    conn.commit()
    conn.close()
    return True


def update_streak(user_id: int = 1) -> int:
    """Update user streak based on daily activity"""
    conn = get_connection()
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    
    # Check if user was active yesterday
    cursor.execute('''
        SELECT * FROM daily_stats WHERE user_id = ? AND date = ?
    ''', (user_id, yesterday))
    yesterday_activity = cursor.fetchone()
    
    # Check if user was active today
    cursor.execute('''
        SELECT * FROM daily_stats WHERE user_id = ? AND date = ?
    ''', (user_id, today))
    today_activity = cursor.fetchone()
    
    # Get current streak
    cursor.execute('SELECT streak_days FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    current_streak = user['streak_days'] if user else 0
    
    if today_activity:
        if yesterday_activity:
            # Continue streak
            new_streak = current_streak + 1
        else:
            # Reset streak (broken yesterday)
            new_streak = 1
    else:
        new_streak = current_streak  # No change until today's activity
    
    cursor.execute('UPDATE users SET streak_days = ? WHERE id = ?', (new_streak, user_id))
    conn.commit()
    conn.close()
    
    return new_streak


# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def get_topic_stats(user_id: int = 1, days: int = 30) -> Dict:
    """Get topic distribution stats"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    cursor.execute('''
        SELECT topic, COUNT(*) as count, SUM(duration) as total_time
        FROM learning_logs 
        WHERE user_id = ? AND timestamp >= ?
        GROUP BY topic
        ORDER BY count DESC
    ''', (user_id, cutoff_date))
    
    topics = {}
    for row in cursor.fetchall():
        topics[row['topic']] = {
            'count': row['count'],
            'total_time': row['total_time'] or 0
        }
    
    conn.close()
    return topics


def get_total_stats(user_id: int = 1) -> Dict:
    """Get overall statistics"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            COUNT(*) as total_sessions,
            SUM(duration) as total_time,
            AVG(engagement_score) as avg_engagement,
            COUNT(DISTINCT topic) as topics_count
        FROM learning_logs 
        WHERE user_id = ?
    ''', (user_id,))
    
    stats = cursor.fetchone()
    conn.close()
    
    return dict(stats) if stats else {}


# ==========================================
# TASKS / TODOS OPERATIONS
# ==========================================

def create_task(data: Dict) -> int:
    """Create a new task"""
    conn = get_connection()
    cursor = conn.cursor()
    
    tags = json.dumps(data.get('tags', []))
    
    cursor.execute('''
        INSERT INTO tasks (title, description, priority, status, due_date, due_time, 
                          topic, estimated_minutes, tags, is_recurring, recurrence_rule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', 'Untitled Task'),
        data.get('description', ''),
        data.get('priority', 'medium'),
        data.get('status', 'pending'),
        data.get('due_date'),
        data.get('due_time'),
        data.get('topic'),
        data.get('estimated_minutes', 30),
        tags,
        data.get('is_recurring', 0),
        data.get('recurrence_rule')
    ))
    
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id


def get_tasks(user_id: int = 1, status: str = None, include_completed: bool = False) -> List[Dict]:
    """Get all tasks with optional filtering"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if status:
        cursor.execute('''
            SELECT * FROM tasks WHERE user_id = ? AND status = ?
            ORDER BY 
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                due_date ASC NULLS LAST,
                created_at DESC
        ''', (user_id, status))
    elif include_completed:
        cursor.execute('''
            SELECT * FROM tasks WHERE user_id = ?
            ORDER BY 
                CASE status WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                due_date ASC NULLS LAST,
                created_at DESC
        ''', (user_id,))
    else:
        cursor.execute('''
            SELECT * FROM tasks WHERE user_id = ? AND status != 'completed'
            ORDER BY 
                CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                due_date ASC NULLS LAST,
                created_at DESC
        ''', (user_id,))
    
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    for task in tasks:
        task['tags'] = json.loads(task.get('tags', '[]'))
    
    return tasks


def get_task(task_id: int) -> Optional[Dict]:
    """Get a single task by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    task = cursor.fetchone()
    conn.close()
    
    if task:
        result = dict(task)
        result['tags'] = json.loads(result.get('tags', '[]'))
        return result
    return None


def update_task(task_id: int, data: Dict) -> bool:
    """Update a task"""
    conn = get_connection()
    cursor = conn.cursor()
    
    tags = json.dumps(data.get('tags', []))
    
    cursor.execute('''
        UPDATE tasks SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            priority = COALESCE(?, priority),
            status = COALESCE(?, status),
            due_date = COALESCE(?, due_date),
            due_time = COALESCE(?, due_time),
            topic = COALESCE(?, topic),
            estimated_minutes = COALESCE(?, estimated_minutes),
            actual_minutes = COALESCE(?, actual_minutes),
            tags = ?,
            completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        data.get('title'),
        data.get('description'),
        data.get('priority'),
        data.get('status'),
        data.get('due_date'),
        data.get('due_time'),
        data.get('topic'),
        data.get('estimated_minutes'),
        data.get('actual_minutes'),
        tags,
        data.get('status'),
        task_id
    ))
    
    conn.commit()
    conn.close()
    return True


def delete_task(task_id: int) -> bool:
    """Delete a task"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return True


def complete_task(task_id: int) -> bool:
    """Mark a task as completed"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE tasks SET 
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (task_id,))
    conn.commit()
    conn.close()
    
    # Update daily focus stats
    update_focus_stats_tasks()
    return True


def get_tasks_due_today(user_id: int = 1) -> List[Dict]:
    """Get tasks due today"""
    conn = get_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT * FROM tasks 
        WHERE user_id = ? AND due_date = ? AND status != 'completed'
        ORDER BY due_time ASC NULLS LAST, priority DESC
    ''', (user_id, today))
    
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    for task in tasks:
        task['tags'] = json.loads(task.get('tags', '[]'))
    
    return tasks


# ==========================================
# POMODORO SESSIONS OPERATIONS
# ==========================================

def create_pomodoro_session(data: Dict) -> int:
    """Start a new pomodoro session"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO pomodoro_sessions (task_id, session_type, duration_minutes, topic, notes, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('task_id'),
        data.get('session_type', 'focus'),
        data.get('duration_minutes', 25),
        data.get('topic'),
        data.get('notes'),
        'active'
    ))
    
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id


def complete_pomodoro_session(session_id: int, actual_duration: int) -> bool:
    """Complete a pomodoro session"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE pomodoro_sessions SET
            status = 'completed',
            actual_duration = ?,
            ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (actual_duration, session_id))
    
    conn.commit()
    conn.close()
    
    # Update daily focus stats
    update_focus_stats_pomodoro(actual_duration)
    return True


def cancel_pomodoro_session(session_id: int, actual_duration: int = 0) -> bool:
    """Cancel/interrupt a pomodoro session"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE pomodoro_sessions SET
            status = 'cancelled',
            actual_duration = ?,
            ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (actual_duration, session_id))
    
    conn.commit()
    conn.close()
    return True


def get_pomodoro_sessions(user_id: int = 1, days: int = 7) -> List[Dict]:
    """Get pomodoro sessions for last N days"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    cursor.execute('''
        SELECT * FROM pomodoro_sessions 
        WHERE user_id = ? AND started_at >= ?
        ORDER BY started_at DESC
    ''', (user_id, cutoff_date))
    
    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return sessions


def get_pomodoro_stats(user_id: int = 1, days: int = 7) -> Dict:
    """Get pomodoro statistics"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    cursor.execute('''
        SELECT 
            COUNT(*) as total_sessions,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
            SUM(CASE WHEN status = 'completed' THEN actual_duration ELSE 0 END) as total_focus_minutes,
            AVG(CASE WHEN status = 'completed' THEN actual_duration ELSE NULL END) as avg_session_duration
        FROM pomodoro_sessions 
        WHERE user_id = ? AND started_at >= ? AND session_type = 'focus'
    ''', (user_id, cutoff_date))
    
    stats = cursor.fetchone()
    conn.close()
    
    return dict(stats) if stats else {}


# ==========================================
# FOCUS SETTINGS OPERATIONS
# ==========================================

def get_focus_settings(user_id: int = 1) -> Dict:
    """Get focus/pomodoro settings"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM focus_settings WHERE user_id = ?', (user_id,))
    settings = cursor.fetchone()
    
    if not settings:
        # Create default settings
        cursor.execute('''
            INSERT INTO focus_settings (user_id) VALUES (?)
        ''', (user_id,))
        conn.commit()
        cursor.execute('SELECT * FROM focus_settings WHERE user_id = ?', (user_id,))
        settings = cursor.fetchone()
    
    conn.close()
    
    if settings:
        result = dict(settings)
        result['blocked_sites_during_focus'] = json.loads(result.get('blocked_sites_during_focus', '[]'))
        return result
    return {}


def update_focus_settings(user_id: int, data: Dict) -> bool:
    """Update focus/pomodoro settings"""
    conn = get_connection()
    cursor = conn.cursor()
    
    blocked_sites = json.dumps(data.get('blocked_sites_during_focus', []))
    
    cursor.execute('''
        UPDATE focus_settings SET
            focus_duration = COALESCE(?, focus_duration),
            short_break = COALESCE(?, short_break),
            long_break = COALESCE(?, long_break),
            sessions_before_long_break = COALESCE(?, sessions_before_long_break),
            auto_start_breaks = COALESCE(?, auto_start_breaks),
            auto_start_focus = COALESCE(?, auto_start_focus),
            sound_enabled = COALESCE(?, sound_enabled),
            notification_enabled = COALESCE(?, notification_enabled),
            blocked_sites_during_focus = ?
        WHERE user_id = ?
    ''', (
        data.get('focus_duration'),
        data.get('short_break'),
        data.get('long_break'),
        data.get('sessions_before_long_break'),
        data.get('auto_start_breaks'),
        data.get('auto_start_focus'),
        data.get('sound_enabled'),
        data.get('notification_enabled'),
        blocked_sites,
        user_id
    ))
    
    conn.commit()
    conn.close()
    return True


# ==========================================
# REMINDERS OPERATIONS
# ==========================================

def create_reminder(data: Dict) -> int:
    """Create a new reminder"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO reminders (title, message, reminder_time, reminder_type, recurrence_rule, task_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', 'Reminder'),
        data.get('message'),
        data.get('reminder_time'),
        data.get('reminder_type', 'once'),
        data.get('recurrence_rule'),
        data.get('task_id')
    ))
    
    reminder_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return reminder_id


def get_reminders(user_id: int = 1, active_only: bool = True) -> List[Dict]:
    """Get all reminders"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if active_only:
        cursor.execute('''
            SELECT * FROM reminders WHERE user_id = ? AND is_active = 1
            ORDER BY reminder_time ASC
        ''', (user_id,))
    else:
        cursor.execute('''
            SELECT * FROM reminders WHERE user_id = ?
            ORDER BY reminder_time ASC
        ''', (user_id,))
    
    reminders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return reminders


def get_upcoming_reminders(user_id: int = 1, hours: int = 24) -> List[Dict]:
    """Get reminders due in next N hours"""
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cutoff = (datetime.now() + timedelta(hours=hours)).isoformat()
    
    cursor.execute('''
        SELECT * FROM reminders 
        WHERE user_id = ? AND is_active = 1 AND reminder_time >= ? AND reminder_time <= ?
        ORDER BY reminder_time ASC
    ''', (user_id, now, cutoff))
    
    reminders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return reminders


def update_reminder(reminder_id: int, data: Dict) -> bool:
    """Update a reminder"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE reminders SET
            title = COALESCE(?, title),
            message = COALESCE(?, message),
            reminder_time = COALESCE(?, reminder_time),
            reminder_type = COALESCE(?, reminder_type),
            recurrence_rule = COALESCE(?, recurrence_rule),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
    ''', (
        data.get('title'),
        data.get('message'),
        data.get('reminder_time'),
        data.get('reminder_type'),
        data.get('recurrence_rule'),
        data.get('is_active'),
        reminder_id
    ))
    
    conn.commit()
    conn.close()
    return True


def delete_reminder(reminder_id: int) -> bool:
    """Delete a reminder"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM reminders WHERE id = ?', (reminder_id,))
    conn.commit()
    conn.close()
    return True


def deactivate_reminder(reminder_id: int) -> bool:
    """Deactivate a reminder (mark as triggered)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE reminders SET is_active = 0 WHERE id = ?', (reminder_id,))
    conn.commit()
    conn.close()
    return True


# ==========================================
# FOCUS STATS OPERATIONS
# ==========================================

def update_focus_stats_pomodoro(minutes: int, user_id: int = 1):
    """Update daily focus stats after a pomodoro session"""
    conn = get_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute('''
        INSERT INTO focus_stats (user_id, date, total_focus_minutes, completed_pomodoros)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id, date) DO UPDATE SET
            total_focus_minutes = total_focus_minutes + ?,
            completed_pomodoros = completed_pomodoros + 1
    ''', (user_id, today, minutes, minutes))
    
    conn.commit()
    conn.close()


def update_focus_stats_tasks(user_id: int = 1):
    """Update daily focus stats after completing a task"""
    conn = get_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute('''
        INSERT INTO focus_stats (user_id, date, completed_tasks)
        VALUES (?, ?, 1)
        ON CONFLICT(user_id, date) DO UPDATE SET
            completed_tasks = completed_tasks + 1
    ''', (user_id, today))
    
    conn.commit()
    conn.close()


def get_focus_stats(user_id: int = 1, days: int = 7) -> List[Dict]:
    """Get daily focus stats for last N days"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    cursor.execute('''
        SELECT * FROM focus_stats 
        WHERE user_id = ? AND date >= ?
        ORDER BY date DESC
    ''', (user_id, cutoff_date))
    
    stats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return stats


def get_productivity_summary(user_id: int = 1) -> Dict:
    """Get productivity summary for dashboard"""
    conn = get_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Today's stats
    cursor.execute('''
        SELECT * FROM focus_stats WHERE user_id = ? AND date = ?
    ''', (user_id, today))
    today_stats = cursor.fetchone()
    
    # Pending tasks count
    cursor.execute('''
        SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status != 'completed'
    ''', (user_id,))
    pending_tasks = cursor.fetchone()['count']
    
    # Tasks due today
    cursor.execute('''
        SELECT COUNT(*) as count FROM tasks 
        WHERE user_id = ? AND due_date = ? AND status != 'completed'
    ''', (user_id, today))
    due_today = cursor.fetchone()['count']
    
    # This week's total focus time
    week_start = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime('%Y-%m-%d')
    cursor.execute('''
        SELECT SUM(total_focus_minutes) as total FROM focus_stats 
        WHERE user_id = ? AND date >= ?
    ''', (user_id, week_start))
    week_focus = cursor.fetchone()['total'] or 0
    
    conn.close()
    
    return {
        'today_focus_minutes': today_stats['total_focus_minutes'] if today_stats else 0,
        'today_pomodoros': today_stats['completed_pomodoros'] if today_stats else 0,
        'today_completed_tasks': today_stats['completed_tasks'] if today_stats else 0,
        'pending_tasks': pending_tasks,
        'due_today': due_today,
        'week_focus_minutes': week_focus
    }


# ==========================================
# AI CHAT HISTORY OPERATIONS
# ==========================================

def save_chat_message(message_data: Dict, user_id: int = 1):
    """Save a chat message to history"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create chat_history table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            user_message TEXT,
            ai_response TEXT,
            intent TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        INSERT INTO chat_history (user_id, user_message, ai_response, intent, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        user_id,
        message_data.get('user_message', ''),
        message_data.get('ai_response', ''),
        message_data.get('intent', 'general'),
        message_data.get('timestamp', datetime.now().isoformat())
    ))
    
    conn.commit()
    conn.close()


def get_chat_history(user_id: int = 1, limit: int = 50) -> List[Dict]:
    """Get chat history for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            user_message TEXT,
            ai_response TEXT,
            intent TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        SELECT * FROM chat_history 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (user_id, limit))
    
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return history


def clear_chat_history(user_id: int = 1):
    """Clear chat history for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM chat_history WHERE user_id = ?', (user_id,))
    
    conn.commit()
    conn.close()


# ==========================================
# HISTORY ANALYSIS OPERATIONS
# ==========================================

def save_history_analysis(analysis: Dict, user_id: int = 1):
    """Save browsing history analysis"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create history_analysis table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            pattern_type TEXT,
            confidence REAL,
            features TEXT,
            insights TEXT,
            entities TEXT,
            sentiment TEXT,
            total_visits INTEGER,
            primary_topic TEXT,
            topic_distribution TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        INSERT INTO history_analysis 
        (user_id, pattern_type, confidence, features, insights, entities, sentiment, 
         total_visits, primary_topic, topic_distribution, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        analysis.get('pattern_type', 'explorer'),
        analysis.get('confidence', 0),
        json.dumps(analysis.get('features', {})),
        json.dumps(analysis.get('insights', [])),
        json.dumps(analysis.get('entities', {})),
        json.dumps(analysis.get('sentiment', {})),
        analysis.get('total_visits', 0),
        analysis.get('primary_topic', 'General'),
        json.dumps(analysis.get('topic_distribution', {})),
        datetime.now().isoformat()
    ))
    
    conn.commit()
    conn.close()


def get_latest_history_analysis(user_id: int = 1) -> Optional[Dict]:
    """Get the most recent history analysis"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            pattern_type TEXT,
            confidence REAL,
            features TEXT,
            insights TEXT,
            entities TEXT,
            sentiment TEXT,
            total_visits INTEGER,
            primary_topic TEXT,
            topic_distribution TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        SELECT * FROM history_analysis 
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
    ''', (user_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        analysis = dict(row)
        # Parse JSON fields
        analysis['features'] = json.loads(analysis.get('features', '{}'))
        analysis['insights'] = json.loads(analysis.get('insights', '[]'))
        analysis['entities'] = json.loads(analysis.get('entities', '{}'))
        analysis['sentiment'] = json.loads(analysis.get('sentiment', '{}'))
        analysis['topic_distribution'] = json.loads(analysis.get('topic_distribution', '{}'))
        return analysis
    
    return None


# ==========================================
# RESUME OPERATIONS
# ==========================================

def save_generated_resume(resume: Dict, user_id: int = 1):
    """Save generated resume to database"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create resumes table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS generated_resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            resume_data TEXT,
            generated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        INSERT INTO generated_resumes (user_id, resume_data, generated_at)
        VALUES (?, ?, ?)
    ''', (user_id, json.dumps(resume), datetime.now().isoformat()))
    
    conn.commit()
    conn.close()


def get_latest_resume(user_id: int = 1) -> Optional[Dict]:
    """Get the most recently generated resume"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS generated_resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            resume_data TEXT,
            generated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        SELECT * FROM generated_resumes 
        WHERE user_id = ?
        ORDER BY generated_at DESC
        LIMIT 1
    ''', (user_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return json.loads(row['resume_data'])
    
    return None


def get_all_resumes(user_id: int = 1, limit: int = 10) -> List[Dict]:
    """Get all generated resumes for a user"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS generated_resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT 1,
            resume_data TEXT,
            generated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        SELECT * FROM generated_resumes 
        WHERE user_id = ?
        ORDER BY generated_at DESC
        LIMIT ?
    ''', (user_id, limit))
    
    resumes = []
    for row in cursor.fetchall():
        resume = dict(row)
        resume['resume_data'] = json.loads(resume.get('resume_data', '{}'))
        resumes.append(resume)
    
    conn.close()
    return resumes


# Initialize database when module is imported
if __name__ == "__main__":
    init_db()
    print("Database setup complete!")