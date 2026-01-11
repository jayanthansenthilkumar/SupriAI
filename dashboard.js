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
                'settings': 'Settings',
                'chat-assistant': 'AI Assistant',
                'resume-builder': 'Resume Builder'
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

            if (nameEl) nameEl.textContent = (data.user.display_name === 'User') ? 'Supriya' : (data.user.display_name || 'Supriya');

            const initial = (data.user.avatar_initial === 'U') ? 'S' : (data.user.avatar_initial || 'S');
            if (avatarEl) avatarEl.textContent = initial;
            if (smAvatarEl) smAvatarEl.textContent = initial;
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
        case 'chat-assistant':
            await loadChatData();
            break;
        case 'resume-builder':
            await loadResumeData();
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
// AI CHAT ASSISTANT
// ==========================================

let chatHistory = [];

async function loadChatData() {
    try {
        // Load AI recommendations
        await loadAIRecommendations();

        // Load chat history
        const response = await fetch(`${API_URL}/api/chat/history?limit=20`);
        const data = await response.json();

        if (data.status === 'success' && data.history.length > 0) {
            // Render existing chat history
            const container = document.getElementById('chatMessages');
            data.history.reverse().forEach(msg => {
                appendChatMessage(msg.user_message, 'user', false);
                appendChatMessage(msg.ai_response, 'ai', false);
            });
        }
    } catch (e) {
        console.error("Failed to load chat data:", e);
    }
}

async function loadAIRecommendations() {
    const container = document.getElementById('aiRecommendations');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/recommendations`);
        const data = await response.json();

        if (data.status === 'success' && data.recommendations) {
            renderAIRecommendations(data.recommendations);
        }
    } catch (e) {
        container.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 40px;">
                <i class="ri-error-warning-line" style="font-size: 32px; color: #d93025;"></i>
                <p style="margin-top: 10px; color: #5f6368;">Failed to load recommendations</p>
            </div>
        `;
    }
}

function renderAIRecommendations(recommendations) {
    const container = document.getElementById('aiRecommendations');
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `
            <div class="google-card" style="text-align: center; padding: 40px;">
                <i class="ri-lightbulb-line" style="font-size: 32px; color: #f9ab00;"></i>
                <p style="margin-top: 10px; color: #5f6368;">Keep learning to get personalized recommendations!</p>
            </div>
        `;
        return;
    }

    const colors = {
        course: '#1a73e8',
        practice: '#188038',
        challenge: '#d93025',
        tutorial: '#a142f4',
        project: '#f9ab00',
        focus: '#e8710a',
        deep_dive: '#1967d2'
    };

    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card">
            <div class="recommendation-header">
                <div class="recommendation-icon" style="background: ${colors[rec.type] || '#5f6368'}20; color: ${colors[rec.type] || '#5f6368'};">
                    <i class="${rec.icon || 'ri-lightbulb-line'}"></i>
                </div>
                <div>
                    <div class="recommendation-type">${rec.type || 'recommendation'}</div>
                    <div class="recommendation-title">${rec.title}</div>
                </div>
            </div>
            <p class="recommendation-description">${rec.description}</p>
            ${rec.url ? `
                <a href="${rec.url}" target="_blank" class="recommendation-action">
                    Explore <i class="ri-external-link-line"></i>
                </a>
            ` : ''}
        </div>
    `).join('');
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to chat
    appendChatMessage(message, 'user');

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                context: { history: chatHistory }
            })
        });

        const data = await response.json();

        // Hide typing indicator
        hideTypingIndicator();

        if (data.status === 'success') {
            appendChatMessage(data.response, 'ai');

            // Update suggestions
            toggleSendButton(input);

            // Hide welcome screen if first message
            const welcomeScreen = document.getElementById('geminiWelcome');
            if (welcomeScreen) welcomeScreen.style.display = 'none';

            // Add User Message
            addMessageToChat('user', message);

            // Show Typing Indicator
            const typingId = showTypingIndicator();

            try {
                // In real app: const response = await fetch(`${API_URL}/api/chat`, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({
                //         message: message,
                //         context: { history: chatHistory.map(msg => ({ [msg.role]: msg.text })) } // Adapt history format
                //     })
                // });
                // const data = await response.json();

                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Remove typing indicator
                removeTypingIndicator(typingId);

                // Generate mock AI response
                const aiResponse = generateMockAIResponse(message);
                addMessageToChat('ai', aiResponse);

                // In a real app, you'd handle data.suggestions here
                // if (data.status === 'success' && data.suggestions) {
                //     updateChatSuggestions(data.suggestions);
                // }

            } catch (e) {
                console.error("Chat error:", e);
                removeTypingIndicator(typingId);
                addMessageToChat('ai', "Sorry, I'm having trouble connecting right now.");
            }
        }
    } catch (e) {
        console.error("Chat error:", e);
        hideTypingIndicator(); // Ensure indicator is hidden on error
        appendChatMessage("Sorry, I'm having trouble connecting right now.", 'ai');
    }
}

function sendSuggestion(text) {
    const input = document.getElementById('chatInput');
    input.value = text;
    toggleSendButton(input); // Update button state
    sendChatMessage();
}

function toggleSendButton(input) {
    const btn = document.getElementById('sendBtn');
    if (input.value.trim().length > 0) {
        btn.classList.add('has-text');
    } else {
        btn.classList.remove('has-text');
    }
}

function addMessageToChat(role, text) {
    const chatContainer = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `gemini-message ${role}`;

    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="gemini-user-bubble">
                ${escapeHtml(text)}
            </div>
        `;
    } else {
        // Formatted AI Response
        messageDiv.innerHTML = `
            <div class="gemini-icon">
                <i class="ri-sparkling-fill" style="color: #4285f4; font-size: 24px;"></i>
            </div>
            <div class="gemini-bot-content">
                ${formatAIResponse(text)}
            </div>
        `;
    }

    chatContainer.appendChild(messageDiv);
    scrollToBottom();

    // Save to history
    chatHistory.push({ role, text, timestamp: new Date() });
}

