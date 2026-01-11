

import { StorageManager } from '../js/storage.js';
import { formatTime, formatDate, isExtensionContextValid, safeSendMessage } from '../js/utils.js';

class PopupController {
    constructor() {
        this.storage = new StorageManager();
        this.isTracking = true;
        this.init();
    }

    async init() {
        this.initTheme();
        await this.loadTrackingStatus();
        await this.loadQuickStats();
        await this.loadCurrentPage();
        await this.loadTopTopics();
        await this.loadRecommendations();
        this.setupEventListeners();
        this.startRealTimeUpdates();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('supriai-theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    setupEventListeners() {
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('supriai-theme', newTheme);
        });

        document.getElementById('openDashboard').addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
        });

        document.getElementById('toggleTracking').addEventListener('click', async () => {
            this.isTracking = !this.isTracking;
            await chrome.storage.local.set({ trackingEnabled: this.isTracking });
            this.updateTrackingUI();

            try {
                await safeSendMessage({ type: 'TOGGLE_TRACKING', enabled: this.isTracking });
            } catch (error) {
                console.error('Failed to notify background script:', error);
            }
        });

        document.getElementById('settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html#settings') });
        });
    }

    async loadTrackingStatus() {
        const result = await chrome.storage.local.get(['trackingEnabled']);
        this.isTracking = result.trackingEnabled !== false;
        this.updateTrackingUI();
    }

    updateTrackingUI() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        const toggleBtn = document.getElementById('toggleTracking');

        if (this.isTracking) {
            statusDot.classList.add('active');
            statusText.textContent = 'Tracking';
            toggleBtn.innerHTML = '<i class="ri-pause-circle-line"></i> Pause Tracking';
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = 'Paused';
            toggleBtn.innerHTML = '<i class="ri-play-circle-line"></i> Resume Tracking';
        }
    }

    async loadQuickStats() {
        try {
            const stats = await this.storage.getTodayStats();

            document.getElementById('todayTopics').textContent = stats.topicsCount || 0;
            document.getElementById('todayTime').textContent = formatTime(stats.totalTime || 0);
            document.getElementById('streakDays').textContent = stats.streak || 0;
        } catch (error) {
            console.error('Error loading quick stats:', error);
        }
    }

    async loadCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url) {
                this.showCurrentPageFallback('No active tab', 'Open a webpage to track');
                return;
            }

            // Check if this is a trackable page
            const isTrackable = tab.url.startsWith('http://') || tab.url.startsWith('https://');

            if (!isTrackable) {
                this.showCurrentPageFallback(tab.title || 'Browser Page', 'Not trackable');
                return;
            }

            // Try to get session info from background script
            if (isExtensionContextValid()) {
                try {
                    const response = await safeSendMessage({
                        type: 'GET_CURRENT_SESSION',
                        tabId: tab.id
                    });

                    if (response && response.session) {
                        const session = response.session;
                        document.getElementById('currentPageTitle').textContent = session.title || tab.title || 'Unknown Page';
                        document.getElementById('currentPageCategory').textContent = session.category || 'Analyzing...';

                        const engagement = session.engagementScore || 0;
                        document.getElementById('engagementMeter').style.width = `${engagement}%`;
                        document.getElementById('engagementValue').textContent = `${Math.round(engagement)}%`;

                        this.updateFocusDots(session.focusLevel || 0);
                        return;
                    }
                } catch (msgError) {
                    // Background script not responding - show basic info
                }
            }

            // Fallback: Show basic tab info
            const domain = new URL(tab.url).hostname.replace('www.', '');
            document.getElementById('currentPageTitle').textContent = this.truncateText(tab.title || domain, 40);
            document.getElementById('currentPageCategory').textContent = this.isTracking ? 'Tracking...' : 'Paused';
            document.getElementById('engagementMeter').style.width = '0%';
            document.getElementById('engagementValue').textContent = '0%';
            this.updateFocusDots(0);

        } catch (error) {
            console.error('Error loading current page:', error);
            this.showCurrentPageFallback('Unable to load', 'Try refreshing');
        }
    }

    showCurrentPageFallback(title, category) {
        document.getElementById('currentPageTitle').textContent = title;
        document.getElementById('currentPageCategory').textContent = category;
        document.getElementById('engagementMeter').style.width = '0%';
        document.getElementById('engagementValue').textContent = '0%';
        this.updateFocusDots(0);
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    updateFocusDots(level) {
        const dots = document.querySelectorAll('.focus-dot');
        const activeDots = Math.ceil(level / 20);

        dots.forEach((dot, index) => {
            if (index < activeDots) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    async loadTopTopics() {
        try {
            const topics = await this.storage.getTopTopics(3);
            const container = document.getElementById('topTopicsList');

            if (topics.length === 0) {
                container.innerHTML = `
                    <div class="topic-item">
                        <div class="topic-info">
                            <div class="topic-icon"><i class="ri-book-open-line"></i></div>
                            <div>
                                <div class="topic-name">Start Learning!</div>
                                <div class="topic-time">Browse educational content to see topics</div>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            const topicIcons = [
                '<i class="ri-computer-line"></i>',
                '<i class="ri-bar-chart-line"></i>',
                '<i class="ri-microscope-line"></i>',
                '<i class="ri-book-2-line"></i>',
                '<i class="ri-palette-line"></i>',
                '<i class="ri-calculator-line"></i>',
                '<i class="ri-global-line"></i>',
                '<i class="ri-settings-line"></i>'
            ];

            container.innerHTML = topics.map((topic, index) => `
                <div class="topic-item">
                    <div class="topic-info">
                        <div class="topic-icon">${topicIcons[index % topicIcons.length]}</div>
                        <div>
                            <div class="topic-name">${topic.name}</div>
                            <div class="topic-time">${formatTime(topic.totalTime)}</div>
                        </div>
                    </div>
                    <div class="topic-progress">
                        <div class="topic-progress-fill" style="width: ${topic.progress || 0}%"></div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading top topics:', error);
        }
    }

    async loadRecommendations() {
        try {
            const recommendations = await this.storage.getRecommendations(2);
            const container = document.getElementById('recommendationsList');

            if (recommendations.length === 0) {
                container.innerHTML = `
                    <div class="recommendation-card">
                        <div class="rec-icon"><i class="ri-lightbulb-line"></i></div>
                        <div class="rec-content">
                            <div class="rec-title">Personalized Recommendations Coming</div>
                            <div class="rec-description">Keep learning! AI will generate recommendations based on your patterns.</div>
                            <span class="rec-tag">Getting Started</span>
                        </div>
                    </div>
                `;
                return;
            }

            const recIcons = [
                '<i class="ri-book-read-line"></i>',
                '<i class="ri-movie-line"></i>',
                '<i class="ri-article-line"></i>',
                '<i class="ri-links-line"></i>',
                '<i class="ri-lightbulb-line"></i>'
            ];

            container.innerHTML = recommendations.map((rec, index) => `
                <a href="${rec.url || '#'}" 
                   class="recommendation-card" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   ${!rec.url ? 'style="pointer-events: none; opacity: 0.7;"' : ''}>
                    <div class="rec-icon">${rec.icon || recIcons[index % recIcons.length]}</div>
                    <div class="rec-content">
                        <div class="rec-title">
                            ${rec.title}
                            ${rec.url ? '<i class="ri-external-link-line" style="font-size: 14px; opacity: 0.7;"></i>' : ''}
                        </div>
                        <div class="rec-description">${rec.description}</div>
                        <span class="rec-tag">${rec.type || 'Suggested'}</span>
                    </div>
                </a>
            `).join('');
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    startRealTimeUpdates() {
        setInterval(() => {
            try {
                if (isExtensionContextValid()) {
                    this.loadCurrentPage();
                }
            } catch (error) {
                console.log('Extension context invalidated, stopping updates');
            }
        }, 5000);

        setInterval(() => {
            try {
                if (isExtensionContextValid()) {
                    this.loadQuickStats();
                }
            } catch (error) {
                console.log('Extension context invalidated, stopping updates');
            }
        }, 30000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (isExtensionContextValid()) {
            new PopupController();
        } else {
            throw new Error('Extension context invalidated');
        }
    } catch (error) {
        console.error('Failed to initialize popup:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>Extension Reloaded</h3>
                <p>Please refresh the extension popup or reload the extension.</p>
            </div>
        `;
    }
});
