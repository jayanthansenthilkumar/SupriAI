/**
 * SupriAI Dashboard - Main JavaScript
 * Complete frontend connectivity with backend API
 */

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = "http://localhost:5000";
let trendChart, topicChart;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SupriAI Dashboard Initializing...");

    // Setup navigation
    setupNavigation();

    // Fetch user identity
    fetchUserIdentity();

    // Initialize charts
    if (typeof Chart !== 'undefined') {
        initCharts();
    } else {
        console.warn("Chart.js not loaded.");
    }

    // Load initial data
    loadDashboardData();

    // Setup event listeners
    setupEventListeners();

    // Check server status
    checkServerStatus();
});


// ==========================================
// SERVER STATUS CHECK
// ==========================================

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            console.log("✅ Backend server connected");
            showToast("Connected to SupriAI Server", "success");
        }
    } catch (e) {
        console.warn("⚠️ Backend server not available");
        showToast("Server offline. Run 'python app.py' in backend folder", "error");
    }
}


// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show target view
            document.querySelectorAll('.page-view').forEach(view => view.style.display = 'none');
            const targetId = `view-${item.dataset.target}`;
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.style.display = 'block';
            }

            // Update page title
            const titleMap = {
                'dashboard': 'Dashboard',
                'analytics': 'Analytics',
                'calendar': 'Schedule',
                'academy': 'Academy',
                'library': 'My Library',
                'reviews': 'Reviews',
                'goals': 'Goals & Streak',
                'community': 'Community',
                'settings': 'Settings'
            };
            document.getElementById('pageTitle').innerText = titleMap[item.dataset.target] || 'Dashboard';

            // Load view-specific data
            loadViewData(item.dataset.target);
        });
    });
}


// ==========================================
// USER IDENTITY
// ==========================================

function fetchUserIdentity() {
    // Check if running in extension context
    if (typeof chrome !== 'undefined' && chrome.identity) {
        chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
            if (chrome.runtime.lastError) {
                console.warn("Identity Error:", chrome.runtime.lastError);
                loadUserFromBackend();
                return;
            }

            if (userInfo && userInfo.email) {
                updateUserDisplay(userInfo.email);
            } else {
                loadUserFromBackend();
            }
        });
    } else {
        loadUserFromBackend();
    }
}

async function loadUserFromBackend() {
    try {
        const response = await fetch(`${API_URL}/api/user`);
        const data = await response.json();

        if (data.status === 'success' && data.user) {
            const nameEl = document.querySelector('.user-info .name');
            const avatarEl = document.querySelector('.user-profile .avatar');
            const smAvatarEl = document.querySelector('.avatar-sm');

            if (nameEl) nameEl.textContent = data.user.display_name || 'User';
            if (avatarEl) avatarEl.textContent = data.user.avatar_initial || 'U';
            if (smAvatarEl) smAvatarEl.textContent = data.user.avatar_initial || 'U';
        }
    } catch (e) {
        console.warn("Could not load user from backend:", e);
    }
}

function updateUserDisplay(email) {
    const nameEl = document.querySelector('.user-info .name');
    const avatarEl = document.querySelector('.user-profile .avatar');
    const smAvatarEl = document.querySelector('.avatar-sm');

    let displayName = email.split('@')[0];
    displayName = displayName.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    if (nameEl) nameEl.textContent = displayName;

    const initials = displayName.substring(0, 1).toUpperCase();
    if (avatarEl) avatarEl.textContent = initials;
    if (smAvatarEl) smAvatarEl.textContent = initials;
}


// ==========================================
// CHARTS INITIALIZATION
// ==========================================

function initCharts() {
    const colors = {
        blue: '#1a73e8',
        green: '#188038',
        yellow: '#f9ab00',
        red: '#d93025',
        purple: '#a142f4',
        text: '#5f6368',
        grid: '#f1f3f4'
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                grid: { color: colors.grid, drawBorder: false },
                ticks: { color: colors.text, font: { family: 'Google Sans', size: 11 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: colors.text, font: { family: 'Google Sans', size: 11 } }
            }
        },
        elements: {
            point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
        }
    };

    // Trend Chart
    const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
    if (ctxTrend) {
        trendChart = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Minutes',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: colors.blue,
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: commonOptions
        });
    }

    // Topic Chart
    const ctxTopic = document.getElementById('topicChart')?.getContext('2d');
    if (ctxTopic) {
        topicChart = new Chart(ctxTopic, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [colors.blue, colors.green, colors.yellow, colors.red, colors.purple],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            color: colors.text,
                            font: { family: 'Google Sans', size: 11 }
                        }
                    }
                }
            }
        });
    }
}


