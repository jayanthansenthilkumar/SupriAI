/* SupriAI v2.0 — AI-Powered Browsing Intelligence */

let settings;
let backendOnline = false;
let forecastChartInstance = null;
let productivityTimelineChart = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded. Waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (typeof Chart === 'undefined') {
      console.error('Chart.js failed to load');
      return;
    }
  }

  const { tabData, tabGroups, settings: storedSettings } = await chrome.storage.local.get(['tabData', 'tabGroups', 'settings']);
  settings = storedSettings || defaultSettings;

  const initializedTabData = tabData || {};
  const initializedTabGroups = tabGroups || {};

  // Setup tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  // Show overview tab by default
  document.getElementById('overview').style.display = 'block';

  // Initialize charts & existing features
  createTimeChart(initializedTabGroups);
  displayTabGroups(initializedTabGroups);
  displayInactiveTabs(initializedTabData);
  addDetailedAnalytics(initializedTabGroups, initializedTabData);

  await initializeSettings();
  setupSettingsHandlers();
  setupSummarizeHandler();
  setupCurationHandler();
  setupHistoryHandlers();

  // NEW: Check backend and load AI features
  await checkBackendStatus();
  loadQuickStats(initializedTabData, initializedTabGroups);
  loadFocusRecommendation();

  // Setup AI Insights handlers
  setupInsightsHandlers();

  // Periodic backend check every 30s
  setInterval(checkBackendStatus, 30000);
});

// ============================================
// BACKEND STATUS
// ============================================
async function checkBackendStatus() {
  const statusEl = document.getElementById('backendStatus');
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('.status-text');
  const serverText = document.getElementById('serverStatusText');

  try {
    if (typeof backendAPI !== 'undefined') {
      const health = await backendAPI.checkHealth();
      backendOnline = true;
      dot.className = 'status-dot online';
      text.textContent = 'Backend Online';
      if (serverText) {
        serverText.textContent = 'Connected';
        serverText.className = 'status-indicator connected';
      }
    } else {
      throw new Error('API not loaded');
    }
  } catch (e) {
    backendOnline = false;
    dot.className = 'status-dot offline';
    text.textContent = 'Backend Offline';
    if (serverText) {
      serverText.textContent = 'Disconnected';
      serverText.className = 'status-indicator disconnected';
    }
  }
}

// ============================================
// QUICK STATS BAR
// ============================================
function loadQuickStats(tabData, tabGroups) {
  let totalMs = 0;
  Object.values(tabData || {}).forEach(t => { totalMs += (t.totalActiveTime || 0); });
  document.getElementById('todayTime').textContent = formatTime(totalMs);

  const tabCount = Object.keys(tabData || {}).length;
  document.getElementById('todayTabs').textContent = tabCount;

  const domains = new Set();
  Object.values(tabData || {}).forEach(t => { if (t.domain) domains.add(t.domain); });
  document.getElementById('todayDomains').textContent = domains.size;

  if (backendOnline && typeof backendAPI !== 'undefined') {
    backendAPI.predictProductivity().then(res => {
      if (res && res.predicted_score !== undefined) {
        document.getElementById('todayScore').textContent = Math.round(res.predicted_score) + '%';
      }
    }).catch(() => {
      computeLocalScore(tabData);
    });
  } else {
    computeLocalScore(tabData);
  }
}

function computeLocalScore(tabData) {
  let productive = 0, total = 0;
  Object.values(tabData || {}).forEach(t => {
    total += (t.totalActiveTime || 0);
    if (settings && settings.productiveSites && settings.productiveSites.includes(t.domain)) {
      productive += (t.totalActiveTime || 0);
    }
  });
  const score = total > 0 ? Math.round((productive / total) * 100) : 0;
  document.getElementById('todayScore').textContent = score + '%';
}

// ============================================
// FOCUS RECOMMENDATION
// ============================================
async function loadFocusRecommendation() {
  const card = document.getElementById('focusCard');
  const icon = document.getElementById('focusIcon');
  const title = document.getElementById('focusTitle');
  const message = document.getElementById('focusMessage');
  const actions = document.getElementById('focusActions');

  try {
    let recommendation;
    if (backendOnline && typeof backendAPI !== 'undefined') {
      recommendation = await backendAPI.getFocusRecommendation();
    } else {
      recommendation = getLocalFocusRecommendation();
    }

    const type = recommendation.recommendation || recommendation.type || 'light_work';
    const conf = recommendation.confidence || 0.5;

    card.className = 'focus-card ' + type;

    const focusMap = {
      deep_focus: { icon: '\uD83C\uDFAF', title: 'Deep Focus Time', msg: 'Perfect time for concentrated work. Minimize distractions!' },
      light_work: { icon: '\uD83D\uDCBB', title: 'Light Work Mode', msg: 'Good for emails, browsing, and casual tasks.' },
      break_needed: { icon: '\u2615', title: 'Break Recommended', msg: "You've been working a while. Take a short break!" },
      leisure: { icon: '\uD83C\uDFAE', title: 'Leisure Time', msg: 'Relax and enjoy some downtime.' }
    };

    const info = focusMap[type] || focusMap.light_work;
    icon.textContent = info.icon;
    title.textContent = info.title;
    message.textContent = recommendation.message || info.msg;

    actions.innerHTML = '<span class="focus-tag">Confidence: ' + Math.round(conf * 100) + '%</span>' +
      (recommendation.suggested_duration ? '<span class="focus-tag">' + recommendation.suggested_duration + ' min</span>' : '');
  } catch (e) {
    icon.textContent = '\uD83D\uDCA1';
    title.textContent = 'Smart Suggestions';
    message.textContent = 'Start browsing to get AI-powered focus recommendations.';
    actions.innerHTML = '';
  }
}

