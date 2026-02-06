-- SupriAI SQLite Database Schema
-- This schema can be used for server-side database implementation
-- Compatible with the IndexedDB structure used in the browser extension

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Sessions table
-- Tracks browsing sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    tab_count INTEGER DEFAULT 0,
    total_active_time INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_end_time ON sessions(end_time);

-- Tabs table
-- Stores individual tab records
CREATE TABLE IF NOT EXISTS tabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tab_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    title TEXT,
    favicon TEXT,
    timestamp INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    active_time INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_tabs_tab_id ON tabs(tab_id);
CREATE INDEX idx_tabs_url ON tabs(url);
CREATE INDEX idx_tabs_domain ON tabs(domain);
CREATE INDEX idx_tabs_timestamp ON tabs(timestamp);
CREATE INDEX idx_tabs_session_id ON tabs(session_id);
CREATE INDEX idx_tabs_date ON tabs(date);

-- Domain statistics table
-- Aggregated statistics per domain per day
CREATE TABLE IF NOT EXISTS domain_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    date TEXT NOT NULL,
    visit_count INTEGER DEFAULT 0,
    total_active_time INTEGER DEFAULT 0,
    tab_count INTEGER DEFAULT 0,
    last_visit INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, date)
);

CREATE INDEX idx_domain_stats_domain ON domain_stats(domain);
CREATE INDEX idx_domain_stats_date ON domain_stats(date);
CREATE INDEX idx_domain_stats_domain_date ON domain_stats(domain, date);

-- Tab events table
-- Detailed event log for tab activities
CREATE TABLE IF NOT EXISTS tab_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tab_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('opened', 'closed', 'activated', 'updated', 'idle')),
    timestamp INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    url TEXT,
    domain TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_tab_events_tab_id ON tab_events(tab_id);
CREATE INDEX idx_tab_events_event_type ON tab_events(event_type);
CREATE INDEX idx_tab_events_timestamp ON tab_events(timestamp);
CREATE INDEX idx_tab_events_session_id ON tab_events(session_id);

-- Triggers for updating timestamps
CREATE TRIGGER update_sessions_timestamp 
AFTER UPDATE ON sessions
BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_domain_stats_timestamp 
AFTER UPDATE ON domain_stats
BEGIN
    UPDATE domain_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Views for common queries

-- View: Recent tabs with session info
CREATE VIEW IF NOT EXISTS recent_tabs_view AS
SELECT 
    t.id,
    t.tab_id,
    t.url,
    t.domain,
    t.title,
    t.timestamp,
    t.active_time,
    t.date,
    s.session_id,
    s.start_time as session_start
FROM tabs t
LEFT JOIN sessions s ON t.session_id = s.session_id
ORDER BY t.timestamp DESC;

-- View: Domain statistics summary
CREATE VIEW IF NOT EXISTS domain_stats_summary AS
SELECT 
    domain,
    SUM(visit_count) as total_visits,
    SUM(total_active_time) as total_time,
    SUM(tab_count) as total_tabs,
    MAX(last_visit) as last_visit,
    COUNT(DISTINCT date) as days_active
FROM domain_stats
GROUP BY domain
ORDER BY total_time DESC;

-- View: Session summary
CREATE VIEW IF NOT EXISTS session_summary AS
SELECT 
    s.id,
    s.session_id,
    s.start_time,
    s.end_time,
    s.tab_count,
    s.total_active_time,
    COUNT(DISTINCT t.domain) as unique_domains,
    (s.end_time - s.start_time) as session_duration
FROM sessions s
LEFT JOIN tabs t ON s.session_id = t.session_id
GROUP BY s.id, s.session_id, s.start_time, s.end_time, s.tab_count, s.total_active_time
ORDER BY s.start_time DESC;

-- View: Daily browsing summary
CREATE VIEW IF NOT EXISTS daily_summary AS
SELECT 
    date,
    COUNT(*) as total_tabs,
    COUNT(DISTINCT domain) as unique_domains,
    SUM(active_time) as total_active_time,
    COUNT(DISTINCT session_id) as sessions
FROM tabs
GROUP BY date
ORDER BY date DESC;

-- Common queries

-- Get tabs for a specific date range
-- SELECT * FROM tabs WHERE timestamp BETWEEN ? AND ?;

-- Get domain stats for a date range
-- SELECT * FROM domain_stats WHERE date BETWEEN ? AND ?;

-- Get most visited domains
-- SELECT domain, SUM(visit_count) as visits FROM domain_stats GROUP BY domain ORDER BY visits DESC LIMIT 10;

-- Get domains with most time spent
-- SELECT domain, SUM(total_active_time) as time FROM domain_stats GROUP BY domain ORDER BY time DESC LIMIT 10;

-- Get session data
-- SELECT * FROM tabs WHERE session_id = ?;

-- Get tab events for a specific tab
-- SELECT * FROM tab_events WHERE tab_id = ? ORDER BY timestamp;

-- Clean up old data (older than 30 days)
-- DELETE FROM tabs WHERE timestamp < (strftime('%s', 'now') - 30*24*60*60) * 1000;
-- DELETE FROM tab_events WHERE timestamp < (strftime('%s', 'now') - 30*24*60*60) * 1000;

-- Vacuum database to reclaim space
-- VACUUM;
