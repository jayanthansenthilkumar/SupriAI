/**
 * SupriAI Background Service Worker
 * Handles backend communication, data synchronization, and Chrome history collection
 * Enhanced with full AI automation capabilities
 */

// ==========================================
// CONFIGURATION
// ==========================================

const SERVER_URL = "http://localhost:5000";
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
        console.log("History collection disabled");
        return { status: 'disabled' };
    }

    console.log("🔍 Collecting Chrome browsing history...");

    const endTime = Date.now();
    const startTime = storage.lastHistorySync || (endTime - (HISTORY_DAYS_TO_FETCH * 24 * 60 * 60 * 1000));

    try {
        // Search Chrome history
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

        console.log(`📚 Found ${historyItems.length} history items`);

        // Process and categorize history items
        const processedHistory = historyItems.map(item => ({
            url: item.url,
            title: item.title || 'Untitled',
            visitCount: item.visitCount || 1,
            lastVisitTime: item.lastVisitTime,
            domain: extractDomain(item.url)
        })).filter(item => {
            // Filter out extension pages, chrome internal pages
            return !item.url.startsWith('chrome://') &&
                !item.url.startsWith('chrome-extension://') &&
                !item.url.startsWith('about:');
        });

        // Send to backend for ML processing
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
            console.log("✅ History analyzed successfully:", result);

            // Update last sync time
            await chrome.storage.local.set({
                lastHistorySync: endTime,
                historyAnalysis: result
            });

            // Store recommendations
            if (result.recommendations) {
                await chrome.storage.local.set({
                    aiRecommendations: result.recommendations,
                    recommendationsUpdatedAt: Date.now()
                });
            }

            return { status: 'success', count: processedHistory.length, analysis: result };
        } else {
            throw new Error(`Server error: ${response.status}`);
        }

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
// AI CHAT ASSISTANT
// ==========================================