function getLocalFocusRecommendation() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 11) return { type: 'deep_focus', confidence: 0.7, message: 'Morning hours are ideal for deep work.' };
  if (hour >= 12 && hour <= 13) return { type: 'break_needed', confidence: 0.8, message: 'Lunchtime \u2014 recharge your energy!' };
  if (hour >= 14 && hour <= 16) return { type: 'light_work', confidence: 0.6, message: 'Afternoon is good for emails and meetings.' };
  if (hour >= 17) return { type: 'leisure', confidence: 0.7, message: 'End of work day \u2014 time to wind down.' };
  return { type: 'light_work', confidence: 0.5, message: 'Start your day with some light tasks.' };
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');

  if (tabId === 'history') loadHistoryData();
  if (tabId === 'insights') loadAllInsights();
}

// ============================================
// SETTINGS HANDLERS
// ============================================
function setupSettingsHandlers() {
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

  const syncBtn = document.getElementById('syncNowBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.textContent = 'Syncing...';
      syncBtn.disabled = true;
      try {
        await syncDataToBackend();
        showToast('Data synced successfully!', 'success');
      } catch (e) {
        showToast('Sync failed: ' + e.message, 'error');
      } finally {
        syncBtn.textContent = '\u21BB Sync Data Now';
        syncBtn.disabled = false;
      }
    });
  }
}

// ============================================
// SUMMARIZE HANDLER
// ============================================
function setupSummarizeHandler() {
  document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const summarySection = document.getElementById('summaryResult');
    const loader = summarySection.querySelector('.loader');
    const summaryText = summarySection.querySelector('.summary-text');

    loader.style.display = 'block';
    summaryText.innerHTML = '';

    try {
      if (typeof CONFIG === 'undefined') throw new Error('Configuration not loaded.');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active tab found.');
      if (!tab.url || !tab.url.startsWith('http')) throw new Error('Navigate to a webpage to summarize.');

      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['scripts/content.js'] });
      } catch (e) { /* already injected */ }

      await new Promise(r => setTimeout(r, 100));
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
      if (!response || !response.success) throw new Error(response ? response.error : 'Failed to get content.');

      const content = response.content;
      if (!content || !content.trim()) throw new Error('No content found on this page.');

      if (typeof summarizeContent !== 'function') throw new Error('Summarize function not loaded.');
      loader.textContent = 'Generating summary with AI...';
      const summary = await summarizeContent(content);
      summaryText.innerHTML = DOMPurify.sanitize(summary);
    } catch (error) {
      let msg = error.message || 'An unknown error occurred';
      if (msg.includes('Could not establish connection')) msg = 'Refresh the page and try again.';
      summaryText.innerHTML = '<div class="error-message"><strong>\u26A0\uFE0F Error:</strong> ' + msg + '</div>';
    } finally {
      loader.style.display = 'none';
    }
  });
}

// ============================================
// CURATION HANDLER
// ============================================
function setupCurationHandler() {
  async function populateDomainDropdown() {
    const tabs = await chrome.tabs.query({});
    const domains = new Set();
    tabs.forEach(tab => {
      try {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('http')) domains.add(url.hostname);
      } catch (e) { /* skip */ }
    });
    const select = document.getElementById('domainSelect');
    select.innerHTML = '<option value="">Select a domain...</option>';
    Array.from(domains).sort().forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      select.appendChild(opt);
    });
  }

  populateDomainDropdown();
  chrome.tabs.onUpdated.addListener(populateDomainDropdown);
  chrome.tabs.onRemoved.addListener(populateDomainDropdown);

  const curationService = new CurationService();
  window.workflow = new CurationWorkflow(curationService);
  document.getElementById('startCuration').addEventListener('click', () => {
    const domain = document.getElementById('domainSelect').value;
    if (domain) window.workflow.startWorkflow(domain);
  });
}

