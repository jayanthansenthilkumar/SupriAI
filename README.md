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
