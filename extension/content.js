// content.js
console.log("AI Learning Companion: Tracking Active");

let startTime = Date.now();
let maxScroll = 0;
let interactions = {
    clicks: 0,
    mouseDistance: 0,
    scrollDepths: []
};

// Mouse Tracking
let lastMouseX = 0;
let lastMouseY = 0;

document.addEventListener('mousemove', (e) => {
    if (lastMouseX !== 0 && lastMouseY !== 0) {
        const dist = Math.sqrt(Math.pow(e.clientX - lastMouseX, 2) + Math.pow(e.clientY - lastMouseY, 2));
        interactions.mouseDistance += dist;
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

document.addEventListener('click', () => {
    interactions.clicks++;
});

// Scroll Tracking
document.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
        const scrolled = (scrollPos / docHeight) * 100;
        if (scrolled > maxScroll) maxScroll = scrolled;
        interactions.scrollDepths.push(Math.round(scrolled));
    }
});

// Periodic Sync (every 30 seconds) or on unload
const syncData = () => {
    // Performance: Use requestIdleCallback to avoid blocking the main thread during heavy syncs
    // Check if requestIdleCallback is supported (it is in Chrome)
    const runIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

    runIdle(() => {
        const duration = (Date.now() - startTime) / 1000; // seconds

        // Optimization: Don't log trivial visits (< 5s)
        if (duration < 5) return;

        const payload = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            duration: duration,
            engagement: {
                maxScroll: maxScroll,
                clicks: interactions.clicks,
                mouseDistance: Math.round(interactions.mouseDistance)
            },
            // Optimize: Content extraction can be heavy, limit to 3k chars
            content: document.body.innerText.substring(0, 3000)
        };

        // Send to background
        try {
            chrome.runtime.sendMessage({ type: "LOG_ACTIVITY", data: payload });

            // Local state update for popup to read fast
            chrome.storage.local.set({
                lastSessionTime: duration,
                lastSessionUrl: window.location.href
            });
        } catch (e) {
            // Extension context invalidated
        }
    }, { timeout: 2000 });
};

window.addEventListener('beforeunload', syncData);

// Performance: Debounce scroll to avoid high frequency function calls
let scrollTimeout;
document.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const scrollPos = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
            const scrolled = (scrollPos / docHeight) * 100;
            if (scrolled > maxScroll) maxScroll = scrolled;
            // Limit array growth
            if (interactions.scrollDepths.length < 1000) {
                interactions.scrollDepths.push(Math.round(scrolled));
            }
        }
    }, 100);
});

setInterval(syncData, 60000);