// ============================================
// AI INSIGHTS
// ============================================
function setupInsightsHandlers() {
  document.getElementById('trainModelsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('trainModelsBtn');
    btn.textContent = '\u23F3 Training...';
    btn.disabled = true;
    try {
      if (!backendOnline) throw new Error('Backend is offline');
      await backendAPI.trainModels();
      showToast('Models trained successfully!', 'success');
      loadAllInsights();
    } catch (e) {
      showToast('Training failed: ' + e.message, 'error');
    } finally {
      btn.textContent = '\uD83D\uDD04 Retrain ML Models';
      btn.disabled = false;
    }
  });

  document.getElementById('importHistoryBtn').addEventListener('click', async () => {
    const btn = document.getElementById('importHistoryBtn');
    btn.textContent = '\u23F3 Importing...';
    btn.disabled = true;
    try {
      await importChromeHistory();
      showToast('Chrome history imported!', 'success');
    } catch (e) {
      showToast('Import failed: ' + e.message, 'error');
    } finally {
      btn.textContent = '\uD83D\uDCE5 Import Chrome History';
      btn.disabled = false;
    }
  });

  const toggle = document.getElementById('modelsInfoToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const card = toggle.closest('.collapsible');
      card.classList.toggle('open');
      document.getElementById('modelsInfoDisplay').classList.toggle('collapsed');
    });
  }
}

async function loadAllInsights() {
  if (!backendOnline) {
    showInsightsOfflineState();
    return;
  }

  await Promise.allSettled([
    loadProductivityPrediction(),
    loadBrowsingCluster(),
    loadAnomalyDetection(),
    loadClassification(),
    loadForecast(),
    loadOptimalSchedule(),
    loadModelsInfo()
  ]);
}

function showInsightsOfflineState() {
  var msg = '<p style="color:var(--text-secondary);text-align:center;">Start the Flask backend to see ML insights.<br><code>cd backend && python app.py</code></p>';
  document.getElementById('productivityDetails').innerHTML = msg;
  document.getElementById('clusterDisplay').innerHTML = msg;
  document.getElementById('anomalyDisplay').innerHTML = msg;
  document.getElementById('classificationDisplay').innerHTML = msg;
  document.getElementById('forecastSummary').innerHTML = msg;
  document.getElementById('scheduleDisplay').innerHTML = msg;
}

// --- Productivity Prediction ---
async function loadProductivityPrediction() {
  try {
    const result = await backendAPI.predictProductivity();
    const score = Math.round(result.predicted_score || 0);
    const circle = document.getElementById('predictedScore');
    circle.style.setProperty('--score-pct', score);
    circle.querySelector('.score-number').textContent = score;

    var ci = result.confidence_interval || {};
    var html = '<p>' + getProductivityMessage(score) + '</p>';
    if (ci.lower !== undefined) html += '<p class="confidence">Range: ' + Math.round(ci.lower) + '% \u2014 ' + Math.round(ci.upper) + '%</p>';
    if (result.features_used) html += '<p class="confidence">Based on ' + result.features_used + ' features</p>';
    document.getElementById('productivityDetails').innerHTML = html;
  } catch (e) {
    document.getElementById('productivityDetails').innerHTML = '<p>Not enough data for prediction yet.</p>';
  }
}

function getProductivityMessage(score) {
  if (score >= 80) return '\uD83C\uDF1F Excellent productivity! Keep up the great work.';
  if (score >= 60) return '\uD83D\uDC4D Good productivity. Try to maintain focus.';
  if (score >= 40) return '\uD83D\uDCCA Average productivity. Consider reducing distractions.';
  return '\u26A0\uFE0F Low productivity. Try the focus recommendations below.';
}

// --- Browsing Cluster ---
async function loadBrowsingCluster() {
  try {
    const result = await backendAPI.getInsights();
    const cluster = result.cluster || {};
    const display = document.getElementById('clusterDisplay');

    const clusterEmoji = {
      'Focus Worker': '\uD83C\uDFAF',
      'Social Butterfly': '\uD83E\uDD8B',
      'Content Consumer': '\uD83D\uDCFA',
      'Balanced Browser': '\u2696\uFE0F',
      'Casual Surfer': '\uD83C\uDFC4'
    };

    const label = cluster.label || 'Analyzing...';
    const emoji = clusterEmoji[label] || '\uD83D\uDCCA';

    var barsHtml = '';
    if (cluster.features) {
      var f = cluster.features;
      var bars = [
        { label: 'Productive', value: f.productive_ratio || 0, cls: 'productive' },
        { label: 'Social', value: f.social_ratio || 0, cls: 'social' },
        { label: 'Entertainment', value: f.entertainment_ratio || 0, cls: 'entertainment' },
        { label: 'News', value: f.news_ratio || 0, cls: 'news' },
        { label: 'Shopping', value: f.shopping_ratio || 0, cls: 'shopping' }
      ];
      barsHtml = '<div class="cluster-bars">';
      bars.forEach(function(b) {
        barsHtml += '<div class="cluster-bar-item"><span class="cluster-bar-label">' + b.label + '</span><div class="cluster-bar-track"><div class="cluster-bar-fill ' + b.cls + '" style="width:' + Math.round(b.value * 100) + '%"></div></div><span class="cluster-bar-value">' + Math.round(b.value * 100) + '%</span></div>';
      });
      barsHtml += '</div>';
    }

    display.innerHTML = '<div class="cluster-label">' + emoji + ' ' + label + '</div><div class="cluster-description">' + (cluster.description || 'Your browsing habits are being analyzed.') + '</div>' + barsHtml;
  } catch (e) {
    document.getElementById('clusterDisplay').innerHTML = '<div class="cluster-label">Collecting data...</div>';
  }
}

