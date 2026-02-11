# 🧠 SupriAI — AI-Powered Browsing Intelligence

> **Final Year Project** — Chrome Extension with Machine Learning Backend

SupriAI is an intelligent Chrome extension that tracks your browsing habits and uses **6 Machine Learning algorithms** to provide productivity insights, anomaly detection, browsing forecasts, and personalized focus recommendations — all powered by a **Python Flask + SQLite** backend.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [ML Algorithms](#-ml-algorithms)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)

---

## ✨ Features

### Chrome Extension
- **📊 Real-time Dashboard** — Live overview with quick stats, charts, and tab lifecycle
- **🤖 AI Insights Tab** — 6 ML-powered insight cards with live predictions
- **💡 Smart Focus Recommendations** — Context-aware suggestions (deep focus, light work, break, leisure)
- **📑 Content Curation** — AI-powered page summarization using Gemini API
- **📅 Browsing History** — Detailed stats with productivity timeline
- **📁 Tab Groups** — Automatic domain-based grouping with time limits
- **💤 Inactive Tab Detection** — Find and close unused tabs
- **⚙️ Customizable Settings** — Time limits, productivity categories, backend connection

### ML-Powered Backend
- **Website Classification** — Automatic categorization of visited websites
- **Browsing Profiling** — K-Means clustering to identify your browsing personality
- **Productivity Prediction** — Random Forest predicts daily productivity scores
- **Anomaly Detection** — Identifies unusual browsing patterns
- **Time Series Forecasting** — 7-day forecasts of browsing habits
- **Focus Scheduling** — Optimal work/break schedule based on patterns

---

## 🏗 Architecture

```
┌─────────────────────────┐     HTTP/REST      ┌─────────────────────────┐
│   Chrome Extension      │ ◄───────────────►  │   Flask Backend         │
│                         │                    │                         │
│  ┌───────────────────┐  │                    │  ┌───────────────────┐  │
│  │ Popup UI          │  │                    │  │ REST API          │  │
│  │ (HTML/CSS/JS)     │  │                    │  │ (app.py)          │  │
│  └───────┬───────────┘  │                    │  └───────┬───────────┘  │
│          │              │                    │          │              │
│  ┌───────┴───────────┐  │                    │  ┌───────┴───────────┐  │
│  │ Background Worker │  │   Sync every 60s   │  │ ML Engine         │  │
│  │ (Service Worker)  │──┼──────────────────► │  │ (6 algorithms)    │  │
│  └───────┬───────────┘  │                    │  └───────┬───────────┘  │
│          │              │                    │          │              │
│  ┌───────┴───────────┐  │                    │  ┌───────┴───────────┐  │
│  │ IndexedDB         │  │                    │  │ SQLite Database   │  │
│  │ (Client-side)     │  │                    │  │ (Server-side)     │  │
│  └───────────────────┘  │                    │  └───────────────────┘  │
└─────────────────────────┘                    └─────────────────────────┘
```

---

## 🤖 ML Algorithms

| # | Algorithm | Purpose | Library |
|---|-----------|---------|---------|
| 1 | **Multinomial Naive Bayes** | Website Category Classification | scikit-learn |
| 2 | **K-Means Clustering** | Browsing Habit Profiling | scikit-learn |
| 3 | **Random Forest Regressor** | Productivity Score Prediction | scikit-learn |
| 4 | **Isolation Forest** | Anomaly Detection | scikit-learn |
| 5 | **Ridge Regression + Exponential Smoothing** | Time Series Forecasting | scikit-learn + scipy |
| 6 | **Decision Tree Classifier** | Focus Time Recommendation | scikit-learn |

### Algorithm Details

**1. Website Category Classifier (Naive Bayes)**
- Classifies domains into: productive, social, entertainment, news, shopping, communication
- Uses TF-IDF vectorization on domain name tokens
- Includes rule-based fallback for common domains

**2. Browsing Habit Clustering (K-Means)**
- Clusters users into profiles: Focus Worker, Social Butterfly, Content Consumer, etc.
- Features: category ratios, peak hours, unique domains, session length
- Uses silhouette score to find optimal k

**3. Productivity Predictor (Random Forest)**
- Predicts daily productivity score (0-100)
- 100 estimators, max depth 10
- Features: time distributions, category ratios, rolling averages
- Provides confidence intervals from individual tree predictions

**4. Anomaly Detector (Isolation Forest)**
- Detects unusual browsing sessions
- Severity levels: normal, mild, moderate, severe
- Generates actionable recommendations for each anomaly

**5. Time Series Forecaster (Regression + Smoothing)**
- Forecasts 7 days of browsing metrics
- Combines Ridge Regression with Exponential Smoothing (α=0.3)
- Provides widening confidence bands over forecast horizon

**6. Focus Recommender (Decision Tree)**
- Recommends: deep_focus, light_work, break_needed, leisure
- Uses class-balanced weighting for imbalanced scenarios
- Computes optimal daily schedule based on historical data

---

## 🛠 Tech Stack

### Frontend (Chrome Extension)
| Technology | Purpose |
|-----------|---------|
| HTML5 / CSS3 | Popup UI |
| JavaScript (ES6+) | Extension logic |
| Chart.js | Data visualization |
| Chrome Extensions API (MV3) | Tab tracking, history, storage |
| Gemini API | AI-powered content summarization |
| DOMPurify | HTML sanitization |

### Backend (Python)
| Technology | Purpose |
|-----------|---------|
| Python 3.10+ | Backend language |
| Flask 3.1 | REST API framework |
| Flask-CORS | Cross-origin support |
| SQLite3 | Database |
| scikit-learn 1.6 | Machine learning |
| NumPy / Pandas | Data processing |
| SciPy | Statistical functions |

---

## 📂 Project Structure

```
SupriAI/
├── manifest.json                 # Chrome extension manifest (MV3)
├── popup.html                    # Extension popup UI
│
├── assets/                       # All frontend assets
│   ├── scripts/
│   │   ├── popup.js             # Popup logic with ML integration
│   │   ├── background-enhanced.js # Background service worker
│   │   ├── background.js        # Legacy background script
│   │   ├── config.js            # Default settings
│   │   ├── gamification.js      # Gamification features
│   │   ├── content.js           # Content extraction script
│   │   │
│   │   ├── services/
│   │   │   ├── backendAPI.js    # Flask backend API client
│   │   │   ├── database.js      # IndexedDB service
│   │   │   ├── databaseQueryHelper.js # DB query utilities
│   │   │   ├── gemini.js        # Gemini AI summarization
│   │   │   ├── curationService.js # 3-step content curation
│   │   │   └── dataMigration.js # Storage migration
│   │   │
│   │   ├── components/
│   │   │   └── curationWorkflow.js # Curation UI workflow
│   │   │
│   │   └── lib/
│   │       ├── chart.js         # Chart.js library
│   │       └── purify.min.js    # DOMPurify library
│   │
│   ├── styles/
│   │   ├── popup.css            # Popup styles (Google Material)
│   │   ├── curation.css         # Curation styles
│   │   └── fonts.css            # Google Sans fonts
│   │
│   ├── config/
│   │   ├── keys.js              # API keys (Gemini)
│   │   └── keys.example.js      # Example config
│   │
│   ├── fonts/                   # Google Sans font files
│   └── icons/                   # Extension icons
│
├── backend/                      # Python Flask Backend
│   ├── app.py                   # Flask REST API server
│   ├── config.py                # Backend configuration
│   ├── database.py              # SQLite database manager
│   ├── requirements.txt         # Python dependencies
│   │
│   └── ml/                      # Machine Learning Module
│       ├── __init__.py
│       ├── engine.py            # ML orchestration engine
│       ├── classifier.py        # ML #1: Naive Bayes
│       ├── clustering.py        # ML #2: K-Means
│       ├── productivity.py      # ML #3: Random Forest
│       ├── anomaly.py           # ML #4: Isolation Forest
│       ├── forecasting.py       # ML #5: Time Series
│       └── focus.py             # ML #6: Decision Tree
│
└── README.md                     # This file
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Google Chrome** (version 88+)
- **Python 3.10+**
- **pip** (Python package manager)

### Step 1: Clone the Repository
```bash
git clone https://github.com/jayanthansenthilkumar/SupriAI.git
cd SupriAI
```

### Step 2: Setup Python Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```
The Flask server will start at `http://127.0.0.1:5000`

### Step 3: Configure API Keys
```bash
cp assets/config/keys.example.js assets/config/keys.js
```
Edit `assets/config/keys.js` and add your **Gemini API key**.

### Step 4: Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `SupriAI` project folder
5. Pin the extension to your toolbar

### Step 5: Start Using
1. Click the SupriAI icon in your toolbar
2. The **Overview** tab shows real-time browsing stats
3. Click **AI Insights** to see ML-powered analysis
4. Click **Import Chrome History** to feed data into ML models
5. Click **Retrain ML Models** after importing data

---

## 📖 Usage

### Overview Tab
- Quick stats bar: today's time, score, tabs, sites
- Focus recommendation card with AI suggestions
- Time distribution pie chart
- Hourly activity line chart
- Productivity ratio doughnut chart

### AI Insights Tab
- **Productivity Prediction**: See predicted score with confidence interval
- **Browsing Profile**: Your K-Means cluster with category breakdown
- **Anomaly Detection**: Unusual browsing pattern alerts
- **Website Classification**: Auto-categorized open tabs
- **7-Day Forecast**: Predicted browsing time chart
- **Optimal Schedule**: Best times for focus/break/leisure

### Curate Tab
- Select a domain from open tabs
- AI generates curated insights in 3 steps

### Summary Tab
- Click "Summarize This Page" on any webpage
- Gemini AI extracts and summarizes content

### History Tab
- Filter by today/week/month
- View productivity trend timeline
- Top domains with visit counts
- Export data as JSON

### Settings Tab
- Set time limits per domain
- Configure productive/social site categories
- Check backend connection status
- Manual data sync

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/models` | ML models status |
| POST | `/api/sync` | Sync browsing data |
| POST | `/api/import-history` | Import Chrome history |
| GET | `/api/stats/summary` | Browsing summary |
| GET | `/api/stats/categories` | Category breakdown |
| GET | `/api/stats/hourly` | Hourly activity |
| GET | `/api/stats/top-domains` | Top visited domains |
| POST | `/api/ml/classify` | Classify a domain |
| GET | `/api/ml/cluster` | Get browsing cluster |
| GET | `/api/ml/predict-productivity` | Predict productivity |
| GET | `/api/ml/detect-anomaly` | Detect anomalies |
| GET | `/api/ml/forecast` | Time series forecast |
| GET | `/api/ml/focus` | Focus recommendation |
| GET | `/api/ml/schedule` | Optimal schedule |
| GET | `/api/ml/insights` | Comprehensive insights |
| POST | `/api/ml/train` | Retrain all models |
| GET | `/api/productivity/scores` | Historical scores |
| GET | `/api/export` | Export all data |

---

## 📸 Screenshots

> Add screenshots of the extension popup showing:
> 1. Overview tab with quick stats and charts
> 2. AI Insights tab with ML predictions
> 3. History tab with productivity timeline
> 4. Settings tab with backend connection

---

## 📄 License

This project is developed as a **Final Year Project** for academic purposes.

---

## 👨‍💻 Developer

**Jayanthan Senthilkumar**

Built with ❤️ using Chrome Extensions API, Python Flask, scikit-learn, and Gemini AI.
