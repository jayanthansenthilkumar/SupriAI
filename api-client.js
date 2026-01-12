/**
 * SupriAI - API Client
 * Centralized API communication with retry logic and error handling
 */

class APIClient {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
        this.timeout = 5000;
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    /**
     * Make HTTP request with retry logic
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Don't retry on client errors
                    if (response.status >= 400 && response.status < 500) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.json();

            } catch (error) {
                console.log(`API request attempt ${attempt}/${this.maxRetries} failed:`, error.message);

                if (attempt === this.maxRetries) {
                    throw new Error(`API request failed after ${this.maxRetries} attempts: ${error.message}`);
                }

                // Exponential backoff
                await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
            }
        }
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * Check server health
     */
    async checkHealth() {
        try {
            const response = await this.get('/health');
            return response.status === 'running';
        } catch (error) {
            return false;
        }
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log activity
     */
    async logActivity(data) {
        return this.post('/log_activity', data);
    }

    /**
     * Get analytics
     */
    async getAnalytics(days = 7) {
        return this.get('/get_analytics', { days });
    }

    /**
     * Get recommendations
     */
    async getRecommendations() {
        return this.get('/api/ai/recommendations');
    }

    /**
     * Get history
     */
    async getHistory(days = 30, limit = 100) {
        return this.get('/api/history', { days, limit });
    }

    /**
     * Search history
     */
    async searchHistory(query, limit = 50) {
        return this.get('/api/history/search', { q: query, limit });
    }

    /**
     * Get goals
     */
    async getGoals() {
        return this.get('/api/goals');
    }

    /**
     * Create goal
     */
    async createGoal(goalData) {
        return this.post('/api/goals', goalData);
    }

    /**
     * Update goal
     */
    async updateGoal(goalId, data) {
        return this.put(`/api/goals/${goalId}`, data);
    }

    /**
     * Delete goal
     */
    async deleteGoal(goalId) {
        return this.delete(`/api/goals/${goalId}`);
    }

    /**
     * Get bookmarks
     */
    async getBookmarks() {
        return this.get('/api/bookmarks');
    }

    /**
     * Add bookmark
     */
    async addBookmark(bookmarkData) {
        return this.post('/api/bookmarks', bookmarkData);
    }

    /**
     * Export data
     */
    async exportData(format = 'json') {
        return this.get('/api/export', { format });
    }
}

// Create singleton instance
const apiClient = new APIClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, apiClient };
}
