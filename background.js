/**
 * SupriAI Background Service Worker
 * Handles backend communication and data synchronization
 */

// ==========================================
// CONFIGURATION
// ==========================================

const SERVER_URL = "http://localhost:5000";
const SYNC_INTERVAL = 5; // minutes
const MAX_OFFLINE_LOGS = 100;


// ==========================================
// INITIALIZATION
// ==========================================

console.log("🚀 SupriAI Background Service Started");

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    console.log("SupriAI Extension Installed");
    
    // Set default storage values
    chrome.storage.local.set({
        trackingPaused: false,
        offlineLogs: [],
        todayTotalTime: 0,
        lastSyncTime: Date.now()
    });
    
    // Create sync alarm
    chrome.alarms.create("retrySync", { periodInMinutes: SYNC_INTERVAL });
    chrome.alarms.create("dailyReset", { periodInMinutes: 60 }); // Check hourly for day change
});


// ==========================================
// MESSAGE HANDLING
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle async responses
    if (message.type === "LOG_ACTIVITY") {
        handleLogActivity(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true; // Keep channel open for async response
    }
    
    if (message.type === "GET_STATUS") {
        getServerStatus()
            .then(status => sendResponse(status))
            .catch(() => sendResponse({ status: 'offline' }));
        return true;
    }
    
    if (message.type === "FORCE_SYNC") {
        syncOfflineLogs()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
});


// ==========================================
// ACTIVITY LOGGING
// ==========================================

async function handleLogActivity(data) {
    // Check if tracking is paused
    const storage = await chrome.storage.local.get(['trackingPaused']);
    if (storage.trackingPaused) {
        console.log("Tracking paused, skipping log");
        return { status: 'skipped', reason: 'tracking_paused' };
    }
    
    // Try to send to backend
    try {
        const result = await sendDataToBackend(data);
        
        // Update local storage with latest data
        await updateLocalStorage(data, result);
        
        // Notify popup to update
        try {
            chrome.runtime.sendMessage({ type: 'UPDATE_POPUP' });
        } catch (e) {
            // Popup might not be open
        }
        
        return result;
        
    } catch (error) {
        console.warn("Backend not reachable. Storing locally for retry.");
        await storeLocally(data);
        return { status: 'queued', message: 'Stored for offline sync' };
    }
}

async function sendDataToBackend(data) {
    const response = await fetch(`${SERVER_URL}/log_activity`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("✅ Data logged successfully:", result);
    
    // Store recommendation if provided
    if (result.recommendation) {
        chrome.storage.local.set({ latestRecommendation: result.recommendation });
    }
    
    return result;
}


// ==========================================
// LOCAL STORAGE MANAGEMENT
// ==========================================

async function updateLocalStorage(data, result) {
    const storage = await chrome.storage.local.get(['todayTotalTime', 'lastActivityDate']);
    
    // Check if it's a new day
    const today = new Date().toDateString();
    const lastDate = storage.lastActivityDate;
    
    let todayTotal = storage.todayTotalTime || 0;
    
    if (lastDate !== today) {
        // New day, reset counter
        todayTotal = 0;
    }
    
    // Add current session duration (in minutes)
    todayTotal += (data.duration || 0) / 60;
    
    await chrome.storage.local.set({
        lastSessionTime: data.duration || 0,
        lastSessionUrl: data.url || '',
        lastTopic: result.topic || 'General',
        todayTotalTime: todayTotal,
        lastActivityDate: today,
        lastSyncTime: Date.now()
    });
}

async function storeLocally(data) {
    const storage = await chrome.storage.local.get(['offlineLogs']);
    let logs = storage.offlineLogs || [];
    
    // Add timestamp for ordering
    data.queuedAt = Date.now();
    logs.push(data);
    
    // Limit queue size to prevent storage overflow
    if (logs.length > MAX_OFFLINE_LOGS) {
        logs = logs.slice(-MAX_OFFLINE_LOGS);
    }
    
    await chrome.storage.local.set({ offlineLogs: logs });
    console.log(`📦 Stored locally. Queue size: ${logs.length}`);
}


// ==========================================
// SYNC OPERATIONS
// ==========================================

async function syncOfflineLogs() {
    const storage = await chrome.storage.local.get(['offlineLogs']);
    const logs = storage.offlineLogs || [];
    
    if (logs.length === 0) {
        console.log("No offline logs to sync");
        return { status: 'success', synced: 0 };
    }
    
    console.log(`🔄 Syncing ${logs.length} offline logs...`);
    
    try {
        // Try bulk sync first
        const response = await fetch(`${SERVER_URL}/bulk_log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logs),
            signal: AbortSignal.timeout(30000) // 30 second timeout for bulk
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Synced ${result.synced_count || logs.length} offline logs`);
            
            // Clear the queue
            await chrome.storage.local.set({ 
                offlineLogs: [],
                lastSyncTime: Date.now()
            });
            
            return { status: 'success', synced: result.synced_count || logs.length };
        } else {
            throw new Error(`Bulk sync failed: ${response.status}`);
        }
        
    } catch (e) {
        console.warn("Bulk sync failed, trying individual sync...");
        return await syncLogsIndividually(logs);
    }
}

