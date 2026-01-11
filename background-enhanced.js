/**
 * SupriAI Background Service Worker - Enhanced with Offline Support
 * Handles backend communication, offline storage, and seamless synchronization
 */

// Import offline modules
importScripts('offline-manager.js', 'offline-analytics.js', 'offline-ai.js');

// ==========================================
// CONFIGURATION
// ==========================================

const SERVER_URL = "http://localhost:5000";
const SYNC_INTERVAL = 5; // minutes
const HISTORY_SYNC_INTERVAL = 30; // minutes
const HISTORY_DAYS_TO_FETCH = 7; // days

// Initialize offline managers
let offlineManager;
let offlineAnalytics;
let offlineAI;
let isOnline = navigator.onLine || true;

// ==========================================
// INITIALIZATION
// ==========================================

console.log("🚀 SupriAI Background Service Started (Offline-Capable)");

// Initialize when the service worker starts
initializeOfflineSystem();

async function initializeOfflineSystem() {
    try {
        // Initialize offline manager
        offlineManager = new OfflineManager();
        await offlineManager.initDB();
        
        // Initialize analytics engine
        offlineAnalytics = new OfflineAnalytics(offlineManager);
        
        // Initialize AI engine
        offlineAI = new OfflineAI(offlineManager, offlineAnalytics);
        
        console.log("✅ Offline system initialized");
        
        // Try initial sync if online
        if (isOnline) {
            setTimeout(() => offlineManager.syncAll(), 3000);
        }
    } catch (error) {
        console.error("Failed to initialize offline system:", error);
    }
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    console.log("SupriAI Extension Installed");
    
    // Set default storage values
    chrome.storage.local.set({
        trackingPaused: false,
        todayTotalTime: 0,
        lastSyncTime: Date.now(),
        lastHistorySync: 0,
        historyCollectionEnabled: true,
        offlineModeEnabled: true
    });
    
    // Create sync alarms
    chrome.alarms.create("retrySync", { periodInMinutes: SYNC_INTERVAL });
    chrome.alarms.create("dailyReset", { periodInMinutes: 60 });
    chrome.alarms.create("historySync", { periodInMinutes: HISTORY_SYNC_INTERVAL });
    chrome.alarms.create("cacheCleanup", { periodInMinutes: 60 });
    
    // Initial history collection
    setTimeout(() => collectAndSendBrowsingHistory(), 5000);
});


