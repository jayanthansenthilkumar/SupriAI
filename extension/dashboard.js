// Navigation Logic
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        // Active State
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // View Switching
        document.querySelectorAll('.page-view').forEach(view => view.style.display = 'none');
        const targetId = `view-${item.dataset.target}`;
        document.getElementById(targetId).style.display = 'block';

        // Update Title
        const titleMap = {
            'dashboard': 'Dashboard',
            'library': 'My Library',
            'goals': 'Goals & Streak',
            'settings': 'Settings'
        };
        document.getElementById('pageTitle').innerText = titleMap[item.dataset.target];
    });
});

const API_URL = "http://localhost:5000";

// Initialize Charts
let trendChart, topicChart;

function initCharts() {
    // Google Material Colors
    const colors = {
        blue: '#1a73e8',
        green: '#188038',
        yellow: '#f9ab00',
        red: '#d93025',
        text: '#5f6368',
        grid: '#f1f3f4'
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false // Minimalist
            }
        },
        scales: {
            y: {
                grid: { color: colors.grid, drawBorder: false },
                ticks: { color: colors.text, font: { family: 'Inter', size: 11 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: colors.text, font: { family: 'Inter', size: 11 } }
            }
        },
        elements: {
            point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
        }
    };

    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            datasets: [{
                label: 'Minutes',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: colors.blue,
                backgroundColor: 'rgba(26, 115, 232, 0.05)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: commonOptions
    });

    const ctxTopic = document.getElementById('topicChart').getContext('2d');
    topicChart = new Chart(ctxTopic, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [colors.blue, colors.green, colors.yellow, colors.red],
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
                        font: { family: 'Inter', size: 11 }
                    }
                }
            }
        }
    });
}

async function loadData() {
    try {
        const response = await fetch(`${API_URL}/get_analytics`);
        const data = await response.json();

        // Update Stats
        document.getElementById('totalTime').innerText = `${Math.floor(data.total_minutes / 60)}h ${data.total_minutes % 60}m`;
        document.getElementById('topTopic').innerText = data.top_topic || "-";
        document.getElementById('engagementScore').innerText = data.engagement_score;

        // Update Charts
        trendChart.data.datasets[0].data = data.weekly_trends;
        trendChart.update();

        topicChart.data.labels = Object.keys(data.topic_distribution);
        topicChart.data.datasets[0].data = Object.values(data.topic_distribution);
        topicChart.update();

        renderRecentActivity(data.recent_activity);
        renderRecommendations(data.recommendations);

    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function renderRecentActivity(activities) {
    const tbody = document.getElementById('recentActivityTable');
    tbody.innerHTML = "";

    if (!activities || activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #5f6368;">No learning history yet.</td></tr>`;
        return;
    }

    activities.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        row.innerHTML = `
            <td><span style="font-weight:500; color: #1967d2;">${item.topic}</span></td>
            <td style="max-width: 250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.title}</td>
            <td>
                <div style="display: items; align-items: center; gap: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 500;">${item.score}</span>
                </div>
            </td>
            <td style="color: #5f6368;">${date}</td>
            <td><button class="icon-btn" style="width: 32px; height: 32px;"><i class="ri-more-2-fill"></i></button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderRecommendations(recs) {
    const container = document.getElementById('recommendationsGrid');
    container.innerHTML = "";

    if (!recs || recs.length === 0) {
        container.innerHTML = `<div class="google-card"><h3>No recommendations yet. Start browsing!</h3></div>`;
        return;
    }

    recs.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'google-card';
        card.style.borderLeft = "4px solid #1a73e8"; // Accent border
        card.innerHTML = `
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #5f6368; margin-bottom: 8px;">${rec.type}</div>
            <h3 style="font-size: 1.1rem; margin-top: 0; margin-bottom: 8px;">${rec.title}</h3>
            <p style="color: #5f6368; font-size: 0.9rem; line-height: 1.5;">${rec.description}</p>
            <button class="text-btn" style="margin-top: 16px; color: #1a73e8;" onclick="window.open('${rec.url}')">
                Start Learning <i class="ri-arrow-right-line"></i>
            </button>
        `;
        container.appendChild(card);
    });
}

/* Event Listeners */
document.getElementById('refreshBtn')?.addEventListener('click', loadData); // Optional if in header

// Settings Logic
document.querySelector('.danger-btn')?.addEventListener('click', () => {
    Swal.fire({
        title: 'Delete History?',
        text: "This cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d93025',
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Deleted!', 'Local history cleared.', 'success');
    });
});

// Init
initCharts();
loadData();
