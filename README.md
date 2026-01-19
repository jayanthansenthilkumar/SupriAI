# SupriAI - Smart Learning Assistant

SupriAI is a powerful Chrome Extension designed to track your learning journey, visualize your progress, and help you stay focused on your study goals. It runs entirely within your browser, ensuring your data stays local and private.

## Features

- **📊 Visual Dashboard**: comprehensive analytics of your learning habits.
- **⏱️ Time Tracking**: Automatically tracks time spent on educational websites.
- **🎯 Goal Setting**: Set and track daily, weekly, or monthly learning goals.
- **📝 Notes & Reflections**: Take quick notes on what you've learned.
- **🚫 Distraction Free**: Helps you stay focused on your learning path.
- **🔒 Privacy First**: All data is stored locally in your browser. No external servers or API keys required.

## Installation

1. open `chrome://extensions/` in your Chrome browser.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `SupriAI` folder.

## Usage

- **Popup**: Click the extension icon to see your daily progress, pause tracking, or check your current session stats.
- **Dashboard**: Click "Open Dashboard" in the popup to view detailed analytics, manage goals, and review your history.
- **Tracking**: The extension automatically tracks time on educational sites (like Coursera, Udemy, GitHub, Documentation, etc.) and categorizes them.

## Development

- `manifest.json`: Extension configuration.
- `background.js`: Background service worker handles data collection and state management.
- `dashboard.js`: Logic for the main dashboard interface.
- `popup.js`: Logic for the popup menu.
- `content.js`: Script that runs on web pages to analyze content and track engagement.

## License

Personal usage.
