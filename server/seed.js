/**
 * SupriAI — Database Seed Script
 * Generates 400+ realistic dummy browsing records across all tables
 * for ML model training and prediction.
 *
 * Usage:  cd server && node seed.js
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ── Setup ──────────────────────────────────────────────────
const dataDir = path.resolve(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.resolve(dataDir, "supriai.db");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// ── Realistic Websites Pool ────────────────────────────────
const SITES = {
  productive: [
    { domain: "github.com",           titles: ["Pull Requests", "Issues · Dashboard", "Explore Repositories", "Actions Workflows", "Code Review"] },
    { domain: "stackoverflow.com",    titles: ["How to use async/await", "React useEffect cleanup", "Python list comprehension", "SQL JOIN optimization", "Docker compose networking"] },
    { domain: "docs.google.com",      titles: ["Project Proposal", "Meeting Notes — Sprint 12", "Research Paper Draft", "Quarterly Report", "Budget Planning 2026"] },
    { domain: "medium.com",           titles: ["Understanding Transformers", "System Design Patterns", "Clean Code Principles", "Microservices Architecture", "Data Pipeline Best Practices"] },
    { domain: "leetcode.com",         titles: ["Two Sum — Easy", "Binary Tree Level Order", "Merge K Sorted Lists", "LRU Cache Design", "Dynamic Programming Patterns"] },
    { domain: "udemy.com",            titles: ["React & Node Masterclass", "Python for Data Science", "AWS Solutions Architect", "Docker & Kubernetes", "Machine Learning A-Z"] },
    { domain: "notion.so",            titles: ["Weekly Planner", "Reading List 2026", "Habit Tracker", "Project Roadmap", "Notes — CS Fundamentals"] },
    { domain: "kaggle.com",           titles: ["Titanic Dataset", "House Prices Competition", "NLP with Disaster Tweets", "Notebook: EDA", "Leaderboard"] },
    { domain: "figma.com",            titles: ["Dashboard UI Kit", "Mobile App Wireframes", "Design System v3", "Landing Page Concepts", "Icon Library"] },
    { domain: "dev.to",               titles: ["Top 10 VS Code Extensions", "Building a CLI in Rust", "React Server Components Explained", "Git Branching Strategy", "TypeScript Tips 2026"] },
    { domain: "coursera.org",         titles: ["Machine Learning — Week 4", "Deep Learning Specialization", "Google Data Analytics", "IBM AI Engineering", "Statistics with Python"] },
    { domain: "freecodecamp.org",     titles: ["JavaScript Algorithms", "Responsive Web Design", "Front End Libraries", "APIs and Microservices", "Data Visualization"] },
    { domain: "learn.microsoft.com",  titles: ["Azure Fundamentals", "C# Documentation", ".NET 8 What's New", "Power BI Guide", "TypeScript Handbook"] },
    { domain: "scholar.google.com",   titles: ["Neural Network Survey", "Attention Mechanisms Paper", "Federated Learning Study", "NLP Benchmarks 2025", "Computer Vision Trends"] },
  ],
  social: [
    { domain: "twitter.com",    titles: ["Home / X", "Notifications", "Trending Topics", "Messages", "Bookmarks"] },
    { domain: "reddit.com",     titles: ["r/programming", "r/webdev — Hot Posts", "r/MachineLearning", "r/technology", "r/AskReddit — Top"] },
    { domain: "instagram.com",  titles: ["Feed", "Reels", "Explore", "Direct Messages", "Profile"] },
    { domain: "facebook.com",   titles: ["News Feed", "Marketplace", "Groups", "Notifications", "Events"] },
    { domain: "discord.com",    titles: ["Dev Community Server", "Gaming Lounge", "Study Group", "Direct Messages", "Server Settings"] },
    { domain: "linkedin.com",   titles: ["Feed", "My Network", "Jobs", "Messaging", "Notifications"] },
  ],
  entertainment: [
    { domain: "youtube.com",    titles: ["Home — YouTube", "Fireship — 100 Seconds", "CS50 Lecture 7", "Music Mix 2026", "Tech Reviews Playlist"] },
    { domain: "netflix.com",    titles: ["Browse", "My List", "New & Popular", "Continue Watching", "Trending Now"] },
    { domain: "spotify.com",    titles: ["Discover Weekly", "Liked Songs", "Focus Flow Playlist", "Release Radar", "Daily Mix 1"] },
    { domain: "twitch.tv",      titles: ["Live Channels", "Following", "Browse Categories", "TheProGamer — Live", "Esports Stream"] },
  ],
  news: [
    { domain: "news.ycombinator.com", titles: ["Hacker News", "Show HN: New project", "Ask HN: Career advice", "Top Stories", "New Comments"] },
    { domain: "techcrunch.com",       titles: ["Startup Funding News", "AI Breakthrough 2026", "New iPhone Launch", "SaaS Market Trends", "Fintech Interview"] },
    { domain: "theverge.com",         titles: ["Tech News", "Apple Event Coverage", "Android 17 Review", "EV Market Update", "Gaming Hardware"] },
    { domain: "bbc.com",              titles: ["BBC News — World", "Technology", "Business Headlines", "Science & Environment", "Sports Live"] },
    { domain: "wired.com",            titles: ["Gadget Lab", "Science Stories", "Security News", "AI Ethics Report", "Culture & Ideas"] },
  ],
  shopping: [
    { domain: "amazon.com",   titles: ["Today's Deals", "Your Orders", "Electronics", "Books — Best Sellers", "Cart (3 items)"] },
    { domain: "flipkart.com", titles: ["Mobiles", "Fashion Sale", "Electronics Deals", "Home & Furniture", "Grocery"] },
    { domain: "ebay.com",     titles: ["Daily Deals", "Electronics", "Collectibles", "My Watch List", "Saved Searches"] },
  ],
  communication: [
    { domain: "mail.google.com",     titles: ["Inbox (12)", "Starred", "Sent Mail", "Drafts (3)", "Important"] },
    { domain: "slack.com",           titles: ["#general", "#engineering", "#random", "Direct Messages", "Threads"] },
    { domain: "teams.microsoft.com", titles: ["Chat", "Teams — Project Alpha", "Calendar", "Calls", "Files"] },
    { domain: "zoom.us",             titles: ["Upcoming Meetings", "Personal Room", "Recordings", "Settings", "Join Meeting"] },
  ],
};

// Flatten for random picks
const ALL_SITES = [];
for (const [cat, sites] of Object.entries(SITES)) {
  for (const site of sites) {
    ALL_SITES.push({ ...site, category: cat });
  }
}

// ── Helpers ────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function uuid() { return crypto.randomUUID(); }

function dateStr(d) { return d.toISOString().slice(0, 10); }
function ts(d) { return Math.floor(d.getTime()); }

// Generate realistic browsing pattern weights by hour
// People browse more 9-12, 14-17, 20-23
function hourWeight(hour) {
  if (hour >= 9 && hour <= 12) return 3;
  if (hour >= 14 && hour <= 17) return 3;
  if (hour >= 20 && hour <= 23) return 2;
  if (hour >= 7 && hour <= 8) return 1.5;
  return 0.5;
}

// Weighted category selection to mimic real user — more productive on weekdays
function pickSiteForTime(date) {
  const day = date.getDay(); // 0=Sun … 6=Sat
  const hour = date.getHours();
  const isWeekday = day >= 1 && day <= 5;
  const isWorkHour = hour >= 9 && hour <= 17;

  let weights;
  if (isWeekday && isWorkHour) {
    weights = { productive: 45, communication: 15, news: 10, social: 10, entertainment: 5, shopping: 5 };
  } else if (isWeekday) {
    weights = { productive: 15, communication: 5, news: 10, social: 25, entertainment: 30, shopping: 10 };
  } else {
    weights = { productive: 10, communication: 5, news: 10, social: 25, entertainment: 35, shopping: 15 };
  }

  // Pick category by weight
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rand(1, total);
  for (const [cat, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) {
      const sites = SITES[cat];
      if (!sites || sites.length === 0) return pick(ALL_SITES);
      return { ...pick(sites), category: cat };
    }
  }
  return pick(ALL_SITES);
}

const PRODUCTIVITY_WEIGHTS = {
  productive: 1.0,
  communication: 0.7,
  news: 0.4,
  shopping: 0.2,
  entertainment: 0.1,
  social: 0.1,
  unknown: 0.3,
};

// ── Main Seed ──────────────────────────────────────────────
async function seed() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║    SupriAI — Seeding Database             ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  // Create tables (same schema as database.js / database.py)
  await new Promise((resolve, reject) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        start_time INTEGER,
        end_time INTEGER,
        tab_count INTEGER DEFAULT 0,
        total_active_time INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tabs (
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
    `, (err) => { if (err) reject(err); else resolve(); });
  });
  console.log("   Tables created.\n");

  // Generate data for the last 90 days
  const today = new Date();
  today.setHours(23, 59, 59, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 89);
  startDate.setHours(0, 0, 0, 0);

  let totalTabs = 0;
  let totalEvents = 0;
  let totalDomainStats = 0;
  let totalProductivity = 0;
  let totalSessions = 0;
  let totalHistory = 0;

  // For each day, generate a session with multiple tabs
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    const dayStr = dateStr(dayDate);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

    // 1-3 sessions per day
    const sessionsPerDay = isWeekend ? rand(1, 2) : rand(2, 3);
    const dayDomainMap = {}; // domain → { time, visits, category }

    let dayProductiveTime = 0;
    let daySocialTime = 0;
    let dayEntertainmentTime = 0;
    let dayOtherTime = 0;
    let dayTotalTime = 0;
    let topProdDomain = "";
    let topProdTime = 0;
    let topDistDomain = "";
    let topDistTime = 0;

    for (let s = 0; s < sessionsPerDay; s++) {
      const sessionId = uuid();
      // Session start times: morning(8-10), afternoon(13-15), evening(19-21)
      const sessionStarts = isWeekend ? [10, 14, 20] : [8, 13, 19];
      const baseHour = sessionStarts[s] || rand(8, 21);
      const sessionStart = new Date(dayDate);
      sessionStart.setHours(baseHour, rand(0, 30), rand(0, 59));

      // 3-8 tabs per session
      const tabCount = rand(3, 8);
      let sessionActiveTime = 0;

      // Collect tab data first so we can insert session before tabs (FK constraint)
      const tabRows = [];
      const eventRows = [];

      for (let t = 0; t < tabCount; t++) {
        const tabTime = new Date(sessionStart);
        tabTime.setMinutes(tabTime.getMinutes() + t * rand(2, 15));
        tabTime.setHours(tabTime.getHours(), tabTime.getMinutes() + rand(0, 5));

        const site = pickSiteForTime(tabTime);
        const title = pick(site.titles);
        const tabId = rand(1, 99999);
        const activeTime = rand(15, 600) * 1000; // 15s – 10min in ms

        tabRows.push({ tabId, site, title, tabTime, activeTime, dayStr });
        sessionActiveTime += activeTime;

        // Accumulate domain stats
        if (!dayDomainMap[site.domain]) {
          dayDomainMap[site.domain] = { time: 0, visits: 0, category: site.category, lastVisit: 0 };
        }
        dayDomainMap[site.domain].time += activeTime;
        dayDomainMap[site.domain].visits += 1;
        dayDomainMap[site.domain].lastVisit = ts(tabTime);

        // Accumulate productivity
        const timeSec = activeTime / 1000;
        dayTotalTime += timeSec;
        if (site.category === "productive") { dayProductiveTime += timeSec; }
        else if (site.category === "social") { daySocialTime += timeSec; }
        else if (site.category === "entertainment") { dayEntertainmentTime += timeSec; }
        else { dayOtherTime += timeSec; }

        // Track top productive & distracting
        const weight = PRODUCTIVITY_WEIGHTS[site.category] || 0.3;
        if (weight >= 0.7 && dayDomainMap[site.domain].time > topProdTime) {
          topProdDomain = site.domain;
          topProdTime = dayDomainMap[site.domain].time;
        }
        if (weight <= 0.2 && dayDomainMap[site.domain].time > topDistTime) {
          topDistDomain = site.domain;
          topDistTime = dayDomainMap[site.domain].time;
        }
      }

      // Insert session FIRST (before tabs/events, due to FK constraint)
      const sessionEnd = new Date(sessionStart.getTime() + sessionActiveTime + rand(60, 300) * 1000);
      await run(
        `INSERT INTO sessions (session_id, start_time, end_time, tab_count, total_active_time)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, ts(sessionStart), ts(sessionEnd), tabCount, sessionActiveTime]
      );
      totalSessions++;

      // Now insert tabs and events
      for (const row of tabRows) {
        await run(
          `INSERT INTO tabs (tab_id, url, domain, title, timestamp, session_id, active_time, date, category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.tabId, `https://${row.site.domain}/${rand(1,999)}`, row.site.domain, row.title, ts(row.tabTime), sessionId, row.activeTime, row.dayStr, row.site.category]
        );
        totalTabs++;

        await run(
          `INSERT INTO tab_events (tab_id, event_type, timestamp, session_id, url, domain)
           VALUES (?, 'activated', ?, ?, ?, ?)`,
          [row.tabId, ts(row.tabTime), sessionId, `https://${row.site.domain}/`, row.site.domain]
        );
        const deactivateTime = new Date(row.tabTime.getTime() + row.activeTime);
        await run(
          `INSERT INTO tab_events (tab_id, event_type, timestamp, session_id, url, domain)
           VALUES (?, 'deactivated', ?, ?, ?, ?)`,
          [row.tabId, ts(deactivateTime), sessionId, `https://${row.site.domain}/`, row.site.domain]
        );
        totalEvents += 2;
      }
    }

    // Insert domain_stats for the day
    for (const [domain, info] of Object.entries(dayDomainMap)) {
      await run(
        `INSERT OR REPLACE INTO domain_stats (domain, date, visit_count, total_active_time, tab_count, category, last_visit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [domain, dayStr, info.visits, info.time, info.visits, info.category, info.lastVisit]
      );
      totalDomainStats++;
    }

    // Insert productivity score for the day
    const prodScore = dayTotalTime > 0
      ? Math.round(((dayProductiveTime * 1.0 + dayOtherTime * 0.3) / dayTotalTime) * 100)
      : 0;
    await run(
      `INSERT OR REPLACE INTO productivity_scores (date, score, productive_time, social_time, entertainment_time, other_time, total_time, top_productive_domain, top_distraction_domain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dayStr, Math.min(prodScore, 100), Math.round(dayProductiveTime), Math.round(daySocialTime), Math.round(dayEntertainmentTime), Math.round(dayOtherTime), Math.round(dayTotalTime), topProdDomain, topDistDomain]
    );
    totalProductivity++;
  }

  // ── Chrome History (100+ records) ──────────────────────
  const historyDomains = new Set();
  for (const site of ALL_SITES) historyDomains.add(site.domain);

  for (const site of ALL_SITES) {
    const visitCount = rand(5, 200);
    const daysAgo = rand(0, 89);
    const lastVisit = new Date(today);
    lastVisit.setDate(lastVisit.getDate() - daysAgo);

    await run(
      `INSERT INTO chrome_history (url, title, domain, visit_count, last_visit_time, typed_count, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`https://${site.domain}/`, pick(site.titles), site.domain, visitCount, ts(lastVisit) / 1000, rand(0, 30), site.category]
    );
    totalHistory++;
  }

  // Add some extra varied history entries
  const extraUrls = [
    { domain: "npmjs.com", title: "npm — axios", category: "productive" },
    { domain: "pypi.org", title: "PyPI — scikit-learn", category: "productive" },
    { domain: "codepen.io", title: "CSS Animation Pen", category: "productive" },
    { domain: "dribbble.com", title: "UI Design Inspiration", category: "productive" },
    { domain: "producthunt.com", title: "Today's Top Products", category: "news" },
    { domain: "hackernoon.com", title: "Web3 Trends 2026", category: "news" },
    { domain: "news.google.com", title: "Google News — Top Stories", category: "news" },
    { domain: "tiktok.com", title: "For You Page", category: "social" },
    { domain: "pinterest.com", title: "Home Feed", category: "social" },
    { domain: "walmart.com", title: "Rollback Deals", category: "shopping" },
    { domain: "primevideo.com", title: "Continue Watching", category: "entertainment" },
    { domain: "disneyplus.com", title: "Marvel Collection", category: "entertainment" },
    { domain: "outlook.com", title: "Mail — Focused Inbox", category: "communication" },
    { domain: "meet.google.com", title: "Join Meeting", category: "communication" },
    { domain: "protonmail.com", title: "Inbox", category: "communication" },
  ];
  for (const extra of extraUrls) {
    await run(
      `INSERT INTO chrome_history (url, title, domain, visit_count, last_visit_time, typed_count, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`https://${extra.domain}/`, extra.title, extra.domain, rand(3, 80), ts(today) / 1000, rand(0, 10), extra.category]
    );
    totalHistory++;
  }

  // ── ML Predictions (sample ML results) ──────────────────
  const mlPredictions = [
    { type: "classification", data: { top_category: "productive", confidence: 0.87, distribution: { productive: 42, social: 18, entertainment: 15, news: 12, communication: 8, shopping: 5 } }, confidence: 0.87 },
    { type: "cluster_profile", data: { cluster: 1, label: "Focused Developer", traits: ["High GitHub usage", "Consistent work hours", "Low social media"] }, confidence: 0.81 },
    { type: "productivity_prediction", data: { predicted_score: 72, factors: { work_hours: 0.35, tab_switches: -0.12, productive_ratio: 0.28 }, accuracy: 0.84 }, confidence: 0.84 },
    { type: "anomaly_detection", data: { is_anomaly: false, anomaly_score: -0.23, message: "Browsing patterns are within normal range" }, confidence: 0.92 },
    { type: "forecast", data: { next_7_days: [65, 70, 72, 68, 75, 45, 40], trend: "stable" }, confidence: 0.76 },
    { type: "focus_recommendation", data: { recommendation: "deep_focus", suggested_action: "Block social media for the next 2 hours", optimal_break_in: 45 }, confidence: 0.89 },
    { type: "learning_recommendation", data: { categories: ["programming", "data_science"], resources: [{ title: "Advanced Python Patterns", url: "https://realpython.com", score: 0.92 }] }, confidence: 0.88 },
    { type: "content_analysis", data: { topics: ["machine learning", "web development", "system design"], diversity_score: 0.73, vocabulary_richness: 842 }, confidence: 0.79 },
    { type: "collaborative_filter", data: { similar_profile: "Data Engineer", recommended_sites: ["databricks.com", "airflow.apache.org"], match_score: 0.68 }, confidence: 0.68 },
    { type: "temporal_prediction", data: { peak_hours: [10, 11, 14, 15], predicted_tomorrow: { browsing_time: 185, productivity: 0.71, focus_score: 0.65 } }, confidence: 0.75 },
  ];
  for (const pred of mlPredictions) {
    await run(
      `INSERT INTO insights (model_name, insight_type, data) VALUES (?, ?, ?)`,
      [`ML-${pred.type}`, pred.type, JSON.stringify({ ...pred.data, confidence: pred.confidence })]
    );
  }

  // ── User Goals ────────────────────────────────────────
  const goals = [
    { type: "productivity", target: 80, current: 65, start: dateStr(new Date(today.getTime() - 30*86400000)), end: dateStr(today) },
    { type: "focus_time", target: 240, current: 180, start: dateStr(new Date(today.getTime() - 14*86400000)), end: dateStr(today) },
    { type: "reduce_social", target: 30, current: 55, start: dateStr(new Date(today.getTime() - 7*86400000)), end: dateStr(new Date(today.getTime() + 7*86400000)) },
  ];
  for (const g of goals) {
    await run(
      `INSERT INTO goals (title, description, target_value, current_value, goal_type, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`${g.type} goal`, `Target: ${g.target}`, g.target, g.current, g.type, g.start, g.end]
    );
  }

  // ── Summary ──────────────────────────────────────────
  console.log("✔  Seeding complete!\n");
  console.log(`   Tabs:              ${totalTabs}`);
  console.log(`   Tab Events:        ${totalEvents}`);
  console.log(`   Sessions:          ${totalSessions}`);
  console.log(`   Domain Stats:      ${totalDomainStats}`);
  console.log(`   Productivity Days: ${totalProductivity}`);
  console.log(`   Chrome History:    ${totalHistory}`);
  console.log(`   Insights:          ${mlPredictions.length}`);
  console.log(`   Goals:             ${goals.length}`);
  console.log(`   ────────────────────────────`);
  console.log(`   TOTAL RECORDS:     ${totalTabs + totalEvents + totalSessions + totalDomainStats + totalProductivity + totalHistory + mlPredictions.length + goals.length}`);
  console.log(`\n   Database: ${dbPath}`);
}

// ── Run ────────────────────────────────────────────────────
db.serialize(() => {
  db.run("PRAGMA journal_mode=WAL");
  db.run("PRAGMA foreign_keys=ON");
});

seed()
  .then(() => {
    db.close(() => {
      console.log("\n   Database connection closed. Done.\n");
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error("Seed error:", err);
    db.close();
    process.exit(1);
  });
