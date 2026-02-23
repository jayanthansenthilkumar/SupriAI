/* ============================================
   SupriAI v2.0 — Unified Popup Script
   Merged: config.js + backendAPI.js + gemini.js +
           databaseQueryHelper.js + curationService.js +
           curationWorkflow.js + popup.js
   ============================================ */

// ============================================
// 1. DEFAULT SETTINGS (from config.js)
// ============================================
const defaultSettings = {
  siteLimits: {
    'www.youtube.com': 2,
    'facebook.com': 30,
    'twitter.com': 20
  },
  productiveSites: [
    'github.com',
    'stackoverflow.com',
    'docs.google.com',
    'linkedin.com'
  ],
  socialSites: [
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'www.youtube.com'
  ]
};

// Initialize settings in storage if not exists
chrome.storage.local.get(['settings'], ({ settings }) => {
  if (!settings) {
    chrome.storage.local.set({ settings: defaultSettings });
  }
});

// ============================================
// 2. BACKEND API SERVICE (from backendAPI.js)
// ============================================
class BackendAPI {
  constructor() {
    this.baseURL = 'http://127.0.0.1:5000/api';
    this.connected = false;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        this.connected = true;
        return await response.json();
      }
      this.connected = false;
      return null;
    } catch (e) {
      this.connected = false;
      return null;
    }
  }

  async syncData(tabData, tabGroups, sessionId) {
    try {
      const response = await fetch(`${this.baseURL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabData, tabGroups, sessionId })
      });
      return await response.json();
    } catch (e) {
      console.error('Sync failed:', e);
      return { error: e.message };
    }
  }

  async importHistory(historyItems) {
    try {
      const response = await fetch(`${this.baseURL}/import-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyItems })
      });
      return await response.json();
    } catch (e) {
      console.error('Import failed:', e);
      return { error: e.message };
    }
  }

  async classifyDomain(domain) {
    try {
      const response = await fetch(`${this.baseURL}/ml/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      return await response.json();
    } catch (e) {
      return { category: 'unknown', confidence: 0, method: 'offline' };
    }
  }

  async classifyDomains(domains) {
    try {
      const response = await fetch(`${this.baseURL}/ml/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains })
      });
      return await response.json();
    } catch (e) {
      return { classifications: domains.map(() => ({ category: 'unknown' })) };
    }
  }

  async getInsights(dayData) {
    try {
      const response = await fetch(`${this.baseURL}/ml/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayData)
      });
      return await response.json();
    } catch (e) {
      console.error('Insights error:', e);
      return { error: e.message };
    }
  }

  async getFocusRecommendation(currentState) {
    try {
      const response = await fetch(`${this.baseURL}/ml/focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState)
      });
      return await response.json();
    } catch (e) {
      return this._offlineFocusRecommendation();
    }
  }

  async predictProductivity(record) {
    try {
      const response = await fetch(`${this.baseURL}/ml/predict-productivity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      return await response.json();
    } catch (e) {
      return { predicted_score: 50, method: 'offline' };
    }
  }

  async detectAnomaly(dayData) {
    try {
      const response = await fetch(`${this.baseURL}/ml/detect-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayData)
      });
      return await response.json();
    } catch (e) {
      return { is_anomaly: false, severity: 'normal' };
    }
  }

  async getForecast(days = 7) {
    try {
      const response = await fetch(`${this.baseURL}/ml/forecast?days=${days}`);
      return await response.json();
    } catch (e) {
      return { error: 'Backend not available' };
    }
  }

  async getOptimalSchedule() {
    try {
      const response = await fetch(`${this.baseURL}/ml/schedule`);
      return await response.json();
    } catch (e) {
      return this._defaultSchedule();
    }
  }

  async getDomainStats(period = 'week') {
    try {
      const response = await fetch(`${this.baseURL}/stats/domains?period=${period}`);
      return await response.json();
    } catch (e) {
      return { stats: [] };
    }
  }

  async getCategoryStats(period = 'week') {
    try {
      const response = await fetch(`${this.baseURL}/stats/categories?period=${period}`);
      return await response.json();
    } catch (e) {
      return { categories: [] };
    }
  }

  async getProductivityScores(period = 'month') {
    try {
      const response = await fetch(`${this.baseURL}/productivity/scores?period=${period}`);
      return await response.json();
    } catch (e) {
      return { scores: [] };
    }
  }

  async getBrowsingSummary(period = 'week') {
    try {
      const response = await fetch(`${this.baseURL}/stats/summary?period=${period}`);
      return await response.json();
    } catch (e) {
      return { totalTabs: 0, uniqueDomains: 0, totalActiveTime: 0, totalVisits: 0 };
    }
  }

  async getModelsInfo() {
    try {
      const response = await fetch(`${this.baseURL}/models`);
      return await response.json();
    } catch (e) {
      return { error: 'Backend not available' };
    }
  }

  async trainModels() {
    try {
      const response = await fetch(`${this.baseURL}/ml/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  async saveGoal(goalData) {
    try {
      const response = await fetch(`${this.baseURL}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData)
      });
      return await response.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  async getGoals() {
    try {
      const response = await fetch(`${this.baseURL}/goals`);
      return await response.json();
    } catch (e) {
      return { goals: [] };
    }
  }

  async exportAllData() {
    try {
      const response = await fetch(`${this.baseURL}/export`);
      return await response.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  // NEW: Get AI/DL learning recommendations
  async getLearningRecommendations(browsingData) {
    try {
      const response = await fetch(`${this.baseURL}/ml/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(browsingData || {})
      });
      return await response.json();
    } catch (e) {
      return { recommendations: [], error: 'Backend not available' };
    }
  }

  // NEW: Get content analysis via NLP
  async getContentAnalysis(entries) {
    try {
      const response = await fetch(`${this.baseURL}/ml/content-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });
      return await response.json();
    } catch (e) {
      return { topics: [], error: 'Backend not available' };
    }
  }

  // NEW: Get temporal browsing predictions
  async getTemporalPredictions(recentDays, type) {
    try {
      const response = await fetch(`${this.baseURL}/ml/temporal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recent_days: recentDays, type: type || 'next_day' })
      });
      return await response.json();
    } catch (e) {
      return { error: 'Backend not available' };
    }
  }

  // NEW: Get optimal study hours
  async getOptimalHours() {
    try {
      const response = await fetch(`${this.baseURL}/ml/optimal-hours`);
      return await response.json();
    } catch (e) {
      return { error: 'Backend not available' };
    }
  }

  // NEW: Get collaborative filtering domain recommendations
  async getCollaborativeRecommendations(context) {
    try {
      const response = await fetch(`${this.baseURL}/ml/collaborative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context || {})
      });
      return await response.json();
    } catch (e) {
      return { recommendations: [], error: 'Backend not available' };
    }
  }

  _offlineFocusRecommendation() {
    const hour = new Date().getHours();
    let state = 'light_work';
    if (hour >= 9 && hour <= 11) state = 'deep_focus';
    else if (hour >= 14 && hour <= 16) state = 'deep_focus';
    else if (hour >= 12 && hour <= 13) state = 'break_needed';
    else if (hour >= 20) state = 'leisure';

    return {
      state,
      confidence: 0.5,
      recommendation: {
        title: state === 'deep_focus' ? 'Focus Time' : 'Light Work',
        icon: state === 'deep_focus' ? '🎯' : '💡',
        message: 'Backend offline — using default schedule',
        actions: ['Connect to backend for personalized recommendations'],
        color: '#4285F4'
      }
    };
  }

  _defaultSchedule() {
    return {
      peak_productivity_hours: [9, 10, 14, 15],
      recommended_breaks: ['11:00', '13:00', '16:00'],
      focus_blocks: [
        { start: '9:00', end: '10:30', type: 'deep_focus', duration: 90 },
        { start: '14:00', end: '15:30', type: 'deep_focus', duration: 90 }
      ],
      tips: ['Start the backend server for ML-powered recommendations']
    };
  }
}

const backendAPI = new BackendAPI();

