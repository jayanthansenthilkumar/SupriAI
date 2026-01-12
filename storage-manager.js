/**
 * SupriAI - Storage Manager
 * Enhanced storage utilities for extension data management
 */

const StorageManager = {
    /**
     * Get item from storage with fallback
     */
    async get(key, defaultValue = null) {
        try {
            const result = await chrome.storage.local.get(key);
            return result[key] !== undefined ? result[key] : defaultValue;
        } catch (error) {
            console.error(`Storage get error for ${key}:`, error);
            return defaultValue;
        }
    },

    /**
     * Set item in storage with error handling
     */
    async set(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`Storage set error for ${key}:`, error);
            
            // If quota exceeded, try cleanup
            if (error.message.includes('QUOTA')) {
                await this.cleanup();
                try {
                    await chrome.storage.local.set({ [key]: value });
                    return true;
                } catch (e) {
                    console.error('Still unable to store after cleanup:', e);
                    return false;
                }
            }
            return false;
        }
    },

    /**
     * Remove item from storage
     */
    async remove(key) {
        try {
            await chrome.storage.local.remove(key);
            return true;
        } catch (error) {
            console.error(`Storage remove error for ${key}:`, error);
            return false;
        }
    },

    /**
     * Clear all storage
     */
    async clear() {
        try {
            await chrome.storage.local.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    /**
     * Get storage usage
     */
    async getUsage() {
        try {
            if (chrome.storage.local.getBytesInUse) {
                const bytes = await chrome.storage.local.getBytesInUse();
                return {
                    bytes: bytes,
                    kb: (bytes / 1024).toFixed(2),
                    mb: (bytes / 1024 / 1024).toFixed(2)
                };
            }
            return null;
        } catch (error) {
            console.error('Storage usage error:', error);
            return null;
        }
    },

    /**
     * Cleanup old data
     */
    async cleanup() {
        console.log('🧹 Cleaning up storage...');
        
        try {
            // Clean offline logs - keep only last 50
            const offlineLogs = await this.get('offlineLogs', []);
            if (offlineLogs.length > 50) {
                await this.set('offlineLogs', offlineLogs.slice(-50));
                console.log(`Cleaned ${offlineLogs.length - 50} old logs`);
            }

            // Clean old cache entries
            const result = await chrome.storage.local.get(null);
            const keys = Object.keys(result);
            
            for (const key of keys) {
                if (key.startsWith('cache_')) {
                    const data = result[key];
                    if (data.timestamp) {
                        const age = Date.now() - data.timestamp;
                        if (age > 24 * 60 * 60 * 1000) { // 24 hours
                            await this.remove(key);
                            console.log(`Removed old cache: ${key}`);
                        }
                    }
                }
            }

            console.log('✅ Storage cleanup complete');
            return true;
        } catch (error) {
            console.error('Storage cleanup error:', error);
            return false;
        }
    },

    /**
     * Batch get multiple keys
     */
    async getMultiple(keys) {
        try {
            return await chrome.storage.local.get(keys);
        } catch (error) {
            console.error('Storage getMultiple error:', error);
            return {};
        }
    },

    /**
     * Batch set multiple key-value pairs
     */
    async setMultiple(items) {
        try {
            await chrome.storage.local.set(items);
            return true;
        } catch (error) {
            console.error('Storage setMultiple error:', error);
            return false;
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
