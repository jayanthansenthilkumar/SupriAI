# AI-Powered Learning Recommendation & Analytics System

## Abstract
This project turns web browsing into a personalized learning journey. It passively tracks learning-related activity, stores it locally (SQLite), and uses an AI engine (Python) to provide insights and study recommendations via a beautiful Chrome Extension Dashboard.

## Architecture
- **Frontend**: Chrome Extension (Manifest V3), HTML5, CSS3 (Glassmorphism), Chart.js, SweetAlert2.
- **Backend**: Python (Flask), SQLite, NLP (Keyword/Heuristic for demo).

## Prerequisites
- Python 3.8+
- Google Chrome browser

## Setup Instructions

### 1. Backend Setup
The "Brain" of the system needs to be running locally.
```
SupriAI/
├── manifest.json           # Chrome extension manifest
├── start-backend.bat       # Backend startup script (Windows)
├── popup/                  # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── dashboard/              # Full dashboard interface
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js
├── js/                     # Core extension scripts
│   ├── background.js       # Service worker
│   ├── content.js          # Content script for tracking
│   ├── storage.js          # IndexedDB storage manager
│   ├── classifier.js       # Content classification
│   ├── analytics.js        # Analytics engine
│   ├── recommendations.js  # Recommendations engine
│   ├── config.js           # Configuration
│   ├── utils.js            # Utility functions
│   ├── server-manager.js   # Backend connection
│   └── d3-viz.js          # D3 visualizations
├── css/                    # Stylesheets
│   ├── theme.css           # Theme variables
│   └── remixicon.css       # Icon font
├── icons/                  # Extension icons
└── backend/                # Backend server
    ├── server.js           # Node.js server
    ├── app.py              # Flask API (alternative)
    ├── ai_engine.py        # AI analysis engine
    ├── recommendation_engine.py
    ├── ai_service.py       # Python AI service wrapper
    ├── config.py           # Backend configuration
    ├── package.json        # Node.js dependencies
    └── requirements.txt    # Python dependencies
```

## 🛠️ Installation

### 1. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `SupriAI` folder


### 2. Start the Backend Server

The backend provides enhanced AI analysis and recommendations.

**Option A: Using the startup script (Recommended)**
```bash
# Windows
double-click start-backend.bat
```

```bash
cd backend
pip install flask flask-cors
python app.py
```
*The server will start on http://localhost:5000*

### 2. Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle).
3. Click "Load unpacked".
4. Select the `SupriAI/extension` folder from this project.
5. The "AI Learning Companion" is now active!

## Features
- **Passive Tracking**: Logs time, scroll depth, and active URL.
- **Privacy First**: Data stays local (on your machine).
- **AI Analysis**: Classifies content into topics (Programming, History, Science, etc.).
- **Analytics Dashboard**: View your engagement trends and topic distribution.
- **Recommendations**: Get suggested next steps based on your history.

## Aesthetics
The dashboard uses a modern "Dark Mode" aesthetic with glassmorphism effects for a premium feel.
