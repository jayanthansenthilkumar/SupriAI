/**
 * SupriAI Express Backend Server
 * Handles: CRUD operations, Chrome extension sync, Python AI bridge
 * Stack: Express + SQLite + Python Flask bridge
 */
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { dbRun, dbGet, dbAll } = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3001;
const PYTHON_API = process.env.PYTHON_API || 'http://127.0.0.1:5000/api';

// Website category lists for Express-side classification
const CATEGORY_MAP = {
  productive: [
    'github.com','stackoverflow.com','docs.google.com','linkedin.com',
    'medium.com','dev.to','freecodecamp.org','udemy.com','coursera.org',
    'kaggle.com','leetcode.com','hackerrank.com','geeksforgeeks.org',
    'w3schools.com','mdn.mozilla.org','learn.microsoft.com','notion.so',
    'trello.com','figma.com','canva.com','scholar.google.com','arxiv.org'
  ],
  social: [
    'facebook.com','twitter.com','x.com','instagram.com','tiktok.com',
    'snapchat.com','reddit.com','pinterest.com','discord.com','telegram.org','whatsapp.com'
  ],
  entertainment: [
    'youtube.com','www.youtube.com','netflix.com','primevideo.com',
    'disneyplus.com','twitch.tv','spotify.com','soundcloud.com','9gag.com'
  ],
  news: [
    'bbc.com','cnn.com','reuters.com','nytimes.com','theguardian.com',
    'techcrunch.com','theverge.com','wired.com','news.ycombinator.com'
  ],
  shopping: [
    'amazon.com','ebay.com','walmart.com','flipkart.com','etsy.com','myntra.com'
  ],
  communication: [
    'mail.google.com','outlook.com','slack.com','teams.microsoft.com','zoom.us','meet.google.com'
  ]
};

const CATEGORY_WEIGHTS = {
  productive: 1.0, communication: 0.7, news: 0.4,
  shopping: 0.2, entertainment: 0.1, social: 0.1, unknown: 0.3
};

function classifyDomain(domain) {
  const d = (domain || '').toLowerCase().replace(/^www\./, '');
  for (const [category, domains] of Object.entries(CATEGORY_MAP)) {
    if (domains.some(cd => d === cd || d.endsWith('.' + cd))) {
      return category;
    }
  }
  return 'unknown';
}

function getDateRange(period) {
  const today = new Date();
  const end = today.toISOString().split('T')[0];
  let start = end;
  if (period === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 7);
    start = d.toISOString().split('T')[0];
  } else if (period === 'month') {
    const d = new Date(today); d.setDate(d.getDate() - 30);
    start = d.toISOString().split('T')[0];
  } else if (period === 'year') {
    const d = new Date(today); d.setDate(d.getDate() - 365);
    start = d.toISOString().split('T')[0];
  }
  return { start, end };
}

// ==================== Middleware ====================
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ==================== Health ====================
app.get('/api/health', async (req, res) => {
  let pythonStatus = 'offline';
  try {
    const r = await axios.get(`${PYTHON_API}/health`, { timeout: 2000 });
    if (r.status === 200) pythonStatus = 'online';
  } catch {}

  res.json({
    status: 'running',
    version: '3.0.0',
    name: 'SupriAI Express Backend',
    timestamp: new Date().toISOString(),
    python_backend: pythonStatus
  });
});

