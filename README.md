# SupriAI - Smart Learning Assistant 🧠

SupriAI is a powerful Chrome Extension that transforms your browsing history into actionable learning insights. It analyzes your Google Chrome history, categorizes your learning activities, and provides comprehensive analytics to help you track and optimize your learning journey.

## ✨ Key Features

- **📊 Chrome History Analytics**: Automatically imports and analyzes your Google Chrome browsing history
- **🎯 Smart Categorization**: AI-powered topic detection (Programming, Web Development, Documentation, etc.)
- **📈 Visual Dashboard**: Beautiful, comprehensive analytics of your learning habits
- **⏱️ Time Tracking**: Tracks time spent on educational websites and learning resources
- **🎯 Goal Setting**: Set and track daily, weekly, or monthly learning goals
- **📝 Notes & Reflections**: Take quick notes on what you've learned
- **🔖 Bookmarks**: Save important resources for later
- **🔒 Privacy First**: All data stored locally on your machine - never sent to external servers

## 🚀 Quick Start

### 1. Start the Backend

```powershell
cd backend
python main.py
```

Server will start on http://127.0.0.1:8000

### 2. Install Chrome Extension

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `SupriAI` folder

### 3. Sync Your Chrome History

1. Open `sync-chrome-history.html` from the extension
2. Click "🚀 Sync Chrome History Now"
3. Your browsing history will be imported and analyzed

### 4. View Your Analytics

Open `dashboard.html` to see your learning insights!

## 📊 Data Source

**Primary Dataset: Google Chrome Browsing History**

SupriAI uses your Chrome browsing history as its data source, providing:

- Automatic history collection (every 30 minutes)
- Smart URL categorization
- Visit frequency and duration tracking
- Topic-based analytics
- Learning pattern insights

**Privacy Note:** All data stays on your local machine. Nothing is sent to external servers.

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

## Backend (Python / Flask)

The backend collects Chrome history events and exposes analytics + dataset exports for ML/DL.

### Setup

1. Install Python 3.10+.
2. `cd backend`
3. `python -m venv .venv && .venv\Scripts\activate`
4. `pip install -r requirements.txt`

### Run locally

`python main.py` (runs on port 8000)

### Key endpoints

- `POST /api/history/bulk` — ingest an array of history events from the extension.
- `GET /api/history` — list events with filters (domain, search, date range).
- `GET /api/history/export?format=csv|ndjson` — download dataset for ML pipelines.
- `GET /api/analytics/summary` — visit counts, durations, top domains/topics.
- `GET /api/analytics/time-distribution` — hourly distribution for modeling.
- `GET /api/dataset` — normalized rows for training.
- CRUD for bookmarks, notes, goals: `/api/bookmarks`, `/api/notes`, `/api/goals`.

### Wiring the extension

Point the extension’s network calls (e.g., in `background.js`) to `http://localhost:8000` or your deployed URL. Send Chrome history batches to `/api/history/bulk` with fields: `url`, `title`, `visited_at` (ISO datetime), `duration_seconds`, `source`, `topic`, `content_snippet`, `metadata`.

## License

Personal usage.