// ==========================================
// DATA LOADING
// ==========================================

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/get_analytics?days=7`);
        const data = await response.json();

        // Update Stats Cards
        updateElement('totalTime', formatTime(data.total_minutes || 0));
        updateElement('topTopic', data.top_topic || "Start Learning");
        updateElement('streakDays', data.streak_days || 0);
        updateElement('engagementScore', data.engagement_score || 0);

        // Update Charts
        if (trendChart) {
            trendChart.data.datasets[0].data = data.weekly_trends || [0, 0, 0, 0, 0, 0, 0];
            trendChart.update();
        }

        if (topicChart && data.topic_distribution) {
            topicChart.data.labels = Object.keys(data.topic_distribution);
            topicChart.data.datasets[0].data = Object.values(data.topic_distribution);
            topicChart.update();
        }

        // Update Recent Activity
        renderRecentActivity(data.recent_activity || []);

        // Update Recommendations
        renderRecommendations(data.recommendations || []);

        console.log("✅ Dashboard data loaded successfully");

    } catch (e) {
        console.error("❌ Failed to load dashboard data:", e);
        showOfflineState();
    }
}

async function loadViewData(viewName) {
    switch (viewName) {
        case 'library':
            await loadLibraryData();
            break;
        case 'goals':
            await loadGoalsData();
            break;
        case 'calendar':
            await loadScheduleData();
            break;
        case 'reviews':
            await loadNotesData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
        case 'analytics':
            await loadAnalyticsData();
            break;
    }
}


// ==========================================
// LIBRARY / HISTORY
// ==========================================

async function loadLibraryData() {
    try {
        // Load history
        const historyResponse = await fetch(`${API_URL}/api/history?days=30&limit=50`);
        const historyData = await historyResponse.json();

        if (historyData.status === 'success') {
            renderRecentActivity(historyData.history);
        }

        // Load bookmarks
        const bookmarksResponse = await fetch(`${API_URL}/api/bookmarks`);
        const bookmarksData = await bookmarksResponse.json();

        if (bookmarksData.status === 'success') {
            renderBookmarks(bookmarksData.bookmarks);
        }

    } catch (e) {
        console.error("Failed to load library data:", e);
    }
}

function renderBookmarks(bookmarks) {
    const container = document.querySelector('#view-library .dashboard-grid:last-child');
    if (!container) return;

    if (!bookmarks || bookmarks.length === 0) {
        container.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 40px;">
                <i class="ri-bookmark-line" style="font-size: 2rem; color: #5f6368;"></i>
                <p style="color: #5f6368; margin-top: 10px;">No bookmarks yet. Save resources while browsing!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bookmarks.map(bookmark => `
        <div class="google-card" data-bookmark-id="${bookmark.id}">
            <div class="card-header">
                <i class="ri-bookmark-fill" style="color: #f9ab00;"></i>
                <button class="icon-btn delete-bookmark" data-id="${bookmark.id}">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
            <h3 style="margin: 10px 0;">${bookmark.title || 'Untitled'}</h3>
            <p class="text-secondary">${bookmark.topic || 'General'} • ${bookmark.resource_type || 'Article'}</p>
            <a href="${bookmark.url}" target="_blank" class="text-btn" style="margin-top: 10px;">
                Open <i class="ri-external-link-line"></i>
            </a>
        </div>
    `).join('');

    // Add delete handlers
    container.querySelectorAll('.delete-bookmark').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            await deleteBookmark(id);
        });
    });
}

async function deleteBookmark(id) {
    try {
        const response = await fetch(`${API_URL}/api/bookmarks/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Bookmark deleted", "success");
            loadLibraryData();
        }
    } catch (e) {
        showToast("Failed to delete bookmark", "error");
    }
}


// ==========================================
// GOALS
// ==========================================

async function loadGoalsData() {
    try {
        const response = await fetch(`${API_URL}/api/goals`);
        const data = await response.json();

        if (data.status === 'success') {
            renderGoals(data.goals);
        }

        // Load achievements
        const achievementsResponse = await fetch(`${API_URL}/api/achievements`);
        const achievementsData = await achievementsResponse.json();

        if (achievementsData.status === 'success') {
            renderAchievements(achievementsData.achievements);
        }

    } catch (e) {
        console.error("Failed to load goals:", e);
    }
}

