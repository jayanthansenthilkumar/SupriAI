let settings;

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded. Waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (typeof Chart === 'undefined') {
      console.error('Chart.js failed to load');
      return;
    }
  }

  // Load data and settings from storage
  const { tabData, tabGroups, settings: storedSettings } = await chrome.storage.local.get(['tabData', 'tabGroups', 'settings']);
  settings = storedSettings || defaultSettings;
      
  // Debug logging
  console.log('Current tab data:', tabData);
  console.log('Current tab groups:', tabGroups);
  
  // Initialize empty objects if data doesn't exist
  const initializedTabData = tabData || {};
  const initializedTabGroups = tabGroups || {};
  
  // Setup tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  // Show overview tab by default
  document.getElementById('overview').style.display = 'block';
  
  // Remove inline styles from other tabs
  ['groups', 'inactive', 'settings'].forEach(tabId => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.removeAttribute('style');
    }
  });

  // Initialize charts
  createTimeChart(initializedTabGroups);
  displayTabGroups(initializedTabGroups);
  displayInactiveTabs(initializedTabData);
  addDetailedAnalytics(initializedTabGroups, initializedTabData);

  // Initialize settings
  await initializeSettings();

  // Add time limit
  document.getElementById('addLimit').addEventListener('click', async () => {
    const domain = document.getElementById('limitDomain').value.trim();
    const minutes = parseInt(document.getElementById('limitMinutes').value);
    
    if (domain && minutes > 0) {
      const { settings } = await chrome.storage.local.get(['settings']);
      settings.siteLimits[domain] = minutes;
      await chrome.storage.local.set({ settings });
      displayTimeLimits(settings.siteLimits);
      
      document.getElementById('limitDomain').value = '';
      document.getElementById('limitMinutes').value = '';
    }
  });

  // Add productive site
  document.getElementById('addProductive').addEventListener('click', async () => {
    const domain = document.getElementById('productiveSite').value.trim();
    if (domain) {
      const { settings } = await chrome.storage.local.get(['settings']);
      if (!settings.productiveSites.includes(domain)) {
        settings.productiveSites.push(domain);
        await chrome.storage.local.set({ settings });
        displaySiteList(settings.productiveSites, 'productiveSitesList');
      }
      document.getElementById('productiveSite').value = '';
    }
  });

  // Add social site
  document.getElementById('addSocial').addEventListener('click', async () => {
    const domain = document.getElementById('socialSite').value.trim();
    if (domain) {
      const { settings } = await chrome.storage.local.get(['settings']);
      if (!settings.socialSites.includes(domain)) {
        settings.socialSites.push(domain);
        await chrome.storage.local.set({ settings });
        displaySiteList(settings.socialSites, 'socialSitesList');
      }
      document.getElementById('socialSite').value = '';
    }
  });

  // Handle summarize button click
  document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const summarySection = document.getElementById('summaryResult');
    const loader = summarySection.querySelector('.loader');
    const summaryText = summarySection.querySelector('.summary-text');
    
    loader.style.display = 'block';
    summaryText.innerHTML = '';
    
    try {
      // Validate CONFIG is loaded
      if (typeof CONFIG === 'undefined') {
        throw new Error('Configuration not loaded. Please reload the extension.');
      }

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found.');
      }

      // Check if it's a valid webpage
      if (!tab.url || !tab.url.startsWith('http')) {
        throw new Error('Please navigate to a webpage (http:// or https://) to summarize content.');
      }

      console.log('Summarizing tab:', tab.url);
      
      // Inject content script if not already injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/content.js']
        });
        console.log('Content script injected successfully');
      } catch (e) {
        console.log('Content script injection note:', e.message);
      }
      
      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get page content
      console.log('Requesting page content...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      
      if (!response) {
        throw new Error('No response from content script. Please refresh the page and try again.');
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract page content');
      }

      const content = response.content;
      
      if (!content || content.trim().length === 0) {
        throw new Error('No content found on this page to summarize.');
      }

      console.log('Content received, length:', content.length);
      
      // Get summary from Gemini
      if (typeof summarizeContent !== 'function') {
        throw new Error('Summarize function not loaded. Please reload the extension.');
      }

      loader.textContent = 'Generating summary with AI...';
      const summary = await summarizeContent(content);
      
      // Display summary
      const sanitizedHtml = DOMPurify.sanitize(summary);
      summaryText.innerHTML = sanitizedHtml;
      
      console.log('Summary displayed successfully');
      
    } catch (error) {
      console.error('Summary Error:', error);
      
      let errorMessage = error.message || 'An unknown error occurred';
      
      // Special handling for common errors
      if (error.message && error.message.includes('Could not establish connection')) {
        errorMessage = 'Could not connect to the page. Please refresh the page and try again.';
      } else if (error.message && error.message.includes('Frame')) {
        errorMessage = 'Cannot access this page. Some pages (like chrome:// pages) cannot be summarized.';
      }
      
      summaryText.innerHTML = `
        <div class="error-message">
          <strong>⚠️ Error:</strong> ${errorMessage}
          <br><br>
          <small>Check the browser console (F12) for more details.</small>
        </div>
      `;
    } finally {
      loader.style.display = 'none';
    }
  });

  // Populate domain dropdown
  async function populateDomainDropdown() {
    const tabs = await chrome.tabs.query({});
    const domains = new Set();
    
    tabs.forEach(tab => {
      try {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('http')) {
          domains.add(url.hostname);
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });
    
    const select = document.getElementById('domainSelect');
    select.innerHTML = '<option value="">Select a domain...</option>';
    
    Array.from(domains).sort().forEach(domain => {
      const option = document.createElement('option');
      option.value = domain;
      option.textContent = domain;
      select.appendChild(option);
    });
  }

  // Call it initially
  populateDomainDropdown();

  // Update dropdown when tabs change
  chrome.tabs.onUpdated.addListener(populateDomainDropdown);
  chrome.tabs.onRemoved.addListener(populateDomainDropdown);

  // Initialize curation workflow
  const curationService = new CurationService();
  window.workflow = new CurationWorkflow(curationService);

  document.getElementById('startCuration').addEventListener('click', () => {
    const domain = document.getElementById('domainSelect').value;
    if (domain) {
      window.workflow.startWorkflow(domain);
    }
  });
});

