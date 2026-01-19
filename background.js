/**
 * SupriAI Background Service Worker
 * Handles backend communication, data synchronization, and Chrome history collection
 * Enhanced with full AI automation capabilities
 */

// ==========================================
// CONFIGURATION
// ==========================================

// Backend removed
const SYNC_INTERVAL = 5; // minutes
const MAX_OFFLINE_LOGS = 100;
const HISTORY_SYNC_INTERVAL = 30; // minutes
const HISTORY_DAYS_TO_FETCH = 7; // days
const AI_INSIGHTS_INTERVAL = 60; // minutes - auto-fetch AI insights
const AUTO_RECOMMEND_INTERVAL = 120; // minutes - auto-fetch recommendations
const WEEKLY_REPORT_DAY = 0; // Sunday


// ==========================================
// INITIALIZATION
// ==========================================

console.log("🚀 SupriAI Advanced AI Background Service Started");

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    console.log("SupriAI Extension Installed - AI Features Enabled");

    // Set default storage values
    chrome.storage.local.set({
        trackingPaused: false,
        offlineLogs: [],
        todayTotalTime: 0,
        lastSyncTime: Date.now(),
        lastHistorySync: 0,
        historyCollectionEnabled: true,
        aiAutomationEnabled: true,
        autoInsightsEnabled: true,
        autoRecommendationsEnabled: true,
        weeklyReportEnabled: true,
        smartNotificationsEnabled: true
    });

    // Create sync alarms
    chrome.alarms.create("retrySync", { periodInMinutes: SYNC_INTERVAL });
    chrome.alarms.create("dailyReset", { periodInMinutes: 60 }); // Check hourly for day change
    chrome.alarms.create("historySync", { periodInMinutes: HISTORY_SYNC_INTERVAL }); // Sync history periodically

    // AI Automation alarms
    chrome.alarms.create("aiInsights", { periodInMinutes: AI_INSIGHTS_INTERVAL }); // Auto-fetch AI insights
    chrome.alarms.create("autoRecommend", { periodInMinutes: AUTO_RECOMMEND_INTERVAL }); // Auto-fetch recommendations
    chrome.alarms.create("weeklyReport", { periodInMinutes: 60 }); // Check hourly for weekly report
    chrome.alarms.create("smartNotifications", { periodInMinutes: 30 }); // Smart reminder check

    // Initial setup - staggered for performance
    setTimeout(() => collectAndSendBrowsingHistory(), 5000);
    setTimeout(() => fetchAIDashboardSummary(), 10000);
    setTimeout(() => getAIRecommendations(), 15000);
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

    // Enhanced AI Auto-Log with Analysis
    if (message.type === "AUTO_LOG") {
        handleAutoLogWithAI(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
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

    // Chrome History Collection
    if (message.type === "COLLECT_HISTORY") {
        collectAndSendBrowsingHistory()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // AI Chat Message
    if (message.type === "CHAT_MESSAGE") {
        sendChatMessage(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Get AI Recommendations
    if (message.type === "GET_RECOMMENDATIONS") {
        getAIRecommendations()
            .then(result => sendResponse(result))
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

    // ========== NEW AI FEATURES ==========

    // AI Dashboard Summary
    if (message.type === "GET_AI_DASHBOARD") {
        fetchAIDashboardSummary()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // AI Insights
    if (message.type === "GET_AI_INSIGHTS") {
        fetchAIInsights(message.days || 30)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Learning Path Generation
    if (message.type === "GET_LEARNING_PATH") {
        fetchLearningPath(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Smart Study Schedule
    if (message.type === "GET_SMART_SCHEDULE") {
        fetchSmartSchedule(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Skill Assessment
    if (message.type === "GET_SKILL_ASSESSMENT") {
        fetchSkillAssessment()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Weekly Report
    if (message.type === "GET_WEEKLY_REPORT") {
        fetchWeeklyReport()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Content Summarization
    if (message.type === "SUMMARIZE_CONTENT") {
        summarizeContent(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Analyze Content
    if (message.type === "ANALYZE_CONTENT") {
        analyzeContent(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ status: 'error', message: error.message }));
        return true;
    }

    // Auto Recommendations
    if (message.type === "GET_AUTO_RECOMMENDATIONS") {
        fetchAutoRecommendations()
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

    // Backend removed: Log locally only
    try {
        await updateLocalStorage(data, { topic: 'General' });
        await storeLocally(data);
        
        try {
            chrome.runtime.sendMessage({ type: 'UPDATE_POPUP' });
        } catch (e) {}

        return { status: 'success', message: 'Logged locally' };

    } catch (error) {
        console.warn("Logging failed:", error);
        return { status: 'error', message: error.message };
    }
}

async function sendDataToBackend(data) {
    // Backend removed
    return { topic: 'General', recommendation: null };
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
    console.log("Sync disabled (No Backend)");
    return { status: 'success', synced: 0 };
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

    if (alarm.name === "historySync") {
        console.log("⏰ History sync alarm triggered");
        await collectAndSendBrowsingHistory();
    }

    // ========== AI AUTOMATION ALARMS ==========

    if (alarm.name === "aiInsights") {
        const storage = await chrome.storage.local.get(['autoInsightsEnabled']);
        if (storage.autoInsightsEnabled !== false) {
            console.log("🧠 Auto-fetching AI insights...");
            await fetchAIInsights(30);
        }
    }

    if (alarm.name === "autoRecommend") {
        const storage = await chrome.storage.local.get(['autoRecommendationsEnabled']);
        if (storage.autoRecommendationsEnabled !== false) {
            console.log("💡 Auto-fetching AI recommendations...");
            await fetchAutoRecommendations();
        }
    }

    if (alarm.name === "weeklyReport") {
        const storage = await chrome.storage.local.get(['weeklyReportEnabled', 'lastWeeklyReport']);
        if (storage.weeklyReportEnabled !== false) {
            const today = new Date();
            // Generate report on Sunday (day 0)
            if (today.getDay() === WEEKLY_REPORT_DAY) {
                const lastReport = storage.lastWeeklyReport || 0;
                const weekAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);

                if (lastReport < weekAgo) {
                    console.log("📊 Generating weekly report...");
                    await generateAndNotifyWeeklyReport();
                }
            }
        }
    }

    if (alarm.name === "smartNotifications") {
        const storage = await chrome.storage.local.get(['smartNotificationsEnabled']);
        if (storage.smartNotificationsEnabled !== false) {
            await checkAndSendSmartNotifications();
        }
    }
});


// ==========================================
// CHROME HISTORY COLLECTION
// ==========================================

async function collectAndSendBrowsingHistory() {
    const storage = await chrome.storage.local.get(['historyCollectionEnabled', 'lastHistorySync']);

    if (!storage.historyCollectionEnabled) {
        return { status: 'disabled' };
    }

    console.log("🔍 Collecting Chrome browsing history... (Local Only)");
    const endTime = Date.now();
    await chrome.storage.local.set({ lastHistorySync: endTime });
    return { status: 'success', count: 0 };
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
// AI CHAT ASSISTANT
// ==========================================

async function sendChatMessage(data) {
    console.log("💬 Sending chat message (Local Response - Backend Removed)");
    return {
        status: 'success',
        response: "I'm sorry, I cannot process your message because the AI backend server has been removed."
    };
}


// ==========================================
// AI RECOMMENDATIONS
// ==========================================

async function getAIRecommendations() {
    console.log("Recommendations disabled (No Backend)");
    return { status: 'success', recommendations: [] };
}


// ==========================================
// RESUME BUILDER
// ==========================================

async function generateResume() {
    console.log("Resume generation disabled");
    return { status: 'error', message: 'Backend removed' };
}


// ==========================================
// SERVER STATUS
// ==========================================

async function getServerStatus() {
    return { status: 'offline' };
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

    // Add AI analyze context menu
    chrome.contextMenus?.create({
        id: "supriAnalyze",
        title: "Analyze with SupriAI",
        contexts: ["page", "selection"]
    });
});

chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
    if (info.menuItemId === "supriBookmark") {
        showNotification("SupriAI", "Bookmarks are disabled (Backend Removed)");
    }

    if (info.menuItemId === "supriAnalyze") {
        showNotification("SupriAI", "AI Analysis unavailable (Backend Removed)");
    }
});

function showNotification(title, message) {
     chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'libs/icon48.png',
        title: title,
        message: message
    });
}


// ==========================================
// ADVANCED AI FUNCTIONS
// ==========================================

async function handleAutoLogWithAI(data) {
    // Fallback to regular log (local)
    return handleLogActivity(data);
}

async function fetchAIDashboardSummary() {
    return { status: 'success', summary: {} };
}

async function fetchAIInsights(days = 30) {
    return { status: 'success', insights: [] };
}

async function fetchLearningPath(data = {}) {
    return { status: 'error', message: 'Backend removed' };
}

async function fetchSmartSchedule(data = {}) {
    return { status: 'error', message: 'Backend removed' };
}

async function fetchSkillAssessment() {
    return { status: 'error', message: 'Backend removed' };
}

async function fetchWeeklyReport() {
    return { status: 'success', report: {} };
}

async function summarizeContent(data) {
    return { status: 'error', message: 'Backend removed' };
}

async function analyzeContent(data) {
    return { status: 'error', message: 'Backend removed' };
}

async function fetchAutoRecommendations() {
    return { status: 'success', recommendations: [] };
}

async function generateAndNotifyWeeklyReport() {
    const result = await fetchWeeklyReport();

    if (result.status === 'success' && result.report) {
        const summary = result.report.summary || {};

        // Update last report time
        await chrome.storage.local.set({ lastWeeklyReport: Date.now() });

        // Send notification
        chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'libs/icon48.png',
            title: '📊 Weekly Learning Report Ready!',
            message: `Sessions: ${summary.sessions || 0} | Hours: ${summary.total_hours || 0}h | Streak: ${summary.streak || 0} days`
        });
    }

    return result;
}

async function checkAndSendSmartNotifications() {
    const storage = await chrome.storage.local.get([
        'todayTotalTime',
        'lastNotificationTime',
        'aiInsights',
        'skillAssessment'
    ]);

    const lastNotification = storage.lastNotificationTime || 0;
    const hoursSinceNotification = (Date.now() - lastNotification) / (1000 * 60 * 60);

    // Don't notify too frequently
    if (hoursSinceNotification < 4) return;

    const todayMinutes = storage.todayTotalTime || 0;
    const currentHour = new Date().getHours();

    // Study reminder in the evening if no activity today
    if (currentHour >= 18 && currentHour <= 21 && todayMinutes < 15) {
        chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'libs/icon48.png',
            title: '📖 Time for a Learning Session!',
            message: 'You haven\'t studied much today. A quick 25-minute focused session can make a difference!'
        });

        await chrome.storage.local.set({ lastNotificationTime: Date.now() });
    }

    // Celebrate milestones
    if (todayMinutes >= 60 && todayMinutes < 65) {
        chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'libs/icon48.png',
            title: '🎉 1 Hour Achievement!',
            message: 'Amazing! You\'ve completed over an hour of learning today!'
        });

        await chrome.storage.local.set({ lastNotificationTime: Date.now() });
    }
}


// ==========================================
// UTILITY: Export for testing
// ==========================================

// These functions are available for content scripts to call via messaging
const exportedFunctions = {
    syncOfflineLogs,
    getServerStatus,
    handleLogActivity,
    handleAutoLogWithAI,
    fetchAIDashboardSummary,
    fetchAIInsights,
    fetchLearningPath,
    fetchSmartSchedule,
    fetchSkillAssessment,
    fetchWeeklyReport,
    analyzeContent,
    summarizeContent,
    fetchAutoRecommendations
};