// --- Anomaly Detection ---
async function loadAnomalyDetection() {
  try {
    const result = await backendAPI.detectAnomaly();
    const display = document.getElementById('anomalyDisplay');

    var severityIcons = { normal: '\u2705', mild: '\u26A1', moderate: '\u26A0\uFE0F', severe: '\uD83D\uDEA8' };
    var severity = result.severity || 'normal';

    var recsHtml = '';
    if (result.recommendations && result.recommendations.length > 0) {
      recsHtml = '<div class="anomaly-recommendations"><strong>Suggestions:</strong><ul>';
      result.recommendations.forEach(function(r) { recsHtml += '<li>' + r + '</li>'; });
      recsHtml += '</ul></div>';
    }

    display.innerHTML = '<div class="anomaly-status"><span class="anomaly-icon">' + (severityIcons[severity] || '\u2705') + '</span><div><div class="anomaly-label ' + severity + '">' + severity.charAt(0).toUpperCase() + severity.slice(1) + ' Activity</div><div class="anomaly-details">' + (result.message || 'Browsing patterns appear normal.') + '</div></div></div>' + recsHtml;
  } catch (e) {
    document.getElementById('anomalyDisplay').innerHTML = '<p>Not enough data for anomaly detection.</p>';
  }
}

// --- Website Classification ---
async function loadClassification() {
  try {
    const tabs = await chrome.tabs.query({});
    var domains = [];
    tabs.forEach(function(tab) {
      try {
        var url = new URL(tab.url);
        if (url.protocol.startsWith('http') && domains.indexOf(url.hostname) === -1) {
          domains.push(url.hostname);
        }
      } catch (e) { /* skip */ }
    });

    if (domains.length === 0) {
      document.getElementById('classificationDisplay').innerHTML = '<p>No open tabs to classify.</p>';
      return;
    }

    const results = await backendAPI.classifyDomains(domains.slice(0, 12));
    var catIcons = { productive: '\uD83D\uDCBC', social: '\uD83D\uDCAC', entertainment: '\uD83C\uDFAC', news: '\uD83D\uDCF0', shopping: '\uD83D\uDED2', communication: '\u2709\uFE0F', other: '\uD83C\uDF10' };

    var html = '<div class="classification-grid">';
    results.forEach(function(r) {
      html += '<div class="classification-item"><span class="cat-icon">' + (catIcons[r.category] || '\uD83C\uDF10') + '</span><div class="cat-info"><div class="cat-domain">' + r.domain + '</div><div class="cat-label">' + r.category + ' (' + Math.round((r.confidence || 0) * 100) + '%)</div></div></div>';
    });
    html += '</div>';
    document.getElementById('classificationDisplay').innerHTML = html;
  } catch (e) {
    document.getElementById('classificationDisplay').innerHTML = '<p>Classification unavailable.</p>';
  }
}

// --- Forecast ---
async function loadForecast() {
  try {
    const result = await backendAPI.getForecast(7);
    if (!result || !result.forecasts || result.forecasts.length === 0) {
      document.getElementById('forecastSummary').innerHTML = '<p>Not enough data for forecasting.</p>';
      return;
    }

    var labels = result.forecasts.map(function(f) { return f.date; });
    var totalTime = result.forecasts.map(function(f) { return f.total_time || 0; });
    var productive = result.forecasts.map(function(f) { return f.productive_time || 0; });

    var ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChartInstance) forecastChartInstance.destroy();
    forecastChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Total Time (hrs)', data: totalTime, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', tension: 0.4, fill: true },
          { label: 'Productive (hrs)', data: productive, borderColor: '#188038', backgroundColor: 'rgba(24,128,56,0.1)', tension: 0.4, fill: true }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, title: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } }, x: { ticks: { font: { size: 10 } } } }
      }
    });

    var avg = (totalTime.reduce(function(a, b) { return a + b; }, 0) / totalTime.length).toFixed(1);
    document.getElementById('forecastSummary').innerHTML = '<p>\uD83D\uDCCA 7-day forecast based on your browsing patterns. Predicted avg: ' + avg + ' hrs/day.</p>';
  } catch (e) {
    document.getElementById('forecastSummary').innerHTML = '<p>Forecasting needs more historical data.</p>';
  }
}

