/**
 * SupriAI Offline Status Component
 * Shows online/offline status and sync information
 */

class OfflineStatusUI {
    constructor() {
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        this.createStatusBadge();
        this.setupEventListeners();
        this.updateStatus();
        
        // Check status periodically
        setInterval(() => this.updateStatus(), 5000);
    }

    createStatusBadge() {
        // Add status badge to header if it doesn't exist
        const header = document.querySelector('.header');
        if (!header) return;

        const existingBadge = document.getElementById('offlineStatusBadge');
        if (existingBadge) return;

        const badge = document.createElement('div');
        badge.id = 'offlineStatusBadge';
        badge.className = 'offline-status-badge';
        badge.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot"></span>
                <span class="status-text">Checking...</span>
            </div>
            <div class="sync-info" style="display:none;">
                <span class="sync-text">Syncing...</span>
            </div>
        `;

        // Add to header-right
        const headerRight = header.querySelector('.header-right');
        if (headerRight) {
            headerRight.insertBefore(badge, headerRight.firstChild);
        }

        // Add click handler to show details
        badge.addEventListener('click', () => this.showStatusDetails());
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus();
            this.showNotification('Connected! Syncing data...', 'success');
            this.triggerSync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus();
            this.showNotification('Offline mode activated', 'info');
        });
    }

    async updateStatus() {
        const badge = document.getElementById('offlineStatusBadge');
        if (!badge) return;

        const indicator = badge.querySelector('.status-indicator');
        const dot = badge.querySelector('.status-dot');
        const text = badge.querySelector('.status-text');

        if (this.isOnline) {
            // Check if server is actually reachable
            const serverOnline = await this.checkServerStatus();
            
            if (serverOnline) {
                dot.style.backgroundColor = '#10b981'; // Green
                text.textContent = 'Online';
                text.title = 'Connected to server';
                badge.classList.remove('offline');
            } else {
                dot.style.backgroundColor = '#f59e0b'; // Orange
                text.textContent = 'Server Offline';
                text.title = 'Network available but server unreachable';
                badge.classList.add('offline');
            }
        } else {
            dot.style.backgroundColor = '#6b7280'; // Gray
            text.textContent = 'Offline';
            text.title = 'No network connection';
            badge.classList.add('offline');
        }

        // Update sync info
        await this.updateSyncInfo();
    }

    async checkServerStatus() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
                resolve(response && response.status === 'online');
            });
        });
    }

    async updateSyncInfo() {
        const badge = document.getElementById('offlineStatusBadge');
        if (!badge) return;

        const syncInfo = badge.querySelector('.sync-info');
        const syncText = badge.querySelector('.sync-text');

        try {
            const stats = await this.getOfflineStats();
            
            if (stats && (stats.unsyncedLogs > 0 || stats.queuedItems > 0)) {
                const total = stats.unsyncedLogs + stats.queuedItems;
                syncInfo.style.display = 'block';
                syncText.textContent = `${total} items to sync`;
                syncText.title = `${stats.unsyncedLogs} logs, ${stats.queuedItems} queued items`;
            } else {
                syncInfo.style.display = 'none';
            }
        } catch (e) {
            syncInfo.style.display = 'none';
        }
    }

    async getOfflineStats() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_OFFLINE_STATS' }, (response) => {
                resolve(response);
            });
        });
    }

    async triggerSync() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'FORCE_SYNC' }, (response) => {
                if (response && response.status === 'success') {
                    this.showNotification('Data synced successfully', 'success');
                }
                resolve(response);
            });
        });
    }

    async showStatusDetails() {
        const stats = await this.getOfflineStats();
        const serverOnline = await this.checkServerStatus();

        const details = `
            <div class="status-details">
                <h3>📡 Connection Status</h3>
                <p><strong>Network:</strong> ${this.isOnline ? '✅ Connected' : '❌ Disconnected'}</p>
                <p><strong>Server:</strong> ${serverOnline ? '✅ Online' : '❌ Offline'}</p>
                ${stats ? `
                    <h3>📊 Sync Status</h3>
                    <p><strong>Unsynced Logs:</strong> ${stats.unsyncedLogs || 0}</p>
                    <p><strong>Queued Items:</strong> ${stats.queuedItems || 0}</p>
                    <p><strong>Unsynced History:</strong> ${stats.unsyncedHistory || 0}</p>
                ` : ''}
                ${!serverOnline ? `
                    <p style="margin-top:10px;color:#f59e0b;">
                        ⚠️ Server is offline. All data is being stored locally and will sync when the server is back online.
                    </p>
                ` : ''}
                ${this.isOnline && serverOnline && stats && (stats.unsyncedLogs > 0 || stats.queuedItems > 0) ? `
                    <button onclick="offlineStatusUI.triggerSync()" class="sync-now-btn">
                        Sync Now
                    </button>
                ` : ''}
            </div>
        `;

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'System Status',
                html: details,
                icon: 'info',
                confirmButtonText: 'Close'
            });
        } else {
            alert(details.replace(/<[^>]*>/g, '\n'));
        }
    }

    showNotification(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Add offline indicator to data displays
    addOfflineIndicator(element, message = 'Using offline data') {
        if (!element) return;

        const existing = element.querySelector('.offline-indicator');
        if (existing) return;

        const indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
            <span style="font-size:12px;color:#6b7280;display:flex;align-items:center;gap:4px;">
                <span style="width:8px;height:8px;background:#6b7280;border-radius:50%;"></span>
                ${message}
            </span>
        `;
        
        element.insertBefore(indicator, element.firstChild);
    }

    removeOfflineIndicator(element) {
        if (!element) return;
        const indicator = element.querySelector('.offline-indicator');
        if (indicator) indicator.remove();
    }
}

// Initialize when DOM is ready
let offlineStatusUI;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        offlineStatusUI = new OfflineStatusUI();
        window.offlineStatusUI = offlineStatusUI;
    });
} else {
    offlineStatusUI = new OfflineStatusUI();
    window.offlineStatusUI = offlineStatusUI;
}

// Export for global use
if (typeof window !== 'undefined') {
    window.OfflineStatusUI = OfflineStatusUI;
}