// ============================================
// 3. GEMINI SUMMARIZER (from gemini.js)
// ============================================
async function summarizeContent(content) {
  try {
    if (!CONFIG || !CONFIG.GEMINI_API_KEY || !CONFIG.API_URL) {
      console.error('Configuration error:', { CONFIG });
      throw new Error('API configuration is missing. Please check assets/config/keys.js');
    }

    if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('Please replace YOUR_GEMINI_API_KEY_HERE with your actual Gemini API key in assets/config/keys.js');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('No content to summarize. Please make sure you are on a valid webpage.');
    }

    console.log('Sending request to Gemini API...');
    const response = await fetch(`${CONFIG.API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Please provide a concise summary of the following content in at least 5 bullet points and at max 10 points. Return output in HTML format with proper <ul> and <li> tags:\n\n${content}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400) throw new Error('Invalid request. Please check your API key and try again.');
      else if (response.status === 403) throw new Error('API key is invalid or doesn\'t have permission.');
      else if (response.status === 404) {
        const errorMsg = errorData.error?.message || '';
        if (errorMsg.includes('not found for API version')) throw new Error('API endpoint error. The model may not be available.');
        throw new Error('API endpoint not found.');
      }
      else if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment.');
      else if (response.status === 500) throw new Error('Server error. Please try again.');
      else throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Received invalid response from API. Please try again.');
    }

    let summary = data.candidates[0].content.parts[0].text;
    summary = summary.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    return summary;

  } catch (error) {
    console.error('Error summarizing content:', error);
    if (error.message) {
      return `<div class="error-message"><strong>Error:</strong> ${error.message}</div>`;
    }
    return '<div class="error-message"><strong>Error:</strong> Failed to generate summary. Please try again.</div>';
  }
}

// ============================================
// 4. DATABASE QUERY HELPER (from databaseQueryHelper.js)
// ============================================
class DatabaseQueryHelper {
  static async getTabHistory(startDate, endDate, domain = null) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getTabHistory', startDate, endDate, domain }, (response) => {
        if (response && response.success) resolve(response.tabs);
        else reject(new Error(response?.error || 'Failed to get tab history'));
      });
    });
  }

  static async getDomainStats(startDate, endDate) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getDomainStats', startDate, endDate }, (response) => {
        if (response && response.success) resolve(response.stats);
        else reject(new Error(response?.error || 'Failed to get domain stats'));
      });
    });
  }

  static async getCurrentSessionData() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getSessionData' }, (response) => {
        if (response && response.success) resolve({ tabs: response.tabs, sessionId: response.sessionId });
        else reject(new Error(response?.error || 'Failed to get session data'));
      });
    });
  }

  static async getSessionData(sessionId) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getSessionData', sessionId }, (response) => {
        if (response && response.success) resolve({ tabs: response.tabs, sessionId: response.sessionId });
        else reject(new Error(response?.error || 'Failed to get session data'));
      });
    });
  }

  static async exportData() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
        if (response && response.success) resolve(response.data);
        else reject(new Error(response?.error || 'Failed to export data'));
      });
    });
  }

  static async clearOldData(daysToKeep = 30) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'clearOldData', daysToKeep }, (response) => {
        if (response && response.success) resolve(response.result);
        else reject(new Error(response?.error || 'Failed to clear old data'));
      });
    });
  }

  static async getTodaysTabs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getTabHistory(today.getTime(), tomorrow.getTime());
  }

  static async getThisWeeksTabs() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return this.getTabHistory(weekStart.getTime(), Date.now());
  }

  static async getThisMonthsTabs() {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    return this.getTabHistory(monthStart.getTime(), Date.now());
  }

  static async getTodaysDomainStats() {
    const today = new Date().toISOString().split('T')[0];
    return this.getDomainStats(today, today);
  }

  static async getThisWeeksDomainStats() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return this.getDomainStats(weekStart.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  }

  static async getThisMonthsDomainStats() {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return this.getDomainStats(monthStart.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  }

  static async getMostVisitedDomains(limit = 10, dateRange = 'week') {
    let stats;
    switch (dateRange) {
      case 'today': stats = await this.getTodaysDomainStats(); break;
      case 'week': stats = await this.getThisWeeksDomainStats(); break;
      case 'month': stats = await this.getThisMonthsDomainStats(); break;
      default: stats = await this.getThisWeeksDomainStats();
    }
    const domainMap = new Map();
    stats.forEach(stat => {
      if (domainMap.has(stat.domain)) {
        const existing = domainMap.get(stat.domain);
        existing.visitCount += stat.visitCount;
        existing.totalActiveTime += stat.totalActiveTime;
        existing.tabCount += stat.tabCount;
      } else {
        domainMap.set(stat.domain, { domain: stat.domain, visitCount: stat.visitCount, totalActiveTime: stat.totalActiveTime, tabCount: stat.tabCount });
      }
    });
    return Array.from(domainMap.values()).sort((a, b) => b.visitCount - a.visitCount).slice(0, limit);
  }

  static async getDomainsWithMostTime(limit = 10, dateRange = 'week') {
    let stats;
    switch (dateRange) {
      case 'today': stats = await this.getTodaysDomainStats(); break;
      case 'week': stats = await this.getThisWeeksDomainStats(); break;
      case 'month': stats = await this.getThisMonthsDomainStats(); break;
      default: stats = await this.getThisWeeksDomainStats();
    }
    const domainMap = new Map();
    stats.forEach(stat => {
      if (domainMap.has(stat.domain)) {
        const existing = domainMap.get(stat.domain);
        existing.visitCount += stat.visitCount;
        existing.totalActiveTime += stat.totalActiveTime;
        existing.tabCount += stat.tabCount;
      } else {
        domainMap.set(stat.domain, { domain: stat.domain, visitCount: stat.visitCount, totalActiveTime: stat.totalActiveTime, tabCount: stat.tabCount });
      }
    });
    return Array.from(domainMap.values()).sort((a, b) => b.totalActiveTime - a.totalActiveTime).slice(0, limit);
  }

  static async downloadDataAsJSON() {
    try {
      const data = await this.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supri-ai-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error downloading data:', error);
      throw error;
    }
  }

  static formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    else if (hours > 0) return `${hours}h ${minutes % 60}m`;
    else if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    else return `${seconds}s`;
  }

  static async getBrowsingSummary(dateRange = 'today') {
    let tabs, stats;
    switch (dateRange) {
      case 'today': tabs = await this.getTodaysTabs(); stats = await this.getTodaysDomainStats(); break;
      case 'week': tabs = await this.getThisWeeksTabs(); stats = await this.getThisWeeksDomainStats(); break;
      case 'month': tabs = await this.getThisMonthsTabs(); stats = await this.getThisMonthsDomainStats(); break;
      default: tabs = await this.getTodaysTabs(); stats = await this.getTodaysDomainStats();
    }
    const totalTabs = tabs.length;
    const uniqueDomains = new Set(tabs.map(tab => tab.domain)).size;
    const totalActiveTime = stats.reduce((sum, stat) => sum + stat.totalActiveTime, 0);
    const totalVisits = stats.reduce((sum, stat) => sum + stat.visitCount, 0);
    return { totalTabs, uniqueDomains, totalActiveTime, totalActiveTimeFormatted: this.formatTime(totalActiveTime), totalVisits, averageTimePerDomain: uniqueDomains > 0 ? totalActiveTime / uniqueDomains : 0, tabs, stats };
  }
}

// ============================================
// 5. CURATION SERVICE (from curationService.js)
// ============================================
class CurationService {
  constructor() {
    this.apiKey = CONFIG.GEMINI_API_KEY;
    this.apiUrl = CONFIG.API_URL;
  }

  async analyzeTabsIntent(tabs) {
    const tabsInfo = tabs.map(tab => ({ title: tab.title, url: tab.url }));
    try {
      if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return { intent: 'Error: API key not configured. Update assets/config/keys.js', relevant_tabs: [] };
      }
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a JSON output generator. Given these tabs:\n${JSON.stringify(tabsInfo, null, 2)}\n\nReturn ONLY a JSON object with two fields:\n1. "intent": Identify intent of the user based on the tabs.\n2. "relevant_tabs": an array of relevant tab titles\n\nDO NOT include any other text, markdown formatting, or explanation.` }] }]
        })
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        return { intent: `Error (${response.status}): ${errBody.error?.message || response.statusText}`, relevant_tabs: [] };
      }
      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const blockReason = data.promptFeedback?.blockReason;
        return { intent: `Error: ${blockReason ? `Content blocked: ${blockReason}` : 'No response from API'}`, relevant_tabs: [] };
      }
      let responseText = data.candidates[0].content.parts[0].text.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) responseText = jsonMatch[0];
      try {
        const parsed = JSON.parse(responseText);
        if (!parsed.intent || !Array.isArray(parsed.relevant_tabs)) throw new Error('Invalid response format');
        return parsed;
      } catch (parseError) {
        return { intent: 'Failed to parse intent', relevant_tabs: [] };
      }
    } catch (error) {
      return { intent: 'Error analyzing tabs', relevant_tabs: [] };
    }
  }

  async rateContent(tabs, intents) {
    const results = [];
    const relevantTabs = tabs.filter(tab => intents.relevant_tabs.includes(tab.title));
    for (const tab of relevantTabs) {
      try {
        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Rate this article based on its relevance to: "${intents.intent}"\n\nTitle: ${tab.title}\nURL: ${tab.url}\n\nReturn rating in this exact JSON format without any additional text:\n{"rating": number between 0 and 10, "explanation": "brief explanation"}` }] }]
          })
        });
        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Invalid API response');
        const responseText = data.candidates[0].content.parts[0].text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        const parsed = JSON.parse(responseText);
        if (typeof parsed.rating !== 'number' || !parsed.explanation) throw new Error('Invalid rating format');
        results.push({ tabId: tab.id, ...parsed });
      } catch (error) {
        results.push({ tabId: tab.id, rating: 0, explanation: `Error: ${error.message || 'Failed to rate'}` });
      }
    }
    return results;
  }

  async generateLearningPlan(highRatedTabs) {
    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Create a structured learning plan from these high-rated articles.\nReturn ONLY a JSON object with this exact structure:\n{"readingSequence":[{"title":"string","estimatedTime":"number"}],"practicalExercises":["string"],"implementationSteps":["string"],"nextActions":["string"]}\n\nArticles: ${JSON.stringify(highRatedTabs)}\n\nDO NOT include any other text.` }] }]
        })
      });
      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Invalid API response');
      let responseText = data.candidates[0].content.parts[0].text.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) responseText = jsonMatch[0];
      const parsed = JSON.parse(responseText);
      if (!Array.isArray(parsed.readingSequence) || !Array.isArray(parsed.practicalExercises) || !Array.isArray(parsed.implementationSteps) || !Array.isArray(parsed.nextActions)) throw new Error('Invalid format');
      parsed.readingSequence = parsed.readingSequence.map(item => ({ title: item.title || 'Untitled', estimatedTime: typeof item.estimatedTime === 'number' ? item.estimatedTime : parseInt(item.estimatedTime) || 30 }));
      return parsed;
    } catch (error) {
      return { readingSequence: [], practicalExercises: ['Failed to generate exercises'], implementationSteps: ['Failed to generate steps'], nextActions: ['Please try again'] };
    }
  }
}