// --- Optimal Schedule ---
async function loadOptimalSchedule() {
  try {
    const result = await backendAPI.getOptimalSchedule();
    var display = document.getElementById('scheduleDisplay');
    if (!result || !result.schedule || result.schedule.length === 0) {
      renderSchedule(display, generateLocalSchedule());
      return;
    }
    renderSchedule(display, result.schedule);
  } catch (e) {
    renderSchedule(document.getElementById('scheduleDisplay'), generateLocalSchedule());
  }
}

function renderSchedule(container, schedule) {
  var html = '<div class="schedule-timeline">';
  schedule.slice(0, 10).forEach(function(slot) {
    var type = slot.recommendation || slot.type || 'light_work';
    var hour = slot.hour !== undefined ? String(slot.hour).padStart(2, '0') + ':00' : '';
    var label = type.replace(/_/g, ' ');
    html += '<div class="schedule-slot ' + type + '"><span class="schedule-time">' + hour + '</span><span class="schedule-type">' + label + '</span></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function generateLocalSchedule() {
  var hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  return hours.map(function(h) {
    var type = 'light_work';
    if (h >= 9 && h <= 11) type = 'deep_focus';
    else if (h === 12 || h === 13) type = 'break_needed';
    else if (h >= 14 && h <= 16) type = 'light_work';
    else if (h >= 17) type = 'leisure';
    return { hour: h, type: type };
  });
}

// --- Models Info ---
async function loadModelsInfo() {
  try {
    const result = await backendAPI.getModelsInfo();
    var display = document.getElementById('modelsInfoDisplay');
    if (!result || !result.models) {
      display.innerHTML = '<p>No model info available.</p>';
      return;
    }

    var html = '<div class="models-grid">';
    Object.keys(result.models).forEach(function(name) {
      var info = result.models[name];
      var trained = info.trained || false;
      html += '<div class="model-status-item"><span class="model-name">' + name + '</span><span class="model-state ' + (trained ? 'trained' : 'untrained') + '">' + (trained ? 'Trained' : 'Untrained') + '</span></div>';
    });
    html += '</div>';
    display.innerHTML = html;
  } catch (e) {
    document.getElementById('modelsInfoDisplay').innerHTML = '<p>Cannot load model info.</p>';
  }
}

// ============================================
// CHROME HISTORY IMPORT
// ============================================
async function importChromeHistory() {
  return new Promise(function(resolve, reject) {
    chrome.history.search({
      text: '',
      maxResults: 5000,
      startTime: Date.now() - (30 * 24 * 60 * 60 * 1000)
    }, async function(results) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!results || results.length === 0) {
        reject(new Error('No Chrome history found.'));
        return;
      }

      var historyItems = results.map(function(item) {
        return {
          url: item.url,
          title: item.title || '',
          visit_count: item.visitCount || 1,
          last_visit: item.lastVisitTime ? new Date(item.lastVisitTime).toISOString() : new Date().toISOString()
        };
      });

      try {
        if (backendOnline && typeof backendAPI !== 'undefined') {
          await backendAPI.importHistory(historyItems);
        }
        resolve(historyItems.length);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ============================================
// SYNC DATA TO BACKEND
// ============================================
async function syncDataToBackend() {
  if (!backendOnline || typeof backendAPI === 'undefined') {
    throw new Error('Backend not connected');
  }

  const { tabData, tabGroups } = await chrome.storage.local.get(['tabData', 'tabGroups']);

  var tabs = [];
  var events = [];
  Object.keys(tabData || {}).forEach(function(tabId) {
    var data = tabData[tabId];
    tabs.push({ tab_id: parseInt(tabId), url: data.url || '', title: data.title || data.domain || '', domain: data.domain || '', active_time: data.totalActiveTime || 0 });
    events.push({ tab_id: parseInt(tabId), event_type: 'tracked', domain: data.domain || '', url: data.url || '', timestamp: new Date(data.startTime || Date.now()).toISOString() });
  });

  var domainStats = [];
  Object.keys(tabGroups || {}).forEach(function(domain) {
    var data = tabGroups[domain];
    domainStats.push({ domain: domain, total_time: data.totalTime || 0, visit_count: data.tabs ? data.tabs.length : 0 });
  });

  await backendAPI.syncData({
    session: { start_time: new Date().toISOString(), is_active: true },
    tabs: tabs,
    events: events,
    domain_stats: domainStats
  });
}

// ============================================
// OVERVIEW CHARTS
// ============================================
function createTimeChart(tabGroups) {
  if (typeof Chart === 'undefined') return;
  if (!Object.keys(tabGroups).length) {
    var ctx = document.getElementById('timeChart').getContext('2d');
    ctx.font = '14px Google Sans, sans-serif';
    ctx.fillStyle = '#9aa0a6';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet. Start browsing!', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  var ctx = document.getElementById('timeChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(tabGroups),
      datasets: [{ data: Object.values(tabGroups).map(function(g) { return g.totalTime / 60000; }), backgroundColor: generateColors(Object.keys(tabGroups).length) }]
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Time Spent by Website' } } }
  });
}

async function addDetailedAnalytics(tabGroups, tabData) {
  if (Object.keys(tabData).length > 0) {
    new Chart(document.getElementById('dailyPattern').getContext('2d'), {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, function(_, i) { return i + ':00'; }),
        datasets: [{ label: 'Tab Activity', data: calculateHourlyActivity(tabData), borderColor: '#4285f4', backgroundColor: 'rgba(66, 133, 244, 0.1)', tension: 0.4, fill: true }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } } }
    });

    var productivityRatio = await calculateProductivityRatio(tabData);
    new Chart(document.getElementById('productivity').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Productive', 'Social', 'Other'],
        datasets: [{ data: productivityRatio, backgroundColor: ['#34A853', '#EA4335', '#FBBC05'] }]
      },
      options: { responsive: true, plugins: { title: { display: true, text: 'Time Distribution' } } }
    });
  } else {
    document.getElementById('dailyPattern').style.display = 'none';
    document.getElementById('productivity').style.display = 'none';
  }

  var lifecycle = document.getElementById('tabLifecycle');
  lifecycle.innerHTML = '<h3>Tab Lifecycle</h3><div class="tab-timeline">' + generateTabTimeline(tabData) + '</div>';
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================
function displayTabGroups(tabGroups) {
  var container = document.getElementById('tabGroups');
  container.innerHTML = '';
  if (!tabGroups || !Object.keys(tabGroups).length) {
    container.innerHTML = '<p class="empty-state">No tab groups yet. Open some tabs to get started!</p>';
    return;
  }

  chrome.storage.local.get(['settings'], function(result) {
    var stgs = result.settings;
    if (!stgs) return;
    var sortedGroups = Object.entries(tabGroups).sort(function(a, b) {
      var aLimit = stgs.siteLimits[a[0]];
      var bLimit = stgs.siteLimits[b[0]];
      var aExceeded = aLimit && (a[1].totalTime / 60000) >= aLimit;
      var bExceeded = bLimit && (b[1].totalTime / 60000) >= bLimit;
      if (aExceeded && !bExceeded) return -1;
      if (!aExceeded && bExceeded) return 1;
      return b[1].totalTime - a[1].totalTime;
    });

    sortedGroups.forEach(function(entry) {
      var domain = entry[0], data = entry[1];
      var el = document.createElement('div');
      el.className = 'group-item';
      var limit = stgs.siteLimits[domain];
      var mins = data.totalTime / 60000;
      var warning = '';
      if (limit && mins >= limit) {
        el.classList.add('time-limit-reached');
        warning = '<div class="time-warning"><p>Time limit reached! ' + Math.floor(mins) + ' min on ' + domain + '.</p><button>Close All Tabs</button></div>';
      }
      el.innerHTML = '<h3>' + domain + '</h3><p>Open tabs: ' + data.tabs.length + '</p><p>Total time: ' + formatTime(data.totalTime) + '</p>' + warning;
      if (limit && mins >= limit) {
        el.querySelector('.time-warning button').addEventListener('click', function() { closeTabsByDomain(domain); });
      }
      container.appendChild(el);
    });
  });
}

function displayInactiveTabs(tabData) {
  var container = document.getElementById('inactiveTabs');
  container.innerHTML = '';
  if (!Object.keys(tabData).length) {
    container.innerHTML = '<p class="empty-state">No inactive tabs detected.</p>';
    return;
  }

  var threshold = 5 * 60 * 1000;
  var now = Date.now();
  var found = false;

  Object.keys(tabData).forEach(function(tabId) {
    var data = tabData[tabId];
    if (data.lastInactiveTime && (now - data.lastInactiveTime > threshold)) {
      found = true;
      var el = document.createElement('div');
      el.className = 'inactive-tab';
      var info = document.createElement('div');
      info.innerHTML = '<p>' + data.domain + '</p><p>Inactive for: ' + formatTime(now - data.lastInactiveTime) + '</p>';
      var btn = document.createElement('button');
      btn.textContent = 'Close';
      btn.addEventListener('click', function() { closeTab(tabId); });
      el.appendChild(info);
      el.appendChild(btn);
      container.appendChild(el);
    }
  });

  if (!found) container.innerHTML = '<p class="empty-state">All tabs are active!</p>';
}

// ============================================
// HISTORY TAB
// ============================================
function setupHistoryHandlers() {
  var periodSelect = document.getElementById('historyPeriod');
  if (periodSelect) periodSelect.addEventListener('change', loadHistoryData);

  var exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async function() {
      try {
        exportBtn.textContent = 'Exporting...';
        exportBtn.disabled = true;
        if (typeof DatabaseQueryHelper !== 'undefined') {
          await DatabaseQueryHelper.downloadDataAsJSON();
          exportBtn.textContent = '\u2713 Exported!';
        } else if (backendOnline) {
          var data = await backendAPI.exportAllData();
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'supriai-export-' + new Date().toISOString().split('T')[0] + '.json';
          a.click();
          URL.revokeObjectURL(url);
          exportBtn.textContent = '\u2713 Exported!';
        } else {
          throw new Error('No database available');
        }
      } catch (e) {
        exportBtn.textContent = '\u2717 Failed';
      } finally {
        setTimeout(function() { exportBtn.textContent = 'Export Data'; exportBtn.disabled = false; }, 2000);
      }
    });
  }
}

