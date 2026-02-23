// Import database service (paths relative to service worker location)
importScripts('services/database.js');
importScripts('services/backendAPI.js');

// Get settings from storage
async function getSettings() {
  const { settings } = await chrome.storage.local.get(['settings']);
  // If settings don't exist, initialize with default values
  if (!settings) {
    const defaultSettings = {
      siteLimits: {
        'www.youtube.com': 2,
        'facebook.com': 30,
        'twitter.com': 20
      },
      productiveSites: [
        'github.com',
        'stackoverflow.com',
        'docs.google.com',
        'linkedin.com'
      ],
      socialSites: [
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'www.youtube.com'
      ]
    };
    await chrome.storage.local.set({ settings: defaultSettings });
    return defaultSettings;
  }
  return settings;
}

let tabData = {};
let tabGroups = {};
let currentSessionId = null;

// Initialize database and create session when extension loads
chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  await initializeDatabase();
});

// Initialize database
async function initializeDatabase() {
  try {
    await dbService.init();
    console.log('Database initialized successfully');
    
    // Create a new session
    currentSessionId = await dbService.createSession();
    console.log('New session created:', currentSessionId);
    
    // Store session ID in chrome storage for access from popup
    await chrome.storage.local.set({ currentSessionId });
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Enhanced tab tracking with database persistence
async function trackTab(tab) {
  if (!tab.url || !tab.url.startsWith('http')) {
    return; // Skip non-http tabs
  }

  const domain = new URL(tab.url).hostname;
  const currentTime = Date.now();

  // Track in memory (existing functionality)
  if (!tabData[tab.id]) {
    tabData[tab.id] = {
      domain,
      url: tab.url,
      title: tab.title || '',
      startTime: currentTime,
      lastActiveTime: currentTime,
      totalActiveTime: 0,
      lastInactiveTime: tab.active ? null : currentTime,
      isActive: tab.active
    };

    // Save to database
    try {
      await dbService.saveTab({
        tabId: tab.id,
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        favicon: tab.favIconUrl || '',
        timestamp: currentTime,
        sessionId: currentSessionId,
        activeTime: 0
      });

      // Log tab opened event
      await dbService.logTabEvent({
        tabId: tab.id,
        eventType: 'opened',
        timestamp: currentTime,
        sessionId: currentSessionId,
        url: tab.url,
        domain: domain
      });

      // Buffer event for backend sync
      bufferTabEvent({ tabId: tab.id, eventType: 'opened', timestamp: currentTime, url: tab.url, domain });

      // Update session tab count
      if (currentSessionId) {
        const sessionTabs = await dbService.getTabsBySession(currentSessionId);
        await dbService.updateSession(currentSessionId, {
          tabCount: sessionTabs.length
        });
      }
    } catch (error) {
      console.error('Error saving tab to database:', error);
    }
  } else {
    // Update time for existing tab before updating its state
    if (tabData[tab.id].isActive) {
      tabData[tab.id].totalActiveTime += currentTime - tabData[tab.id].lastActiveTime;
    }
    tabData[tab.id].lastActiveTime = currentTime;
    tabData[tab.id].isActive = tab.active;
    tabData[tab.id].lastInactiveTime = tab.active ? null : currentTime;

    // Log tab activated event
    if (tab.active) {
      try {
        await dbService.logTabEvent({
          tabId: tab.id,
          eventType: 'activated',
          timestamp: currentTime,
          sessionId: currentSessionId,
          url: tab.url,
          domain: domain
        });

        // Buffer event for backend sync
        bufferTabEvent({ tabId: tab.id, eventType: 'activated', timestamp: currentTime, url: tab.url, domain });
      } catch (error) {
        console.error('Error logging tab event:', error);
      }
    }
  }

  // Group tabs by domain
  if (!tabGroups[domain]) {
    tabGroups[domain] = {
      tabs: [tab.id],
      totalTime: 0
    };
  } else if (!tabGroups[domain].tabs.includes(tab.id)) {
    tabGroups[domain].tabs.push(tab.id);
  }

  // Update group total time
  tabGroups[domain].totalTime = Object.values(tabData)
    .filter(t => t.domain === domain)
    .reduce((total, t) => total + t.totalActiveTime, 0);

  // Save data to chrome storage
  chrome.storage.local.set({ tabData, tabGroups });
}

// Initialize tab tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  trackTab(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    trackTab(tab);
  }
});

