/**
 * SupriAI Backend API Service
 * Connects Chrome Extension to Flask Backend + ML Engine
 */
class BackendAPI {
  constructor() {
    this.baseURL = 'http://127.0.0.1:5000/api';
    this.connected = false;
  }

  /**
   * Check if backend is running
   */
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

  /**
   * Sync current browsing data to backend
   */
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

  /**
   * Import Chrome history to backend
   */
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

  /**
   * Classify a domain
   */
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

  /**
   * Classify multiple domains
   */
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

  /**
   * Get comprehensive ML insights
   */
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

  /**
   * Get focus recommendation
   */
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

  /**
   * Get productivity prediction
   */
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

  /**
   * Detect anomalies
   */
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

  /**
   * Get forecast
   */
  async getForecast(days = 7) {
    try {
      const response = await fetch(`${this.baseURL}/ml/forecast?days=${days}`);
      return await response.json();
    } catch (e) {
      return { error: 'Backend not available' };
    }
  }

  /**
   * Get optimal schedule
   */
  async getOptimalSchedule() {
    try {
      const response = await fetch(`${this.baseURL}/ml/schedule`);
      return await response.json();
    } catch (e) {
      return this._defaultSchedule();
    }
  }

  /**
   * Get domain stats from backend
   */
  async getDomainStats(period = 'week') {
    try {
      const response = await fetch(`${this.baseURL}/stats/domains?period=${period}`);
      return await response.json();
    } catch (e) {
      return { stats: [] };
    }
  }

  /**
   * Get category breakdown
   */
  async getCategoryStats(period = 'week') {
    try {
      const response = await fetch(`${this.baseURL}/stats/categories?period=${period}`);
      return await response.json();
    } catch (e) {
      return { categories: [] };
    }
  }

  /**
   * Get productivity scores over time
   */
  async getProductivityScores(period = 'month') {
    try {
      const response = await fetch(`${this.baseURL}/productivity/scores?period=${period}`);
      return await response.json();
    } catch (e) {
      return { scores: [] };
    }
  }

  /**
   * Get browsing summary
   */
  async getBrowsingSummary(period = 'week') {
    try {
      const response = await fetch(`${this.baseURL}/stats/summary?period=${period}`);
      return await response.json();
    } catch (e) {
      return { totalTabs: 0, uniqueDomains: 0, totalActiveTime: 0, totalVisits: 0 };
    }
  }

  /**
   * Get ML model info
   */
  async getModelsInfo() {
    try {
      const response = await fetch(`${this.baseURL}/models`);
      return await response.json();
    } catch (e) {
      return { error: 'Backend not available' };
    }
  }

  /**
   * Train all models
   */
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

  /**
   * Save goal
   */
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

  /**
   * Get goals
   */
  async getGoals() {
    try {
      const response = await fetch(`${this.baseURL}/goals`);
      return await response.json();
    } catch (e) {
      return { goals: [] };
    }
  }

  /**
   * Export all data
   */
  async exportAllData() {
    try {
      const response = await fetch(`${this.baseURL}/export`);
      return await response.json();
    } catch (e) {
      return { error: e.message };
    }
  }

  // ==================== Offline Fallbacks ====================

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

// Create global instance
const backendAPI = new BackendAPI();