async function sendChatMessage(data) {
    console.log("💬 Sending chat message to AI...");

    try {
        // Get user context for personalized responses
        const storage = await chrome.storage.local.get([
            'historyAnalysis',
            'aiRecommendations',
            'todayTotalTime'
        ]);

        const response = await fetch(`${SERVER_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: data.message,
                context: {
                    historyAnalysis: storage.historyAnalysis || null,
                    recommendations: storage.aiRecommendations || null,
                    todayLearningTime: storage.todayTotalTime || 0,
                    conversationHistory: data.history || []
                }
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ AI response received");
            return result;
        } else {
            throw new Error(`Chat API error: ${response.status}`);
        }

    } catch (error) {
        console.error("Chat failed:", error);
        return {
            status: 'error',
            message: error.message,
            response: "I'm sorry, I couldn't process your message. Please check your connection and try again."
        };
    }
}


// ==========================================
// AI RECOMMENDATIONS
// ==========================================

async function getAIRecommendations() {
    console.log("🎯 Fetching AI recommendations...");

    try {
        const response = await fetch(`${SERVER_URL}/api/recommendations`, {
            method: 'GET',
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache recommendations locally
            await chrome.storage.local.set({
                aiRecommendations: result.recommendations,
                recommendationsUpdatedAt: Date.now()
            });

            console.log("✅ Recommendations received:", result);
            return result;
        } else {
            throw new Error(`Recommendations API error: ${response.status}`);
        }

    } catch (error) {
        console.error("Failed to get recommendations:", error);

        // Return cached recommendations if available
        const storage = await chrome.storage.local.get(['aiRecommendations']);
        if (storage.aiRecommendations) {
            return {
                status: 'cached',
                recommendations: storage.aiRecommendations,
                message: 'Using cached recommendations'
            };
        }

        return { status: 'error', message: error.message };
    }
}


// ==========================================
// RESUME BUILDER
// ==========================================

async function generateResume() {
    console.log("📄 Generating resume from learning analytics...");

    try {
        const response = await fetch(`${SERVER_URL}/api/resume/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Resume generated successfully");

            // Cache the resume
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

    // Add AI analyze context menu
    chrome.contextMenus?.create({
        id: "supriAnalyze",
        title: "Analyze with SupriAI",
        contexts: ["page", "selection"]
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

    if (info.menuItemId === "supriAnalyze") {
        const content = info.selectionText || '';
        const url = info.pageUrl || tab.url;
        const title = tab.title || 'Untitled';

        try {
            const analysis = await analyzeContent({ text: content, title, url });

            chrome.notifications?.create({
                type: 'basic',
                iconUrl: 'libs/icon48.png',
                title: `SupriAI: ${analysis.analysis?.topic || 'Analyzed'}`,
                message: `Learning value: ${analysis.analysis?.learning_value || 'N/A'}% | ${analysis.analysis?.content_type || 'content'}`
            });
        } catch (e) {
            console.error("Failed to analyze:", e);
        }
    }
});


// ==========================================
// ADVANCED AI FUNCTIONS
// ==========================================

async function handleAutoLogWithAI(data) {
    console.log("🤖 Auto-logging with AI analysis...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/auto-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ AI Auto-log successful:", result);

            // Cache the AI analysis
            await chrome.storage.local.set({
                lastAIAnalysis: result.ai_analysis,
                lastRecommendation: result.recommendation,
                lastLogTime: Date.now()
            });

            // Show smart notification if high learning value
            if (result.ai_analysis?.learning_value > 70) {
                chrome.notifications?.create({
                    type: 'basic',
                    iconUrl: 'libs/icon48.png',
                    title: '📚 High-Value Learning Detected!',
                    message: `${result.ai_analysis.topic} - ${result.ai_analysis.learning_value}% learning value`
                });
            }

            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("AI Auto-log failed:", e);
        // Fallback to regular log
        return handleLogActivity(data);
    }
}

async function fetchAIDashboardSummary() {
    console.log("📊 Fetching AI dashboard summary...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/dashboard-summary`, {
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache dashboard summary
            await chrome.storage.local.set({
                aiDashboardSummary: result.summary,
                dashboardSummaryUpdatedAt: Date.now()
            });

            console.log("✅ Dashboard summary fetched");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Dashboard summary failed:", e);

        // Return cached if available
        const storage = await chrome.storage.local.get(['aiDashboardSummary']);
        if (storage.aiDashboardSummary) {
            return { status: 'cached', summary: storage.aiDashboardSummary };
        }
        return { status: 'error', message: e.message };
    }
}

async function fetchAIInsights(days = 30) {
    console.log(`🧠 Fetching AI insights for ${days} days...`);

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/insights?days=${days}`, {
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache insights
            await chrome.storage.local.set({
                aiInsights: result.insights,
                insightsUpdatedAt: Date.now()
            });

            console.log("✅ AI insights fetched");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("AI insights failed:", e);

        const storage = await chrome.storage.local.get(['aiInsights']);
        if (storage.aiInsights) {
            return { status: 'cached', insights: storage.aiInsights };
        }
        return { status: 'error', message: e.message };
    }
}

async function fetchLearningPath(data = {}) {
    console.log("📚 Generating learning path...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/learning-path`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache learning path
            await chrome.storage.local.set({
                learningPath: result.learning_path,
                learningPathUpdatedAt: Date.now()
            });

            console.log("✅ Learning path generated");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Learning path generation failed:", e);
        return { status: 'error', message: e.message };
    }
}

async function fetchSmartSchedule(data = {}) {
    console.log("📅 Generating smart study schedule...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/smart-schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache schedule
            await chrome.storage.local.set({
                smartSchedule: result.schedule,
                scheduleUpdatedAt: Date.now()
            });

            console.log("✅ Smart schedule generated");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Smart schedule generation failed:", e);
        return { status: 'error', message: e.message };
    }
}

async function fetchSkillAssessment() {
    console.log("📈 Fetching skill assessment...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/skill-assessment`, {
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache assessment
            await chrome.storage.local.set({
                skillAssessment: result.assessment,
                assessmentUpdatedAt: Date.now()
            });

            console.log("✅ Skill assessment fetched");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Skill assessment failed:", e);

        const storage = await chrome.storage.local.get(['skillAssessment']);
        if (storage.skillAssessment) {
            return { status: 'cached', assessment: storage.skillAssessment };
        }
        return { status: 'error', message: e.message };
    }
}

async function fetchWeeklyReport() {
    console.log("📊 Fetching weekly report...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/weekly-report`, {
            signal: AbortSignal.timeout(20000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache report
            await chrome.storage.local.set({
                weeklyReport: result.report,
                weeklyReportUpdatedAt: Date.now()
            });

            console.log("✅ Weekly report fetched");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Weekly report failed:", e);
        return { status: 'error', message: e.message };
    }
}

async function summarizeContent(data) {
    console.log("📝 Summarizing content...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Content summarized");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Content summarization failed:", e);
        return { status: 'error', message: e.message };
    }
}

async function analyzeContent(data) {
    console.log("🔍 Analyzing content...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/analyze-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Content analyzed");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Content analysis failed:", e);
        return { status: 'error', message: e.message };
    }
}

async function fetchAutoRecommendations() {
    console.log("🎯 Fetching auto recommendations...");

    try {
        const response = await fetch(`${SERVER_URL}/api/ai/auto-recommendations`, {
            signal: AbortSignal.timeout(20000)
        });

        if (response.ok) {
            const result = await response.json();

            // Cache recommendations
            await chrome.storage.local.set({
                autoRecommendations: result.recommendations,
                recommendationsUpdatedAt: Date.now()
            });

            console.log("✅ Auto recommendations fetched");
            return result;
        }
        throw new Error(`Server error: ${response.status}`);
    } catch (e) {
        console.error("Auto recommendations failed:", e);

        const storage = await chrome.storage.local.get(['autoRecommendations']);
        if (storage.autoRecommendations) {
            return { status: 'cached', recommendations: storage.autoRecommendations };
        }
        return { status: 'error', message: e.message };
    }
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