// Track tab removal with database logging
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabData[tabId]) {
    const domain = tabData[tabId].domain;
    const url = tabData[tabId].url;
    const activeTime = tabData[tabId].totalActiveTime;

    // Log tab closed event
    try {
      await dbService.logTabEvent({
        tabId: tabId,
        eventType: 'closed',
        timestamp: Date.now(),
        sessionId: currentSessionId,
        url: url,
        domain: domain,
        metadata: {
          activeTime: activeTime
        }
      });

      // Buffer event for backend sync
      bufferTabEvent({ tabId, eventType: 'closed', timestamp: Date.now(), url, domain, metadata: { activeTime } });

      // Update domain statistics
      const today = new Date().toISOString().split('T')[0];
      await dbService.saveDomainStats(domain, today, {
        activeTime: activeTime,
        tabCount: 1
      });
    } catch (error) {
      console.error('Error logging tab removal:', error);
    }

    // Update in-memory data
    tabGroups[domain].tabs = tabGroups[domain].tabs.filter(id => id !== tabId);
    
    if (tabGroups[domain].tabs.length === 0) {
      delete tabGroups[domain];
    }
    
    delete tabData[tabId];
    chrome.storage.local.set({ tabData, tabGroups });
  }
});

// Update active time every 10 seconds and persist to database
setInterval(async () => {
  const currentTime = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  for (const tabId of Object.keys(tabData)) {
    const tab = tabData[tabId];
    if (tab.isActive) {
      const timeDelta = currentTime - tab.lastActiveTime;
      tab.totalActiveTime += timeDelta;
      tab.lastActiveTime = currentTime;
      
      // Update group total time
      if (tabGroups[tab.domain]) {
        tabGroups[tab.domain].totalTime = Object.values(tabData)
          .filter(t => t.domain === tab.domain)
          .reduce((total, t) => total + t.totalActiveTime, 0);
      }

      // Periodically update domain stats in database
      try {
        await dbService.saveDomainStats(tab.domain, today, {
          activeTime: timeDelta,
          tabCount: 0 // Don't increment tab count on updates
        });
      } catch (error) {
        console.error('Error updating domain stats:', error);
      }
    }
    
    // Update last interaction time when user switches away from tab
    if (!tab.isActive && !tab.lastInactiveTime) {
      tab.lastInactiveTime = currentTime;
      
      // Log idle event
      try {
        await dbService.logTabEvent({
          tabId: parseInt(tabId),
          eventType: 'idle',
          timestamp: currentTime,
          sessionId: currentSessionId,
          url: tab.url,
          domain: tab.domain
        });
      } catch (error) {
        console.error('Error logging idle event:', error);
      }
    }
  }
  
  // Save data to storage
  chrome.storage.local.set({ tabData, tabGroups });

  // Update session total active time
  if (currentSessionId) {
    try {
      const totalActiveTime = Object.values(tabData)
        .reduce((total, tab) => total + tab.totalActiveTime, 0);
      
      await dbService.updateSession(currentSessionId, {
        totalActiveTime: totalActiveTime,
        endTime: currentTime
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }
}, 10000);

// Track tab activation state
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const currentTime = Date.now();
  
  // Update total time for previously active tab before switching
  Object.keys(tabData).forEach(id => {
    const tab = tabData[id];
    if (tab.isActive) {
      tab.totalActiveTime += currentTime - tab.lastActiveTime;
      tab.lastActiveTime = currentTime;
    }
  });

  // Set all tabs as inactive first
  Object.keys(tabData).forEach(id => {
    if (tabData[id]) {
      tabData[id].isActive = false;
      // Start tracking inactive time when tab becomes inactive
      if (!tabData[id].lastInactiveTime) {
        tabData[id].lastInactiveTime = Date.now();
      }
    }
  });

  // Set the current tab as active
  if (tabData[tabId]) {
    tabData[tabId].isActive = true;
    tabData[tabId].lastActiveTime = Date.now();
    // Reset inactive time when tab becomes active
    tabData[tabId].lastInactiveTime = null;
    
    // Check time limit immediately when switching to a tab
    const tab = tabData[tabId];
    const settings = await getSettings();
    const limit = settings.siteLimits[tab.domain];
    if (limit) {
      const timeSpentMinutes = tab.totalActiveTime / 60000;
      if (timeSpentMinutes >= limit && 
          (!notificationsSent[tab.domain] || 
           Date.now() - notificationsSent[tab.domain] > 5 * 60 * 1000)) {
        notificationsSent[tab.domain] = Date.now();
        chrome.notifications.create(`limit-${tabId}`, {
          type: 'basic',
          title: 'Time Limit Reached',
          message: `You've spent ${Math.floor(timeSpentMinutes)} minutes on ${tab.domain}. Consider taking a break!`,
          buttons: [{ title: 'Close Tab' }],
          requireInteraction: true
        });
      }
    }
  }

  chrome.storage.local.set({ tabData });
});

// Track when tab becomes hidden/visible
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabData[tabId]) {
    tabData[tabId].lastActiveTime = Date.now();
    chrome.windows.get(tab.windowId, (window) => {
      tabData[tabId].isActive = !window.state.includes('minimized');
      chrome.storage.local.set({ tabData });
    });
  }
});

// Initialize tracking for existing tabs when extension loads
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.url && tab.url.startsWith('http')) {
      trackTab(tab);
    }
  });
});