// ============================================
// 6. CURATION WORKFLOW (from curationWorkflow.js)
// ============================================
class CurationWorkflow {
  constructor(curationService) {
    this.curationService = curationService;
    this.currentStep = 1;
    this.workflowData = { selectedTabs: [], intents: {}, ratings: [], learningPlan: null };
  }

  async startWorkflow(domain) {
    try {
      const tabs = await this.getTabsForDomain(domain);
      if (!tabs || tabs.length === 0) throw new Error("No tabs found for this domain");
      this.workflowData.selectedTabs = tabs;
      this.workflowData.intents = await this.curationService.analyzeTabsIntent(tabs);
      this.updateUI();
    } catch (error) {
      const container = document.getElementById("curationWorkflow");
      if (container) {
        container.innerHTML = `<div class="error-message"><p>Error: ${error.message}</p><p>Please try again or select a different domain.</p></div>`;
      }
    }
  }

  async getTabsForDomain(domain) {
    return new Promise((resolve) => {
      chrome.tabs.query({ url: `*://*.${domain}/*` }, (tabs) => resolve(tabs));
    });
  }

  updateUI() {
    const container = document.getElementById("curationWorkflow");
    if (!container) return;
    switch (this.currentStep) {
      case 1: this.renderStepOne(container); break;
      case 2: this.renderStepTwo(container); break;
      case 3: this.renderStepThree(container); break;
    }
  }

  renderStepOne(container) {
    container.innerHTML = `
      <div class="step-container"><h3>Step 1: Intent Analysis</h3>
        <div class="intent-summary"><h4>Identified Intent:</h4><p class="intent-description">${this.workflowData.intents.intent}</p></div>
        <div class="relevant-tabs"><h4>Relevant Tabs:</h4><ul class="tabs-list">${this.workflowData.intents.relevant_tabs.map(title => `<li class="tab-item"><span class="tab-title">${title}</span></li>`).join("")}</ul></div>
        <div class="step-actions"><button class="primary-button" id="proceedToStep2">Continue to Rating</button></div>
      </div>`;
    document.getElementById("proceedToStep2")?.addEventListener("click", () => this.proceedToStep2());
  }

  renderStepTwo(container) {
    container.innerHTML = `
      <div class="step-container"><h3>Step 2: Content Quality Ratings</h3>
        <div class="ratings-list">${this.workflowData.ratings.map(rating => `<div class="rating-item ${rating.rating >= 7 ? "high-rated" : ""}"><h4>${this.workflowData.selectedTabs.find(t => t.id === rating.tabId)?.title}</h4><p>Rating: ${rating.rating}/10</p><p>Explanation: ${rating.explanation}</p></div>`).join("")}</div>
        <div class="step-actions"><button class="primary-button" id="proceedToStep3">Generate Learning Plan</button></div>
      </div>`;
    document.getElementById("proceedToStep3")?.addEventListener("click", () => this.proceedToStep3());
  }

  renderStepThree(container) {
    if (!this.workflowData.learningPlan) {
      container.innerHTML = `<div class="error-message"><p>Learning plan not available.</p></div>`;
      return;
    }
    const plan = this.workflowData.learningPlan;
    container.innerHTML = `
      <div class="step-container"><h3>Step 3: Your Learning Plan</h3>
        <div class="learning-plan">
          <h4>Reading Sequence</h4><ol>${plan.readingSequence.map(item => `<li><div class="reading-item"><span class="reading-title">${item.title}</span><span class="reading-time">${item.estimatedTime} mins</span></div></li>`).join("")}</ol>
          <h4>Practical Exercises</h4><ul>${plan.practicalExercises.map(ex => `<li>${ex}</li>`).join("")}</ul>
          <h4>Implementation Steps</h4><ol>${plan.implementationSteps.map(step => `<li>${step}</li>`).join("")}</ol>
          <h4>Next Actions</h4><div class="checklist">${plan.nextActions.map(action => `<label class="checkbox-item"><input type="checkbox"><span>${action}</span></label>`).join("")}</div>
        </div>
        <div class="step-actions"><button class="primary-button" id="savePlan">Save Learning Plan</button><button class="danger-button" id="closeUnusedTabs">Close Unused Tabs</button></div>
      </div>`;
    document.getElementById("savePlan")?.addEventListener("click", () => this.saveLearningPlan());
    document.getElementById("closeUnusedTabs")?.addEventListener("click", () => this.closeUnusedTabs());
  }

  async proceedToStep2() {
    try {
      this.currentStep = 2;
      this.workflowData.ratings = await this.curationService.rateContent(this.workflowData.selectedTabs, this.workflowData.intents);
      this.updateUI();
    } catch (error) { this.showError(error.message); }
  }

  async proceedToStep3() {
    try {
      this.currentStep = 3;
      const highRatedTabs = this.workflowData.ratings.filter(r => r.rating >= 7).map(r => ({ ...r, tab: this.workflowData.selectedTabs.find(t => t.id === r.tabId) }));
      this.workflowData.learningPlan = await this.curationService.generateLearningPlan(highRatedTabs);
      this.updateUI();
    } catch (error) { this.showError(error.message); }
  }

  showError(message) {
    const container = document.getElementById("curationWorkflow");
    if (container) container.innerHTML = `<div class="error-message"><p>Error: ${message}</p><p>Please try again.</p></div>`;
  }

  async saveLearningPlan() {
    await chrome.storage.local.set({
      learningPlans: { ...(await chrome.storage.local.get("learningPlans")).learningPlans, [Date.now()]: this.workflowData.learningPlan }
    });
  }

  async closeUnusedTabs() {
    const lowRatedTabIds = this.workflowData.ratings.filter(r => r.rating < 7).map(r => r.tabId);
    await chrome.tabs.remove(lowRatedTabIds);
  }
}

// ============================================
// 7. MAIN POPUP CONTROLLER (from popup.js)
// ============================================
let settings;
let backendOnline = false;
let forecastChartInstance = null;
let productivityTimelineChart = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Chart === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (typeof Chart === 'undefined') { console.error('Chart.js failed to load'); return; }
  }

  const { tabData, tabGroups, settings: storedSettings } = await chrome.storage.local.get(['tabData', 'tabGroups', 'settings']);
  settings = storedSettings || defaultSettings;

  const initializedTabData = tabData || {};
  const initializedTabGroups = tabGroups || {};

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  document.getElementById('overview').style.display = 'block';

  createTimeChart(initializedTabGroups);
  displayTabGroups(initializedTabGroups);
  displayInactiveTabs(initializedTabData);
  addDetailedAnalytics(initializedTabGroups, initializedTabData);

  await initializeSettings();
  setupSettingsHandlers();
  setupSummarizeHandler();
  setupCurationHandler();
  setupHistoryHandlers();

  await checkBackendStatus();
  loadQuickStats(initializedTabData, initializedTabGroups);
  loadFocusRecommendation();

  setupInsightsHandlers();
  setInterval(checkBackendStatus, 30000);
});

// ==================== BACKEND STATUS ====================
async function checkBackendStatus() {
  const statusEl = document.getElementById('backendStatus');
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('.status-text');
  const serverText = document.getElementById('serverStatusText');

  try {
    if (typeof backendAPI !== 'undefined') {
      const health = await backendAPI.checkHealth();
      backendOnline = true;
      dot.className = 'status-dot online';
      text.textContent = 'Backend Online';
      if (serverText) { serverText.textContent = 'Connected'; serverText.className = 'status-indicator connected'; }
    } else { throw new Error('API not loaded'); }
  } catch (e) {
    backendOnline = false;
    dot.className = 'status-dot offline';
    text.textContent = 'Backend Offline';
    if (serverText) { serverText.textContent = 'Disconnected'; serverText.className = 'status-indicator disconnected'; }
  }
}

// ==================== QUICK STATS ====================
function loadQuickStats(tabData, tabGroups) {
  let totalMs = 0;
  Object.values(tabData || {}).forEach(t => { totalMs += (t.totalActiveTime || 0); });
  document.getElementById('todayTime').textContent = formatTime(totalMs);

  const tabCount = Object.keys(tabData || {}).length;
  document.getElementById('todayTabs').textContent = tabCount;

  const domains = new Set();
  Object.values(tabData || {}).forEach(t => { if (t.domain) domains.add(t.domain); });
  document.getElementById('todayDomains').textContent = domains.size;

  if (backendOnline && typeof backendAPI !== 'undefined') {
    backendAPI.predictProductivity().then(res => {
      if (res && res.predicted_score !== undefined) document.getElementById('todayScore').textContent = Math.round(res.predicted_score) + '%';
    }).catch(() => computeLocalScore(tabData));
  } else {
    computeLocalScore(tabData);
  }
}