function renderGoals(goals) {
    const container = document.querySelector('#view-goals .google-card:first-child > div:last-child');
    if (!container) return;

    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #5f6368;">
                <i class="ri-target-line" style="font-size: 2rem;"></i>
                <p>No active goals. Create one to start tracking!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = goals.map(goal => {
        const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value * 100) : 0;
        return `
            <div class="goal-item" data-goal-id="${goal.id}">
                <div class="goal-info">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div class="goal-icon" style="background: ${goal.color}20; color: ${goal.color}; padding: 8px; border-radius: 50%;">
                            <i class="${goal.icon || 'ri-target-line'}"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">${goal.title}</div>
                            <div class="text-secondary" style="font-size: 0.85rem;">${goal.goal_type} Target</div>
                        </div>
                    </div>
                    <span style="font-weight: 600; color: ${goal.color};">${goal.current_value}/${goal.target_value}</span>
                </div>
                <div class="progress-bar">
                    <div class="fill" style="width: ${Math.min(progress, 100)}%; background: ${goal.color};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAchievements(achievements) {
    const container = document.querySelector('#view-goals .google-card:last-child > div:last-child');
    if (!container) return;

    const allAchievements = [
        { name: "First Steps", icon: "ri-footprint-line", unlocked: false },
        { name: "Week Warrior", icon: "ri-medal-line", unlocked: false },
        { name: "Topic Explorer", icon: "ri-compass-3-line", unlocked: false },
        { name: "Deep Diver", icon: "ri-focus-3-line", unlocked: false },
        { name: "Consistency King", icon: "ri-fire-line", unlocked: false },
        { name: "Month Master", icon: "ri-trophy-line", unlocked: false }
    ];

    // Mark unlocked achievements
    achievements.forEach(a => {
        const found = allAchievements.find(aa => aa.name === a.badge_name);
        if (found) found.unlocked = true;
    });

    container.innerHTML = allAchievements.map(a => `
        <div style="padding: 10px; border: 1px solid #f1f3f4; border-radius: 8px; text-align: center; ${!a.unlocked ? 'opacity: 0.4;' : ''}">
            <i class="${a.icon}" style="font-size: 2rem; color: ${a.unlocked ? '#f9ab00' : '#5f6368'};"></i>
            <div style="font-size: 0.85rem; margin-top: 5px; font-weight: 500;">${a.name}</div>
        </div>
    `).join('');
}

async function createGoal(goalData) {
    try {
        const response = await fetch(`${API_URL}/api/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(goalData)
        });

        if (response.ok) {
            showToast("Goal created!", "success");
            loadGoalsData();
        }
    } catch (e) {
        showToast("Failed to create goal", "error");
    }
}


// ==========================================
// SCHEDULE
// ==========================================

async function loadScheduleData() {
    try {
        const response = await fetch(`${API_URL}/api/schedule`);
        const data = await response.json();

        if (data.status === 'success') {
            renderSchedule(data.events);
        }
    } catch (e) {
        console.error("Failed to load schedule:", e);
    }
}

function renderSchedule(events) {
    // Schedule rendering logic - the HTML already has placeholder content
    console.log("Schedule events:", events);
}


// ==========================================
// NOTES / REVIEWS
// ==========================================

async function loadNotesData() {
    try {
        const response = await fetch(`${API_URL}/api/notes`);
        const data = await response.json();

        if (data.status === 'success') {
            renderNotes(data.notes);
        }
    } catch (e) {
        console.error("Failed to load notes:", e);
    }
}

