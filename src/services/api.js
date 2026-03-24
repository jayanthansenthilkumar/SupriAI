import axios from 'axios';
import { offlineData } from './dummyData';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const withFallback = async (requestFn, fallbackFn, label) => {
  try {
    return await requestFn();
  } catch (error) {
    // Keep the app functional when backend services are offline.
    console.warn(`[SupriAI][offline] ${label}:`, error?.message || error);
    return typeof fallbackFn === 'function' ? fallbackFn(error) : fallbackFn;
  }
};

// ==================== Health ====================
export const checkHealth = () =>
  withFallback(() => api.get('/health').then(r => r.data), () => offlineData.health(), 'checkHealth');

// ==================== Stats ====================
export const getSummary = (period = 'today') =>
  withFallback(() => api.get(`/stats/summary?period=${period}`).then(r => r.data), () => offlineData.summary(period), 'getSummary');

export const getDomainStats = (period = 'week') =>
  withFallback(() => api.get(`/stats/domains?period=${period}`).then(r => r.data), () => offlineData.domainStats(period), 'getDomainStats');

export const getTopDomains = (period = 'week', limit = 10) =>
  withFallback(() => api.get(`/stats/top-domains?period=${period}&limit=${limit}`).then(r => r.data), () => offlineData.topDomains(period, limit), 'getTopDomains');

export const getCategoryStats = (period = 'week') =>
  withFallback(() => api.get(`/stats/categories?period=${period}`).then(r => r.data), () => offlineData.categoryStats(period), 'getCategoryStats');

export const getHourlyActivity = (date) =>
  withFallback(() => api.get(`/stats/hourly${date ? `?date=${date}` : ''}`).then(r => r.data), () => offlineData.hourly(date), 'getHourlyActivity');

// ==================== Productivity ====================
export const getTodayProductivity = () =>
  withFallback(() => api.get('/productivity/today').then(r => r.data), () => offlineData.productivityToday(), 'getTodayProductivity');

export const getProductivityScores = (period = 'month') =>
  withFallback(() => api.get(`/productivity/scores?period=${period}`).then(r => r.data), () => offlineData.productivityScores(period), 'getProductivityScores');

// ==================== Sessions ====================
export const createSession = (sessionId) =>
  withFallback(() => api.post('/sessions', { sessionId }).then(r => r.data), () => ({ success: true, sessionId: sessionId || `offline_session_${Date.now()}`, offline: true }), 'createSession');

export const getSessions = (limit = 10) =>
  withFallback(() => api.get(`/sessions?limit=${limit}`).then(r => r.data), () => offlineData.sessions(limit), 'getSessions');

// ==================== Tabs ====================
export const getTabs = (limit = 50) =>
  withFallback(() => api.get(`/tabs?limit=${limit}`).then(r => r.data), () => offlineData.tabs(limit), 'getTabs');

// ==================== History ====================
export const getHistory = (period = 'week', limit = 100) =>
  withFallback(() => api.get(`/history?period=${period}&limit=${limit}`).then(r => r.data), () => offlineData.history(period, limit), 'getHistory');

// ==================== Goals ====================
export const getGoals = () => withFallback(() => api.get('/goals').then(r => r.data), () => offlineData.goals(), 'getGoals');
export const createGoal = (data) => withFallback(() => api.post('/goals', data).then(r => r.data), () => ({ success: true, offline: true, goal: data }), 'createGoal');

// ==================== Settings ====================
export const getSettings = () => withFallback(() => api.get('/settings').then(r => r.data), () => offlineData.settings(), 'getSettings');
export const saveSetting = (key, value) =>
  withFallback(() => api.post('/settings', { key, value }).then(r => r.data), () => offlineData.saveSetting(key, value), 'saveSetting');

// ==================== Insights ====================
export const getInsights = (limit = 20) =>
  withFallback(() => api.get(`/insights?limit=${limit}`).then(r => r.data), () => offlineData.insights(limit), 'getInsights');

// ==================== Export ====================
export const exportData = () => withFallback(() => api.get('/export').then(r => r.data), () => offlineData.exportData(), 'exportData');

// ==================== ML / AI ====================
export const getModelInfo = () => withFallback(() => api.get('/ml/models').then(r => r.data), () => offlineData.modelInfo(), 'getModelInfo');

export const trainAllModels = () =>
  withFallback(() => api.post('/ml/train', {}, { timeout: 30000 }).then(r => r.data), () => offlineData.trainAllModels(), 'trainAllModels');

export const classifyDomain = (domain) =>
  withFallback(() => api.post('/ml/classify', { domain }).then(r => r.data), () => offlineData.classifyDomain(domain), 'classifyDomain');

export const getMLInsights = (dayData = {}) =>
  withFallback(() => api.post('/ml/insights', dayData, { timeout: 15000 }).then(r => r.data), () => offlineData.mlInsights(), 'getMLInsights');

export const getFocusRecommendation = (state = {}) =>
  withFallback(() => api.post('/ml/focus', state).then(r => r.data), () => offlineData.focusRecommendation(), 'getFocusRecommendation');

export const predictProductivity = (data) =>
  withFallback(() => api.post('/ml/predict-productivity', data).then(r => r.data), () => ({ predicted_score: 78, confidence: 0.65, offline: true }), 'predictProductivity');

export const detectAnomaly = (data) =>
  withFallback(() => api.post('/ml/detect-anomaly', data).then(r => r.data), () => ({ is_anomaly: false, severity: 'normal', offline: true }), 'detectAnomaly');

export const getForecast = (days = 7) =>
  withFallback(() => api.get(`/ml/forecast?days=${days}`).then(r => r.data), () => offlineData.forecast(days), 'getForecast');

export const getLearningRecommendations = (data = {}) =>
  withFallback(() => api.post('/ml/recommendations', data).then(r => r.data), () => offlineData.learningRecommendations(), 'getLearningRecommendations');

export const getContentAnalysis = (data) =>
  withFallback(() => api.post('/ml/content-analysis', data).then(r => r.data), () => offlineData.contentAnalysis(), 'getContentAnalysis');

export const getCollaborativeRecs = (data = {}) =>
  withFallback(() => api.post('/ml/collaborative', data).then(r => r.data), () => offlineData.collaborative(), 'getCollaborativeRecs');

export const getTemporalPredictions = (data = {}) =>
  withFallback(() => api.post('/ml/temporal', data).then(r => r.data), () => offlineData.temporal(), 'getTemporalPredictions');

export const getOptimalSchedule = () =>
  withFallback(() => api.get('/ml/schedule').then(r => r.data), () => offlineData.optimalSchedule(), 'getOptimalSchedule');

export const getOptimalHours = () =>
  withFallback(() => api.get('/ml/optimal-hours').then(r => r.data), () => offlineData.optimalHours(), 'getOptimalHours');

// ==================== Sync ====================
export const syncData = (tabData, tabGroups, sessionId) =>
  withFallback(() => api.post('/sync', { tabData, tabGroups, sessionId }).then(r => r.data), () => offlineData.syncData(), 'syncData');

export const importHistory = (history) =>
  withFallback(() => api.post('/import-history', { history }).then(r => r.data), () => offlineData.importHistory(history), 'importHistory');

export default api;
