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

// Initialize settings when extension loads
chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
});

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

function trackTab(tab) {
  if (!tab.url || !tab.url.startsWith('http')) {
    return; // Skip non-http tabs
  }

  const domain = new URL(tab.url).hostname;
  const currentTime = Date.now();

  if (!tabData[tab.id]) {
    tabData[tab.id] = {
      domain,
      url: tab.url,
      startTime: currentTime,
      lastActiveTime: currentTime,
      totalActiveTime: 0,
      lastInactiveTime: tab.active ? null : currentTime,
      isActive: tab.active
    };
  } else {
    // Update time for existing tab before updating its state
    if (tabData[tab.id].isActive) {
      tabData[tab.id].totalActiveTime += currentTime - tabData[tab.id].lastActiveTime;
    }
    tabData[tab.id].lastActiveTime = currentTime;
    tabData[tab.id].isActive = tab.active;
    tabData[tab.id].lastInactiveTime = tab.active ? null : currentTime;
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

  // Save data immediately when a new tab is tracked
  chrome.storage.local.set({ tabData, tabGroups });
}

// Track tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabData[tabId]) {
    const domain = tabData[tabId].domain;
    tabGroups[domain].tabs = tabGroups[domain].tabs.filter(id => id !== tabId);
    
    if (tabGroups[domain].tabs.length === 0) {
      delete tabGroups[domain];
    }
    
    delete tabData[tabId];
    chrome.storage.local.set({ tabData, tabGroups });
  }
});

// Update active time every minute
setInterval(() => {
  const currentTime = Date.now();
  
  Object.keys(tabData).forEach(tabId => {
    const tab = tabData[tabId];
    if (tab.isActive) {
      tab.totalActiveTime += currentTime - tab.lastActiveTime;
      tab.lastActiveTime = currentTime;
      
      // Update group total time
      if (tabGroups[tab.domain]) {
        tabGroups[tab.domain].totalTime = Object.values(tabData)
          .filter(t => t.domain === tab.domain)
          .reduce((total, t) => total + t.totalActiveTime, 0);
      }
    }
    
    // Update last interaction time when user switches away from tab
    if (!tab.isActive && !tab.lastInactiveTime) {
      tab.lastInactiveTime = currentTime;
    }
  });
  
  // Save data to storage
  chrome.storage.local.set({ tabData, tabGroups });
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
      // After closing, send response back to popup if it's still open
      sendResponse({ success: true, closedCount: tabsToClose.length });
    });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
}); 