// ==========================================
// MESSAGE HANDLING
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Activity Logging
    if (message.type === "LOG_ACTIVITY") {
        handleLogActivity(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Server Status
    if (message.type === "GET_STATUS") {
        getServerStatus()
            .then(status => sendResponse(status))
            .catch(() => sendResponse({ status: 'offline', mode: 'offline' }));
        return true;
    }
    
    // Force Sync
    if (message.type === "FORCE_SYNC") {
        offlineManager.syncAll()
            .then(() => sendResponse({ status: 'success' }))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Get Offline Stats
    if (message.type === "GET_OFFLINE_STATS") {
        offlineManager.getOfflineStats()
            .then(stats => sendResponse(stats))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Chrome History Collection
    if (message.type === "COLLECT_HISTORY") {
        collectAndSendBrowsingHistory()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // AI Chat Message (Offline-capable)
    if (message.type === "CHAT_MESSAGE") {
        handleChatMessage(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Get Recommendations (Offline-capable)
    if (message.type === "GET_RECOMMENDATIONS") {
        getRecommendations()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Get Analytics (Offline-capable)
    if (message.type === "GET_ANALYTICS") {
        getAnalytics(message.days)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Get Today Stats
    if (message.type === "GET_TODAY_STATS") {
        offlineAnalytics.getTodayStats()
            .then(stats => sendResponse({ status: 'success', data: stats }))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Get Weekly Stats
    if (message.type === "GET_WEEKLY_STATS") {
        offlineAnalytics.getWeeklyStats()
            .then(stats => sendResponse({ status: 'success', data: stats }))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
    
    // Generate Resume
    if (message.type === "GENERATE_RESUME") {
        generateResume()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }
});


// ==========================================
// ACTIVITY LOGGING (Offline-Capable)
// ==========================================

async function handleLogActivity(data) {
    // Check if tracking is paused
    const storage = await chrome.storage.local.get(['trackingPaused']);
    if (storage.trackingPaused) {
        console.log("Tracking paused, skipping log");
        return { status: 'skipped', reason: 'tracking_paused' };
    }
    
    // Store locally using offline manager
    const result = await offlineManager.logActivity(data);
    
    // Update local storage for quick access
    await updateLocalStorage(data);
    
    // Try to sync if online
    if (isOnline) {
        try {
            const serverResult = await sendDataToBackend(data);
            return { ...result, serverResponse: serverResult };
        } catch (error) {
            console.log("Server not available, using offline mode");
        }
    }
    
    return result;
}

async function sendDataToBackend(data) {
    const response = await fetch(`${SERVER_URL}/log_activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("✅ Data logged to server:", result);
    
    return result;
}


// ==========================================
// LOCAL STORAGE MANAGEMENT
// ==========================================

async function updateLocalStorage(data) {
    const storage = await chrome.storage.local.get(['todayTotalTime', 'lastActivityDate']);
    
    const today = new Date().toDateString();
    const lastDate = storage.lastActivityDate;
    
    let todayTotal = storage.todayTotalTime || 0;
    
    if (lastDate !== today) {
        todayTotal = 0;
    }
    
    todayTotal += (data.duration || 0) / 60;
    
    await chrome.storage.local.set({
        lastSessionTime: data.duration || 0,
        lastSessionUrl: data.url || '',
        lastTopic: data.category || 'General',
        todayTotalTime: todayTotal,
        lastActivityDate: today,
        lastUpdateTime: Date.now()
    });
}


// ==========================================
// ALARM HANDLERS
// ==========================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "retrySync") {
        console.log("⏰ Sync alarm triggered");
        if (offlineManager && isOnline) {
            await offlineManager.syncAll();
        }
    }
    
    if (alarm.name === "dailyReset") {
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
    
    if (alarm.name === "historySync") {
        console.log("⏰ History sync alarm triggered");
        await collectAndSendBrowsingHistory();
    }
    
    if (alarm.name === "cacheCleanup") {
        if (offlineManager) {
            await offlineManager.clearExpiredCache();
        }
    }
});


// ==========================================
// CHROME HISTORY COLLECTION
// ==========================================

async function collectAndSendBrowsingHistory() {
    const storage = await chrome.storage.local.get(['historyCollectionEnabled', 'lastHistorySync']);
    
    if (!storage.historyCollectionEnabled) {
        console.log("History collection disabled");
        return { status: 'disabled' };
    }
    
    console.log("🔍 Collecting Chrome browsing history...");
    
    const endTime = Date.now();
    const startTime = storage.lastHistorySync || (endTime - (HISTORY_DAYS_TO_FETCH * 24 * 60 * 60 * 1000));
    
    try {
        const historyItems = await chrome.history.search({
            text: '',
            startTime: startTime,
            endTime: endTime,
            maxResults: 500
        });
        
        if (historyItems.length === 0) {
            console.log("No new history items found");
            return { status: 'success', count: 0 };
        }
        
        const processedHistory = historyItems
            .filter(item => {
                return !item.url.startsWith('chrome://') && 
                       !item.url.startsWith('chrome-extension://') &&
                       !item.url.startsWith('about:');
            })
            .map(item => ({
                url: item.url,
                title: item.title || 'Untitled',
                visitCount: item.visitCount || 1,
                lastVisitTime: item.lastVisitTime,
                domain: extractDomain(item.url)
            }));
        
        // Store locally
        for (const item of processedHistory) {
            await offlineManager.saveBrowsingHistory(item);
        }
        
        // Try to send to server if online
        if (isOnline) {
            try {
                const response = await fetch(`${SERVER_URL}/api/history/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        history: processedHistory,
                        startTime: startTime,
                        endTime: endTime
                    }),
                    signal: AbortSignal.timeout(30000)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log("✅ History analyzed successfully");
                    
                    await chrome.storage.local.set({ 
                        lastHistorySync: endTime,
                        historyAnalysis: result 
                    });
                    
                    return { status: 'success', count: processedHistory.length, analysis: result };
                }
            } catch (error) {
                console.log("Server analysis failed, stored locally");
            }
        }
        
        await chrome.storage.local.set({ lastHistorySync: endTime });
        return { status: 'offline', count: processedHistory.length, message: 'Stored locally' };
        
    } catch (error) {
        console.error("History collection failed:", error);
        return { status: 'error', message: error.message };
    }
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        return 'unknown';
    }
}


// ==========================================
// AI CHAT (Offline-Capable)
// ==========================================

async function handleChatMessage(data) {
    console.log("💬 Processing chat message...");
    
    // Try online first
    if (isOnline) {
        try {
            const response = await fetch(`${SERVER_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: data.message,
                    context: data.context || {}
                }),
                signal: AbortSignal.timeout(15000)
            });
            
            if (response.ok) {
                const result = await response.json();
                await offlineManager.saveChatMessage('user', data.message);
                await offlineManager.saveChatMessage('assistant', result.response);
                return { status: 'success', response: result.response, mode: 'online' };
            }
        } catch (error) {
            console.log("Online chat failed, using offline AI");
        }
    }
    
    // Use offline AI
    try {
        const response = await offlineAI.processMessage(data.message);
        return { 
            status: 'success', 
            response: response, 
            mode: 'offline',
            message: '🔸 Offline Mode: Using local AI'
        };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}


// ==========================================
// RECOMMENDATIONS (Offline-Capable)
// ==========================================

async function getRecommendations() {
    // Try online first
    if (isOnline) {
        try {
            const response = await fetch(`${SERVER_URL}/api/recommendations`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                const result = await response.json();
                await offlineManager.cacheData('recommendations', result, 3600000); // 1 hour cache
                return { ...result, mode: 'online' };
            }
        } catch (error) {
            console.log("Online recommendations failed, using offline");
        }
    }
    
    // Check cache first
    const cached = await offlineManager.getCachedData('recommendations');
    if (cached) {
        return { ...cached, mode: 'cached' };
    }
    
    // Generate offline recommendations
    const recommendations = await offlineAnalytics.generateOfflineRecommendations();
    return { 
        status: 'success', 
        recommendations: recommendations,
        mode: 'offline'
    };
}


// ==========================================
// ANALYTICS (Offline-Capable)
// ==========================================

async function getAnalytics(days = 7) {
    // Try online first
    if (isOnline) {
        try {
            const response = await fetch(`${SERVER_URL}/api/analytics?days=${days}`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                const result = await response.json();
                await offlineManager.cacheData(`analytics_${days}`, result, 600000); // 10 min cache
                return { ...result, mode: 'online' };
            }
        } catch (error) {
            console.log("Online analytics failed, using offline");
        }
    }
    
    // Check cache
    const cached = await offlineManager.getCachedData(`analytics_${days}`);
    if (cached) {
        return { ...cached, mode: 'cached' };
    }
    
    // Generate from local data
    const localStats = await offlineManager.calculateLocalStats(days);
    return { 
        status: 'success',
        data: localStats,
        mode: 'offline'
    };
}


// ==========================================
// RESUME BUILDER
// ==========================================

async function generateResume() {
    console.log("📄 Generating resume...");
    
    try {
        const response = await fetch(`${SERVER_URL}/api/resume/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
            const result = await response.json();
            await chrome.storage.local.set({
                generatedResume: result.resume,
                resumeGeneratedAt: Date.now()
            });
            return result;
        } else {
            throw new Error(`Resume API error: ${response.status}`);
        }
    } catch (error) {
        console.error("Resume generation failed:", error);
        return { status: 'error', message: error.message };
    }
}


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
            isOnline = true;
            return { status: 'online', mode: 'online', ...data };
        }
        isOnline = false;
        return { status: 'offline', mode: 'offline' };
    } catch (e) {
        isOnline = false;
        return { status: 'offline', mode: 'offline' };
    }
}


// ==========================================
// ONLINE/OFFLINE EVENT LISTENERS
// ==========================================

self.addEventListener('online', () => {
    console.log('🌐 Connection restored');
    isOnline = true;
    if (offlineManager) {
        offlineManager.isOnline = true;
        offlineManager.onConnectionRestored();
    }
});

self.addEventListener('offline', () => {
    console.log('📴 Connection lost');
    isOnline = false;
    if (offlineManager) {
        offlineManager.isOnline = false;
        offlineManager.onConnectionLost();
    }
});


// ==========================================
// TAB TRACKING
// ==========================================

chrome.tabs?.onActivated?.addListener(async (activeInfo) => {
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
        // Tab might not exist
    }
});


// ==========================================
// CONTEXT MENU
// ==========================================

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
                chrome.notifications?.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'SupriAI',
                    message: 'Page saved to your library!'
                });
            }
        } catch (e) {
            console.error("Failed to save bookmark:", e);
        }
    }
});

console.log("✅ SupriAI Background Service Ready (Offline-Capable Mode)");
