/**
 * SupriAI Popup - Extension Popup JavaScript
 * Backend connectivity for popup interface
 */

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = "http://localhost:5000";


// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Load data from storage and backend
    loadPopupData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check server status
    checkServerStatus();
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
            await updateTrackingStatus(false);
            
        } else {
            // Resume tracking
            btn.innerHTML = `<i class="ri-pause-circle-line"></i> Pause`;
            badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Active`;
            badge.classList.remove('paused');
            
            // Save state to storage
            chrome.storage.local.set({ trackingPaused: false });
            
            // Update backend settings
            await updateTrackingStatus(true);
        }
    });
}


// ==========================================
// SERVER STATUS
// ==========================================

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            // Server is running
            updateServerIndicator(true);
        } else {
            updateServerIndicator(false);
        }
    } catch (e) {
        updateServerIndicator(false);
    }
}

function updateServerIndicator(isOnline) {
    const badge = document.getElementById('statusBadge');
    if (!badge) return;
    
    // Check if tracking is paused
    chrome.storage.local.get(['trackingPaused'], (result) => {
        if (result.trackingPaused) {
            badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Paused`;
            badge.classList.add('paused');
        } else if (isOnline) {
            badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Active`;
            badge.classList.remove('paused');
        } else {
            badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:#f9ab00;border-radius:50%"></span> Offline`;
            badge.classList.add('paused');
        }
    });
}


// ==========================================
// DATA LOADING
// ==========================================

async function loadPopupData() {
    // First, load from local storage (fast)
    loadFromStorage();
    
    // Then, try to get fresh data from backend
    try {
        const response = await fetch(`${API_URL}/get_analytics?days=1`, {
            signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
            const data = await response.json();
            updatePopupWithServerData(data);
        }
    } catch (e) {
        console.log("Using cached data (server unavailable)");
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
    if (data.top_topic && data.top_topic !== 'None') {
        updateElement('currentTopic', data.top_topic);
        updateTopicIcon(data.top_topic);
        
        // Save to storage for next time
        chrome.storage.local.set({ lastTopic: data.top_topic });
    }

    // Update engagement score
    if (data.engagement_score !== undefined) {
        const confFill = document.getElementById('confFill');
        if (confFill) {
            confFill.style.width = `${data.engagement_score}%`;
        }
    }

    // Update today's time
    if (data.total_minutes !== undefined) {
        updateElement('todayTime', formatMinutes(data.total_minutes));
        chrome.storage.local.set({ todayTotalTime: data.total_minutes });
    }

    // Update streak
    if (data.streak_days !== undefined) {
        // Could add streak display to popup if needed
    }
}


// ==========================================
// BACKEND COMMUNICATION
// ==========================================

async function updateTrackingStatus(enabled) {
    try {
        await fetch(`${API_URL}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracking_enabled: enabled ? 1 : 0 })
        });
    } catch (e) {
        console.log("Could not update server settings");
    }
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
        // Refresh popup data when new activity is logged
        loadPopupData();
    }
    
    if (message.type === 'SESSION_UPDATE') {
        // Update session time in real-time
        if (message.data?.duration) {
            updateElement('sessionTime', formatTime(message.data.duration));
        }
        if (message.data?.topic) {
            updateElement('currentTopic', message.data.topic);
            updateTopicIcon(message.data.topic);
        }
    }
});
