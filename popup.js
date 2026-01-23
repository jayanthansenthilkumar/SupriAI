/**
 * SupriAI Popup - Extension Popup JavaScript
 * Backend connectivity for popup interface
 */

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = 'http://127.0.0.1:8000';


// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Load data from storage and backend
    loadPopupData();
    
    // Setup event listeners
    setupEventListeners();
});


// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Open Dashboard button
    document.getElementById('openDashboard')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });

    // Toggle Tracking button
    document.getElementById('toggleTracking')?.addEventListener('click', async () => {
        const btn = document.getElementById('toggleTracking');
        const badge = document.getElementById('statusBadge');

        if (btn.innerText.includes("Pause")) {
            // Pause tracking
            btn.innerHTML = `<i class="ri-play-circle-line"></i> Resume`;
            badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Paused`;
            badge.classList.add('paused');
            
            // Save state to storage
            chrome.storage.local.set({ trackingPaused: true });
            
            // Update backend settings
            // Backend removed

            
        } else {
            // Resume tracking
            btn.innerHTML = `<i class="ri-pause-circle-line"></i> Pause`;
            badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Active`;
            badge.classList.remove('paused');
            
            // Save state to storage
            chrome.storage.local.set({ trackingPaused: false });
            
            // Update backend settings
            // Backend removed

        }
    });
}


// ==========================================
// SERVER STATUS
// ==========================================

// Server Status Check Removed


// ==========================================
// DATA LOADING
// ==========================================

async function loadPopupData() {
    // First, load from local storage (fast)
    loadFromStorage();
    
    // Then fetch latest stats from backend
    try {
        const res = await fetch(`${API_URL}/api/analytics/summary`);
        const data = await res.json();
        updatePopupWithServerData(data);
    } catch (e) {
        console.log("Backend offline, using local cache");
    }
}

function loadFromStorage() {
    chrome.storage.local.get([
        'latestRecommendation', 
        'lastSessionTime', 
        'lastTopic',
        'todayTotalTime',
        'trackingPaused'
    ], (result) => {
        // Update topic display
        if (result.latestRecommendation) {
            const topic = result.latestRecommendation.topic || result.lastTopic || "General Browsing";
            updateElement('currentTopic', topic);

            // Update confidence bar
            const conf = result.latestRecommendation.confidence || 0;
            const confFill = document.getElementById('confFill');
            if (confFill) {
                confFill.style.width = `${conf}%`;
            }

            // Update icon based on topic
            updateTopicIcon(topic);
        }

        // Update session time
        if (result.lastSessionTime) {
            updateElement('sessionTime', formatTime(result.lastSessionTime));
        }

        // Update today's total
        if (result.todayTotalTime) {
            updateElement('todayTime', formatMinutes(result.todayTotalTime));
        }

        // Update tracking button state
        if (result.trackingPaused) {
            const btn = document.getElementById('toggleTracking');
            const badge = document.getElementById('statusBadge');
            if (btn) {
                btn.innerHTML = `<i class="ri-play-circle-line"></i> Resume`;
            }
            if (badge) {
                badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Paused`;
                badge.classList.add('paused');
            }
        }
    });
}

function updatePopupWithServerData(data) {
    // Update topic
    if (data.topics && data.topics.length > 0) {
        const topTopic = data.topics[0][0];
        updateElement('currentTopic', topTopic);
        updateTopicIcon(topTopic);
        chrome.storage.local.set({ lastTopic: topTopic });
    }

    // Update engagement score (derived from avg duration)
    if (data.avg_duration_seconds !== undefined) {
        const confFill = document.getElementById('confFill');
        if (confFill) {
            const percentage = Math.min(100, Math.round(data.avg_duration_seconds / 60 * 5));
            confFill.style.width = `${percentage}%`;
        }
    }

    // Update today's time
    if (data.total_duration_seconds !== undefined) {
        const totalMinutes = Math.round(data.total_duration_seconds / 60);
        updateElement('todayTime', formatMinutes(totalMinutes));
        chrome.storage.local.set({ todayTotalTime: totalMinutes });
    }
}


// ==========================================
// BACKEND COMMUNICATION
// ==========================================

async function updateTrackingStatus(enabled) {
    // Local update only
    console.log("Tracking status updated locally:", enabled);
}


// ==========================================
// UI UPDATES
// ==========================================

function updateTopicIcon(topic) {
    const iconEl = document.querySelector('.topic-icon');
    if (!iconEl) return;

    // Topic to icon mapping
    const iconMap = {
        'Programming': 'ri-code-s-slash-line',
        'Data Science': 'ri-bar-chart-grouped-fill',
        'Web Development': 'ri-global-line',
        'Mathematics': 'ri-calculator-line',
        'Science': 'ri-flask-line',
        'History': 'ri-ancient-gate-line',
        'Business': 'ri-briefcase-line',
        'Design': 'ri-palette-line',
        'Language Learning': 'ri-translate-2',
        'Personal Development': 'ri-user-star-line',
        'General Interest': 'ri-lightbulb-line',
        'General Browsing': 'ri-global-line'
    };

    // Find matching icon
    let iconClass = 'ri-global-line';
    for (const [key, value] of Object.entries(iconMap)) {
        if (topic.toLowerCase().includes(key.toLowerCase())) {
            iconClass = value;
            break;
        }
    }

    iconEl.className = `${iconClass} topic-icon`;
    iconEl.style.opacity = 1;
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatTime(seconds) {
    if (!seconds || seconds < 0) return "00:00";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatMinutes(minutes) {
    if (!minutes || minutes < 0) return "0m";
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    
    return `${mins}m`;
}


// ==========================================
// MESSAGE LISTENER (from background script)
// ==========================================

chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_POPUP') {
        loadPopupData();
    }
    
    if (message.type === 'SESSION_UPDATE') {
        if (message.data?.duration) {
            updateElement('sessionTime', formatTime(message.data.duration));
        }
        if (message.data?.topic) {
            updateElement('currentTopic', message.data.topic);
            updateTopicIcon(message.data.topic);
        }
    }
});