"""
SupriAI Database Manager
SQLite database for storing browsing data, sessions, and ML results
"""
import os
import sqlite3
import json
from datetime import datetime, timedelta
from contextlib import contextmanager

import config


class DatabaseManager:
    """SQLite database manager for SupriAI backend"""

    def __init__(self, db_path=None):
        self.db_path = db_path or config.DATABASE_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_tables()

    @contextmanager
    def get_connection(self):
        """Get a database connection as context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_tables(self):
        """Initialize all database tables"""
        with self.get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS tabs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tab_id INTEGER,
                    url TEXT,
                    domain TEXT,
                    title TEXT DEFAULT '',
                    favicon TEXT DEFAULT '',
                    timestamp INTEGER,
                    session_id TEXT,
                    active_time INTEGER DEFAULT 0,
                    date TEXT,
                    category TEXT DEFAULT 'unknown',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE,
                    start_time INTEGER,
                    end_time INTEGER,
                    tab_count INTEGER DEFAULT 0,
                    total_active_time INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS domain_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain TEXT,
                    date TEXT,
                    visit_count INTEGER DEFAULT 0,
                    total_active_time INTEGER DEFAULT 0,
                    tab_count INTEGER DEFAULT 0,
                    category TEXT DEFAULT 'unknown',
                    last_visit INTEGER,
                    UNIQUE(domain, date)
                );

                CREATE TABLE IF NOT EXISTS tab_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tab_id INTEGER,
                    event_type TEXT,
                    timestamp INTEGER,
                    session_id TEXT,
                    url TEXT DEFAULT '',
                    domain TEXT DEFAULT '',
                    metadata TEXT DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS productivity_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT UNIQUE,
                    score REAL DEFAULT 0,
                    productive_time INTEGER DEFAULT 0,
                    social_time INTEGER DEFAULT 0,
                    entertainment_time INTEGER DEFAULT 0,
                    other_time INTEGER DEFAULT 0,
                    total_time INTEGER DEFAULT 0,
                    top_productive_domain TEXT DEFAULT '',
                    top_distraction_domain TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS chrome_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT,
                    title TEXT DEFAULT '',
                    domain TEXT,
                    visit_count INTEGER DEFAULT 1,
                    last_visit_time REAL DEFAULT 0,
                    typed_count INTEGER DEFAULT 0,
                    category TEXT DEFAULT 'unknown',
                    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS insights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT,
                    insight_type TEXT,
                    data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    description TEXT DEFAULT '',
                    target_value REAL DEFAULT 0,
                    current_value REAL DEFAULT 0,
                    goal_type TEXT DEFAULT 'productivity',
                    status TEXT DEFAULT 'active',
                    start_date TEXT,
                    end_date TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE,
                    value TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_tabs_domain ON tabs(domain);
                CREATE INDEX IF NOT EXISTS idx_tabs_date ON tabs(date);
                CREATE INDEX IF NOT EXISTS idx_tabs_session ON tabs(session_id);
                CREATE INDEX IF NOT EXISTS idx_domain_stats_date ON domain_stats(date);
                CREATE INDEX IF NOT EXISTS idx_domain_stats_domain ON domain_stats(domain);
                CREATE INDEX IF NOT EXISTS idx_tab_events_session ON tab_events(session_id);
                CREATE INDEX IF NOT EXISTS idx_productivity_date ON productivity_scores(date);
                CREATE INDEX IF NOT EXISTS idx_chrome_history_domain ON chrome_history(domain);
            """)

    # ==================== Tab Operations ====================

    def save_tab(self, tab_data):
        """Save a tab record"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO tabs (tab_id, url, domain, title, favicon, timestamp, session_id, active_time, date, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tab_data.get('tabId'),
                tab_data.get('url', ''),
                tab_data.get('domain', ''),
                tab_data.get('title', ''),
                tab_data.get('favicon', ''),
                tab_data.get('timestamp', int(datetime.now().timestamp() * 1000)),
                tab_data.get('sessionId'),
                tab_data.get('activeTime', 0),
                tab_data.get('date', datetime.now().strftime('%Y-%m-%d')),
                tab_data.get('category', 'unknown')
            ))

    def get_tabs(self, limit=100):
        """Get recent tabs"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM tabs ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
            return [dict(r) for r in rows]

    def get_tabs_by_domain(self, domain):
        """Get tabs for a specific domain"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM tabs WHERE domain = ? ORDER BY timestamp DESC", (domain,)
            ).fetchall()
            return [dict(r) for r in rows]

    def get_tabs_by_date_range(self, start_date, end_date):
        """Get tabs within a date range"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM tabs WHERE date BETWEEN ? AND ? ORDER BY timestamp DESC",
                (start_date, end_date)
            ).fetchall()
            return [dict(r) for r in rows]

    # ==================== Session Operations ====================

    def create_session(self, session_id=None):
        """Create a new browsing session"""
        if not session_id:
            session_id = f"session_{int(datetime.now().timestamp())}"
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO sessions (session_id, start_time, tab_count, total_active_time)
                VALUES (?, ?, 0, 0)
            """, (session_id, int(datetime.now().timestamp() * 1000)))
        return session_id

    def get_sessions(self, limit=10):
        """Get recent sessions"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?", (limit,)
            ).fetchall()
            return [dict(r) for r in rows]

    def update_session(self, session_id, updates):
        """Update session data"""
        allowed = ['end_time', 'tab_count', 'total_active_time']
        sets = []
        values = []
        for key in allowed:
            if key in updates:
                sets.append(f"{key} = ?")
                values.append(updates[key])
        if not sets:
            return
        values.append(session_id)
        with self.get_connection() as conn:
            conn.execute(
                f"UPDATE sessions SET {', '.join(sets)} WHERE session_id = ?", values
            )

    # ==================== Domain Statistics ====================

    def save_domain_stats(self, domain, date, stats):
        """Save or update domain statistics"""
        with self.get_connection() as conn:
            existing = conn.execute(
                "SELECT * FROM domain_stats WHERE domain = ? AND date = ?", (domain, date)
            ).fetchone()

            if existing:
                conn.execute("""
                    UPDATE domain_stats
                    SET visit_count = visit_count + ?,
                        total_active_time = total_active_time + ?,
                        tab_count = tab_count + ?,
                        category = COALESCE(?, category),
                        last_visit = ?
                    WHERE domain = ? AND date = ?
                """, (
                    stats.get('visitCount', 1),
                    stats.get('activeTime', 0),
                    stats.get('tabCount', 1),
                    stats.get('category'),
                    int(datetime.now().timestamp() * 1000),
                    domain, date
                ))
            else:
                conn.execute("""
                    INSERT INTO domain_stats (domain, date, visit_count, total_active_time, tab_count, category, last_visit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    domain, date,
                    stats.get('visitCount', 1),
                    stats.get('activeTime', 0),
                    stats.get('tabCount', 1),
                    stats.get('category', 'unknown'),
                    int(datetime.now().timestamp() * 1000)
                ))

    def get_domain_stats(self, start_date, end_date):
        """Get domain statistics for a date range"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT domain, SUM(visit_count) as visits, SUM(total_active_time) as total_time,
                       SUM(tab_count) as tabs, category
                FROM domain_stats
                WHERE date BETWEEN ? AND ?
                GROUP BY domain
                ORDER BY total_time DESC
            """, (start_date, end_date)).fetchall()
            return [dict(r) for r in rows]

    def get_top_domains(self, start_date, end_date, limit=10):
        """Get top domains by active time"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT domain, SUM(total_active_time) as total_time,
                       SUM(visit_count) as visits, category
                FROM domain_stats
                WHERE date BETWEEN ? AND ?
                GROUP BY domain
                ORDER BY total_time DESC
                LIMIT ?
            """, (start_date, end_date, limit)).fetchall()
            return [dict(r) for r in rows]

    def get_category_breakdown(self, start_date, end_date):
        """Get time breakdown by category"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT category, SUM(total_active_time) as total_time,
                       COUNT(DISTINCT domain) as domain_count,
                       SUM(visit_count) as visits
                FROM domain_stats
                WHERE date BETWEEN ? AND ?
                GROUP BY category
                ORDER BY total_time DESC
            """, (start_date, end_date)).fetchall()
            return [dict(r) for r in rows]

    def get_browsing_summary(self, start_date, end_date):
        """Get comprehensive browsing summary"""
        with self.get_connection() as conn:
            summary_row = conn.execute("""
                SELECT COUNT(DISTINCT domain) as unique_domains,
                       SUM(visit_count) as total_visits,
                       SUM(total_active_time) as total_time
                FROM domain_stats
                WHERE date BETWEEN ? AND ?
            """, (start_date, end_date)).fetchone()

            summary = dict(summary_row) if summary_row else {
                'unique_domains': 0, 'total_visits': 0, 'total_time': 0
            }

            # Get top domain
            top = conn.execute("""
                SELECT domain, SUM(total_active_time) as time
                FROM domain_stats WHERE date BETWEEN ? AND ?
                GROUP BY domain ORDER BY time DESC LIMIT 1
            """, (start_date, end_date)).fetchone()

            summary['top_domain'] = dict(top) if top else None
            return summary

    def get_hourly_activity(self, date):
        """Get hourly activity breakdown for a date"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
                       COUNT(*) as events,
                       COUNT(DISTINCT domain) as domains
                FROM tab_events
                WHERE date(datetime(timestamp/1000, 'unixepoch', 'localtime')) = ?
                GROUP BY hour
                ORDER BY hour
            """, (date,)).fetchall()

            hourly = {i: {'events': 0, 'domains': 0} for i in range(24)}
            for r in rows:
                h = dict(r)
                hourly[h['hour']] = {'events': h['events'], 'domains': h['domains']}
            return hourly

    # ==================== Tab Events ====================

    def log_tab_event(self, event_data):
        """Log a tab event"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO tab_events (tab_id, event_type, timestamp, session_id, url, domain, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event_data.get('tabId'),
                event_data.get('eventType', ''),
                event_data.get('timestamp', int(datetime.now().timestamp() * 1000)),
                event_data.get('sessionId'),
                event_data.get('url', ''),
                event_data.get('domain', ''),
                json.dumps(event_data.get('metadata', {}))
            ))

    # ==================== Productivity ====================

    def save_productivity_score(self, date, data):
        """Save daily productivity score"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO productivity_scores
                (date, score, productive_time, social_time, entertainment_time, other_time,
                 total_time, top_productive_domain, top_distraction_domain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                date,
                data.get('score', 0),
                data.get('productive_time', 0),
                data.get('social_time', 0),
                data.get('entertainment_time', 0),
                data.get('other_time', 0),
                data.get('total_time', 0),
                data.get('top_productive_domain', ''),
                data.get('top_distraction_domain', '')
            ))

    def get_productivity_scores(self, start_date, end_date):
        """Get productivity scores for a date range"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM productivity_scores
                WHERE date BETWEEN ? AND ?
                ORDER BY date DESC
            """, (start_date, end_date)).fetchall()
            return [dict(r) for r in rows]

    # ==================== Chrome History Import ====================

    def import_chrome_history(self, items):
        """Import Chrome browsing history"""
        count = 0
        with self.get_connection() as conn:
            for item in items:
                try:
                    conn.execute("""
                        INSERT OR IGNORE INTO chrome_history
                        (url, title, domain, visit_count, last_visit_time, typed_count, category)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get('url', ''),
                        item.get('title', ''),
                        item.get('domain', ''),
                        item.get('visitCount', 1),
                        item.get('lastVisitTime', 0),
                        item.get('typedCount', 0),
                        item.get('category', 'unknown')
                    ))
                    count += 1
                except Exception:
                    continue
        return count

    # ==================== Goals ====================

    def get_active_goals(self):
        """Get active goals"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM goals WHERE status = 'active' ORDER BY created_at DESC"
            ).fetchall()
            return [dict(r) for r in rows]

    def save_goal(self, data):
        """Save a new goal"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO goals (title, description, target_value, goal_type, start_date, end_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                data.get('title', ''),
                data.get('description', ''),
                data.get('target_value', 0),
                data.get('goal_type', 'productivity'),
                data.get('start_date', datetime.now().strftime('%Y-%m-%d')),
                data.get('end_date', (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'))
            ))

    # ==================== Settings ====================

    def get_setting(self, key):
        """Get a setting value"""
        with self.get_connection() as conn:
            row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
            return row['value'] if row else None

    def save_setting(self, key, value):
        """Save a setting"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (key, value))

    # ==================== Data Export ====================

    def export_all_data(self):
        """Export all data as JSON-compatible dict"""
        with self.get_connection() as conn:
            result = {}
            for table in ['tabs', 'sessions', 'domain_stats', 'productivity_scores', 'chrome_history']:
                rows = conn.execute(f"SELECT * FROM {table}").fetchall()
                result[table] = [dict(r) for r in rows]
            result['export_date'] = datetime.now().isoformat()
            return result

    # ==================== ML Data Access ====================

    def get_all_data_for_ml(self):
        """Get all data needed for ML model training"""
        with self.get_connection() as conn:
            domain_stats = conn.execute("SELECT * FROM domain_stats ORDER BY date").fetchall()
            productivity = conn.execute("SELECT * FROM productivity_scores ORDER BY date").fetchall()
            history = conn.execute("SELECT * FROM chrome_history").fetchall()

            return {
                'domain_stats': [dict(r) for r in domain_stats],
                'productivity_scores': [dict(r) for r in productivity],
                'chrome_history': [dict(r) for r in history]
            }

    # ==================== Insights ====================

    def save_insight(self, model_name, insight_type, data):
        """Save an ML insight"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO insights (model_name, insight_type, data)
                VALUES (?, ?, ?)
            """, (model_name, insight_type, json.dumps(data)))

    def get_insights(self, limit=20):
        """Get recent insights"""
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM insights ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                try:
                    d['data'] = json.loads(d['data'])
                except Exception:
                    pass
                result.append(d)
            return result


# Create singleton instance
db = DatabaseManager()