async function syncLogsIndividually(logs) {
    let syncedCount = 0;
    let failedLogs = [];
    
    for (const log of logs) {
        try {
            await sendDataToBackend(log);
            syncedCount++;
        } catch (e) {
            failedLogs.push(log);
        }
    }
    
    // Keep failed logs for next retry
    await chrome.storage.local.set({ 
        offlineLogs: failedLogs,
        lastSyncTime: Date.now()
    });
    
    console.log(`✅ Synced ${syncedCount}/${logs.length} logs individually`);
    return { status: 'partial', synced: syncedCount, failed: failedLogs.length };
}


// ==========================================
// ALARM HANDLERS
// ==========================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "retrySync") {
        console.log("⏰ Retry sync alarm triggered");
        await syncOfflineLogs();
    }
    
    if (alarm.name === "dailyReset") {
        // Check for day change and reset daily stats
        const storage = await chrome.storage.local.get(['lastActivityDate']);
        const today = new Date().toDateString();
        
        if (storage.lastActivityDate !== today) {
            console.log("📅 New day detected, resetting daily stats");
            await chrome.storage.local.set({
                todayTotalTime: 0,
                lastActivityDate: today
            });
        }
    }
});


// ==========================================
// SERVER STATUS
// ==========================================

async function getServerStatus() {
    try {
        const response = await fetch(`${SERVER_URL}/health`, {
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            const data = await response.json();
            return { status: 'online', ...data };
        }
        return { status: 'error' };
    } catch (e) {
        return { status: 'offline' };
    }
}


// ==========================================
// TAB TRACKING (Optional Enhancement)
// ==========================================

// Track active tab changes for better session tracking
chrome.tabs.onActivated?.addListener(async (activeInfo) => {
    const storage = await chrome.storage.local.get(['trackingPaused']);
    if (storage.trackingPaused) return;
    
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            chrome.storage.local.set({
                currentTabUrl: tab.url,
                currentTabTitle: tab.title,
                tabActivatedAt: Date.now()
            });
        }
    } catch (e) {
        // Tab might not exist anymore
    }
});

// Track URL changes within same tab
chrome.tabs.onUpdated?.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    
    const storage = await chrome.storage.local.get(['trackingPaused']);
    if (storage.trackingPaused) return;
    
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        chrome.storage.local.set({
            currentTabUrl: tab.url,
            currentTabTitle: tab.title,
            tabActivatedAt: Date.now()
        });
    }
});


// ==========================================
// WEB NAVIGATION (For better tracking)
// ==========================================

chrome.webNavigation?.onCompleted?.addListener(async (details) => {
    // Only track main frame navigation
    if (details.frameId !== 0) return;
    
    const storage = await chrome.storage.local.get(['trackingPaused']);
    if (storage.trackingPaused) return;
    
    // Skip extension and chrome pages
    if (details.url.startsWith('chrome://') || details.url.startsWith('chrome-extension://')) {
        return;
    }
    
    console.log(`📍 Navigation completed: ${details.url}`);
});


// ==========================================
// CONTEXT MENU (Optional: Quick Bookmark)
// ==========================================

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus?.create({
        id: "supriBookmark",
        title: "Save to SupriAI Library",
        contexts: ["page", "link"]
    });
});

chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
    if (info.menuItemId === "supriBookmark") {
        const url = info.linkUrl || info.pageUrl || tab.url;
        const title = tab.title || 'Untitled';
        
        try {
            const response = await fetch(`${SERVER_URL}/api/bookmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    title: title,
                    resource_type: 'article'
                })
            });
            
            if (response.ok) {
                // Show notification
                chrome.notifications?.create({
                    type: 'basic',
                    iconUrl: 'libs/icon48.png',
                    title: 'SupriAI',
                    message: 'Page saved to your library!'
                });
            }
        } catch (e) {
            console.error("Failed to save bookmark:", e);
        }
    }
});


// ==========================================
// UTILITY: Export for testing
// ==========================================

// These functions are available for content scripts to call via messaging
const exportedFunctions = {
    syncOfflineLogs,
    getServerStatus,
    handleLogActivity
};
