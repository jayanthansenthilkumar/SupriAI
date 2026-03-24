const TODAY = new Date();

function dateOffset(days) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DOMAIN_ROWS = [
  { domain: 'github.com', category: 'productive', total_time: 1580000, visits: 24, tabs: 11 },
  { domain: 'stackoverflow.com', category: 'productive', total_time: 1020000, visits: 16, tabs: 8 },
  { domain: 'docs.google.com', category: 'productive', total_time: 910000, visits: 11, tabs: 7 },
  { domain: 'youtube.com', category: 'entertainment', total_time: 730000, visits: 13, tabs: 6 },
  { domain: 'reddit.com', category: 'social', total_time: 520000, visits: 10, tabs: 5 },
  { domain: 'news.ycombinator.com', category: 'news', total_time: 320000, visits: 8, tabs: 4 },
  { domain: 'mail.google.com', category: 'communication', total_time: 410000, visits: 9, tabs: 4 }
];

const CATEGORY_ROWS = [
  { category: 'productive', total_time: 3510000, domain_count: 3, visits: 51 },
  { category: 'entertainment', total_time: 730000, domain_count: 1, visits: 13 },
  { category: 'social', total_time: 520000, domain_count: 1, visits: 10 },
  { category: 'communication', total_time: 410000, domain_count: 1, visits: 9 },
  { category: 'news', total_time: 320000, domain_count: 1, visits: 8 }
];

const HISTORY_ROWS = [
  {
    domain: 'github.com',
    title: 'Pull Requests - SupriAI',
    category: 'productive',
    active_time: 420000,
    timestamp: Date.now() - 1000 * 60 * 15,
    url: 'https://github.com'
  },
  {
    domain: 'stackoverflow.com',
    title: 'How to handle Promise.all fallback in React',
    category: 'productive',
    active_time: 280000,
    timestamp: Date.now() - 1000 * 60 * 45,
    url: 'https://stackoverflow.com/questions'
  },
  {
    domain: 'docs.google.com',
    title: 'Project Notes and Sprint Planning',
    category: 'productive',
    active_time: 360000,
    timestamp: Date.now() - 1000 * 60 * 75,
    url: 'https://docs.google.com/document'
  },
  {
    domain: 'youtube.com',
    title: 'System Design Playlist',
    category: 'entertainment',
    active_time: 220000,
    timestamp: Date.now() - 1000 * 60 * 125,
    url: 'https://youtube.com/watch?v=dummy'
  },
  {
    domain: 'reddit.com',
    title: 'r/programming top posts',
    category: 'social',
    active_time: 110000,
    timestamp: Date.now() - 1000 * 60 * 160,
    url: 'https://reddit.com/r/programming'
  }
];

const SCORE_ROWS = [
  { date: dateOffset(6), score: 68 },
  { date: dateOffset(5), score: 72 },
  { date: dateOffset(4), score: 61 },
  { date: dateOffset(3), score: 76 },
  { date: dateOffset(2), score: 74 },
  { date: dateOffset(1), score: 79 },
  { date: dateOffset(0), score: 81 }
].map((row) => ({
  ...row,
  productive_time: 1800000,
  social_time: 480000,
  entertainment_time: 620000,
  other_time: 240000,
  total_time: 3140000
}));

const OFFLINE_SETTINGS_KEY = 'supriai-offline-settings';