function showTypingIndicator() {
    const chatContainer = document.getElementById('chatMessages');
    const id = 'typing-' + Date.now();

    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'gemini-message ai';
    indicatorDiv.id = id;
    indicatorDiv.innerHTML = `
        <div class="gemini-icon">
             <i class="ri-sparkling-fill" style="color: #4285f4; font-size: 24px;"></i>
        </div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    chatContainer.appendChild(indicatorDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAIResponse(text) {
    // Basic Markdown formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function generateMockAIResponse(msg) {
    msg = msg.toLowerCase();
    if (msg.includes('python')) return "Python is a great language! You can start by learning about **variables**, **loops**, and **functions**. Would you like a curriculum?";
    if (msg.includes('plan') || msg.includes('schedule')) return "I've drafted a study plan for you:\n\n1. **Day 1**: Basics & Syntax\n2. **Day 2**: Control Flow\n3. **Day 3**: Data Structures\n\nShall I add this to your calendar?";
    if (msg.includes('quiz')) return "Sure! Here's a quick question:\n\n**What is the time complexity of accessing an element in an array?**\n\nA) O(1)\nB) O(n)\nC) O(log n)";
    return "I can help you learn that! I've found some resources in your library that match. Would you like me to open them?";
}

function updateChatSuggestions(suggestions) {
    const container = document.getElementById('chatSuggestions');
    if (!container || !suggestions) return;

    container.innerHTML = suggestions.map(s =>
        `<button class="suggestion-chip" onclick="sendSuggestion('${s}')">${s}</button>`
    ).join('');
}

async function clearChatHistory() {
    const result = await Swal.fire({
        title: 'Clear Chat History?',
        text: 'This will delete all your chat messages.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d93025',
        confirmButtonText: 'Clear'
    });

    if (result.isConfirmed) {
        try {
            // Clear UI
            const container = document.getElementById('chatMessages');
            // Remove all dynamically added messages
            const messages = container.querySelectorAll('.gemini-message');
            messages.forEach(msg => msg.remove());

            // Show welcome screen again
            const welcomeScreen = document.getElementById('geminiWelcome');
            if (welcomeScreen) welcomeScreen.style.display = 'block';

            chatHistory = [];
            showToast('Chat history cleared', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to clear chat', 'error');
        }
    }
}


// ==========================================
// RESUME BUILDER
// ==========================================

let currentResume = null;

async function loadResumeData() {
    try {
        const response = await fetch(`${API_URL}/api/resume/latest`);
        const data = await response.json();

        if (data.status === 'success' && data.resume) {
            currentResume = data.resume;
            displayResume(data.resume);
        }
    } catch (e) {
        console.log("No existing resume found");
    }
}

async function generateResume() {
    const userInfo = {
        name: document.getElementById('resumeName')?.value || '',
        email: document.getElementById('resumeEmail')?.value || '',
        location: document.getElementById('resumeLocation')?.value || '',
        github: document.getElementById('resumeGithub')?.value || '',
        linkedin: document.getElementById('resumeLinkedin')?.value || '',
        portfolio: document.getElementById('resumePortfolio')?.value || ''
    };

    // Show loading
    const preview = document.getElementById('resumePreview');
    const noResume = document.getElementById('noResumeMessage');
    if (noResume) noResume.style.display = 'none';
    if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = `
            <div style="text-align: center; padding: 60px;">
                <i class="ri-loader-4-line spinning" style="font-size: 48px; color: #1a73e8;"></i>
                <p style="margin-top: 20px; color: #5f6368;">Generating your resume from learning analytics...</p>
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/api/resume/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_info: userInfo })
        });

        const data = await response.json();

        if (data.status === 'success' && data.resume) {
            currentResume = data.resume;

            // Restore preview container and display
            if (preview) {
                preview.innerHTML = createResumePreviewHTML();
            }
            displayResume(data.resume);
            showToast('Resume generated successfully!', 'success');
        } else {
            throw new Error(data.message || 'Failed to generate resume');
        }

    } catch (e) {
        console.error('Resume generation error:', e);
        showToast('Failed to generate resume: ' + e.message, 'error');
        if (preview) {
            preview.style.display = 'none';
        }
        if (noResume) {
            noResume.style.display = 'block';
        }
    }
}

