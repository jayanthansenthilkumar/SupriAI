/**
 * SupriAI Content Script
 * Tracks user learning activity on web pages
 * Sends data to background script for processing
 */

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    MIN_DURATION: 5,           // Minimum seconds before logging
    SYNC_INTERVAL: 30000,      // Sync every 30 seconds
    MAX_CONTENT_LENGTH: 3000,  // Maximum content to extract
    SCROLL_DEBOUNCE: 100,      // Scroll debounce ms
    IDLE_TIMEOUT: 60000        // Consider idle after 60 seconds
};


// ==========================================
// STATE
// ==========================================

let state = {
    startTime: Date.now(),
    maxScroll: 0,
    interactions: {
        clicks: 0,
        keystrokes: 0,
        mouseDistance: 0,
        scrollDepths: []
    },
    lastActivity: Date.now(),
    lastMouseX: 0,
    lastMouseY: 0,
    isIdle: false,
    hasSynced: false
};


// ==========================================
// INITIALIZATION
// ==========================================

console.log("🚀 SupriAI: Content tracking active");

// Check if tracking is enabled
chrome.storage.local.get(['trackingPaused'], (result) => {
    if (result.trackingPaused) {
        console.log("SupriAI: Tracking is paused");
        return;
    }
    
    // Start tracking
    initializeTracking();
});


function initializeTracking() {
    // Setup event listeners
    setupEventListeners();
    
    // Setup periodic sync
    setupPeriodicSync();
    
    // Setup idle detection
    setupIdleDetection();
}


// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Mouse movement tracking
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Click tracking
    document.addEventListener('click', handleClick, { passive: true });
    
    // Scroll tracking (debounced)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, CONFIG.SCROLL_DEBOUNCE);
    }, { passive: true });
    
    // Keyboard tracking (for engagement)
    document.addEventListener('keydown', handleKeydown, { passive: true });
    
    // Page visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Before unload - final sync
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Page hide (for mobile/tab switching)
    window.addEventListener('pagehide', handlePageHide);
}


// ==========================================
// EVENT HANDLERS
// ==========================================

function handleMouseMove(e) {
    state.lastActivity = Date.now();
    state.isIdle = false;
    
    if (state.lastMouseX !== 0 && state.lastMouseY !== 0) {
        const dist = Math.sqrt(
            Math.pow(e.clientX - state.lastMouseX, 2) + 
            Math.pow(e.clientY - state.lastMouseY, 2)
        );
        state.interactions.mouseDistance += dist;
    }
    
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
}


function handleClick() {
    state.lastActivity = Date.now();
    state.isIdle = false;
    state.interactions.clicks++;
}


function handleScroll() {
    state.lastActivity = Date.now();
    state.isIdle = false;
    
    const scrollPos = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    
    if (docHeight > 0) {
        const scrolled = (scrollPos / docHeight) * 100;
        
        if (scrolled > state.maxScroll) {
            state.maxScroll = scrolled;
        }
        
        // Limit array growth
        if (state.interactions.scrollDepths.length < 500) {
            state.interactions.scrollDepths.push(Math.round(scrolled));
        }
    }
}


function handleKeydown() {
    state.lastActivity = Date.now();
    state.isIdle = false;
    state.interactions.keystrokes++;
}


function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        // Page hidden, sync data
        syncData('visibility_hidden');
    } else {
        // Page visible again, reset idle
        state.isIdle = false;
        state.lastActivity = Date.now();
    }
}


function handleBeforeUnload() {
    syncData('beforeunload');
}


function handlePageHide() {
    syncData('pagehide');
}


// ==========================================
// PERIODIC SYNC
// ==========================================

function setupPeriodicSync() {
    setInterval(() => {
        const duration = (Date.now() - state.startTime) / 1000;
        
        // Only sync if page has been active for minimum duration
        if (duration >= CONFIG.MIN_DURATION && !state.isIdle) {
            syncData('periodic');
        }
    }, CONFIG.SYNC_INTERVAL);
}


// ==========================================
// IDLE DETECTION
// ==========================================

function setupIdleDetection() {
    setInterval(() => {
        const timeSinceActivity = Date.now() - state.lastActivity;
        
        if (timeSinceActivity > CONFIG.IDLE_TIMEOUT && !state.isIdle) {
            state.isIdle = true;
            console.log("SupriAI: User idle detected");
        }
    }, 10000); // Check every 10 seconds
}


// ==========================================
// DATA SYNC
// ==========================================

function syncData(trigger = 'manual') {
    // Use requestIdleCallback for non-blocking operation
    const runSync = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    
    runSync(() => {
        const duration = (Date.now() - state.startTime) / 1000;
        
        // Don't log trivial visits
        if (duration < CONFIG.MIN_DURATION) return;
        
        // Don't sync if idle for too long
        if (state.isIdle && trigger === 'periodic') return;
        
        // Prepare payload
        const payload = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            duration: duration,
            engagement: {
                maxScroll: Math.round(state.maxScroll),
                clicks: state.interactions.clicks,
                keystrokes: state.interactions.keystrokes,
                mouseDistance: Math.round(state.interactions.mouseDistance)
            },
            content: extractPageContent(),
            trigger: trigger
        };
        
        // Send to background script
        try {
            chrome.runtime.sendMessage(
                { type: "LOG_ACTIVITY", data: payload },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("SupriAI: Extension context changed");
                        return;
                    }
                    
                    if (response && response.status === 'success') {
                        state.hasSynced = true;
                        
                        // Update popup with real-time session info
                        chrome.runtime.sendMessage({
                            type: 'SESSION_UPDATE',
                            data: {
                                duration: duration,
                                topic: response.topic
                            }
                        });
                    }
                }
            );
            
            // Update local storage for popup quick access
            chrome.storage.local.set({
                lastSessionTime: duration,
                lastSessionUrl: window.location.href
            });
            
        } catch (e) {
            // Extension context invalidated
            console.log("SupriAI: Could not sync data");
        }
    }, { timeout: 2000 });
}


// ==========================================
// CONTENT EXTRACTION
// ==========================================

function extractPageContent() {
    try {
        // Try to get main content first
        const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
        
        let text = '';
        
        if (mainContent) {
            text = mainContent.innerText;
        } else {
            // Fallback to body text
            text = document.body.innerText;
        }
        
        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\n{3,}/g, '\n\n')     // Remove excessive newlines
            .trim();
        
        // Limit length
        return text.substring(0, CONFIG.MAX_CONTENT_LENGTH);
        
    } catch (e) {
        return '';
    }
}


// ==========================================
// UTILITY: Get page metadata
// ==========================================

function getPageMetadata() {
    const metadata = {
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname,
        path: window.location.pathname
    };
    
    // Try to get meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metadata.description = metaDesc.content;
    }
    
    // Try to get Open Graph data
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
        metadata.ogTitle = ogTitle.content;
    }
    
    // Get headings for topic analysis
    const headings = [];
    document.querySelectorAll('h1, h2, h3').forEach((h, i) => {
        if (i < 10) { // Limit to first 10 headings
            headings.push(h.innerText.trim());
        }
    });
    metadata.headings = headings;
    
    return metadata;
}

setInterval(syncData, 60000);
