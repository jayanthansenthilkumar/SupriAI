const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dataDir = path.resolve(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, "supriai.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tab_id INTEGER,
      url TEXT,
      title TEXT DEFAULT '',
      domain TEXT,
      favicon TEXT DEFAULT '',
      timestamp INTEGER,
      session_id TEXT,
      active_time INTEGER DEFAULT 0,
      date TEXT,
      category TEXT DEFAULT 'unknown',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      start_time INTEGER,
      end_time INTEGER,
      tab_count INTEGER DEFAULT 0,
      total_active_time INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS domain_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT,
      date TEXT,
      visit_count INTEGER DEFAULT 0,
      total_active_time INTEGER DEFAULT 0,
      tab_count INTEGER DEFAULT 0,
      category TEXT DEFAULT 'unknown',
      last_visit INTEGER,
      UNIQUE(domain, date)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tab_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tab_id INTEGER,
      event_type TEXT,
      timestamp INTEGER,
      session_id TEXT,
      url TEXT DEFAULT '',
      domain TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS productivity_scores (
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
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chrome_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      title TEXT DEFAULT '',
      domain TEXT,
      visit_count INTEGER DEFAULT 1,
      last_visit_time REAL DEFAULT 0,
      typed_count INTEGER DEFAULT 0,
      category TEXT DEFAULT 'unknown',
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT,
      insight_type TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS goals (
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
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      value TEXT
    )`);

    // Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_tabs_domain ON tabs(domain)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tabs_date ON tabs(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tabs_session ON tabs(session_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_domain_stats_date ON domain_stats(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_domain_stats_domain ON domain_stats(domain)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tab_events_session ON tab_events(session_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_productivity_date ON productivity_scores(date)`);

    console.log("Database tables initialized.");
  });
}

// ==================== Helper: Promisify ====================
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = { db, dbRun, dbGet, dbAll };