function computeLocalScore(tabData) {
  let productive = 0, total = 0;
  Object.values(tabData || {}).forEach(t => {
    total += (t.totalActiveTime || 0);
    if (settings && settings.productiveSites && settings.productiveSites.includes(t.domain)) productive += (t.totalActiveTime || 0);
  });
  document.getElementById('todayScore').textContent = (total > 0 ? Math.round((productive / total) * 100) : 0) + '%';
}

// ==================== FOCUS RECOMMENDATION ====================
async function loadFocusRecommendation() {
  const card = document.getElementById('focusCard');
  const icon = document.getElementById('focusIcon');
  const title = document.getElementById('focusTitle');
  const message = document.getElementById('focusMessage');
  const actions = document.getElementById('focusActions');

  try {
    let recommendation;
    if (backendOnline && typeof backendAPI !== 'undefined') recommendation = await backendAPI.getFocusRecommendation();
    else recommendation = getLocalFocusRecommendation();

    const type = recommendation.recommendation || recommendation.type || 'light_work';
    const conf = recommendation.confidence || 0.5;
    card.className = 'focus-card ' + type;

    const focusMap = {
      deep_focus: { icon: '\uD83C\uDFAF', title: 'Deep Focus Time', msg: 'Perfect time for concentrated work. Minimize distractions!' },
      light_work: { icon: '\uD83D\uDCBB', title: 'Light Work Mode', msg: 'Good for emails, browsing, and casual tasks.' },
      break_needed: { icon: '\u2615', title: 'Break Recommended', msg: "You've been working a while. Take a short break!" },
      leisure: { icon: '\uD83C\uDFAE', title: 'Leisure Time', msg: 'Relax and enjoy some downtime.' }
    };

    const info = focusMap[type] || focusMap.light_work;
    icon.textContent = info.icon;
    title.textContent = info.title;
    message.textContent = recommendation.message || info.msg;
    actions.innerHTML = '<span class="focus-tag">Confidence: ' + Math.round(conf * 100) + '%</span>' + (recommendation.suggested_duration ? '<span class="focus-tag">' + recommendation.suggested_duration + ' min</span>' : '');
  } catch (e) {
    icon.textContent = '\uD83D\uDCA1';
    title.textContent = 'Smart Suggestions';
    message.textContent = 'Start browsing to get AI-powered focus recommendations.';
    actions.innerHTML = '';
  }
}

function getLocalFocusRecommendation() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 11) return { type: 'deep_focus', confidence: 0.7, message: 'Morning hours are ideal for deep work.' };
  if (hour >= 12 && hour <= 13) return { type: 'break_needed', confidence: 0.8, message: 'Lunchtime \u2014 recharge your energy!' };
  if (hour >= 14 && hour <= 16) return { type: 'light_work', confidence: 0.6, message: 'Afternoon is good for emails and meetings.' };
  if (hour >= 17) return { type: 'leisure', confidence: 0.7, message: 'End of work day \u2014 time to wind down.' };
  return { type: 'light_work', confidence: 0.5, message: 'Start your day with some light tasks.' };
}

// ==================== TAB SWITCHING ====================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
  if (tabId === 'history') loadHistoryData();
  if (tabId === 'insights') loadAllInsights();
}

// ==================== SETTINGS ====================
function setupSettingsHandlers() {
  document.getElementById('addLimit').addEventListener('click', async () => {
    const domain = document.getElementById('limitDomain').value.trim();
    const minutes = parseInt(document.getElementById('limitMinutes').value);
    if (domain && minutes > 0) {
      const { settings } = await chrome.storage.local.get(['settings']);
      settings.siteLimits[domain] = minutes;
      await chrome.storage.local.set({ settings });
      displayTimeLimits(settings.siteLimits);
      document.getElementById('limitDomain').value = '';
      document.getElementById('limitMinutes').value = '';
    }
  });

  document.getElementById('addProductive').addEventListener('click', async () => {
    const domain = document.getElementById('productiveSite').value.trim();
    if (domain) {
      const { settings } = await chrome.storage.local.get(['settings']);
      if (!settings.productiveSites.includes(domain)) {
        settings.productiveSites.push(domain);
        await chrome.storage.local.set({ settings });
        displaySiteList(settings.productiveSites, 'productiveSitesList');
      }
      document.getElementById('productiveSite').value = '';
    }
  });

  document.getElementById('addSocial').addEventListener('click', async () => {
    const domain = document.getElementById('socialSite').value.trim();
    if (domain) {
      const { settings } = await chrome.storage.local.get(['settings']);
      if (!settings.socialSites.includes(domain)) {
        settings.socialSites.push(domain);
        await chrome.storage.local.set({ settings });
        displaySiteList(settings.socialSites, 'socialSitesList');
      }
      document.getElementById('socialSite').value = '';
    }
  });

  const syncBtn = document.getElementById('syncNowBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.textContent = 'Syncing...';
      syncBtn.disabled = true;
      try {
        await syncDataToBackend();
        showToast('Data synced successfully!', 'success');
      } catch (e) {
        showToast('Sync failed: ' + e.message, 'error');
      } finally {
        syncBtn.textContent = '\u21BB Sync Data Now';
        syncBtn.disabled = false;
      }
    });
  }
}

// ==================== SUMMARIZE ====================
function setupSummarizeHandler() {
  document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const summarySection = document.getElementById('summaryResult');
    const loader = summarySection.querySelector('.loader');
    const summaryText = summarySection.querySelector('.summary-text');
    loader.style.display = 'block';
    summaryText.innerHTML = '';

    try {
      if (typeof CONFIG === 'undefined') throw new Error('Configuration not loaded.');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found.');
      if (!tab.url || !tab.url.startsWith('http')) throw new Error('Navigate to a webpage to summarize.');
      try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['assets/scripts/content.js'] }); } catch (e) { /* already injected */ }
      await new Promise(r => setTimeout(r, 100));
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      if (!response || !response.success) throw new Error(response ? response.error : 'Failed to get content.');
      const content = response.content;
      if (!content || !content.trim()) throw new Error('No content found on this page.');
      if (typeof summarizeContent !== 'function') throw new Error('Summarize function not loaded.');
      loader.textContent = 'Generating summary with AI...';
      const summary = await summarizeContent(content);
      summaryText.innerHTML = DOMPurify.sanitize(summary);
    } catch (error) {
      let msg = error.message || 'An unknown error occurred';
      if (msg.includes('Could not establish connection')) msg = 'Refresh the page and try again.';
      summaryText.innerHTML = '<div class="error-message"><strong>\u26A0\uFE0F Error:</strong> ' + msg + '</div>';
    } finally {
      loader.style.display = 'none';
    }
  });
}

// ==================== CURATION ====================
function setupCurationHandler() {
  async function populateDomainDropdown() {
    const tabs = await chrome.tabs.query({});
    const domains = new Set();
    tabs.forEach(tab => {
      try { const url = new URL(tab.url); if (url.protocol.startsWith('http')) domains.add(url.hostname); } catch (e) { /* skip */ }
    });
    const select = document.getElementById('domainSelect');
    select.innerHTML = '<option value="">Select a domain...</option>';
    Array.from(domains).sort().forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      select.appendChild(opt);
    });
  }

  populateDomainDropdown();
  chrome.tabs.onUpdated.addListener(populateDomainDropdown);
  chrome.tabs.onRemoved.addListener(populateDomainDropdown);

  const curationService = new CurationService();
  window.workflow = new CurationWorkflow(curationService);
  document.getElementById('startCuration').addEventListener('click', () => {
    const domain = document.getElementById('domainSelect').value;
    if (domain) window.workflow.startWorkflow(domain);
  });
}

// ==================== AI INSIGHTS ====================
function setupInsightsHandlers() {
  document.getElementById('trainModelsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('trainModelsBtn');
    btn.textContent = '\u23F3 Training...';
    btn.disabled = true;
    try {
      if (!backendOnline) throw new Error('Backend is offline');
      await backendAPI.trainModels();
      showToast('Models trained successfully!', 'success');
      loadAllInsights();
    } catch (e) {
      showToast('Training failed: ' + e.message, 'error');
    } finally {
      btn.textContent = '\uD83D\uDD04 Retrain ML Models';
      btn.disabled = false;
    }
  });

  document.getElementById('importHistoryBtn').addEventListener('click', async () => {
    const btn = document.getElementById('importHistoryBtn');
    btn.textContent = '\u23F3 Importing...';
    btn.disabled = true;
    try {
      await importChromeHistory();
      showToast('Chrome history imported!', 'success');
    } catch (e) {
      showToast('Import failed: ' + e.message, 'error');
    } finally {
      btn.textContent = '\uD83D\uDCE5 Import Chrome History';
      btn.disabled = false;
    }
  });

  const toggle = document.getElementById('modelsInfoToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const card = toggle.closest('.collapsible');
      card.classList.toggle('open');
      document.getElementById('modelsInfoDisplay').classList.toggle('collapsed');
    });
  }
}

async function loadAllInsights() {
  if (!backendOnline) { showInsightsOfflineState(); return; }
  await Promise.allSettled([
    loadProductivityPrediction(),
    loadBrowsingCluster(),
    loadAnomalyDetection(),
    loadClassification(),
    loadForecast(),
    loadOptimalSchedule(),
    loadModelsInfo(),
    loadLearningRecommendations(),
    loadNLPAnalysis(),
    loadTemporalPredictions()
  ]);
}