function renderNotes(notes) {
    const container = document.querySelector('#view-reviews .dashboard-grid');
    if (!container) return;

    if (!notes || notes.length === 0) {
        container.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 40px;">
                <i class="ri-draft-line" style="font-size: 2rem; color: #5f6368;"></i>
                <p style="color: #5f6368; margin-top: 10px;">No reflections yet. Start journaling your learning!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notes.map(note => {
        const date = new Date(note.created_at);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const tags = note.tags || [];

        return `
            <div class="google-card" data-note-id="${note.id}">
                <div style="font-size: 0.8rem; color: #5f6368; margin-bottom: 5px;">${dateStr}</div>
                <h3 style="font-size: 1.1rem; margin: 0 0 10px 0;">${note.title || 'Reflection'}</h3>
                <p style="color: #5f6368; line-height: 1.5;">${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</p>
                ${tags.length > 0 ? `
                    <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
                        ${tags.map(tag => `<span class="chip" style="padding: 4px 8px; font-size: 0.75rem;">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function saveNote(noteData) {
    try {
        const response = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (response.ok) {
            showToast("Reflection saved!", "success");
            loadNotesData();
        }
    } catch (e) {
        showToast("Failed to save reflection", "error");
    }
}


// ==========================================
// SETTINGS
// ==========================================

async function loadSettingsData() {
    try {
        const response = await fetch(`${API_URL}/api/settings`);
        const data = await response.json();

        if (data.status === 'success' && data.settings) {
            // Update toggles based on settings
            const trackingToggle = document.getElementById('trackingToggle');
            if (trackingToggle) {
                trackingToggle.checked = data.settings.tracking_enabled === 1;
            }
        }
    } catch (e) {
        console.error("Failed to load settings:", e);
    }
}

async function updateSettings(settings) {
    try {
        const response = await fetch(`${API_URL}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            showToast("Settings saved!", "success");
        }
    } catch (e) {
        showToast("Failed to save settings", "error");
    }
}


// ==========================================
// ANALYTICS
// ==========================================

let analyticsLineChart, analyticsDonutChart;

async function loadAnalyticsData() {
    try {
        // Fetch main analytics
        const response = await fetch(`${API_URL}/get_analytics?days=30`);
        const data = await response.json();

        // Update stats cards
        updateElement('analyticsTotalSessions', data.total_sessions || 0);
        updateElement('analyticsTotalTime', formatTime(data.total_minutes || 0));
        updateElement('analyticsAvgEngagement', (data.engagement_score || 0) + '%');
        updateElement('analyticsTopicsCount', data.topics_count || 0);

        // Render charts
        renderAnalyticsCharts(data);

        // Render heatmap
        renderHeatmap(data.daily_activity || []);

        // Render topic breakdown
        renderTopicBreakdown(data.topic_distribution || {});

        // Render sessions table
        renderAnalyticsSessions(data.recent_activity || []);

        // Setup export button
        setupAnalyticsExport(data);

        console.log("✅ Analytics loaded successfully");

    } catch (e) {
        console.error("Failed to load analytics:", e);
        showToast("Failed to load analytics", "error");
    }
}

function renderAnalyticsCharts(data) {
    const colors = {
        blue: '#1a73e8',
        green: '#188038',
        yellow: '#f9ab00',
        red: '#d93025',
        purple: '#a142f4',
        cyan: '#12b5cb',
        orange: '#fa903e'
    };

    // Line Chart - Daily Activity
    const ctxLine = document.getElementById('analyticsLineChart')?.getContext('2d');
    if (ctxLine) {
        if (analyticsLineChart) analyticsLineChart.destroy();

        // Generate last 30 days labels
        const labels = [];
        const values = data.weekly_trends || [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }

        // Pad values if needed
        while (values.length < 30) values.unshift(0);

        analyticsLineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: labels.slice(-7), // Show last 7 days by default
                datasets: [{
                    label: 'Minutes',
                    data: values.slice(-7),
                    borderColor: colors.blue,
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: colors.blue,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f3f4' },
                        ticks: { color: '#5f6368' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#5f6368' }
                    }
                }
            }
        });
    }

    // Donut Chart - Topic Distribution
    const ctxDonut = document.getElementById('analyticsDonutChart')?.getContext('2d');
    if (ctxDonut && data.topic_distribution) {
        if (analyticsDonutChart) analyticsDonutChart.destroy();

        const topicLabels = Object.keys(data.topic_distribution);
        const topicValues = Object.values(data.topic_distribution);
        const topicColors = [colors.blue, colors.green, colors.yellow, colors.red, colors.purple, colors.cyan, colors.orange];

        analyticsDonutChart = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: topicLabels,
                datasets: [{
                    data: topicValues,
                    backgroundColor: topicColors.slice(0, topicLabels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 15,
                            font: { family: 'Google Sans', size: 11 }
                        }
                    }
                }
            }
        });
    }
}

function renderHeatmap(dailyActivity) {
    const container = document.getElementById('heatmapGrid');
    if (!container) return;

    // Generate 4 weeks of heatmap data
    const weeks = 4;
    const heatmapData = [];

    for (let week = 0; week < weeks; week++) {
        const weekData = [];
        for (let day = 0; day < 7; day++) {
            // Use actual data if available, otherwise random for demo
            const index = week * 7 + day;
            const value = dailyActivity[index] || Math.floor(Math.random() * 5);
            weekData.push(value);
        }
        heatmapData.push(weekData);
    }

    container.innerHTML = heatmapData.map((week, weekIdx) => `
        <div class="heatmap-row">
            <span class="heatmap-time-label">W${weekIdx + 1}</span>
            ${week.map(val => {
        const colorIdx = Math.min(val, 4);
        return `<div class="heatmap-cell level-${colorIdx}" title="${val} sessions"></div>`;
    }).join('')}
        </div>
    `).join('');
}