function switchTab(tabId) {
  // Hide all tab content first
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab content and activate button
  document.getElementById(tabId).style.display = 'block';
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

function createTimeChart(tabGroups) {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  if (Object.keys(tabGroups).length === 0) {
    // Handle empty data
    const ctx = document.getElementById('timeChart').getContext('2d');
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('No data available yet. Start browsing!', ctx.canvas.width/2, ctx.canvas.height/2);
    return;
  }

  const ctx = document.getElementById('timeChart').getContext('2d');
  
  try {
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(tabGroups),
        datasets: [{
          data: Object.values(tabGroups).map(group => group.totalTime / 60000),
          backgroundColor: generateColors(Object.keys(tabGroups).length)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Time Spent by Website'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating chart:', error);
  }
}

function displayTabGroups(tabGroups) {
  const container = document.getElementById('tabGroups');
  container.innerHTML = '';

  if (!tabGroups || Object.keys(tabGroups).length === 0) {
    container.innerHTML = '<p class="empty-state">No tab groups yet. Open some tabs to get started!</p>';
    return;
  }

  // Get settings before sorting
  chrome.storage.local.get(['settings'], ({ settings }) => {
    if (!settings) return;

    // Convert to array and sort: warning tabs first, then by total time
    const sortedGroups = Object.entries(tabGroups)
      .sort((a, b) => {
        const aLimit = settings.siteLimits[a[0]];
        const bLimit = settings.siteLimits[b[0]];
        const aExceeded = aLimit && (a[1].totalTime / 60000) >= aLimit;
        const bExceeded = bLimit && (b[1].totalTime / 60000) >= bLimit;
        
        if (aExceeded && !bExceeded) return -1;
        if (!aExceeded && bExceeded) return 1;
        return b[1].totalTime - a[1].totalTime;
      });

    sortedGroups.forEach(([domain, data]) => {
      const groupElement = document.createElement('div');
      groupElement.className = 'group-item';
      
      const limit = settings.siteLimits[domain];
      const timeSpentMinutes = data.totalTime / 60000;
      let warningMessage = '';
      
      if (limit && timeSpentMinutes >= limit) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'time-warning';
        
        const warningText = document.createElement('p');
        warningText.textContent = `Time limit reached! You've spent ${Math.floor(timeSpentMinutes)} minutes on ${domain}. Consider taking a break!`;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close All Tabs';
        closeButton.addEventListener('click', () => closeTabsByDomain(domain));
        
        warningDiv.appendChild(warningText);
        warningDiv.appendChild(closeButton);
        groupElement.classList.add('time-limit-reached');
        warningMessage = warningDiv.outerHTML;
      }
      
      groupElement.innerHTML = `
        <h3>${domain}</h3>
        <p>Open tabs: ${data.tabs.length}</p>
        <p>Total time: ${formatTime(data.totalTime)}</p>
        ${warningMessage}
      `;
      
      // Re-attach event listener after innerHTML
      if (limit && timeSpentMinutes >= limit) {
        const button = groupElement.querySelector('button');
        button.addEventListener('click', () => closeTabsByDomain(domain));
      }
      
      container.appendChild(groupElement);
    });
  });
}

function displayInactiveTabs(tabData) {
  const container = document.getElementById('inactiveTabs');
  container.innerHTML = '';

  if (Object.keys(tabData).length === 0) {
    container.innerHTML = '<p class="empty-state">No inactive tabs detected.</p>';
    return;
  }

  const inactiveThreshold = 5 * 60 * 1000;
  const currentTime = Date.now();
  let hasInactiveTabs = false;

  Object.entries(tabData).forEach(([tabId, data]) => {
    if (data.lastInactiveTime && (currentTime - data.lastInactiveTime > inactiveThreshold)) {
      hasInactiveTabs = true;
      const tabElement = document.createElement('div');
      tabElement.className = 'inactive-tab';
      
      const infoDiv = document.createElement('div');
      const domainP = document.createElement('p');
      domainP.textContent = data.domain;
      const timeP = document.createElement('p');
      timeP.textContent = `Inactive for: ${formatTime(currentTime - data.lastInactiveTime)}`;
      infoDiv.appendChild(domainP);
      infoDiv.appendChild(timeP);
      
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', () => closeTab(tabId));
      
      tabElement.appendChild(infoDiv);
      tabElement.appendChild(closeButton);
      
      container.appendChild(tabElement);
    }
  });

  if (!hasInactiveTabs) {
    container.innerHTML = '<p class="empty-state">All tabs are active!</p>';
  }
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? 
    `${hours}h ${minutes % 60}m` : 
    `${minutes}m`;
}

function generateColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(`hsl(${(i * 360) / count}, 70%, 50%)`);
  }
  return colors;
}

