document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
});

document.getElementById('toggleTracking').addEventListener('click', () => {
    const btn = document.getElementById('toggleTracking');
    const badge = document.getElementById('statusBadge');

    // Simple UI Toggle for demo (Back-end logic would go here)
    if (btn.innerText.includes("Pause")) {
        btn.innerHTML = `<i class="ri-play-circle-line"></i> Resume`;
        badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Paused`;
        badge.classList.add('paused');
    } else {
        btn.innerHTML = `<i class="ri-pause-circle-line"></i> Pause`;
        badge.innerHTML = `<span class="dot" style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Active`;
        badge.classList.remove('paused');
    }
});

// Helper to format seconds to MM:SS
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Fetch current topic from storage
chrome.storage.local.get(['latestRecommendation', 'lastSessionTime'], (result) => {
    if (result.latestRecommendation) {
        const topic = result.latestRecommendation.topic || "General Browsing";
        document.getElementById('currentTopic').innerText = topic;

        // Update bar
        const conf = result.latestRecommendation.confidence || 0;
        document.getElementById('confFill').style.width = `${conf}%`;

        // Update Icon based on topic (Simple header check)
        const iconEl = document.querySelector('.topic-icon');
        if (topic.includes('Code') || topic.includes('Program')) iconEl.className = 'ri-code-s-slash-line topic-icon';
        else if (topic.includes('Math')) iconEl.className = 'ri-calculator-line topic-icon';
        else iconEl.className = 'ri-global-line topic-icon'; // Default
        iconEl.style.opacity = 1;
    }

    if (result.lastSessionTime) {
        document.getElementById('sessionTime').innerText = formatTime(result.lastSessionTime);
        // Mock a "Today" total by adding a bit to session
        document.getElementById('todayTime').innerText = Math.floor(result.lastSessionTime / 60 + 12) + "m";
    }
});