function showInsightsOfflineState() {
  var msg = '<p style="color:var(--text-secondary);text-align:center;">Start the Flask backend to see ML insights.<br><code>cd backend && python app.py</code></p>';
  document.getElementById('productivityDetails').innerHTML = msg;
  document.getElementById('clusterDisplay').innerHTML = msg;
  document.getElementById('anomalyDisplay').innerHTML = msg;
  document.getElementById('classificationDisplay').innerHTML = msg;
  document.getElementById('forecastSummary').innerHTML = msg;
  document.getElementById('scheduleDisplay').innerHTML = msg;
  document.getElementById('recommendationsDisplay').innerHTML = msg;
  var nlpEl = document.getElementById('nlpDisplay');
  if (nlpEl) nlpEl.innerHTML = msg;
  var tempEl = document.getElementById('temporalDisplay');
  if (tempEl) tempEl.innerHTML = msg;
}

// --- Productivity Prediction ---
async function loadProductivityPrediction() {
  try {
    const result = await backendAPI.predictProductivity();
    const score = Math.round(result.predicted_score || 0);
    const circle = document.getElementById('predictedScore');
    circle.style.setProperty('--score-pct', score);
    circle.querySelector('.score-number').textContent = score;
    var ci = result.confidence_interval || {};
    var html = '<p>' + getProductivityMessage(score) + '</p>';
    if (ci.lower !== undefined) html += '<p class="confidence">Range: ' + Math.round(ci.lower) + '% \u2014 ' + Math.round(ci.upper) + '%</p>';
    if (result.features_used) html += '<p class="confidence">Based on ' + result.features_used + ' features</p>';
    document.getElementById('productivityDetails').innerHTML = html;
  } catch (e) {
    document.getElementById('productivityDetails').innerHTML = '<p>Not enough data for prediction yet.</p>';
  }
}

function getProductivityMessage(score) {
  if (score >= 80) return '\uD83C\uDF1F Excellent productivity! Keep up the great work.';
  if (score >= 60) return '\uD83D\uDC4D Good productivity. Try to maintain focus.';
  if (score >= 40) return '\uD83D\uDCCA Average productivity. Consider reducing distractions.';
  return '\u26A0\uFE0F Low productivity. Try the focus recommendations below.';
}

// --- Browsing Cluster ---
async function loadBrowsingCluster() {
  try {
    const result = await backendAPI.getInsights();
    const cluster = result.cluster || {};
    const display = document.getElementById('clusterDisplay');
    const clusterEmoji = { 'Focus Worker': '\uD83C\uDFAF', 'Social Butterfly': '\uD83E\uDD8B', 'Content Consumer': '\uD83D\uDCFA', 'Balanced Browser': '\u2696\uFE0F', 'Casual Surfer': '\uD83C\uDFC4' };
    const label = cluster.label || null;
    const emoji = label ? (clusterEmoji[label] || '\uD83D\uDCCA') : '\uD83D\uDCCA';
    if (!label) {
      display.innerHTML = '<div class="cluster-label">\uD83D\uDCCA Not enough data</div><div class="cluster-description">Import your Chrome history and retrain models to see your browsing profile.</div>';
      return;
    }
    var barsHtml = '';
    if (cluster.features) {
      var f = cluster.features;
      var bars = [
        { label: 'Productive', value: f.productive_ratio || 0, cls: 'productive' },
        { label: 'Social', value: f.social_ratio || 0, cls: 'social' },
        { label: 'Entertainment', value: f.entertainment_ratio || 0, cls: 'entertainment' },
        { label: 'News', value: f.news_ratio || 0, cls: 'news' },
        { label: 'Shopping', value: f.shopping_ratio || 0, cls: 'shopping' }
      ];
      barsHtml = '<div class="cluster-bars">';
      bars.forEach(function(b) {
        barsHtml += '<div class="cluster-bar-item"><span class="cluster-bar-label">' + b.label + '</span><div class="cluster-bar-track"><div class="cluster-bar-fill ' + b.cls + '" style="width:' + Math.round(b.value * 100) + '%"></div></div><span class="cluster-bar-value">' + Math.round(b.value * 100) + '%</span></div>';
      });
      barsHtml += '</div>';
    }
    display.innerHTML = '<div class="cluster-label">' + emoji + ' ' + label + '</div><div class="cluster-description">' + (cluster.description || 'Your browsing profile has been identified.') + '</div>' + barsHtml;
  } catch (e) {
    document.getElementById('clusterDisplay').innerHTML = '<div class="cluster-label">\uD83D\uDCCA Not enough data</div><div class="cluster-description">Import Chrome history and retrain models.</div>';
  }
}

// --- Anomaly Detection ---
async function loadAnomalyDetection() {
  try {
    const result = await backendAPI.detectAnomaly();
    const display = document.getElementById('anomalyDisplay');
    var severityIcons = { normal: '\u2705', mild: '\u26A1', moderate: '\u26A0\uFE0F', severe: '\uD83D\uDEA8' };
    var severity = result.severity || 'normal';
    var recsHtml = '';
    if (result.recommendations && result.recommendations.length > 0) {
      recsHtml = '<div class="anomaly-recommendations"><strong>Suggestions:</strong><ul>';
      result.recommendations.forEach(function(r) { recsHtml += '<li>' + r + '</li>'; });
      recsHtml += '</ul></div>';
    }
    display.innerHTML = '<div class="anomaly-status"><span class="anomaly-icon">' + (severityIcons[severity] || '\u2705') + '</span><div><div class="anomaly-label ' + severity + '">' + severity.charAt(0).toUpperCase() + severity.slice(1) + ' Activity</div><div class="anomaly-details">' + (result.message || 'Browsing patterns appear normal.') + '</div></div></div>' + recsHtml;
  } catch (e) {
    document.getElementById('anomalyDisplay').innerHTML = '<p>Not enough data for anomaly detection.</p>';
  }
}

// --- Website Classification ---
async function loadClassification() {
  try {
    const tabs = await chrome.tabs.query({});
    var domains = [];
    tabs.forEach(function(tab) {
      try { var url = new URL(tab.url); if (url.protocol.startsWith('http') && domains.indexOf(url.hostname) === -1) domains.push(url.hostname); } catch (e) { /* skip */ }
    });
    if (domains.length === 0) { document.getElementById('classificationDisplay').innerHTML = '<p>No open tabs to classify.</p>'; return; }
    const results = await backendAPI.classifyDomains(domains.slice(0, 12));
    var catIcons = { productive: '\uD83D\uDCBC', social: '\uD83D\uDCAC', entertainment: '\uD83C\uDFAC', news: '\uD83D\uDCF0', shopping: '\uD83D\uDED2', communication: '\u2709\uFE0F', other: '\uD83C\uDF10' };
    var html = '<div class="classification-grid">';
    results.forEach(function(r) {
      html += '<div class="classification-item"><span class="cat-icon">' + (catIcons[r.category] || '\uD83C\uDF10') + '</span><div class="cat-info"><div class="cat-domain">' + r.domain + '</div><div class="cat-label">' + r.category + ' (' + Math.round((r.confidence || 0) * 100) + '%)</div></div></div>';
    });
    html += '</div>';
    document.getElementById('classificationDisplay').innerHTML = html;
  } catch (e) {
    document.getElementById('classificationDisplay').innerHTML = '<p>Classification unavailable.</p>';
  }
}

// --- Forecast ---
async function loadForecast() {
  try {
    const result = await backendAPI.getForecast(7);
    if (!result || !result.forecasts || result.forecasts.length === 0) {
      document.getElementById('forecastSummary').innerHTML = '<p>Not enough data for forecasting.</p>';
      return;
    }
    var labels = result.forecasts.map(f => f.date);
    var totalTime = result.forecasts.map(f => f.total_time || 0);
    var productive = result.forecasts.map(f => f.productive_time || 0);
    var ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChartInstance) forecastChartInstance.destroy();
    forecastChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Total Time (hrs)', data: totalTime, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', tension: 0.4, fill: true },
          { label: 'Productive (hrs)', data: productive, borderColor: '#188038', backgroundColor: 'rgba(24,128,56,0.1)', tension: 0.4, fill: true }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } }, x: { ticks: { font: { size: 10 } } } } }
    });
    var avg = (totalTime.reduce((a, b) => a + b, 0) / totalTime.length).toFixed(1);
    document.getElementById('forecastSummary').innerHTML = '<p>\uD83D\uDCCA 7-day forecast based on your browsing patterns. Predicted avg: ' + avg + ' hrs/day.</p>';
  } catch (e) {
    document.getElementById('forecastSummary').innerHTML = '<p>Forecasting needs more historical data.</p>';
  }
}

// --- Optimal Schedule ---
async function loadOptimalSchedule() {
  try {
    const result = await backendAPI.getOptimalSchedule();
    var display = document.getElementById('scheduleDisplay');
    if (!result || !result.schedule || result.schedule.length === 0) { renderSchedule(display, generateLocalSchedule()); return; }
    renderSchedule(display, result.schedule);
  } catch (e) { renderSchedule(document.getElementById('scheduleDisplay'), generateLocalSchedule()); }
}

