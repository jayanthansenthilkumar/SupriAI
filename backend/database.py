"""
SupriAI SQLite Database Manager
Handles all database operations with SQLite
"""
import sqlite3
import os
import json
from datetime import datetime, timedelta
from contextlib import contextmanager
import config


class DatabaseManager:
    """SQLite Database Manager for SupriAI"""

    def __init__(self, db_path=None):
        self.db_path = db_path or config.DATABASE_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_db(self):
        """Initialize database with schema"""
        with self.get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    start_time INTEGER NOT NULL,
                    end_time INTEGER,
                    tab_count INTEGER DEFAULT 0,
                    total_active_time INTEGER DEFAULT 0,
                    productivity_score REAL DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS tabs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tab_id INTEGER,
                    url TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    title TEXT DEFAULT '',
                    favicon TEXT DEFAULT '',
                    timestamp INTEGER NOT NULL,
                    session_id TEXT,
                    active_time INTEGER DEFAULT 0,
                    date TEXT NOT NULL,
                    category TEXT DEFAULT 'unknown',
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS domain_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain TEXT NOT NULL,
                    date TEXT NOT NULL,
                    visit_count INTEGER DEFAULT 0,
                    total_active_time INTEGER DEFAULT 0,
                    tab_count INTEGER DEFAULT 0,
                    last_visit INTEGER,
                    category TEXT DEFAULT 'unknown',
                    productivity_score REAL DEFAULT 0.0,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(domain, date)
                );

                CREATE TABLE IF NOT EXISTS tab_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tab_id INTEGER,
                    event_type TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    session_id TEXT,
                    url TEXT DEFAULT '',
                    domain TEXT DEFAULT '',
                    metadata TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS chrome_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    title TEXT DEFAULT '',
                    domain TEXT NOT NULL,
                    visit_count INTEGER DEFAULT 1,
                    last_visit_time INTEGER,
                    typed_count INTEGER DEFAULT 0,
                    category TEXT DEFAULT 'unknown',
                    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS ml_predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prediction_type TEXT NOT NULL,
                    prediction_data TEXT NOT NULL,
                    confidence REAL DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    valid_until DATETIME
                );

                CREATE TABLE IF NOT EXISTS user_goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    goal_type TEXT NOT NULL,
                    target_value REAL NOT NULL,
                    current_value REAL DEFAULT 0.0,
                    start_date TEXT NOT NULL,
                    end_date TEXT,
                    status TEXT DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS productivity_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT UNIQUE NOT NULL,
                    score REAL NOT NULL,
                    productive_time INTEGER DEFAULT 0,
                    social_time INTEGER DEFAULT 0,
                    entertainment_time INTEGER DEFAULT 0,
                    other_time INTEGER DEFAULT 0,
                    total_time INTEGER DEFAULT 0,
                    focus_sessions INTEGER DEFAULT 0,
                    top_productive_domain TEXT,
                    top_distraction_domain TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_tabs_domain ON tabs(domain);
                CREATE INDEX IF NOT EXISTS idx_tabs_date ON tabs(date);
                CREATE INDEX IF NOT EXISTS idx_tabs_timestamp ON tabs(timestamp);
                CREATE INDEX IF NOT EXISTS idx_tabs_session_id ON tabs(session_id);
                CREATE INDEX IF NOT EXISTS idx_tabs_category ON tabs(category);
                CREATE INDEX IF NOT EXISTS idx_domain_stats_domain ON domain_stats(domain);
                CREATE INDEX IF NOT EXISTS idx_domain_stats_date ON domain_stats(date);
                CREATE INDEX IF NOT EXISTS idx_tab_events_timestamp ON tab_events(timestamp);
                CREATE INDEX IF NOT EXISTS idx_chrome_history_domain ON chrome_history(domain);
                CREATE INDEX IF NOT EXISTS idx_productivity_scores_date ON productivity_scores(date);
            """)

    # ==================== Session Operations ====================

    def create_session(self, session_id, start_time=None):
        """Create a new browsing session"""
        with self.get_connection() as conn:
            conn.execute(
                "INSERT INTO sessions (session_id, start_time) VALUES (?, ?)",
                (session_id, start_time or int(datetime.now().timestamp() * 1000))
            )
        return session_id

    def update_session(self, session_id, **kwargs):
        """Update session data"""
        allowed_fields = ['end_time', 'tab_count', 'total_active_time', 'productivity_score']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return
        set_clause = ', '.join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [session_id]
        with self.get_connection() as conn:
            conn.execute(
                f"UPDATE sessions SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
                values
            )

    def get_sessions(self, limit=10):
        """Get recent sessions"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    # ==================== Tab Operations ====================

    def save_tab(self, tab_data):
        """Save a tab record"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO tabs (tab_id, url, domain, title, favicon, timestamp,
                    session_id, active_time, date, category, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tab_data.get('tabId'), tab_data.get('url'), tab_data.get('domain'),
                tab_data.get('title', ''), tab_data.get('favicon', ''),
                tab_data.get('timestamp', int(datetime.now().timestamp() * 1000)),
                tab_data.get('sessionId'), tab_data.get('activeTime', 0),
                tab_data.get('date', datetime.now().strftime('%Y-%m-%d')),
                tab_data.get('category', 'unknown'),
                json.dumps(tab_data.get('metadata', {}))
            ))

    def get_tabs_by_date_range(self, start_date, end_date):
        """Get tabs within a date range"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM tabs WHERE date BETWEEN ? AND ? ORDER BY timestamp DESC",
                (start_date, end_date)
            ).fetchall()
        return [dict(r) for r in rows]

    def get_tabs_by_domain(self, domain, limit=100):
        """Get tabs for a specific domain"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM tabs WHERE domain = ? ORDER BY timestamp DESC LIMIT ?",
                (domain, limit)
            ).fetchall()
        return [dict(r) for r in rows]

    # ==================== Domain Stats Operations ====================

    def save_domain_stats(self, domain, date, stats):
        """Save or update domain statistics"""
        with self.get_connection() as conn:
            existing = conn.execute(
                "SELECT * FROM domain_stats WHERE domain = ? AND date = ?",
                (domain, date)
            ).fetchone()

            if existing:
                conn.execute("""
                    UPDATE domain_stats SET
                        visit_count = visit_count + ?,
                        total_active_time = total_active_time + ?,
                        tab_count = tab_count + ?,
                        last_visit = ?,
                        category = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE domain = ? AND date = ?
                """, (
                    stats.get('visitCount', 1),
                    stats.get('activeTime', 0),
                    stats.get('tabCount', 1),
                    int(datetime.now().timestamp() * 1000),
                    stats.get('category', 'unknown'),
                    domain, date
                ))
            else:
                conn.execute("""
                    INSERT INTO domain_stats (domain, date, visit_count, total_active_time,
                        tab_count, last_visit, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    domain, date,
                    stats.get('visitCount', 1),
                    stats.get('activeTime', 0),
                    stats.get('tabCount', 1),
                    int(datetime.now().timestamp() * 1000),
                    stats.get('category', 'unknown')
                ))

    def get_domain_stats(self, start_date, end_date):
        """Get domain statistics for a date range"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT domain, 
                       SUM(visit_count) as visit_count,
                       SUM(total_active_time) as total_active_time,
                       SUM(tab_count) as tab_count,
                       MAX(last_visit) as last_visit,
                       category
                FROM domain_stats 
                WHERE date BETWEEN ? AND ?
                GROUP BY domain
                ORDER BY total_active_time DESC
            """, (start_date, end_date)).fetchall()
        return [dict(r) for r in rows]

    def get_top_domains(self, start_date, end_date, limit=10):
        """Get top domains by time spent"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT domain, 
                       SUM(total_active_time) as total_time,
                       SUM(visit_count) as total_visits,
                       category
                FROM domain_stats 
                WHERE date BETWEEN ? AND ?
                GROUP BY domain
                ORDER BY total_time DESC
                LIMIT ?
            """, (start_date, end_date, limit)).fetchall()
        return [dict(r) for r in rows]

    # ==================== Tab Events ====================

    def log_tab_event(self, event_data):
        """Log a tab event"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO tab_events (tab_id, event_type, timestamp, session_id, url, domain, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event_data.get('tabId'),
                event_data.get('eventType'),
                event_data.get('timestamp', int(datetime.now().timestamp() * 1000)),
                event_data.get('sessionId'),
                event_data.get('url', ''),
                event_data.get('domain', ''),
                json.dumps(event_data.get('metadata', {}))
            ))

    # ==================== Chrome History ====================

    def import_chrome_history(self, history_items):
        """Import Chrome history records"""
        with self.get_connection() as conn:
            for item in history_items:
                try:
                    conn.execute("""
                        INSERT OR REPLACE INTO chrome_history 
                        (url, title, domain, visit_count, last_visit_time, typed_count, category)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get('url'), item.get('title', ''),
                        item.get('domain'), item.get('visitCount', 1),
                        item.get('lastVisitTime'), item.get('typedCount', 0),
                        item.get('category', 'unknown')
                    ))
                except Exception as e:
                    print(f"Error importing history item: {e}")
        return len(history_items)

    def get_chrome_history(self, limit=500):
        """Get imported Chrome history"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM chrome_history ORDER BY last_visit_time DESC LIMIT ?",
                (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    # ==================== Productivity Scores ====================

    def save_productivity_score(self, date, score_data):
        """Save daily productivity score"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO productivity_scores 
                (date, score, productive_time, social_time, entertainment_time,
                 other_time, total_time, focus_sessions, top_productive_domain, top_distraction_domain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                date, score_data.get('score', 0),
                score_data.get('productive_time', 0),
                score_data.get('social_time', 0),
                score_data.get('entertainment_time', 0),
                score_data.get('other_time', 0),
                score_data.get('total_time', 0),
                score_data.get('focus_sessions', 0),
                score_data.get('top_productive_domain', ''),
                score_data.get('top_distraction_domain', '')
            ))

    def get_productivity_scores(self, start_date, end_date):
        """Get productivity scores for a date range"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM productivity_scores WHERE date BETWEEN ? AND ? ORDER BY date",
                (start_date, end_date)
            ).fetchall()
        return [dict(r) for r in rows]

    # ==================== ML Predictions ====================

    def save_prediction(self, prediction_type, prediction_data, confidence=0.0, valid_hours=24):
        """Save an ML prediction"""
        import numpy as np
        class NpEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, np.integer): return int(obj)
                if isinstance(obj, np.floating): return float(obj)
                if isinstance(obj, np.ndarray): return obj.tolist()
                return super(NpEncoder, self).default(obj)
                
        valid_until = (datetime.now() + timedelta(hours=valid_hours)).strftime('%Y-%m-%d %H:%M:%S')
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO ml_predictions (prediction_type, prediction_data, confidence, valid_until)
                VALUES (?, ?, ?, ?)
            """, (prediction_type, json.dumps(prediction_data, cls=NpEncoder), confidence, valid_until))

    def get_latest_prediction(self, prediction_type):
        """Get the latest valid prediction of a type"""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT * FROM ml_predictions 
                WHERE prediction_type = ? AND valid_until > datetime('now')
                ORDER BY created_at DESC LIMIT 1
            """, (prediction_type,)).fetchone()
        if row:
            result = dict(row)
            result['prediction_data'] = json.loads(result['prediction_data'])
            return result
        return None

    # ==================== User Goals ====================

    def save_goal(self, goal_data):
        """Save a user goal"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO user_goals (goal_type, target_value, start_date, end_date)
                VALUES (?, ?, ?, ?)
            """, (
                goal_data.get('goalType'),
                goal_data.get('targetValue'),
                goal_data.get('startDate', datetime.now().strftime('%Y-%m-%d')),
                goal_data.get('endDate')
            ))

    def get_active_goals(self):
        """Get all active goals"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM user_goals WHERE status = 'active' ORDER BY created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]

    def update_goal_progress(self, goal_id, current_value):
        """Update goal progress"""
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE user_goals SET current_value = ? WHERE id = ?",
                (current_value, goal_id)
            )

    # ==================== Analytics Queries ====================

    def get_hourly_activity(self, date):
        """Get hourly activity breakdown for a date"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT 
                    CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT domain) as unique_domains
                FROM tab_events 
                WHERE date(datetime(timestamp/1000, 'unixepoch', 'localtime')) = ?
                GROUP BY hour
                ORDER BY hour
            """, (date,)).fetchall()
        
        # Fill in all 24 hours
        hourly = {i: {'hour': i, 'event_count': 0, 'unique_domains': 0} for i in range(24)}
        for row in rows:
            h = row['hour']
            hourly[h] = dict(row)
        return list(hourly.values())

    def get_category_breakdown(self, start_date, end_date):
        """Get time spent per category"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT category, 
                       SUM(total_active_time) as total_time,
                       COUNT(DISTINCT domain) as domain_count,
                       SUM(visit_count) as total_visits
                FROM domain_stats 
                WHERE date BETWEEN ? AND ?
                GROUP BY category
                ORDER BY total_time DESC
            """, (start_date, end_date)).fetchall()
        return [dict(r) for r in rows]

    def get_browsing_summary(self, start_date, end_date):
        """Get comprehensive browsing summary"""
        with self.get_connection() as conn:
            summary = {}

            # Total stats
            row = conn.execute("""
                SELECT COUNT(*) as total_tabs,
                       COUNT(DISTINCT domain) as unique_domains,
                       SUM(active_time) as total_active_time
                FROM tabs WHERE date BETWEEN ? AND ?
            """, (start_date, end_date)).fetchone()
            summary['totalTabs'] = row['total_tabs']
            summary['uniqueDomains'] = row['unique_domains']
            summary['totalActiveTime'] = row['total_active_time'] or 0

            # Total visits from domain stats
            row2 = conn.execute("""
                SELECT SUM(visit_count) as total_visits
                FROM domain_stats WHERE date BETWEEN ? AND ?
            """, (start_date, end_date)).fetchone()
            summary['totalVisits'] = row2['total_visits'] or 0

            # Top domains
            top = conn.execute("""
                SELECT domain, SUM(total_active_time) as total_time,
                       SUM(visit_count) as visits, category
                FROM domain_stats WHERE date BETWEEN ? AND ?
                GROUP BY domain ORDER BY total_time DESC LIMIT 5
            """, (start_date, end_date)).fetchall()
            summary['topDomains'] = [dict(r) for r in top]

        return summary

    def get_all_data_for_ml(self):
        """Get all data needed for ML training"""
        with self.get_connection() as conn:
            domain_stats = conn.execute(
                "SELECT * FROM domain_stats ORDER BY date"
            ).fetchall()
            
            productivity = conn.execute(
                "SELECT * FROM productivity_scores ORDER BY date"
            ).fetchall()

            events = conn.execute(
                "SELECT * FROM tab_events ORDER BY timestamp"
            ).fetchall()

            history = conn.execute(
                "SELECT * FROM chrome_history ORDER BY last_visit_time DESC"
            ).fetchall()

        return {
            'domain_stats': [dict(r) for r in domain_stats],
            'productivity_scores': [dict(r) for r in productivity],
            'tab_events': [dict(r) for r in events],
            'chrome_history': [dict(r) for r in history]
        }

    def export_all_data(self):
        """Export all data as JSON"""
        with self.get_connection() as conn:
            data = {}
            for table in ['sessions', 'tabs', 'domain_stats', 'tab_events',
                          'chrome_history', 'productivity_scores', 'user_goals', 'ml_predictions']:
                rows = conn.execute(f"SELECT * FROM {table}").fetchall()
                data[table] = [dict(r) for r in rows]
            data['export_date'] = datetime.now().isoformat()
        return data


# Singleton instance
db = DatabaseManager()
