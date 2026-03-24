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
    seedDummyDataIfEmpty();
  });
}

function getDateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function seedDummyDataIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM domain_stats', (countErr, row) => {
    if (countErr) {
      console.error('Dummy seed check failed:', countErr.message);
      return;
    }

    if ((row?.count || 0) > 0) {
      return;
    }

    console.log('No browsing records found. Seeding dummy offline dataset...');

    const domainTemplate = [
      { domain: 'github.com', category: 'productive', baseTime: 1600000, visits: 20, tabs: 10 },
      { domain: 'stackoverflow.com', category: 'productive', baseTime: 1020000, visits: 15, tabs: 8 },
      { domain: 'docs.google.com', category: 'productive', baseTime: 940000, visits: 10, tabs: 6 },
      { domain: 'youtube.com', category: 'entertainment', baseTime: 780000, visits: 13, tabs: 6 },
      { domain: 'reddit.com', category: 'social', baseTime: 560000, visits: 11, tabs: 5 },
      { domain: 'news.ycombinator.com', category: 'news', baseTime: 300000, visits: 7, tabs: 4 },
      { domain: 'mail.google.com', category: 'communication', baseTime: 450000, visits: 8, tabs: 4 }
    ];

    db.serialize(() => {
      const sessionId = `seed_session_${Date.now()}`;
      db.run(
        'INSERT OR IGNORE INTO sessions (session_id, start_time, tab_count, total_active_time) VALUES (?, ?, ?, ?)',
        [sessionId, Date.now() - 3600000, 24, 5200000]
      );

      for (let day = 0; day < 7; day += 1) {
        const date = getDateOffset(day);
        let productive = 0;
        let social = 0;
        let entertainment = 0;
        let other = 0;
        let total = 0;

        domainTemplate.forEach((item, idx) => {
          const jitter = Math.max(0.85, 1 - day * 0.03);
          const activeTime = Math.round(item.baseTime * jitter);
          const visits = Math.max(1, item.visits - day);
          const tabs = Math.max(1, item.tabs - Math.floor(day / 2));
          const ts = Date.now() - day * 86400000 - idx * 3600000;

          total += activeTime;
          if (item.category === 'productive') productive += activeTime;
          else if (item.category === 'social') social += activeTime;
          else if (item.category === 'entertainment') entertainment += activeTime;
          else other += activeTime;

          db.run(
            `INSERT INTO domain_stats (domain, date, visit_count, total_active_time, tab_count, category, last_visit)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [item.domain, date, visits, activeTime, tabs, item.category, ts]
          );

          db.run(
            `INSERT INTO tabs (tab_id, url, title, domain, timestamp, session_id, active_time, date, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              1000 + idx + day * 20,
              `https://${item.domain}`,
              `${item.domain} activity (${date})`,
              item.domain,
              ts,
              sessionId,
              Math.round(activeTime / Math.max(1, tabs)),
              date,
              item.category
            ]
          );
        });

        const score = total > 0
          ? ((productive * 1.0 + social * 0.1 + entertainment * 0.1 + other * 0.3) / total) * 100
          : 0;

        db.run(
          `INSERT OR REPLACE INTO productivity_scores
           (date, score, productive_time, social_time, entertainment_time, other_time, total_time,
            top_productive_domain, top_distraction_domain)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [date, Math.round(score * 10) / 10, productive, social, entertainment, other, total, 'github.com', 'youtube.com']
        );
      }

      db.run(
        `INSERT INTO insights (model_name, insight_type, data)
         VALUES (?, ?, ?)`,
        ['Offline Seed', 'bootstrap', JSON.stringify({ note: 'Dummy dataset inserted for offline mode' })]
      );

      db.run(
        `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?), (?, ?), (?, ?)`,
        [
          'syncInterval', '60',
          'inactiveThreshold', '5',
          'timeLimits', 'youtube.com:45, reddit.com:20, x.com:15'
        ]
      );

      console.log('Dummy offline dataset seeded into SQLite.');
    });
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