async function loadHistoryData() {
  try {
    var period = document.getElementById('historyPeriod').value;

    if (typeof DatabaseQueryHelper !== 'undefined') {
      var summary = await DatabaseQueryHelper.getBrowsingSummary(period);
      document.getElementById('historyTotalTabs').textContent = summary.totalTabs || 0;
      document.getElementById('historyUniqueDomains').textContent = summary.uniqueDomains || 0;
      document.getElementById('historyTotalTime').textContent = summary.totalActiveTimeFormatted || '0s';
      document.getElementById('historyTotalVisits').textContent = summary.totalVisits || 0;

      var topDomains = await DatabaseQueryHelper.getMostVisitedDomains(5, period);
      displayTopDomains(topDomains);
      displayRecentTabs(summary.tabs || []);
    } else {
      displayHistoryPlaceholder();
    }

    if (backendOnline && typeof backendAPI !== 'undefined') {
      loadProductivityTimeline();
    }
  } catch (e) {
    console.error('Error loading history:', e);
    displayHistoryError(e.message);
  }
}

async function loadProductivityTimeline() {
  try {
    var scores = await backendAPI.getProductivityScores();
    if (!scores || scores.length === 0) return;

    var ctx = document.getElementById('productivityTimeline');
    if (!ctx) return;

    if (productivityTimelineChart) productivityTimelineChart.destroy();
    productivityTimelineChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: scores.map(function(s) { return s.date; }),
        datasets: [{
          label: 'Productivity Score',
          data: scores.map(function(s) { return s.score; }),
          borderColor: '#188038',
          backgroundColor: 'rgba(24,128,56,0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#188038'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } }, x: { ticks: { font: { size: 10 } } } }
      }
    });
  } catch (e) {
    console.log('Productivity timeline not available:', e.message);
  }
}

