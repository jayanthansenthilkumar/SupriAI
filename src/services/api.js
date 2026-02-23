import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ==================== Health ====================
export const checkHealth = () => api.get('/health').then(r => r.data);

// ==================== Stats ====================
export const getSummary = (period = 'today') =>
  api.get(`/stats/summary?period=${period}`).then(r => r.data);

export const getDomainStats = (period = 'week') =>
  api.get(`/stats/domains?period=${period}`).then(r => r.data);

export const getTopDomains = (period = 'week', limit = 10) =>
  api.get(`/stats/top-domains?period=${period}&limit=${limit}`).then(r => r.data);

export const getCategoryStats = (period = 'week') =>
  api.get(`/stats/categories?period=${period}`).then(r => r.data);

export const getHourlyActivity = (date) =>
  api.get(`/stats/hourly${date ? `?date=${date}` : ''}`).then(r => r.data);

// ==================== Productivity ====================
export const getTodayProductivity = () =>
  api.get('/productivity/today').then(r => r.data);

export const getProductivityScores = (period = 'month') =>
  api.get(`/productivity/scores?period=${period}`).then(r => r.data);

// ==================== Sessions ====================
export const createSession = (sessionId) =>
  api.post('/sessions', { sessionId }).then(r => r.data);

export const getSessions = (limit = 10) =>
  api.get(`/sessions?limit=${limit}`).then(r => r.data);

// ==================== Tabs ====================
export const getTabs = (limit = 50) =>
  api.get(`/tabs?limit=${limit}`).then(r => r.data);

// ==================== History ====================
export const getHistory = (period = 'week', limit = 100) =>
  api.get(`/history?period=${period}&limit=${limit}`).then(r => r.data);

// ==================== Goals ====================
export const getGoals = () => api.get('/goals').then(r => r.data);
export const createGoal = (data) => api.post('/goals', data).then(r => r.data);

// ==================== Settings ====================
export const getSettings = () => api.get('/settings').then(r => r.data);
export const saveSetting = (key, value) =>
  api.post('/settings', { key, value }).then(r => r.data);

// ==================== Insights ====================
export const getInsights = (limit = 20) =>
  api.get(`/insights?limit=${limit}`).then(r => r.data);

// ==================== Export ====================
export const exportData = () => api.get('/export').then(r => r.data);

// ==================== ML / AI ====================
export const getModelInfo = () => api.get('/ml/models').then(r => r.data);

export const trainAllModels = () =>
  api.post('/ml/train', {}, { timeout: 30000 }).then(r => r.data);

export const classifyDomain = (domain) =>
  api.post('/ml/classify', { domain }).then(r => r.data);

export const getMLInsights = (dayData = {}) =>
  api.post('/ml/insights', dayData, { timeout: 15000 }).then(r => r.data);

export const getFocusRecommendation = (state = {}) =>
  api.post('/ml/focus', state).then(r => r.data);

export const predictProductivity = (data) =>
  api.post('/ml/predict-productivity', data).then(r => r.data);

export const detectAnomaly = (data) =>
  api.post('/ml/detect-anomaly', data).then(r => r.data);

export const getForecast = (days = 7) =>
  api.get(`/ml/forecast?days=${days}`).then(r => r.data);

export const getLearningRecommendations = (data = {}) =>
  api.post('/ml/recommendations', data).then(r => r.data);

export const getContentAnalysis = (data) =>
  api.post('/ml/content-analysis', data).then(r => r.data);

export const getCollaborativeRecs = (data = {}) =>
  api.post('/ml/collaborative', data).then(r => r.data);

export const getTemporalPredictions = (data = {}) =>
  api.post('/ml/temporal', data).then(r => r.data);

export const getOptimalSchedule = () =>
  api.get('/ml/schedule').then(r => r.data);

export const getOptimalHours = () =>
  api.get('/ml/optimal-hours').then(r => r.data);

// ==================== Sync ====================
export const syncData = (tabData, tabGroups, sessionId) =>
  api.post('/sync', { tabData, tabGroups, sessionId }).then(r => r.data);

export const importHistory = (history) =>
  api.post('/import-history', { history }).then(r => r.data);

export default api;
