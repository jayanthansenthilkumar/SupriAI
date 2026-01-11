/**
 * SupriAI Offline Manager
 * Comprehensive offline storage and synchronization system
 * Handles dual-mode operation (online/offline) with seamless data sync
 */

// ==========================================
// CONFIGURATION
// ==========================================

const DB_NAME = 'SupriAI_OfflineDB';
const DB_VERSION = 1;
const STORES = {
    ACTIVITY_LOGS: 'activity_logs',
    ANALYTICS: 'analytics',
    BROWSING_HISTORY: 'browsing_history',
    CHAT_MESSAGES: 'chat_messages',
    GOALS: 'goals',
    STUDY_SESSIONS: 'study_sessions',
    RECOMMENDATIONS: 'recommendations',
    CACHE: 'cache',
    SYNC_QUEUE: 'sync_queue'
};

class OfflineManager {
    constructor() {
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.initDB();
        this.setupEventListeners();
    }

    // ==========================================
    // DATABASE INITIALIZATION
    // ==========================================

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ OfflineDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Activity Logs Store
                if (!db.objectStoreNames.contains(STORES.ACTIVITY_LOGS)) {
                    const store = db.createObjectStore(STORES.ACTIVITY_LOGS, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                }

                // Analytics Store
                if (!db.objectStoreNames.contains(STORES.ANALYTICS)) {
                    const store = db.createObjectStore(STORES.ANALYTICS, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }

                // Browsing History Store
                if (!db.objectStoreNames.contains(STORES.BROWSING_HISTORY)) {
                    const store = db.createObjectStore(STORES.BROWSING_HISTORY, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                }

                // Chat Messages Store
                if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
                    const store = db.createObjectStore(STORES.CHAT_MESSAGES, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('role', 'role', { unique: false });
                }

                // Goals Store
                if (!db.objectStoreNames.contains(STORES.GOALS)) {
                    const store = db.createObjectStore(STORES.GOALS, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('status', 'status', { unique: false });
                }

                // Study Sessions Store
                if (!db.objectStoreNames.contains(STORES.STUDY_SESSIONS)) {
                    const store = db.createObjectStore(STORES.STUDY_SESSIONS, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                }

                // Recommendations Store
                if (!db.objectStoreNames.contains(STORES.RECOMMENDATIONS)) {
                    const store = db.createObjectStore(STORES.RECOMMENDATIONS, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Cache Store (for API responses)
                if (!db.objectStoreNames.contains(STORES.CACHE)) {
                    const store = db.createObjectStore(STORES.CACHE, { 
                        keyPath: 'key' 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Sync Queue Store
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const store = db.createObjectStore(STORES.SYNC_QUEUE, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('priority', 'priority', { unique: false });
                }

                console.log('📦 IndexedDB stores created');
            };
        });
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners() {
        // Online/Offline detection
        window.addEventListener('online', () => {
            console.log('🌐 Connection restored');
            this.isOnline = true;
            this.onConnectionRestored();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Connection lost');
            this.isOnline = false;
            this.onConnectionLost();
        });
    }

    async onConnectionRestored() {
        // Trigger sync when connection is restored
        await this.syncAll();
        
        // Notify user
        if (typeof showToast === 'function') {
            showToast('Connected! Syncing data...', 'success');
        }
    }

    onConnectionLost() {
        // Notify user
        if (typeof showToast === 'function') {
            showToast('Offline mode activated', 'info');
        }
    }

    // ==========================================
    // GENERIC DATABASE OPERATIONS
    // ==========================================

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName) {
                const index = store.index(indexName);
                request = query ? index.getAll(query) : index.getAll();
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ==========================================
    // ACTIVITY LOGGING
    // ==========================================

    async logActivity(activityData) {
        const logEntry = {
            ...activityData,
            timestamp: Date.now(),
            synced: false,
            offline: !this.isOnline
        };

        // Store locally
        const id = await this.add(STORES.ACTIVITY_LOGS, logEntry);
        
        // If online, add to sync queue
        if (this.isOnline) {
            await this.addToSyncQueue({
                type: 'activity_log',
                data: { ...logEntry, id },
                endpoint: '/log_activity',
                priority: 1
            });
            
            // Trigger sync
            this.syncQueue();
        }

        return { id, status: this.isOnline ? 'queued' : 'offline' };
    }

    // ==========================================
    // BROWSING HISTORY
    // ==========================================

    async saveBrowsingHistory(historyData) {
        const entry = {
            ...historyData,
            timestamp: Date.now(),
            synced: false
        };

        const id = await this.add(STORES.BROWSING_HISTORY, entry);
        
        if (this.isOnline) {
            await this.addToSyncQueue({
                type: 'browsing_history',
                data: { ...entry, id },
                endpoint: '/save_history',
                priority: 2
            });
        }

        return { id, status: 'saved' };
    }

    // ==========================================
    // CHAT MESSAGES
    // ==========================================

    async saveChatMessage(role, message) {
        const chatEntry = {
            role,
            message,
            timestamp: Date.now()
        };

        return await this.add(STORES.CHAT_MESSAGES, chatEntry);
    }

    async getChatHistory(limit = 50) {
        const allMessages = await this.getAll(STORES.CHAT_MESSAGES);
        return allMessages.slice(-limit);
    }

    // ==========================================
    // ANALYTICS
    // ==========================================

    async saveAnalytics(analyticsData) {
        const entry = {
            ...analyticsData,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
        };

        return await this.add(STORES.ANALYTICS, entry);
    }

    async getAnalytics(days = 7) {
        const allAnalytics = await this.getAll(STORES.ANALYTICS);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return allAnalytics.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= cutoffDate;
        });
    }

    // ==========================================
    // GOALS MANAGEMENT
    // ==========================================

    async saveGoal(goalData) {
        return await this.add(STORES.GOALS, goalData);
    }

    async updateGoal(goalData) {
        return await this.update(STORES.GOALS, goalData);
    }

    async getGoals() {
        return await this.getAll(STORES.GOALS);
    }

    // ==========================================
    // CACHE MANAGEMENT
    // ==========================================

    async cacheData(key, data, ttl = 3600000) { // Default 1 hour TTL
        const cacheEntry = {
            key,
            data,
            timestamp: Date.now(),
            expires: Date.now() + ttl
        };

        return await this.update(STORES.CACHE, cacheEntry);
    }

    async getCachedData(key) {
        const entry = await this.get(STORES.CACHE, key);
        
        if (!entry) return null;
        
        // Check if expired
        if (entry.expires < Date.now()) {
            await this.delete(STORES.CACHE, key);
            return null;
        }
        
        return entry.data;
    }

    async clearExpiredCache() {
        const allCache = await this.getAll(STORES.CACHE);
        const now = Date.now();
        
        for (const entry of allCache) {
            if (entry.expires < now) {
                await this.delete(STORES.CACHE, entry.key);
            }
        }
    }

    // ==========================================
    // SYNC QUEUE MANAGEMENT
    // ==========================================

    async addToSyncQueue(item) {
        const queueItem = {
            ...item,
            timestamp: Date.now(),
            retries: 0,
            status: 'pending'
        };

        return await this.add(STORES.SYNC_QUEUE, queueItem);
    }

    async syncQueue() {
        if (this.syncInProgress || !this.isOnline) return;
        
        this.syncInProgress = true;
        
        try {
            const queue = await this.getAll(STORES.SYNC_QUEUE, 'status', 'pending');
            console.log(`📤 Syncing ${queue.length} items...`);
            
            for (const item of queue) {
                await this.syncItem(item);
            }
            
            console.log('✅ Sync completed');
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncItem(item) {
        try {
            const API_URL = 'http://localhost:5000';
            const response = await fetch(`${API_URL}${item.endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.data),
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                // Mark as synced and remove from queue
                await this.delete(STORES.SYNC_QUEUE, item.id);
                
                // Update original record as synced
                if (item.type === 'activity_log') {
                    const log = await this.get(STORES.ACTIVITY_LOGS, item.data.id);
                    if (log) {
                        log.synced = true;
                        await this.update(STORES.ACTIVITY_LOGS, log);
                    }
                }
                
                console.log(`✓ Synced ${item.type}`);
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            console.warn(`Failed to sync item ${item.id}:`, error);
            
            // Increment retry counter
            item.retries = (item.retries || 0) + 1;
            
            if (item.retries > 5) {
                item.status = 'failed';
            }
            
            await this.update(STORES.SYNC_QUEUE, item);
        }
    }

    async syncAll() {
        await this.syncQueue();
    }

    // ==========================================
    // STATISTICS
    // ==========================================

    async getOfflineStats() {
        const unsyncedLogs = await this.getAll(STORES.ACTIVITY_LOGS, 'synced', false);
        const unsyncedHistory = await this.getAll(STORES.BROWSING_HISTORY, 'synced', false);
        const queueItems = await this.getAll(STORES.SYNC_QUEUE);
        
        return {
            unsyncedLogs: unsyncedLogs.length,
            unsyncedHistory: unsyncedHistory.length,
            queuedItems: queueItems.length,
            isOnline: this.isOnline
        };
    }

    // ==========================================
    // LOCAL ANALYTICS (OFFLINE MODE)
    // ==========================================

    async calculateLocalStats(days = 7) {
        const logs = await this.getAll(STORES.ACTIVITY_LOGS);
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const recentLogs = logs.filter(log => log.timestamp >= cutoffTime);
        
        // Calculate total time
        const totalTime = recentLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        
        // Category breakdown
        const categoryStats = {};
        recentLogs.forEach(log => {
            const cat = log.category || 'Other';
            categoryStats[cat] = (categoryStats[cat] || 0) + (log.duration || 0);
        });
        
        // Daily breakdown
        const dailyStats = {};
        recentLogs.forEach(log => {
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            dailyStats[date] = (dailyStats[date] || 0) + (log.duration || 0);
        });
        
        return {
            totalTime,
            categoryStats,
            dailyStats,
            totalLogs: recentLogs.length
        };
    }
}

// ==========================================
// EXPORT
// ==========================================

// Make it globally available
if (typeof window !== 'undefined') {
    window.OfflineManager = OfflineManager;
}

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfflineManager;
}