function displayTopDomains(domains) {
  var container = document.getElementById('topDomainsList');
  if (!domains || !domains.length) {
    container.innerHTML = '<div class="empty-history"><div class="empty-history-text">No browsing data yet.</div></div>';
    return;
  }
  var html = '';
  domains.forEach(function(d, i) {
    var time = typeof DatabaseQueryHelper !== 'undefined' ? DatabaseQueryHelper.formatTime(d.totalActiveTime) : formatTime(d.totalActiveTime);
    html += '<div class="domain-item"><span class="domain-name">' + (i + 1) + '. ' + d.domain + '</span><div class="domain-stats"><span>' + d.visitCount + ' visits</span><span>' + time + '</span></div></div>';
  });
  container.innerHTML = html;
}

function displayRecentTabs(tabs) {
  var container = document.getElementById('recentTabsList');
  if (!tabs || !tabs.length) {
    container.innerHTML = '<div class="empty-history"><div class="empty-history-text">No recent tabs.</div></div>';
    return;
  }
  var html = '';
  tabs.slice(0, 10).forEach(function(tab) {
    var date = new Date(tab.timestamp).toLocaleString();
    var time = typeof DatabaseQueryHelper !== 'undefined' ? DatabaseQueryHelper.formatTime(tab.activeTime || 0) : formatTime(tab.activeTime || 0);
    html += '<div class="tab-item"><div class="tab-item-title">' + (tab.title || tab.domain) + '</div><div class="tab-item-url">' + tab.url + '</div><div class="tab-item-meta"><span>' + date + '</span><span>' + time + '</span></div></div>';
  });
  container.innerHTML = html;
}

function displayHistoryPlaceholder() {
  ['historyTotalTabs', 'historyUniqueDomains', 'historyTotalTime', 'historyTotalVisits'].forEach(function(id) {
    document.getElementById(id).textContent = '-';
  });
  document.getElementById('topDomainsList').innerHTML = '<div class="empty-history"><div class="empty-history-icon">\uD83D\uDCCA</div><div class="empty-history-text">Database initializing... Reload extension.</div></div>';
  document.getElementById('recentTabsList').innerHTML = '<div class="empty-history"><div class="empty-history-icon">\uD83D\uDCDD</div><div class="empty-history-text">Recent tabs will appear soon.</div></div>';
}