function closeTab(tabId) {
  chrome.tabs.remove(parseInt(tabId));
  // Refresh the inactive tabs list
  chrome.storage.local.get(['tabData'], ({ tabData }) => {
    delete tabData[tabId];
    chrome.storage.local.set({ tabData });
    displayInactiveTabs(tabData);
  });
}

function calculateHourlyActivity(tabData) {
  const hourlyData = new Array(24).fill(0);
  
  Object.values(tabData).forEach(tab => {
    const hour = new Date(tab.lastActiveTime).getHours();
    hourlyData[hour] += tab.totalActiveTime / 60000; // Convert to minutes
  });
  
  return hourlyData;
}

async function calculateProductivityRatio(tabData) {
  let productiveTime = 0;
  let socialTime = 0;
  let otherTime = 0;

  const { settings } = await chrome.storage.local.get(['settings']);
  if (!settings) return [0, 0, 0];

  Object.values(tabData).forEach(tab => {
    if (settings.productiveSites.includes(tab.domain)) {
      productiveTime += tab.totalActiveTime;
    } else if (settings.socialSites.includes(tab.domain)) {
      socialTime += tab.totalActiveTime;
    } else {
      otherTime += tab.totalActiveTime;
    }
  });

  return [
    productiveTime / 60000,
    socialTime / 60000,
    otherTime / 60000
  ];
}