function readOfflineSettings() {
  try {
    const raw = localStorage.getItem(OFFLINE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOfflineSettings(settings) {
  try {
    localStorage.setItem(OFFLINE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export const offlineData = {
  health() {
    return {
      status: 'offline-fallback',
      name: 'SupriAI Local Fallback',
      version: 'offline-1.0.0',
      timestamp: new Date().toISOString(),
      python_backend: 'offline',
      offline: true
    };
  },

  summary(period = 'today') {
    return {
      period,
      unique_domains: 7,
      total_visits: 91,
      total_time: 5490000,
      start_date: dateOffset(period === 'today' ? 0 : period === 'week' ? 7 : 30),
      end_date: dateOffset(0),
      offline: true
    };
  },

  domainStats(period = 'week') {
    return {
      period,
      stats: DOMAIN_ROWS,
      offline: true
    };
  },

  topDomains(period = 'week', limit = 10) {
    return {
      period,
      domains: DOMAIN_ROWS.slice(0, limit),
      offline: true
    };
  },

  categoryStats(period = 'week') {
    return {
      period,
      categories: CATEGORY_ROWS,
      offline: true
    };
  },

  hourly(date = dateOffset(0)) {
    const hourly = {};
    for (let i = 0; i < 24; i += 1) {
      hourly[i] = { events: i >= 9 && i <= 18 ? 2 + (i % 3) : 0, domains: i >= 9 && i <= 18 ? 1 + (i % 2) : 0 };
    }
    return { date, hourly, offline: true };
  },

  productivityToday() {
    return { date: dateOffset(0), score: 81, total_time: 3140000, offline: true };
  },

  productivityScores(period = 'month') {
    return { period, scores: SCORE_ROWS, offline: true };
  },

  sessions(limit = 10) {
    return Array.from({ length: Math.min(limit, 4) }).map((_, i) => ({
      session_id: `offline_session_${i + 1}`,
      start_time: Date.now() - (i + 1) * 3600000,
      total_active_time: 1500000 - i * 200000,
      tab_count: 6 - i
    }));
  },

  tabs(limit = 50) {
    return HISTORY_ROWS.slice(0, limit).map((row, i) => ({
      id: i + 1,
      tab_id: 100 + i,
      ...row
    }));
  },

  history(period = 'week', limit = 100) {
    return { period, history: HISTORY_ROWS.slice(0, limit), offline: true };
  },

  goals() {
    return {
      goals: [
        {
          id: 1,
          title: 'Keep productivity above 75%',
          description: 'Maintain focus during work hours',
          target_value: 75,
          current_value: 81,
          goal_type: 'productivity',
          status: 'active'
        }
      ],
      offline: true
    };
  },

  settings() {
    return {
      productiveSites: 'github.com, stackoverflow.com, docs.google.com, notion.so',
      socialSites: 'facebook.com, x.com, instagram.com, reddit.com',
      timeLimits: 'youtube.com:45, reddit.com:20, x.com:15',
      syncInterval: '60',
      inactiveThreshold: '5',
      ...readOfflineSettings(),
      offline: true
    };
  },

  saveSetting(key, value) {
    const current = readOfflineSettings();
    current[key] = value;
    writeOfflineSettings(current);
    return { success: true, offline: true, key, value };
  },

  insights(limit = 20) {
    return Array.from({ length: Math.min(limit, 3) }).map((_, i) => ({
      id: i + 1,
      model_name: 'Offline Engine',
      insight_type: 'summary',
      data: { note: 'Offline insight generated from dummy dataset.' },
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      offline: true
    }));
  },

  exportData() {
    return {
      tabs: this.tabs(20),
      sessions: this.sessions(5),
      domain_stats: DOMAIN_ROWS,
      productivity_scores: SCORE_ROWS,
      chrome_history: HISTORY_ROWS,
      export_date: new Date().toISOString(),
      offline: true
    };
  },

  modelInfo() {
    return {
      total_models: 10,
      trained_models: 10,
      offline: true,
      models: {
        classifier: { status: 'ready' },
        clustering: { status: 'ready' },
        productivity: { status: 'ready' },
        anomaly: { status: 'ready' },
        forecasting: { status: 'ready' },
        focus: { status: 'ready' },
        deep_recommender: { status: 'ready' },
        nlp_analyzer: { status: 'ready' },
        collaborative: { status: 'ready' },
        temporal: { status: 'ready' }
      }
    };
  },

  trainAllModels() {
    const result = this.modelInfo();
    return { success: true, message: 'Offline training simulation completed.', results: result.models, offline: true };
  },

  classifyDomain(domain) {
    const normalized = (domain || '').toLowerCase();
    if (normalized.includes('github') || normalized.includes('stack')) return { category: 'productive', confidence: 0.85, offline: true };
    if (normalized.includes('youtube') || normalized.includes('netflix')) return { category: 'entertainment', confidence: 0.77, offline: true };
    if (normalized.includes('reddit') || normalized.includes('x.com')) return { category: 'social', confidence: 0.75, offline: true };
    return { category: 'unknown', confidence: 0.5, offline: true };
  },

  mlInsights() {
    return {
      models_used: ['classifier', 'clustering', 'productivity', 'anomaly', 'forecasting', 'focus', 'deep_recommender', 'nlp_analyzer', 'collaborative', 'temporal'],
      productivity_prediction: { predicted_score: 82, confidence: 0.74 },
      focus_recommendation: {
        focus_state: 'deep_focus',
        recommendation: 'Your pattern is productive now. Block 45 minutes for deep work.',
        confidence: 0.7
      },
      anomaly_detection: { is_anomaly: false, severity: 'normal' },
      learning_recommendations: {
        recommendations: [
          { category: 'web_development', score: 0.91 },
          { category: 'data_science', score: 0.83 },
          { category: 'cloud_computing', score: 0.78 }
        ]
      },
      temporal_prediction: {
        predictions: {
          tomorrow_total_minutes: 240,
          tomorrow_focus_score: 78,
          peak_hour: 10
        }
      },
      offline: true
    };
  },

  focusRecommendation() {
    return {
      focus_state: 'deep_focus',
      recommendation: 'Offline mode: best focus window is now. Try a 45 minute sprint.',
      confidence: 0.66,
      offline: true
    };
  },

  forecast(days = 7) {
    const series = Array.from({ length: days }).map((_, i) => ({
      date: dateOffset(-i),
      predicted_total_minutes: 220 + i * 3,
      predicted_productivity_score: 76 + (i % 4)
    }));
    return { days, forecast: series.reverse(), offline: true };
  },

  learningRecommendations() {
    return {
      recommendations: [
        {
          category: 'programming',
          score: 0.93,
          resources: [
            { title: 'Advanced JavaScript Patterns', url: 'https://developer.mozilla.org' },
            { title: 'Node.js Best Practices', url: 'https://nodejs.org/en/learn' }
          ]
        },
        {
          category: 'data_science',
          score: 0.81,
          resources: [
            { title: 'Intro to Data Pipelines', url: 'https://www.kaggle.com/learn' }
          ]
        }
      ],
      offline: true
    };
  },

  contentAnalysis() {
    return {
      topics: ['javascript', 'machine learning', 'productivity systems'],
      content_diversity: 0.72,
      vocabulary_richness: 0.68,
      learning_pathway: ['review fundamentals', 'build project', 'document insights'],
      offline: true
    };
  },

  collaborative() {
    return { domains: ['github.com', 'notion.so', 'kaggle.com'], offline: true };
  },

  temporal() {
    return { prediction: { best_focus_hour: 10, expected_productivity: 80 }, offline: true };
  },

  optimalSchedule() {
    return {
      schedule: [
        { hour: 9, activity: 'deep_work' },
        { hour: 11, activity: 'meetings' },
        { hour: 14, activity: 'light_tasks' },
        { hour: 16, activity: 'review' }
      ],
      offline: true
    };
  },

  optimalHours() {
    return { optimal_hours: [9, 10, 11, 14, 15], offline: true };
  },

  syncData() {
    return { success: true, synced: 0, message: 'Offline fallback sync recorded locally.', offline: true };
  },

  importHistory(history = []) {
    return { success: true, imported: history.length, total_submitted: history.length, offline: true };
  }
};
