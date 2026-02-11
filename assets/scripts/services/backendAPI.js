// BackendAPI — Lightweight service worker edition
// Only includes methods used by background-enhanced.js

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
}

const backendAPI = new BackendAPI();