function renderSchedule(container, schedule) {
  var html = '<div class="schedule-timeline">';
  schedule.slice(0, 10).forEach(function(slot) {
    var type = slot.recommendation || slot.type || 'light_work';
    var hour = slot.hour !== undefined ? String(slot.hour).padStart(2, '0') + ':00' : '';
    var label = type.replace(/_/g, ' ');
    html += '<div class="schedule-slot ' + type + '"><span class="schedule-time">' + hour + '</span><span class="schedule-type">' + label + '</span></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function generateLocalSchedule() {
  var hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  return hours.map(function(h) {
    var type = 'light_work';
    if (h >= 9 && h <= 11) type = 'deep_focus';
    else if (h === 12 || h === 13) type = 'break_needed';
    else if (h >= 14 && h <= 16) type = 'light_work';
    else if (h >= 17) type = 'leisure';
    return { hour: h, type: type };
  });
}

// --- Models Info ---
async function loadModelsInfo() {
  try {
    const result = await backendAPI.getModelsInfo();
    var display = document.getElementById('modelsInfoDisplay');
    if (!result || !result.models) { display.innerHTML = '<p>No model info available.</p>'; return; }

    var html = '<div class="models-grid">';
    // Show total count
    html += '<div style="grid-column:1/-1;margin-bottom:4px;font-size:11px;color:#9aa0a6">' +
      (result.total_models || Object.keys(result.models).length) + ' models (' +
      (result.categories ? result.categories.traditional_ml + ' ML + ' + result.categories.deep_learning + ' DL' : '') + ')</div>';

    var dlModels = ['deep_recommender', 'nlp_analyzer', 'collaborative_filter', 'temporal_predictor'];
    Object.keys(result.models).forEach(function(name) {
      var info = result.models[name];
      var trained = info.is_trained || info.trained || false;
      var isDL = dlModels.indexOf(name) !== -1;
      var displayName = (info.name || name).replace(/_/g, ' ');
      html += '<div class="model-status-item">';
      html += '<span class="model-name">' + displayName;
      if (isDL) html += ' <span class="ml-badge dl-badge" style="font-size:8px;padding:1px 4px">DL</span>';
      html += '</span>';
      html += '<span class="model-state ' + (trained ? 'trained' : 'untrained') + '">' + (trained ? 'Trained' : 'Untrained') + '</span>';
      html += '</div>';
    });
    html += '</div>';
    display.innerHTML = html;
  } catch (e) { document.getElementById('modelsInfoDisplay').innerHTML = '<p>Cannot load model info.</p>'; }
}

// --- NEW: Learning Recommendations (DL-powered) ---
async function loadLearningRecommendations() {
  const display = document.getElementById('recommendationsDisplay');
  if (!display) return;

  try {
    // Build browsing context from current data
    const { tabGroups } = await chrome.storage.local.get(['tabGroups']);
    const domains = Object.keys(tabGroups || {});
    const catTimes = {};
    let totalTime = 0;
    domains.forEach(function(d) {
      const t = (tabGroups[d] || {}).totalTime || 0;
      totalTime += t;
    });

    const browsingData = {
      domains: domains,
      category_times: { productive: totalTime * 0.5, social: totalTime * 0.15, entertainment: totalTime * 0.2 },
      total_time: totalTime,
      unique_domains: domains.length,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      avg_session_minutes: 30,
      tab_switches: 5,
      focus_score: 0.5,
      recency_weight: 0.6
    };

    const result = await backendAPI.getLearningRecommendations(browsingData);
    if (!result || !result.recommendations || result.recommendations.length === 0) {
      display.innerHTML = '<div class="recommendations-empty">\uD83D\uDCDA Browse more and retrain models to get personalized learning recommendations.</div>';
      return;
    }

    var html = '<div class="recommendations-section">';

    // Model badge
    html += '<div style="margin-bottom:8px"><span class="ml-badge dl-badge">Deep Learning</span> <span style="font-size:11px;color:#9aa0a6">' + (result.model || 'Neural Network') + '</span></div>';

    result.recommendations.forEach(function(rec) {
      var tags = '';
      if (rec.tags && rec.tags.length > 0) {
        tags = '<div class="rec-tags">';
        rec.tags.forEach(function(tag) {
          tags += '<span class="rec-tag">' + tag + '</span>';
        });
        tags += '</div>';
      }

      // Category icons
      var iconMap = {
        'programming': '\uD83D\uDCBB', 'data_science': '\uD83E\uDDEC', 'web_development': '\uD83C\uDF10',
        'cloud_computing': '\u2601\uFE0F', 'cybersecurity': '\uD83D\uDD12', 'design': '\uD83C\uDFA8',
        'mathematics': '\uD83D\uDCCA', 'research': '\uD83D\uDD2C', 'language_learning': '\uD83C\uDF0D',
        'business': '\uD83D\uDCBC', 'general_knowledge': '\uD83C\uDF93', 'career_development': '\uD83D\uDE80'
      };

      var icon = iconMap[rec.category] || '\uD83D\uDCD6';
      var confidence = Math.round((rec.confidence || 0) * 100);
      var title = (rec.category || '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

      html += '<div class="recommendation-card">';
      html += '<div class="rec-header">';
      html += '<span class="rec-icon">' + icon + '</span>';
      html += '<span class="rec-title">' + title + '</span>';
      html += '<span class="rec-score">' + confidence + '% match</span>';
      html += '</div>';
      html += '<div class="rec-reason">' + (rec.reason || 'Based on your browsing patterns') + '</div>';

      // Resources
      if (rec.resources && rec.resources.length > 0) {
        html += '<div class="rec-tags">';
        rec.resources.forEach(function(res) {
          html += '<a href="' + res.url + '" target="_blank" class="rec-tag nlp" style="text-decoration:none;cursor:pointer">' + res.title + '</a>';
        });
        html += '</div>';
      }

      html += tags;
      html += '</div>';
    });

    html += '</div>';
    display.innerHTML = html;
  } catch (e) {
    display.innerHTML = '<div class="recommendations-empty">Could not load recommendations.</div>';
  }
}

// --- NEW: NLP Content Analysis ---
async function loadNLPAnalysis() {
  const display = document.getElementById('nlpDisplay');
  if (!display) return;

  try {
    const { tabGroups } = await chrome.storage.local.get(['tabGroups']);
    const domains = Object.keys(tabGroups || {});
    if (domains.length === 0) {
      display.innerHTML = '<p>No browsing data to analyze yet.</p>';
      return;
    }

    const entries = domains.map(function(d) {
      return { domain: d, title: d, url: 'https://' + d };
    });

    const result = await backendAPI.getContentAnalysis(entries);
    if (!result || result.error) {
      display.innerHTML = '<p>' + (result.error || 'Analysis unavailable') + '</p>';
      return;
    }

    var html = '';
    // Topics
    if (result.topics && result.topics.length > 0) {
      html += '<div style="margin-bottom:8px;font-weight:500;font-size:12px;color:var(--text-primary)">Detected Topics</div>';
      result.topics.forEach(function(topic) {
        var pct = Math.round((topic.relevance || 0) * 100);
        html += '<div style="display:flex;align-items:center;margin-bottom:4px;gap:6px">';
        html += '<span style="font-size:11px;color:var(--text-primary);flex:1">' + topic.label + '</span>';
        html += '<div style="flex:2;background:var(--surface-variant);border-radius:3px;height:6px;overflow:hidden">';
        html += '<div style="width:' + pct + '%;height:100%;background:var(--primary);border-radius:3px"></div></div>';
        html += '<span style="font-size:10px;color:var(--text-secondary);width:28px;text-align:right">' + pct + '%</span>';
        html += '</div>';
      });
    }

    // Learning Pathway
    if (result.learning_pathway && result.learning_pathway.length > 0) {
      html += '<div style="margin-top:8px;font-weight:500;font-size:12px;color:var(--text-primary)">Learning Pathway</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
      result.learning_pathway.forEach(function(step, i) {
        var bg = step.focus_level === 'high' ? 'var(--primary)' : step.focus_level === 'medium' ? '#f9ab00' : 'var(--surface-variant)';
        var color = step.focus_level === 'low' ? 'var(--text-secondary)' : '#fff';
        html += '<span style="font-size:10px;padding:2px 6px;border-radius:10px;background:' + bg + ';color:' + color + '">' + (i + 1) + '. ' + step.topic + '</span>';
      });
      html += '</div>';
    }

    // Metrics
    html += '<div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text-secondary)">';
    html += '<span>Diversity: ' + Math.round((result.content_diversity || 0) * 100) + '%</span>';
    html += '<span>Vocab richness: ' + Math.round((result.vocabulary_richness || 0) * 100) + '%</span>';
    html += '<span>Docs: ' + (result.total_documents_analyzed || 0) + '</span>';
    html += '</div>';

    display.innerHTML = html;
  } catch (e) {
    display.innerHTML = '<p>Content analysis unavailable.</p>';
  }
}

// --- NEW: Temporal Predictions ---
async function loadTemporalPredictions() {
  const display = document.getElementById('temporalDisplay');
  if (!display) return;

  try {
    // Get optimal study hours
    const optimal = await backendAPI.getOptimalHours();
    if (!optimal || optimal.error) {
      display.innerHTML = '<p>Temporal analysis needs more data.</p>';
      return;
    }

    var html = '';

    // Peak hour
    html += '<div style="margin-bottom:8px">';
    html += '<span style="font-size:20px;font-weight:700;color:var(--primary)">' + String(optimal.peak_hour || 10).padStart(2, '0') + ':00</span>';
    html += '<span style="font-size:11px;color:var(--text-secondary);margin-left:6px">Peak productivity hour</span>';
    html += '</div>';

    // Deep work hours
    if (optimal.deep_work_hours && optimal.deep_work_hours.length > 0) {
      html += '<div style="font-size:11px;margin-bottom:4px"><span style="color:var(--primary);font-weight:500">\u{1F3AF} Deep work: </span>';
      html += optimal.deep_work_hours.map(function(h) { return String(h).padStart(2, '0') + ':00'; }).join(', ');
      html += '</div>';
    }

    // Learning hours
    if (optimal.learning_hours && optimal.learning_hours.length > 0) {
      html += '<div style="font-size:11px;margin-bottom:4px"><span style="color:#f9ab00;font-weight:500">\u{1F4D6} Learning: </span>';
      html += optimal.learning_hours.map(function(h) { return String(h).padStart(2, '0') + ':00'; }).join(', ');
      html += '</div>';
    }

    // Break hours
    if (optimal.break_hours && optimal.break_hours.length > 0) {
      html += '<div style="font-size:11px;margin-bottom:4px"><span style="color:#9aa0a6;font-weight:500">\u2615 Breaks: </span>';
      html += optimal.break_hours.map(function(h) { return String(h).padStart(2, '0') + ':00'; }).join(', ');
      html += '</div>';
    }

    // Hourly chart (mini bar chart)
    if (optimal.hourly_productivity) {
      html += '<div style="display:flex;align-items:flex-end;height:40px;gap:1px;margin-top:8px">';
      for (var h = 6; h <= 23; h++) {
        var val = optimal.hourly_productivity[h] || 0;
        var height = Math.max(2, Math.round(val * 40));
        var color = val > 0.6 ? 'var(--primary)' : val > 0.3 ? '#f9ab00' : 'var(--surface-variant)';
        html += '<div title="' + String(h).padStart(2, '0') + ':00 — ' + Math.round(val * 100) + '%" style="flex:1;height:' + height + 'px;background:' + color + ';border-radius:2px 2px 0 0"></div>';
      }
      html += '</div>';
      html += '<div style="display:flex;justify-content:space-between;font-size:8px;color:var(--text-secondary);margin-top:2px"><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span></div>';
    }

    display.innerHTML = html;
  } catch (e) {
    display.innerHTML = '<p>Temporal predictions unavailable.</p>';
  }
}

// ==================== CHROME HISTORY IMPORT ====================
async function importChromeHistory() {
  return new Promise(function(resolve, reject) {
    chrome.history.search({ text: '', maxResults: 5000, startTime: Date.now() - (30 * 24 * 60 * 60 * 1000) }, async function(results) {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      if (!results || results.length === 0) { reject(new Error('No Chrome history found.')); return; }
      var historyItems = results.map(function(item) {
        return { url: item.url, title: item.title || '', visit_count: item.visitCount || 1, last_visit: item.lastVisitTime ? new Date(item.lastVisitTime).toISOString() : new Date().toISOString() };
      });
      try {
        if (backendOnline && typeof backendAPI !== 'undefined') await backendAPI.importHistory(historyItems);
        resolve(historyItems.length);
      } catch (e) { reject(e); }
    });
  });
}

// ==================== SYNC DATA ====================
async function syncDataToBackend() {
  if (!backendOnline || typeof backendAPI === 'undefined') throw new Error('Backend not connected');
  const { tabData, tabGroups } = await chrome.storage.local.get(['tabData', 'tabGroups']);
  var tabs = [], events = [];
  Object.keys(tabData || {}).forEach(function(tabId) {
    var data = tabData[tabId];
    tabs.push({ tab_id: parseInt(tabId), url: data.url || '', title: data.title || data.domain || '', domain: data.domain || '', active_time: data.totalActiveTime || 0 });
    events.push({ tab_id: parseInt(tabId), event_type: 'tracked', domain: data.domain || '', url: data.url || '', timestamp: new Date(data.startTime || Date.now()).toISOString() });
  });
  var domainStats = [];
  Object.keys(tabGroups || {}).forEach(function(domain) {
    var data = tabGroups[domain];
    domainStats.push({ domain: domain, total_time: data.totalTime || 0, visit_count: data.tabs ? data.tabs.length : 0 });
  });
  await backendAPI.syncData({ session: { start_time: new Date().toISOString(), is_active: true }, tabs: tabs, events: events, domain_stats: domainStats });
}

// ==================== CHARTS ====================
function createTimeChart(tabGroups) {
  if (typeof Chart === 'undefined') return;
  if (!Object.keys(tabGroups).length) {
    var ctx = document.getElementById('timeChart').getContext('2d');
    ctx.font = '14px Google Sans, sans-serif';
    ctx.fillStyle = '#9aa0a6';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet. Start browsing!', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  var ctx = document.getElementById('timeChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: { labels: Object.keys(tabGroups), datasets: [{ data: Object.values(tabGroups).map(g => g.totalTime / 60000), backgroundColor: generateColors(Object.keys(tabGroups).length) }] },
    options: { responsive: true, plugins: { title: { display: true, text: 'Time Spent by Website' } } }
  });
}

async function addDetailedAnalytics(tabGroups, tabData) {
  if (Object.keys(tabData).length > 0) {
    new Chart(document.getElementById('dailyPattern').getContext('2d'), {
      type: 'line',
      data: { labels: Array.from({ length: 24 }, (_, i) => i + ':00'), datasets: [{ label: 'Tab Activity', data: calculateHourlyActivity(tabData), borderColor: '#4285f4', backgroundColor: 'rgba(66, 133, 244, 0.1)', tension: 0.4, fill: true }] },
      options: { responsive: true, scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } } }
    });
    var productivityRatio = await calculateProductivityRatio(tabData);
    new Chart(document.getElementById('productivity').getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Productive', 'Social', 'Other'], datasets: [{ data: productivityRatio, backgroundColor: ['#34A853', '#EA4335', '#FBBC05'] }] },
      options: { responsive: true, plugins: { title: { display: true, text: 'Time Distribution' } } }
    });
  } else {
    document.getElementById('dailyPattern').style.display = 'none';
    document.getElementById('productivity').style.display = 'none';
  }
  var lifecycle = document.getElementById('tabLifecycle');
  lifecycle.innerHTML = '<h3>Tab Lifecycle</h3><div class="tab-timeline">' + generateTabTimeline(tabData) + '</div>';
}