function generateTabTimeline(tabData) {
  let timeline = '';
  const sortedTabs = Object.entries(tabData)
    .sort((a, b) => b[1].startTime - a[1].startTime);

  sortedTabs.forEach(([tabId, data]) => {
    const openTime = new Date(data.startTime).toLocaleTimeString();
    timeline += `
      <div class="timeline-item">
        <span class="time">${openTime}</span>
        <span class="domain">${data.domain}</span>
        <span class="duration">${formatTime(data.totalActiveTime)}</span>
      </div>
    `;
  });

  return timeline || '<p class="empty-state">No tab history available</p>';
}

async function addDetailedAnalytics(tabGroups, tabData) {
  const analytics = document.createElement('div');
  analytics.className = 'analytics-section';
  
  // Only create charts if we have data
  if (Object.keys(tabData).length > 0) {
    // Daily usage pattern chart
    const dailyPattern = new Chart(
      document.getElementById('dailyPattern').getContext('2d'),
      {
        type: 'line',
        data: {
          labels: Array.from({length: 24}, (_, i) => `${i}:00`),
          datasets: [{
            label: 'Tab Activity',
            data: calculateHourlyActivity(tabData),
            borderColor: '#4285f4',
            backgroundColor: 'rgba(66, 133, 244, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Minutes'
              }
            }
          }
        }
      }
    );

    // Productivity ratio chart
    const productivityRatio = await calculateProductivityRatio(tabData);
    const productivityChart = new Chart(
      document.getElementById('productivity').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: ['Productive', 'Social', 'Other'],
          datasets: [{
            data: productivityRatio,
            backgroundColor: [
              '#34A853', // Green for productive
              '#EA4335', // Red for social
              '#FBBC05'  // Yellow for other
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Time Distribution'
            }
          }
        }
      }
    );
  } else {
    document.getElementById('dailyPattern').style.display = 'none';
    document.getElementById('productivity').style.display = 'none';
  }

  // Tab lifecycle visualization
  const lifecycle = document.createElement('div');
  lifecycle.innerHTML = `
    <h3>Tab Lifecycle</h3>
    <div class="tab-timeline">
      ${generateTabTimeline(tabData)}
    </div>
  `;

  analytics.appendChild(lifecycle);
}

function closeTabsByDomain(domain) {
  chrome.runtime.sendMessage(
    { action: 'closeTabs', domain },
    (response) => {
      if (response && response.success) {
        // Refresh the tab groups display after closing
        chrome.storage.local.get(['tabData', 'tabGroups'], ({ tabData, tabGroups }) => {
          displayTabGroups(tabGroups);
        });
      }
    }
  );
}

async function initializeSettings() {
  const { settings } = await chrome.storage.local.get(['settings']);
  if (!settings) return;

  displayTimeLimits(settings.siteLimits);
  displaySiteList(settings.productiveSites, 'productiveSitesList');
  displaySiteList(settings.socialSites, 'socialSitesList');
}

function displayTimeLimits(limits) {
  const container = document.getElementById('currentLimits');
  container.innerHTML = '';
  
  Object.entries(limits).forEach(([domain, minutes]) => {
    const item = document.createElement('div');
    item.className = 'limit-item';
    item.innerHTML = `
      <span>${domain}: ${minutes} minutes</span>
      <button class="remove-button">Remove</button>
    `;
    
    item.querySelector('button').addEventListener('click', async () => {
      const { settings } = await chrome.storage.local.get(['settings']);
      delete settings.siteLimits[domain];
      await chrome.storage.local.set({ settings });
      displayTimeLimits(settings.siteLimits);
    });
    
    container.appendChild(item);
  });
}

function displaySiteList(sites, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  sites.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'site-list-item';
    item.innerHTML = `
      <span>${domain}</span>
      <button class="remove-button">Remove</button>
    `;
    
    item.querySelector('button').addEventListener('click', async () => {
      const { settings } = await chrome.storage.local.get(['settings']);
      const category = containerId === 'productiveSitesList' ? 'productiveSites' : 'socialSites';
      settings[category] = settings[category].filter(site => site !== domain);
      await chrome.storage.local.set({ settings });
      displaySiteList(settings[category], containerId);
    });
    
    container.appendChild(item);
  });
} 