// ==================== Data Sync (from Chrome Extension) ====================
app.post('/api/sync', async (req, res) => {
  try {
    const { tabData, tabGroups, sessionId } = req.body;
    if (!tabData) return res.status(400).json({ error: 'No tabData provided' });

    const today = new Date().toISOString().split('T')[0];
    let synced = 0;
    const categoryTimes = {};
    let totalTime = 0;

    for (const [tabId, info] of Object.entries(tabData)) {
      const domain = info.domain || '';
      if (!domain) continue;

      const category = classifyDomain(domain);
      const activeTime = info.totalActiveTime || 0;
      totalTime += activeTime;
      categoryTimes[category] = (categoryTimes[category] || 0) + activeTime;

      // Save tab
      await dbRun(
        `INSERT INTO tabs (tab_id, url, domain, title, timestamp, session_id, active_time, date, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [parseInt(tabId), info.url || '', domain, info.title || '',
         info.startTime || Date.now(), sessionId, activeTime, today, category]
      );

      // Upsert domain stats
      const existing = await dbGet(
        'SELECT * FROM domain_stats WHERE domain = ? AND date = ?', [domain, today]
      );
      if (existing) {
        await dbRun(
          `UPDATE domain_stats SET visit_count = visit_count + 1,
           total_active_time = total_active_time + ?, tab_count = tab_count + 1,
           category = ?, last_visit = ? WHERE domain = ? AND date = ?`,
          [activeTime, category, Date.now(), domain, today]
        );
      } else {
        await dbRun(
          `INSERT INTO domain_stats (domain, date, visit_count, total_active_time, tab_count, category, last_visit)
           VALUES (?, ?, 1, ?, 1, ?, ?)`,
          [domain, today, activeTime, category, Date.now()]
        );
      }
      synced++;
    }

    // Calculate productivity
    let score = 0;
    if (totalTime > 0) {
      for (const [cat, time] of Object.entries(categoryTimes)) {
        score += (time / totalTime) * (CATEGORY_WEIGHTS[cat] || 0.3) * 100;
      }
    }

    await dbRun(
      `INSERT OR REPLACE INTO productivity_scores
       (date, score, productive_time, social_time, entertainment_time, other_time, total_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [today, Math.round(score * 10) / 10,
       categoryTimes.productive || 0, categoryTimes.social || 0,
       categoryTimes.entertainment || 0,
       totalTime - (categoryTimes.productive || 0) - (categoryTimes.social || 0) - (categoryTimes.entertainment || 0),
       totalTime]
    );

    res.json({ success: true, synced, date: today, productivity_score: Math.round(score * 10) / 10 });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== Import Chrome History ====================
app.post('/api/import-history', async (req, res) => {
  try {
    const items = req.body.history || [];
    let imported = 0;

    for (const item of items) {
      try {
        const url = item.url || '';
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        if (!domain || ['newtab', 'extensions', 'settings'].includes(domain)) continue;

        const category = classifyDomain(domain);
        await dbRun(
          `INSERT OR IGNORE INTO chrome_history (url, title, domain, visit_count, last_visit_time, typed_count, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [url, item.title || '', domain, item.visitCount || 1,
           item.lastVisitTime || 0, item.typedCount || 0, category]
        );
        imported++;
      } catch {}
    }

    res.json({ success: true, imported, total_submitted: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Stats ====================
app.get('/api/stats/summary', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.period || 'today');
    const row = await dbGet(
      `SELECT COUNT(DISTINCT domain) as unique_domains, SUM(visit_count) as total_visits,
       SUM(total_active_time) as total_time
       FROM domain_stats WHERE date BETWEEN ? AND ?`, [start, end]
    );
    res.json({
      period: req.query.period || 'today',
      unique_domains: row?.unique_domains || 0,
      total_visits: row?.total_visits || 0,
      total_time: row?.total_time || 0,
      start_date: start, end_date: end
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/domains', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.period || 'week');
    const rows = await dbAll(
      `SELECT domain, SUM(visit_count) as visits, SUM(total_active_time) as total_time,
       SUM(tab_count) as tabs, category
       FROM domain_stats WHERE date BETWEEN ? AND ?
       GROUP BY domain ORDER BY total_time DESC`, [start, end]
    );
    res.json({ period: req.query.period || 'week', stats: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/top-domains', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.period || 'week');
    const limit = parseInt(req.query.limit) || 10;
    const rows = await dbAll(
      `SELECT domain, SUM(total_active_time) as total_time, SUM(visit_count) as visits, category
       FROM domain_stats WHERE date BETWEEN ? AND ?
       GROUP BY domain ORDER BY total_time DESC LIMIT ?`, [start, end, limit]
    );
    res.json({ period: req.query.period || 'week', domains: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/categories', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.period || 'week');
    const rows = await dbAll(
      `SELECT category, SUM(total_active_time) as total_time,
       COUNT(DISTINCT domain) as domain_count, SUM(visit_count) as visits
       FROM domain_stats WHERE date BETWEEN ? AND ?
       GROUP BY category ORDER BY total_time DESC`, [start, end]
    );
    res.json({ period: req.query.period || 'week', categories: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/hourly', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const rows = await dbAll(
      `SELECT CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
       COUNT(*) as events, COUNT(DISTINCT domain) as domains
       FROM tab_events WHERE date(datetime(timestamp/1000, 'unixepoch', 'localtime')) = ?
       GROUP BY hour ORDER BY hour`, [date]
    );
    const hourly = {};
    for (let i = 0; i < 24; i++) hourly[i] = { events: 0, domains: 0 };
    rows.forEach(r => { hourly[r.hour] = { events: r.events, domains: r.domains }; });
    res.json({ date, hourly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Productivity ====================
app.get('/api/productivity/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const row = await dbGet('SELECT * FROM productivity_scores WHERE date = ?', [today]);
    res.json(row || { date: today, score: 0, message: 'No data for today yet' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/productivity/scores', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.period || 'month');
    const rows = await dbAll(
      'SELECT * FROM productivity_scores WHERE date BETWEEN ? AND ? ORDER BY date DESC',
      [start, end]
    );
    res.json({ period: req.query.period || 'month', scores: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Sessions ====================
app.post('/api/sessions', async (req, res) => {
  try {
    const sessionId = req.body.sessionId || `session_${Date.now()}`;
    await dbRun(
      'INSERT OR IGNORE INTO sessions (session_id, start_time) VALUES (?, ?)',
      [sessionId, Date.now()]
    );
    res.json({ success: true, sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const rows = await dbAll('SELECT * FROM sessions ORDER BY start_time DESC LIMIT ?', [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Tab Events ====================
app.post('/api/events', async (req, res) => {
  try {
    const { tabId, eventType, timestamp, sessionId, url, domain, metadata } = req.body;
    await dbRun(
      `INSERT INTO tab_events (tab_id, event_type, timestamp, session_id, url, domain, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tabId, eventType, timestamp || Date.now(), sessionId, url || '', domain || '',
       JSON.stringify(metadata || {})]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Tabs CRUD ====================
app.get('/api/tabs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rows = await dbAll('SELECT * FROM tabs ORDER BY timestamp DESC LIMIT ?', [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tabs', async (req, res) => {
  try {
    const { url, title, domain, duration, tab_id, session_id, category } = req.body;
    const result = await dbRun(
      `INSERT INTO tabs (tab_id, url, title, domain, active_time, session_id, date, category, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tab_id || 0, url, title, domain, duration || 0, session_id,
       new Date().toISOString().split('T')[0], category || classifyDomain(domain), Date.now()]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Browsing History ====================
app.get('/api/history', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.period || 'week');
    const limit = parseInt(req.query.limit) || 100;
    const rows = await dbAll(
      'SELECT * FROM tabs WHERE date BETWEEN ? AND ? ORDER BY timestamp DESC LIMIT ?',
      [start, end, limit]
    );
    res.json({ period: req.query.period || 'week', history: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Goals ====================
app.get('/api/goals', async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM goals WHERE status = 'active' ORDER BY created_at DESC");
    res.json({ goals: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const { title, description, target_value, goal_type, start_date, end_date } = req.body;
    await dbRun(
      `INSERT INTO goals (title, description, target_value, goal_type, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || '', target_value || 0, goal_type || 'productivity',
       start_date || new Date().toISOString().split('T')[0],
       end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Settings ====================
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    await dbRun(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [key, typeof value === 'string' ? value : JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Insights ====================
app.get('/api/insights', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const rows = await dbAll('SELECT * FROM insights ORDER BY created_at DESC LIMIT ?', [limit]);
    const parsed = rows.map(r => {
      try { r.data = JSON.parse(r.data); } catch {}
      return r;
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Export ====================
app.get('/api/export', async (req, res) => {
  try {
    const [tabs, sessions, domainStats, productivity, history] = await Promise.all([
      dbAll('SELECT * FROM tabs'),
      dbAll('SELECT * FROM sessions'),
      dbAll('SELECT * FROM domain_stats'),
      dbAll('SELECT * FROM productivity_scores'),
      dbAll('SELECT * FROM chrome_history')
    ]);
    res.json({ tabs, sessions, domain_stats: domainStats, productivity_scores: productivity,
      chrome_history: history, export_date: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Python AI/ML Bridge ====================
// These endpoints proxy to the Python Flask backend

app.get('/api/ml/models', async (req, res) => {
  try {
    const r = await axios.get(`${PYTHON_API}/models`, { timeout: 5000 });
    res.json(r.data);
  } catch (err) {
    res.json({ error: 'Python backend unavailable', models: {}, total_models: 0 });
  }
});

app.post('/api/ml/train', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/train`, req.body, { timeout: 30000 });
    // Save insight
    await dbRun(
      'INSERT INTO insights (model_name, insight_type, data) VALUES (?, ?, ?)',
      ['ML Engine', 'training', JSON.stringify(r.data)]
    );
    res.json(r.data);
  } catch (err) {
    res.status(502).json({ error: 'Python ML backend unavailable', details: err.message });
  }
});

app.post('/api/ml/classify', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/classify`, req.body, { timeout: 5000 });
    res.json(r.data);
  } catch {
    // Fallback to Express-side classification
    const domain = req.body.domain;
    const domains = req.body.domains;
    if (domain) {
      res.json({ category: classifyDomain(domain), confidence: 0.8, method: 'express-fallback' });
    } else if (domains) {
      res.json({ classifications: domains.map(d => ({ domain: d, category: classifyDomain(d), confidence: 0.8 })) });
    } else {
      res.status(400).json({ error: 'Provide domain or domains' });
    }
  }
});

app.post('/api/ml/insights', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/insights`, req.body, { timeout: 15000 });
    await dbRun(
      'INSERT INTO insights (model_name, insight_type, data) VALUES (?, ?, ?)',
      ['ML Engine', 'comprehensive', JSON.stringify(r.data)]
    );
    res.json(r.data);
  } catch (err) {
    res.status(502).json({ error: 'Python ML backend unavailable' });
  }
});

app.post('/api/ml/focus', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/focus`, req.body, { timeout: 5000 });
    res.json(r.data);
  } catch {
    // Fallback basic focus suggestion
    const hour = new Date().getHours();
    let recommendation = 'Maintain focus';
    if (hour >= 9 && hour <= 11) recommendation = 'Peak focus hours — deep work time!';
    else if (hour >= 14 && hour <= 16) recommendation = 'Post-lunch dip — try light tasks';
    else if (hour >= 22 || hour <= 5) recommendation = 'Late hours — consider rest';
    res.json({ recommendation, focus_state: 'moderate', confidence: 0.5, method: 'fallback' });
  }
});

app.post('/api/ml/predict-productivity', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/predict-productivity`, req.body, { timeout: 5000 });
    res.json(r.data);
  } catch {
    res.json({ predicted_score: 50, method: 'fallback' });
  }
});

app.post('/api/ml/detect-anomaly', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/detect-anomaly`, req.body, { timeout: 5000 });
    res.json(r.data);
  } catch {
    res.json({ is_anomaly: false, method: 'fallback' });
  }
});

app.get('/api/ml/forecast', async (req, res) => {
  try {
    const days = req.query.days || 7;
    const r = await axios.get(`${PYTHON_API}/ml/forecast?days=${days}`, { timeout: 10000 });
    res.json(r.data);
  } catch {
    res.json({ error: 'Forecast unavailable — Python backend offline' });
  }
});

app.post('/api/ml/recommendations', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/recommendations`, req.body, { timeout: 10000 });
    res.json(r.data);
  } catch {
    res.json({ recommendations: [], method: 'fallback' });
  }
});

app.post('/api/ml/content-analysis', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/content-analysis`, req.body, { timeout: 10000 });
    res.json(r.data);
  } catch {
    res.json({ topics: [], method: 'fallback' });
  }
});

app.post('/api/ml/collaborative', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/collaborative`, req.body, { timeout: 10000 });
    res.json(r.data);
  } catch {
    res.json({ domains: [], method: 'fallback' });
  }
});

app.post('/api/ml/temporal', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/temporal`, req.body, { timeout: 10000 });
    res.json(r.data);
  } catch {
    res.json({ prediction: {}, method: 'fallback' });
  }
});

app.get('/api/ml/schedule', async (req, res) => {
  try {
    const r = await axios.get(`${PYTHON_API}/ml/schedule`, { timeout: 5000 });
    res.json(r.data);
  } catch {
    res.json({ schedule: [], method: 'fallback' });
  }
});

app.get('/api/ml/optimal-hours', async (req, res) => {
  try {
    const r = await axios.get(`${PYTHON_API}/ml/optimal-hours`, { timeout: 5000 });
    res.json(r.data);
  } catch {
    res.json({ optimal_hours: [9, 10, 11, 14, 15], method: 'fallback' });
  }
});

app.post('/api/ml/cluster', async (req, res) => {
  try {
    const r = await axios.post(`${PYTHON_API}/ml/cluster`, req.body, { timeout: 5000 });
    res.json(r.data);
  } catch {
    res.json({ cluster: 0, label: 'Unknown', method: 'fallback' });
  }
});

// ==================== Start Server ====================
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║       SupriAI Express Backend — v3.0          ║
  ║  Server:  http://localhost:${PORT}               ║
  ║  Python:  ${PYTHON_API}       ║
  ║  DB:      SQLite (server/data/supriai.db)     ║
  ╚═══════════════════════════════════════════════╝
  `);
});