// ==================== DISPLAY FUNCTIONS ====================
function displayTabGroups(tabGroups) {
  var container = document.getElementById('tabGroups');
  container.innerHTML = '';
  if (!tabGroups || !Object.keys(tabGroups).length) {
    container.innerHTML = '<p class="empty-state">No tab groups yet. Open some tabs to get started!</p>';
    return;
  }
  chrome.storage.local.get(['settings'], function(result) {
    var stgs = result.settings;
    if (!stgs) return;
    var sortedGroups = Object.entries(tabGroups).sort(function(a, b) {
      var aLimit = stgs.siteLimits[a[0]], bLimit = stgs.siteLimits[b[0]];
      var aExceeded = aLimit && (a[1].totalTime / 60000) >= aLimit;
      var bExceeded = bLimit && (b[1].totalTime / 60000) >= bLimit;
      if (aExceeded && !bExceeded) return -1;
      if (!aExceeded && bExceeded) return 1;
      return b[1].totalTime - a[1].totalTime;
    });
    sortedGroups.forEach(function(entry) {
      var domain = entry[0], data = entry[1];
      var el = document.createElement('div');
      el.className = 'group-item';
      var limit = stgs.siteLimits[domain], mins = data.totalTime / 60000;
      var warning = '';
      if (limit && mins >= limit) {
        el.classList.add('time-limit-reached');
        warning = '<div class="time-warning"><p>Time limit reached! ' + Math.floor(mins) + ' min on ' + domain + '.</p><button>Close All Tabs</button></div>';
      }
      el.innerHTML = '<h3>' + domain + '</h3><p>Open tabs: ' + data.tabs.length + '</p><p>Total time: ' + formatTime(data.totalTime) + '</p>' + warning;
      if (limit && mins >= limit) el.querySelector('.time-warning button').addEventListener('click', function() { closeTabsByDomain(domain); });
      container.appendChild(el);
    });
  });
}

function displayInactiveTabs(tabData) {
  var container = document.getElementById('inactiveTabs');
  container.innerHTML = '';
  if (!Object.keys(tabData).length) { container.innerHTML = '<p class="empty-state">No inactive tabs detected.</p>'; return; }
  var threshold = 5 * 60 * 1000, now = Date.now(), found = false;
  Object.keys(tabData).forEach(function(tabId) {
    var data = tabData[tabId];
    if (data.lastInactiveTime && (now - data.lastInactiveTime > threshold)) {
      found = true;
      var el = document.createElement('div');
      el.className = 'inactive-tab';
      var info = document.createElement('div');
      info.innerHTML = '<p>' + data.domain + '</p><p>Inactive for: ' + formatTime(now - data.lastInactiveTime) + '</p>';
      var btn = document.createElement('button');
      btn.textContent = 'Close';
      btn.addEventListener('click', function() { closeTab(tabId); });
      el.appendChild(info);
      el.appendChild(btn);
      container.appendChild(el);
    }
  });
  if (!found) container.innerHTML = '<p class="empty-state">All tabs are active!</p>';
}