function renderTopicBreakdown(topicDist) {
    const container = document.getElementById('topicBreakdownList');
    if (!container) return;

    const total = Object.values(topicDist).reduce((a, b) => a + b, 0) || 1;
    const sortedTopics = Object.entries(topicDist).sort((a, b) => b[1] - a[1]);

    const colors = ['#1a73e8', '#188038', '#f9ab00', '#d93025', '#a142f4', '#12b5cb'];

    if (sortedTopics.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #5f6368;">
                <i class="ri-pie-chart-line" style="font-size: 2rem; opacity: 0.5;"></i>
                <p>No topic data yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sortedTopics.slice(0, 6).map(([topic, count], idx) => {
        const percent = Math.round((count / total) * 100);
        return `
            <div style="margin-bottom: 15px;">
                <div class="topic-item" style="border: none; padding: 0 0 8px 0;">
                    <div class="topic-info">
                        <span class="topic-color" style="background: ${colors[idx % colors.length]};"></span>
                        <span class="topic-name">${topic}</span>
                    </div>
                    <span class="topic-active">${count} sessions (${percent}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;">
                    <div class="fill" style="width: ${percent}%; background: ${colors[idx % colors.length]};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAnalyticsSessions(sessions) {
    const tbody = document.getElementById('analyticsSessionsTable');
    if (!tbody) return;

    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #5f6368; padding: 30px;">
                    <i class="ri-history-line" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p>No sessions recorded yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = sessions.slice(0, 15).map(session => {
        const date = new Date(session.time || session.timestamp);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const duration = session.duration ? Math.round(session.duration / 60) : 0;
        const engagement = session.score || session.engagement_score || 0;

        return `
            <tr>
                <td style="color: #5f6368;">${dateStr}</td>
                <td><span class="chip" style="background: #e8f0fe; color: #1967d2;">${session.topic || 'General'}</span></td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${session.title || 'Untitled'}
                </td>
                <td><i class="ri-time-line" style="margin-right: 5px; color: #5f6368;"></i>${duration}m</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="progress-bar" style="width: 60px; height: 6px;">
                            <div class="fill" style="width: ${engagement}%; background: ${engagement > 70 ? '#188038' : engagement > 40 ? '#f9ab00' : '#d93025'};"></div>
                        </div>
                        <span style="font-size: 0.85rem;">${engagement}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function setupAnalyticsExport(data) {
    const btn = document.getElementById('exportAnalyticsBtn');
    if (btn) {
        btn.onclick = () => {
            const exportData = {
                exported_at: new Date().toISOString(),
                total_sessions: data.total_sessions,
                total_minutes: data.total_minutes,
                topics: data.topic_distribution,
                sessions: data.recent_activity
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `supri-analytics-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Analytics exported!', 'success');
        };
    }
}


// ==========================================
// RENDER FUNCTIONS
// ==========================================

function renderRecentActivity(activities) {
    const tbody = document.getElementById('recentActivityTable');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!activities || activities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #5f6368; padding: 20px;">
                    No learning history yet. Start browsing to track your progress!
                </td>
            </tr>
        `;
        return;
    }

    activities.forEach(item => {
        let dateStr = "Unknown";
        if (item.time || item.timestamp) {
            const d = new Date(item.time || item.timestamp);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-weight: 500; color: #1967d2;">${item.topic || 'General'}</span></td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${item.title || 'Untitled'}
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 500;">${item.score || item.engagement_score || 0}</span>
                </div>
            </td>
            <td style="color: #5f6368;">${dateStr}</td>
            <td>
                <button class="icon-btn" style="width: 32px; height: 32px;" ${item.url ? `onclick="window.open('${item.url}')"` : ''}>
                    <i class="ri-external-link-line"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderRecommendations(recs) {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;

    container.innerHTML = "";

    if (!recs || recs.length === 0) {
        container.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 30px;">
                <i class="ri-lightbulb-line" style="font-size: 2rem; color: #f9ab00;"></i>
                <h3 style="margin-top: 10px;">No recommendations yet</h3>
                <p style="color: #5f6368;">Start browsing educational content to get personalized suggestions!</p>
            </div>
        `;
        return;
    }

    recs.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'google-card';
        card.style.borderLeft = "4px solid #1a73e8";
        card.innerHTML = `
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #5f6368; margin-bottom: 8px;">
                <i class="${rec.icon || 'ri-bookmark-line'}" style="margin-right: 5px;"></i>${rec.type || 'Recommendation'}
            </div>
            <h3 style="font-size: 1.1rem; margin-top: 0; margin-bottom: 8px;">${rec.title}</h3>
            <p style="color: #5f6368; font-size: 0.9rem; line-height: 1.5;">${rec.description}</p>
            <button class="text-btn" style="margin-top: 16px; color: #1a73e8;" onclick="window.open('${rec.url || '#'}')">
                Start Learning <i class="ri-arrow-right-line"></i>
            </button>
        `;
        container.appendChild(card);
    });
}


// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        loadDashboardData();
        showToast("Data refreshed!", "success");
    });

    // Clear history button
    document.querySelector('.danger-btn')?.addEventListener('click', () => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Delete All History?',
                text: "This action cannot be undone.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d93025',
                confirmButtonText: 'Delete All'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await clearAllHistory();
                }
            });
        } else {
            if (confirm('Delete all history? This cannot be undone.')) {
                clearAllHistory();
            }
        }
    });

    // Save reflection button
    const saveReflectionBtn = document.querySelector('#view-reviews .primary-btn');
    if (saveReflectionBtn) {
        saveReflectionBtn.addEventListener('click', () => {
            const textarea = document.querySelector('#view-reviews textarea');
            if (textarea && textarea.value.trim()) {
                saveNote({
                    title: 'Weekly Reflection',
                    content: textarea.value.trim()
                });
                textarea.value = '';
            }
        });
    }

    // Settings toggle listeners
    document.getElementById('trackingToggle')?.addEventListener('change', (e) => {
        updateSettings({ tracking_enabled: e.target.checked ? 1 : 0 });
    });

    // New goal button
    document.querySelector('#view-goals .primary-text')?.addEventListener('click', () => {
        showGoalModal();
    });

    // Search functionality
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchHistory(e.target.value);
            }, 300);
        });
    }

    // FAB click
    document.querySelector('.fab')?.addEventListener('click', () => {
        // Navigate to reviews/notes
        document.querySelector('[data-target="reviews"]')?.click();
    });
}

async function clearAllHistory() {
    try {
        const response = await fetch(`${API_URL}/api/history/clear`, { method: 'DELETE' });
        if (response.ok) {
            showToast("History cleared successfully!", "success");
            loadDashboardData();
        }
    } catch (e) {
        showToast("Failed to clear history", "error");
    }
}

async function searchHistory(query) {
    if (!query.trim()) {
        loadLibraryData();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/history/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.status === 'success') {
            renderRecentActivity(data.results);
        }
    } catch (e) {
        console.error("Search failed:", e);
    }
}

function showGoalModal() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Create New Goal',
            html: `
                <input id="goalTitle" class="swal2-input" placeholder="Goal title">
                <select id="goalType" class="swal2-select">
                    <option value="daily">Daily</option>
                    <option value="weekly" selected>Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
                <input id="goalTarget" type="number" class="swal2-input" placeholder="Target value" value="5">
            `,
            showCancelButton: true,
            confirmButtonText: 'Create',
            confirmButtonColor: '#1a73e8'
        }).then((result) => {
            if (result.isConfirmed) {
                const title = document.getElementById('goalTitle').value;
                const type = document.getElementById('goalType').value;
                const target = parseInt(document.getElementById('goalTarget').value) || 5;

                if (title) {
                    createGoal({
                        title: title,
                        goal_type: type,
                        target_value: target
                    });
                }
            }
        });
    }
}


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function showOfflineState() {
    updateElement('totalTime', '0h 0m');
    updateElement('topTopic', 'Offline');
    updateElement('engagementScore', '0');

    const tbody = document.getElementById('recentActivityTable');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #d93025; padding: 20px;">
                    <i class="ri-wifi-off-line" style="font-size: 1.5rem;"></i>
                    <p style="margin-top: 10px;">Server unavailable. Run 'python app.py' in the backend folder.</p>
                </td>
            </tr>
        `;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#188038' : type === 'error' ? '#d93025' : '#1a73e8'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-top: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);


// ==========================================
// EXPORT FOR TESTING
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadDashboardData,
        formatTime,
        showToast
    };
}