function createResumePreviewHTML() {
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h4 style="margin: 0;">Resume Preview</h4>
            <div style="display: flex; gap: 10px;">
                <button class="text-btn" onclick="exportResume('json')"><i class="ri-code-line"></i> JSON</button>
                <button class="text-btn" onclick="exportResume('html')"><i class="ri-file-code-line"></i> HTML</button>
            </div>
        </div>
        <div id="resumeContent" style="background: white; border: 1px solid #e8eaed; border-radius: 8px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #1a73e8;">
                <h2 id="previewName" style="margin: 0; color: #1a73e8; font-size: 1.8em;">Your Name</h2>
                <p id="previewTitle" style="margin: 5px 0; color: #5f6368; font-size: 1.1em;">Professional Title</p>
                <div id="previewContact" style="margin-top: 10px; font-size: 0.9em; color: #5f6368;"></div>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-user-line"></i> Professional Summary
                </h3>
                <p id="previewSummary" style="color: #333; line-height: 1.6;"></p>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-code-s-slash-line"></i> Technical Skills
                </h3>
                <div id="previewTechnicalSkills" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;"></div>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-tools-line"></i> Tools & Technologies
                </h3>
                <div id="previewTools" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;"></div>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-bar-chart-box-line"></i> Skill Proficiency
                </h3>
                <div id="previewProficiency" style="margin-top: 15px;"></div>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-award-line"></i> Learning Achievements
                </h3>
                <div id="previewAchievements" style="margin-top: 10px;"></div>
            </div>
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-medal-line"></i> Suggested Certifications
                </h3>
                <div id="previewCertifications" style="margin-top: 10px;"></div>
            </div>
            <div>
                <h3 style="color: #1a73e8; border-bottom: 1px solid #e8eaed; padding-bottom: 5px; font-size: 1.1em;">
                    <i class="ri-folder-line"></i> Suggested Projects
                </h3>
                <div id="previewProjects" style="margin-top: 10px;"></div>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-around; text-align: center;">
            <div>
                <div id="statHours" style="font-size: 1.5em; font-weight: 700; color: #1a73e8;">0</div>
                <div style="color: #5f6368; font-size: 0.85em;">Learning Hours</div>
            </div>
            <div>
                <div id="statTopics" style="font-size: 1.5em; font-weight: 700; color: #188038;">0</div>
                <div style="color: #5f6368; font-size: 0.85em;">Topics Explored</div>
            </div>
            <div>
                <div id="statSessions" style="font-size: 1.5em; font-weight: 700; color: #f9ab00;">0</div>
                <div style="color: #5f6368; font-size: 0.85em;">Sessions Completed</div>
            </div>
        </div>
    `;
}

function displayResume(resume) {
    const preview = document.getElementById('resumePreview');
    const noResume = document.getElementById('noResumeMessage');

    if (noResume) noResume.style.display = 'none';
    if (preview) preview.style.display = 'block';

    // Header
    const header = resume.header || {};
    updateElement('previewName', header.name || 'Your Name');
    updateElement('previewTitle', header.title || 'Professional');

    // Contact info
    const contactParts = [];
    if (header.email) contactParts.push(`<i class="ri-mail-line"></i> ${header.email}`);
    if (header.location) contactParts.push(`<i class="ri-map-pin-line"></i> ${header.location}`);
    if (header.github) contactParts.push(`<i class="ri-github-line"></i> ${header.github}`);
    if (header.linkedin) contactParts.push(`<i class="ri-linkedin-box-line"></i> ${header.linkedin}`);

    const contactEl = document.getElementById('previewContact');
    if (contactEl) contactEl.innerHTML = contactParts.join(' &nbsp;|&nbsp; ');

    // Summary
    updateElement('previewSummary', resume.summary || '');

    // Technical Skills
    const techSkillsEl = document.getElementById('previewTechnicalSkills');
    if (techSkillsEl && resume.skills?.technical) {
        techSkillsEl.innerHTML = resume.skills.technical.map(s =>
            `<span class="skill-tag">${s}</span>`
        ).join('');
    }

    // Tools
    const toolsEl = document.getElementById('previewTools');
    if (toolsEl && resume.skills?.tools) {
        toolsEl.innerHTML = resume.skills.tools.map(s =>
            `<span class="tool-tag">${s}</span>`
        ).join('');
    }

    // Proficiency Chart
    const profEl = document.getElementById('previewProficiency');
    if (profEl && resume.proficiency_chart) {
        profEl.innerHTML = resume.proficiency_chart.map(p => `
            <div class="proficiency-bar">
                <span class="proficiency-label">${p.skill}</span>
                <div class="proficiency-track">
                    <div class="proficiency-fill" style="width: ${p.score}%;"></div>
                </div>
                <span class="proficiency-value">${p.level}</span>
            </div>
        `).join('');
    }

    // Achievements
    const achieveEl = document.getElementById('previewAchievements');
    if (achieveEl && resume.learning_achievements) {
        achieveEl.innerHTML = resume.learning_achievements.map(a => `
            <div class="achievement-card">
                <div class="achievement-icon"><i class="${a.icon || 'ri-star-line'}"></i></div>
                <div class="achievement-text">
                    <h4>${a.title}</h4>
                    <p>${a.description}</p>
                </div>
            </div>
        `).join('');
    }

    // Certifications
    const certEl = document.getElementById('previewCertifications');
    if (certEl && resume.certifications) {
        certEl.innerHTML = resume.certifications.map(c => `
            <div class="cert-card">
                <div class="cert-icon"><i class="ri-medal-line"></i></div>
                <div class="cert-text">
                    <h4>${c.name}</h4>
                    <p>${c.provider} • Relevance: ${c.relevance}</p>
                </div>
            </div>
        `).join('');
    }

    // Projects
    const projEl = document.getElementById('previewProjects');
    if (projEl && resume.projects) {
        projEl.innerHTML = resume.projects.map(p => `
            <div class="project-card">
                <h4>${p.name}</h4>
                <p>${p.description}</p>
            </div>
        `).join('');
    }

    // Stats
    if (resume.learning_stats) {
        updateElement('statHours', resume.learning_stats.total_hours || 0);
        updateElement('statTopics', resume.learning_stats.topics_explored || 0);
        updateElement('statSessions', resume.learning_stats.sessions_completed || 0);
    }

    // Fill form with header data
    if (header.name) document.getElementById('resumeName').value = header.name;
    if (header.email) document.getElementById('resumeEmail').value = header.email;
    if (header.location) document.getElementById('resumeLocation').value = header.location;
    if (header.github) document.getElementById('resumeGithub').value = header.github;
    if (header.linkedin) document.getElementById('resumeLinkedin').value = header.linkedin;
    if (header.portfolio) document.getElementById('resumePortfolio').value = header.portfolio;
}

async function exportResume(format) {
    if (!currentResume) {
        showToast('Generate a resume first', 'error');
        return;
    }

    try {
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(currentResume, null, 2)], { type: 'application/json' });
            downloadBlob(blob, 'supri_resume.json');
        } else if (format === 'html') {
            const response = await fetch(`${API_URL}/api/resume/export/html`);
            const html = await response.text();
            const blob = new Blob([html], { type: 'text/html' });
            downloadBlob(blob, 'supri_resume.html');
        }

        showToast(`Resume exported as ${format.toUpperCase()}`, 'success');
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// ==========================================
// CHROME HISTORY SYNC
// ==========================================

async function syncBrowsingHistory() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'COLLECT_HISTORY' }, resolve);
            });

            if (response?.status === 'success') {
                showToast(`Analyzed ${response.count} history items`, 'success');
                // Reload recommendations
                await loadAIRecommendations();
            }
        } catch (e) {
            console.error('History sync failed:', e);
        }
    }
}


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