// ==================== HISTORY TAB ====================
function setupHistoryHandlers() {
  var periodSelect = document.getElementById('historyPeriod');
  if (periodSelect) periodSelect.addEventListener('change', loadHistoryData);
  var exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async function() {
      try {
        exportBtn.textContent = 'Exporting...';
        exportBtn.disabled = true;
        if (typeof DatabaseQueryHelper !== 'undefined') { await DatabaseQueryHelper.downloadDataAsJSON(); exportBtn.textContent = '\u2713 Exported!'; }
        else if (backendOnline) {
          var data = await backendAPI.exportAllData();
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'supriai-export-' + new Date().toISOString().split('T')[0] + '.json';
          a.click();
          URL.revokeObjectURL(url);
          exportBtn.textContent = '\u2713 Exported!';
        } else throw new Error('No database available');
      } catch (e) { exportBtn.textContent = '\u2717 Failed'; }
      finally { setTimeout(function() { exportBtn.textContent = 'Export Data'; exportBtn.disabled = false; }, 2000); }
    });
  }
}

async function loadHistoryData() {
  try {
    var period = document.getElementById('historyPeriod').value;
    if (typeof DatabaseQueryHelper !== 'undefined') {
      var summary = await DatabaseQueryHelper.getBrowsingSummary(period);
      document.getElementById('historyTotalTabs').textContent = summary.totalTabs || 0;
      document.getElementById('historyUniqueDomains').textContent = summary.uniqueDomains || 0;
      document.getElementById('historyTotalTime').textContent = summary.totalActiveTimeFormatted || '0s';
      document.getElementById('historyTotalVisits').textContent = summary.totalVisits || 0;
      var topDomains = await DatabaseQueryHelper.getMostVisitedDomains(5, period);
      displayTopDomains(topDomains);
      displayRecentTabs(summary.tabs || []);
    } else displayHistoryPlaceholder();
    if (backendOnline && typeof backendAPI !== 'undefined') loadProductivityTimeline();
  } catch (e) {
    console.error('Error loading history:', e);
    displayHistoryError(e.message);
  }
}

async function loadProductivityTimeline() {
  try {
    var scores = await backendAPI.getProductivityScores();
    if (!scores || scores.length === 0) return;
    var ctx = document.getElementById('productivityTimeline');
    if (!ctx) return;
    if (productivityTimelineChart) productivityTimelineChart.destroy();
    productivityTimelineChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: { labels: scores.map(s => s.date), datasets: [{ label: 'Productivity Score', data: scores.map(s => s.score), borderColor: '#188038', backgroundColor: 'rgba(24,128,56,0.1)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#188038' }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } }, x: { ticks: { font: { size: 10 } } } } }
    });
  } catch (e) { console.log('Productivity timeline not available:', e.message); }
}

function displayTopDomains(domains) {
  var container = document.getElementById('topDomainsList');
  if (!domains || !domains.length) { container.innerHTML = '<div class="empty-history"><div class="empty-history-text">No browsing data yet.</div></div>'; return; }
  var html = '';
  domains.forEach(function(d, i) {
    var time = typeof DatabaseQueryHelper !== 'undefined' ? DatabaseQueryHelper.formatTime(d.totalActiveTime) : formatTime(d.totalActiveTime);
    html += '<div class="domain-item"><span class="domain-name">' + (i + 1) + '. ' + d.domain + '</span><div class="domain-stats"><span>' + d.visitCount + ' visits</span><span>' + time + '</span></div></div>';
  });
  container.innerHTML = html;
}

function displayRecentTabs(tabs) {
  var container = document.getElementById('recentTabsList');
  if (!tabs || !tabs.length) { container.innerHTML = '<div class="empty-history"><div class="empty-history-text">No recent tabs.</div></div>'; return; }
  var html = '';
  tabs.slice(0, 10).forEach(function(tab) {
    var date = new Date(tab.timestamp).toLocaleString();
    var time = typeof DatabaseQueryHelper !== 'undefined' ? DatabaseQueryHelper.formatTime(tab.activeTime || 0) : formatTime(tab.activeTime || 0);
    html += '<div class="tab-item"><div class="tab-item-title">' + (tab.title || tab.domain) + '</div><div class="tab-item-url">' + tab.url + '</div><div class="tab-item-meta"><span>' + date + '</span><span>' + time + '</span></div></div>';
  });
  container.innerHTML = html;
}

function displayHistoryPlaceholder() {
  ['historyTotalTabs', 'historyUniqueDomains', 'historyTotalTime', 'historyTotalVisits'].forEach(id => document.getElementById(id).textContent = '-');
  document.getElementById('topDomainsList').innerHTML = '<div class="empty-history"><div class="empty-history-icon">\uD83D\uDCCA</div><div class="empty-history-text">Database initializing... Reload extension.</div></div>';
  document.getElementById('recentTabsList').innerHTML = '<div class="empty-history"><div class="empty-history-icon">\uD83D\uDCDD</div><div class="empty-history-text">Recent tabs will appear soon.</div></div>';
}

function displayHistoryError(msg) {
  var html = '<div class="empty-history"><div class="empty-history-icon">\u26A0\uFE0F</div><div class="empty-history-text">Error: ' + msg + '</div></div>';
  document.getElementById('topDomainsList').innerHTML = html;
  document.getElementById('recentTabsList').innerHTML = html;
}

// ==================== UTILITIES ====================
function formatTime(ms) {
  var minutes = Math.floor(ms / 60000);
  var hours = Math.floor(minutes / 60);
  return hours > 0 ? hours + 'h ' + (minutes % 60) + 'm' : minutes + 'm';
}

function generateColors(count) {
  var palette = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FA7B17', '#F439A0', '#A142F4', '#24C1E0'];
  var colors = [];
  for (var i = 0; i < count; i++) colors.push(palette[i % palette.length]);
  return colors;
}

function closeTab(tabId) {
  chrome.tabs.remove(parseInt(tabId));
  chrome.storage.local.get(['tabData'], function(result) {
    var tabData = result.tabData;
    delete tabData[tabId];
    chrome.storage.local.set({ tabData: tabData });
    displayInactiveTabs(tabData);
  });
}

function closeTabsByDomain(domain) {
  chrome.runtime.sendMessage({ action: 'closeTabs', domain: domain }, function(response) {
    if (response && response.success) {
      chrome.storage.local.get(['tabData', 'tabGroups'], function(result) { displayTabGroups(result.tabGroups); });
    }
  });
}

function calculateHourlyActivity(tabData) {
  var hourly = new Array(24).fill(0);
  Object.values(tabData).forEach(function(tab) {
    var hour = new Date(tab.lastActiveTime).getHours();
    hourly[hour] += tab.totalActiveTime / 60000;
  });
  return hourly;
}

async function calculateProductivityRatio(tabData) {
  var productive = 0, social = 0, other = 0;
  var result = await chrome.storage.local.get(['settings']);
  var stgs = result.settings;
  if (!stgs) return [0, 0, 0];
  Object.values(tabData).forEach(function(tab) {
    if (stgs.productiveSites.includes(tab.domain)) productive += tab.totalActiveTime;
    else if (stgs.socialSites.includes(tab.domain)) social += tab.totalActiveTime;
    else other += tab.totalActiveTime;
  });
  return [productive / 60000, social / 60000, other / 60000];
}

function generateTabTimeline(tabData) {
  var sorted = Object.entries(tabData).sort(function(a, b) { return b[1].startTime - a[1].startTime; });
  if (!sorted.length) return '<p class="empty-state">No tab history available</p>';
  var html = '';
  sorted.forEach(function(entry) {
    var data = entry[1];
    var time = new Date(data.startTime).toLocaleTimeString();
    html += '<div class="timeline-item"><span class="time">' + time + '</span><span class="domain">' + data.domain + '</span><span class="duration">' + formatTime(data.totalActiveTime) + '</span></div>';
  });
  return html;
}

async function initializeSettings() {
  var result = await chrome.storage.local.get(['settings']);
  var stgs = result.settings;
  if (!stgs) return;
  displayTimeLimits(stgs.siteLimits);
  displaySiteList(stgs.productiveSites, 'productiveSitesList');
  displaySiteList(stgs.socialSites, 'socialSitesList');
}

function displayTimeLimits(limits) {
  var container = document.getElementById('currentLimits');
  container.innerHTML = '';
  Object.keys(limits).forEach(function(domain) {
    var minutes = limits[domain];
    var item = document.createElement('div');
    item.className = 'limit-item';
    item.innerHTML = '<span>' + domain + ': ' + minutes + ' minutes</span><button class="remove-button">Remove</button>';
    item.querySelector('button').addEventListener('click', async function() {
      var result = await chrome.storage.local.get(['settings']);
      delete result.settings.siteLimits[domain];
      await chrome.storage.local.set({ settings: result.settings });
      displayTimeLimits(result.settings.siteLimits);
    });
    container.appendChild(item);
  });
}

function displaySiteList(sites, containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '';
  sites.forEach(function(domain) {
    var item = document.createElement('div');
    item.className = 'site-list-item';
    item.innerHTML = '<span>' + domain + '</span><button class="remove-button">Remove</button>';
    item.querySelector('button').addEventListener('click', async function() {
      var result = await chrome.storage.local.get(['settings']);
      var cat = containerId === 'productiveSitesList' ? 'productiveSites' : 'socialSites';
      result.settings[cat] = result.settings[cat].filter(function(s) { return s !== domain; });
      await chrome.storage.local.set({ settings: result.settings });
      displaySiteList(result.settings[cat], containerId);
    });
    container.appendChild(item);
  });
}

// ==================== TOAST ====================
function showToast(message, type) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.classList.add('show'); });
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}