function displayHistoryError(msg) {
  var html = '<div class="empty-history"><div class="empty-history-icon">\u26A0\uFE0F</div><div class="empty-history-text">Error: ' + msg + '</div></div>';
  document.getElementById('topDomainsList').innerHTML = html;
  document.getElementById('recentTabsList').innerHTML = html;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatTime(ms) {
  var minutes = Math.floor(ms / 60000);
  var hours = Math.floor(minutes / 60);
  return hours > 0 ? hours + 'h ' + (minutes % 60) + 'm' : minutes + 'm';
}

function generateColors(count) {
  var palette = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FA7B17', '#F439A0', '#A142F4', '#24C1E0'];
  var colors = [];
  for (var i = 0; i < count; i++) colors.push(palette[i % palette.length]);
  return colors;
}

function closeTab(tabId) {
  chrome.tabs.remove(parseInt(tabId));
  chrome.storage.local.get(['tabData'], function(result) {
    var tabData = result.tabData;
    delete tabData[tabId];
    chrome.storage.local.set({ tabData: tabData });
    displayInactiveTabs(tabData);
  });
}

function closeTabsByDomain(domain) {
  chrome.runtime.sendMessage({ action: 'closeTabs', domain: domain }, function(response) {
    if (response && response.success) {
      chrome.storage.local.get(['tabData', 'tabGroups'], function(result) {
        displayTabGroups(result.tabGroups);
      });
    }
  });
}

function calculateHourlyActivity(tabData) {
  var hourly = new Array(24).fill(0);
  Object.values(tabData).forEach(function(tab) {
    var hour = new Date(tab.lastActiveTime).getHours();
    hourly[hour] += tab.totalActiveTime / 60000;
  });
  return hourly;
}

async function calculateProductivityRatio(tabData) {
  var productive = 0, social = 0, other = 0;
  var result = await chrome.storage.local.get(['settings']);
  var stgs = result.settings;
  if (!stgs) return [0, 0, 0];
  Object.values(tabData).forEach(function(tab) {
    if (stgs.productiveSites.includes(tab.domain)) productive += tab.totalActiveTime;
    else if (stgs.socialSites.includes(tab.domain)) social += tab.totalActiveTime;
    else other += tab.totalActiveTime;
  });
  return [productive / 60000, social / 60000, other / 60000];
}

function generateTabTimeline(tabData) {
  var sorted = Object.entries(tabData).sort(function(a, b) { return b[1].startTime - a[1].startTime; });
  if (!sorted.length) return '<p class="empty-state">No tab history available</p>';
  var html = '';
  sorted.forEach(function(entry) {
    var data = entry[1];
    var time = new Date(data.startTime).toLocaleTimeString();
    html += '<div class="timeline-item"><span class="time">' + time + '</span><span class="domain">' + data.domain + '</span><span class="duration">' + formatTime(data.totalActiveTime) + '</span></div>';
  });
  return html;
}

async function initializeSettings() {
  var result = await chrome.storage.local.get(['settings']);
  var stgs = result.settings;
  if (!stgs) return;
  displayTimeLimits(stgs.siteLimits);
  displaySiteList(stgs.productiveSites, 'productiveSitesList');
  displaySiteList(stgs.socialSites, 'socialSitesList');
}

function displayTimeLimits(limits) {
  var container = document.getElementById('currentLimits');
  container.innerHTML = '';
  Object.keys(limits).forEach(function(domain) {
    var minutes = limits[domain];
    var item = document.createElement('div');
    item.className = 'limit-item';
    item.innerHTML = '<span>' + domain + ': ' + minutes + ' minutes</span><button class="remove-button">Remove</button>';
    item.querySelector('button').addEventListener('click', async function() {
      var result = await chrome.storage.local.get(['settings']);
      delete result.settings.siteLimits[domain];
      await chrome.storage.local.set({ settings: result.settings });
      displayTimeLimits(result.settings.siteLimits);
    });
    container.appendChild(item);
  });
}

function displaySiteList(sites, containerId) {
  var container = document.getElementById(containerId);
  container.innerHTML = '';
  sites.forEach(function(domain) {
    var item = document.createElement('div');
    item.className = 'site-list-item';
    item.innerHTML = '<span>' + domain + '</span><button class="remove-button">Remove</button>';
    item.querySelector('button').addEventListener('click', async function() {
      var result = await chrome.storage.local.get(['settings']);
      var cat = containerId === 'productiveSitesList' ? 'productiveSites' : 'socialSites';
      result.settings[cat] = result.settings[cat].filter(function(s) { return s !== domain; });
      await chrome.storage.local.set({ settings: result.settings });
      displaySiteList(result.settings[cat], containerId);
    });
    container.appendChild(item);
  });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function() { toast.classList.add('show'); });
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}