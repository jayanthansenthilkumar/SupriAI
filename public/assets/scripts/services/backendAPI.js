// BackendAPI — Lightweight service worker edition
// Methods used by background-enhanced.js for Express backend communication

class BackendAPI {
  constructor() {
    this.baseURL = 'http://127.0.0.1:3001/api';
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

  async syncData(payload) {
    try {
      const response = await fetch(`${this.baseURL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (e) {
      console.error('[SupriAI] Sync failed:', e);
      return { error: e.message };
    }
  }

  async createSession(sessionId) {
    try {
      const response = await fetch(`${this.baseURL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      return await response.json();
    } catch (e) {
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
      console.error('[SupriAI] History import failed:', e);
      return { error: e.message };
    }
  }

  async logEvent(eventData) {
    try {
      const response = await fetch(`${this.baseURL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      return await response.json();
    } catch (e) {
      return { error: e.message };
    }
  }
}

const backendAPI = new BackendAPI();
