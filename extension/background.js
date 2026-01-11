// background.js
console.log("AI Learning Companion: Background Service Started");

const SERVER_URL = "http://localhost:5000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "LOG_ACTIVITY") {
        sendDataToBackend(message.data);
    }
});

async function sendDataToBackend(data) {
    try {
        const response = await fetch(`${SERVER_URL}/log_activity`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log("Data logged:", result);

        // If the backend returns a recommendation immediately (optional)
        if (result.recommendation) {
            chrome.storage.local.set({ latestRecommendation: result.recommendation });
        }

    } catch (error) {
        console.warn("Backend not reachable. Storing locally for retry.");
        storeLocally(data);
    }
}

function storeLocally(data) {
    chrome.storage.local.get(['offlineLogs'], (result) => {
        const logs = result.offlineLogs || [];
        logs.push(data);
        chrome.storage.local.set({ offlineLogs: logs });
    });
}

// Retry mechanism (every 5 mins)
chrome.alarms.create("retrySync", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "retrySync") {
        syncOfflineLogs();
    }
});

async function syncOfflineLogs() {
    chrome.storage.local.get(['offlineLogs'], async (result) => {
        const logs = result.offlineLogs || [];
        if (logs.length === 0) return;

        try {
            // Try sending the first bunch
            const response = await fetch(`${SERVER_URL}/bulk_log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logs)
            });

            if (response.ok) {
                console.log("Synced offline logs.");
                chrome.storage.local.set({ offlineLogs: [] });
            }
        } catch (e) {
            // Still offline
        }
    });
}