// Keep track of notifications sent
let notificationsSent = {};

// Debug logging for time tracking
setInterval(async () => {
  Object.entries(tabData).forEach(async ([tabId, data]) => {
    const settings = await getSettings();
    if (settings.siteLimits[data.domain]) {
      console.log(`${data.domain}: ${Math.floor(data.totalActiveTime / 60000)} minutes`);
    }
  });
}, 10000);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'closeTabs') {
    const { domain } = request;
    const tabsToClose = Object.entries(tabData)
      .filter(([_, data]) => data.domain === domain)
      .map(([tabId, _]) => parseInt(tabId));
    
    chrome.tabs.remove(tabsToClose, () => {
      sendResponse({ success: true, closedCount: tabsToClose.length });
    });
    
    return true;
  }
  
  // Database query handlers
  if (request.action === 'getTabHistory') {
    (async () => {
      try {
        const { startDate, endDate, domain } = request;
        let tabs;
        
        if (domain) {
          tabs = await dbService.getTabsByDomain(domain);
        } else if (startDate && endDate) {
          tabs = await dbService.getTabsByDateRange(startDate, endDate);
        } else {
          tabs = await dbService.getAllTabs(100); // Limit to 100 most recent
        }
        
        sendResponse({ success: true, tabs });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getDomainStats') {
    (async () => {
      try {
        const { startDate, endDate } = request;
        const stats = await dbService.getDomainStats(startDate, endDate);
        sendResponse({ success: true, stats });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getSessionData') {
    (async () => {
      try {
        const { sessionId } = request;
        const tabs = await dbService.getTabsBySession(sessionId || currentSessionId);
        sendResponse({ success: true, tabs, sessionId: sessionId || currentSessionId });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'exportData') {
    (async () => {
      try {
        const data = await dbService.exportToJSON();
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'clearOldData') {
    (async () => {
      try {
        const { daysToKeep } = request;
        const result = await dbService.clearOldData(daysToKeep || 30);
        sendResponse({ success: true, result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// Create a new session when browser starts
chrome.runtime.onStartup.addListener(async () => {
  await initializeDatabase();
});

// ============================================
// BACKEND SYNC — Periodically sync to Express (port 3001)
// ============================================
let backendSyncEnabled = true;
let historyImported = false;
let pendingEvents = []; // Buffer for tab events to send

async function syncToBackend() {
  if (!backendSyncEnabled) return;

  try {
    // Check if backend is online first
    const health = await backendAPI.checkHealth();
    if (!health) return;

    // Ensure the session exists on the backend
    if (currentSessionId) {
      await backendAPI.createSession(currentSessionId);
    }

    // Send tabData directly as Express expects: { tabData: {}, tabGroups: {}, sessionId }
    await backendAPI.syncData({
      tabData: tabData,
      tabGroups: tabGroups,
      sessionId: currentSessionId
    });

    // Send any buffered tab events
    if (pendingEvents.length > 0) {
      const eventsToSend = [...pendingEvents];
      pendingEvents = [];
      for (const evt of eventsToSend) {
        await backendAPI.logEvent(evt);
      }
    }

    const tabCount = Object.keys(tabData).length;
    const domainCount = Object.keys(tabGroups).length;
    console.log('[SupriAI] Backend sync successful -', tabCount, 'tabs,', domainCount, 'domains');

    // Import Chrome history once per session
    if (!historyImported) {
      await importChromeHistory();
    }
  } catch (error) {
    // Silently fail - backend may be offline
    console.log('[SupriAI] Backend sync skipped (server unavailable)');
  }
}

// Import Chrome browser history into the database
async function importChromeHistory() {
  try {
    // Search last 90 days of Chrome history
    const startTime = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const historyItems = await chrome.history.search({
      text: '',
      startTime: startTime,
      maxResults: 5000
    });

    if (historyItems && historyItems.length > 0) {
      const result = await backendAPI.importHistory(historyItems);
      if (result && !result.error) {
        historyImported = true;
        console.log('[SupriAI] Chrome history imported:', result.imported, 'of', result.total_submitted);
      }
    }
  } catch (error) {
    console.log('[SupriAI] Chrome history import skipped:', error.message);
  }
}

// Buffer a tab event for next sync
function bufferTabEvent(event) {
  pendingEvents.push({
    tabId: event.tabId,
    eventType: event.eventType,
    timestamp: event.timestamp || Date.now(),
    sessionId: currentSessionId,
    url: event.url || '',
    domain: event.domain || '',
    metadata: event.metadata || {}
  });
  // Keep buffer reasonable
  if (pendingEvents.length > 500) {
    pendingEvents = pendingEvents.slice(-250);
  }
}

// Sync to backend every 60 seconds
setInterval(syncToBackend, 60000);

// Also sync on extension startup after a short delay
setTimeout(syncToBackend, 5000);
