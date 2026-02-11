# SupriAI — AI-Powered Browsing Intelligence

> **Final Year Project** — Chrome Extension + Python Flask Backend with 10 ML/DL Algorithms

SupriAI is an intelligent Chrome extension that monitors your browsing behavior in real time and uses **10 Machine Learning and Deep Learning algorithms** to deliver productivity predictions, learning content recommendations, anomaly detection, NLP-based content analysis, time-pattern forecasting, and personalized focus scheduling — powered by a **Python Flask + SQLite + scikit-learn** backend.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Extension UI — 8 Tabs](#extension-ui--8-tabs)
- [ML & DL Algorithms (10 Models)](#ml--dl-algorithms-10-models)
- [Flask API Endpoints](#flask-api-endpoints)
- [Database Schema](#database-schema)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Chrome Permissions](#chrome-permissions)
- [Configuration](#configuration)
- [Design System](#design-system)
- [Screenshots](#screenshots)
- [License](#license)
- [Developer](#developer)

---

## Features

### Chrome Extension (Frontend)

| Feature | Description |
|---------|-------------|
| **Real-Time Dashboard** | Live quick stats (today's time, productivity score, open tabs, unique sites), pie charts, hourly activity graphs, and a tab lifecycle timeline |
| **10-Model AI Insights** | Dedicated tab with insight cards powered by all 10 ML/DL models — productivity prediction, browsing profiling, anomaly alerts, classification grid, 7-day forecast chart, optimal schedule, learning recommendations, NLP topic analysis, and temporal predictions |
| **Deep Learning Recommendations** | MLP neural network (128-64-32) suggests learning content across 12 categories (programming, data science, web dev, cloud, security, design, math, research, languages, business, general, career) with clickable resource links |
| **NLP Content Analysis** | TF-IDF + Latent Semantic Analysis extracts topics from your browsing, computes content diversity, vocabulary richness, and builds a learning pathway progression |
| **Temporal Pattern Predictions** | LSTM-like sliding-window MLP predicts tomorrow's browsing time, productivity ratio, focus score, and identifies your peak deep-work hours with an hourly heatmap |
| **Smart Focus Recommendations** | Context-aware suggestions updated in real time — deep focus, light work, break needed, or leisure — based on current hour, session length, tab switches, and productivity score |
| **AI Content Curation** | 3-step Gemini AI workflow on your open tabs: (1) Intent analysis, (2) Content quality rating (0-10), (3) Generated learning plan with exercises and reading order |
| **Page Summarization** | One-click summarization of any webpage via Gemini 1.5 Flash — HTML bullet-point output sanitized with DOMPurify |
| **Browsing History Analytics** | Period filters (today/week/month), productivity trend chart, top domains list, export to JSON |
| **Tab Group Management** | Auto-grouped by domain with total time, tab count, and time-limit warnings with bulk close |
| **Inactive Tab Detection** | Lists tabs idle for >5 minutes with one-click close |
| **Time Limit Notifications** | Per-domain time limits with Chrome notification alerts and "Close Tab" action button |
| **Customizable Settings** | Configure time limits, productive/social site lists, backend connection, and manual sync |
| **Auto Background Sync** | Service worker syncs all browsing data to Flask backend every 60 seconds |

### ML/DL Backend (10 Algorithms)

| Category | Models |
|----------|--------|
| **Traditional ML** | Naive Bayes classifier, K-Means clustering, Random Forest regression, Isolation Forest anomaly detection, Ridge Regression + Exponential Smoothing forecasting, Decision Tree focus recommendation |
| **Deep Learning** | MLP Neural Network content recommender, TF-IDF + Truncated SVD (LSA) NLP analyzer, Neural Collaborative Filtering domain recommender, Temporal sequence MLP (LSTM-like) time predictor |

---

## Architecture

```
┌──────────────────────────────┐      HTTP / REST       ┌──────────────────────────────┐
│     Chrome Extension (MV3)   │ ◄────────────────────► │      Flask Backend           │
│                              │    Auto-sync / 60s     │                              │
│  ┌────────────────────────┐  │                        │  ┌────────────────────────┐  │
│  │  Popup UI (8 tabs)     │  │                        │  │  REST API (33 routes)  │  │
│  │  HTML + CSS + JS       │  │                        │  │  app.py                │  │
│  └───────────┬────────────┘  │                        │  └───────────┬────────────┘  │
│              │               │                        │              │               │
│  ┌───────────┴────────────┐  │                        │  ┌───────────┴────────────┐  │
│  │  Service Worker        │  │   Sync tabs, groups,   │  │  ML Engine (10 models) │  │
│  │  background-enhanced.js│──┼──sessions, history───► │  │  6 ML + 4 DL           │  │
│  └───────────┬────────────┘  │                        │  └───────────┬────────────┘  │
│              │               │                        │              │               │
│  ┌───────────┴────────────┐  │                        │  ┌───────────┴────────────┐  │
│  │  IndexedDB + Storage   │  │                        │  │  SQLite (8 tables)     │  │
│  │  (Client-side persist) │  │                        │  │  + Trained .pkl models │  │
│  └────────────────────────┘  │                        │  └────────────────────────┘  │
│                              │                        │                              │
│  ┌────────────────────────┐  │                        │  ┌────────────────────────┐  │
│  │  Gemini 1.5 Flash API  │  │                        │  │  scikit-learn 1.6      │  │
│  │  (Summarize + Curate)  │  │                        │  │  NumPy / Pandas / SciPy│  │
│  └────────────────────────┘  │                        │  └────────────────────────┘  │
└──────────────────────────────┘                        └──────────────────────────────┘
```

---

## Extension UI — 8 Tabs

### 1. Overview

The default landing tab with live browsing statistics:

- **Quick Stats Bar** — 4-column grid showing Today's Time, Productivity Score, Open Tabs, and Unique Sites
- **Focus Recommendation** — AI-powered card suggesting deep focus, light work, break needed, or leisure mode based on Decision Tree output and current context
- **Time Distribution Chart** — Pie chart showing time split across websites (Chart.js)
- **Hourly Activity** — Line chart of browsing activity pattern across the day
- **Productivity Ratio** — Doughnut chart of productive vs. social vs. entertainment time
- **Tab Lifecycle Timeline** — Visual timeline of tab open/close events

### 2. AI Insights

The intelligence hub showing all 10 ML/DL model outputs:

- **Productivity Prediction** — Random Forest predicted score (0-100) with confidence interval and circular progress ring
- **Browsing Profile** — K-Means cluster label (Focus Worker, Social Butterfly, etc.) with category breakdown bars
- **Anomaly Detection** — Isolation Forest alert with severity level and actionable recommendations
- **Website Classification** — Naive Bayes auto-categorization grid of open tabs with category icons
- **7-Day Forecast** — Ridge Regression + Exp. Smoothing line chart of predicted browsing hours
- **Optimal Schedule** — Decision Tree daily schedule showing best times for focus/break/leisure
- **ML Models Status** — Collapsible card showing all 10 models with trained/untrained status and DL badges
- **Learning Recommendations** — MLP Neural Network top-5 learning categories with confidence scores, reasons, and clickable resource links
- **Content Analysis** — NLP/LSA topic relevance bars, learning pathway pills, diversity and vocabulary richness metrics
- **Time Pattern Predictions** — Peak productivity hour, deep work/learning/break schedule, and mini hourly productivity heatmap
- **Action Buttons** — "Retrain ML Models" and "Import Chrome History"

### 3. Curate

AI-powered tab curation using Gemini 1.5 Flash:

1. **Step 1 — Intent Analysis**: AI analyzes the intent behind your open tabs for a selected domain
2. **Step 2 — Content Quality Rating**: Each tab gets a quality score (0-10) with explanation
3. **Step 3 — Learning Plan**: Generated structured plan with reading sequence, exercises, implementation steps, and next actions  
4. **Close Unused Tabs** button to clean up low-quality tabs

### 4. Summary

Single-page summarization:

- Click **"Summarize This Page"** on any webpage
- Injects `content.js` to extract page text
- Sends content to Gemini 1.5 Flash API
- Renders HTML summary with bullet points (sanitized via DOMPurify)

### 5. History

Browsing history analytics:

- **Period Filter** — Today / Week / Month selector
- **Stats Cards** — Total Tabs, Unique Domains, Total Time, Total Visits
- **Productivity Trend** — Line chart of productivity scores over time (from backend)
- **Top Domains** — Ranked list by visit count and total time
- **Recent Tabs** — Chronological tab list with domains and timestamps
- **Export Data** — Download all data as JSON

### 6. Groups

Active tab groups:

- Tabs auto-grouped by domain
- Shows tab count and total time per domain
- Time-limit warnings (amber/red based on configured limits)
- **"Close All Tabs"** action per domain group

### 7. Inactive

Idle tab manager:

- Lists all tabs inactive for >5 minutes
- Shows domain, page title, and inactive duration
- Individual **"Close"** button per tab

### 8. Settings

Extension configuration:

- **Time Limits** — Add/remove per-domain time limits in minutes
- **Site Categories** — Edit productive sites and social sites lists
- **Backend Connection** — Shows online/offline status with "Sync Data Now" button

---

## ML & DL Algorithms (10 Models)

### Traditional Machine Learning (Models 1–6)

#### 1. Website Category Classifier — Multinomial Naive Bayes

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/classifier.py` |
| **Algorithm** | Multinomial Naive Bayes with TF-IDF Pipeline |
| **Input Features** | Domain name tokens (split by dots, hyphens), TLD type, URL path keywords, known domain patterns |
| **Output** | Category: productive, social, entertainment, news, shopping, communication, unknown |
| **Training** | Pre-trained on 86 known domains from config + data augmentation with variations |
| **Fallback** | Rule-based matching for common domains when confidence is low |

#### 2. Browsing Habit Clusterer — K-Means Clustering

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/clustering.py` |
| **Algorithm** | K-Means Clustering with StandardScaler normalization |
| **Clusters** | 5: Focus Worker, Social Butterfly, Content Consumer, Balanced Browser, Casual Surfer |
| **Features (11)** | productive_ratio, social_ratio, entertainment_ratio, news_ratio, shopping_ratio, communication_ratio, peak_hour, unique_domains, total_time_hours, avg_session_minutes, focus_score |
| **Optimization** | Silhouette score for optimal k selection |

#### 3. Productivity Score Predictor — Random Forest Regressor

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/productivity.py` |
| **Algorithm** | Random Forest Regression (100 estimators, max_depth=10) |
| **Features (23)** | Day-of-week one-hot (7), time-of-day ratios (4), category ratios (6), unique_domains, total_time_hours, prev_day_score, rolling_7d_score, session_count, avg_session_length |
| **Output** | Productivity score 0–100 with confidence interval (from individual tree variance) and feature importance ranking |

#### 4. Anomaly Detector — Isolation Forest

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/anomaly.py` |
| **Algorithm** | Isolation Forest (100 estimators, contamination=0.1) |
| **Features (10)** | total_time_hours, productive_ratio, social_ratio, entertainment_ratio, peak_hour_normalized, unique_domains_normalized, max_single_domain_ratio, session_count, avg_session_length, category_entropy |
| **Output** | is_anomaly flag, severity (normal/mild/moderate/severe), anomalous features list, actionable recommendations |

#### 5. Time Series Forecaster — Ridge Regression + Exponential Smoothing

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/forecasting.py` |
| **Algorithm** | Ridge Regression trend model + Exponential Smoothing (alpha=0.3) + Savitzky-Golay smoothing |
| **Tracks** | total_time, productive_time, social_time, entertainment_time, productivity_scores (daily) |
| **Output** | 7-day forecast with predicted totals, productive time, scores, trend direction, and widening confidence bands |

#### 6. Focus Time Recommender — Decision Tree Classifier

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/focus.py` |
| **Algorithm** | Decision Tree Classifier (max_depth=8, class-balanced weighting) |
| **Features (10)** | hour_of_day, day_of_week, productive_ratio, social_ratio, entertainment_ratio, minutes_since_last_break, current_session_length, tab_switch_frequency, unique_domains_last_hour, productivity_score_today |
| **Output** | Focus state (deep_focus / light_work / break_needed / leisure), suggested duration in minutes, optimal hourly schedule |

### Deep Learning (Models 7–10)

#### 7. Learning Content Recommender — MLP Neural Network

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/recommendation.py` |
| **Algorithm** | Multi-Layer Perceptron (MLPClassifier) |
| **Architecture** | 18 → 128 → 64 → 32 → 12 neurons |
| **Activation** | ReLU with Adam optimizer |
| **Regularization** | L2 (alpha=0.001) + Early Stopping (patience=20) |
| **Features (18)** | hour_of_day, day_of_week, productive_ratio, social_ratio, entertainment_ratio, news_ratio, total_browsing_minutes, unique_domains_count, avg_session_duration, programming_affinity, data_science_affinity, web_dev_affinity, cloud_affinity, research_affinity, design_affinity, tab_switch_rate, focus_score, recency_weight |
| **Output Categories (12)** | programming, data_science, web_development, cloud_computing, cybersecurity, design, mathematics, research, language_learning, business, general_knowledge, career_development |
| **Training** | 960 synthetic samples (80 per category), pre-trained, fine-tunable with real data via `partial_fit` |
| **Metrics** | Cross-validated accuracy ≈ 86.6% |
| **Features** | Top-K recommendations with confidence scores, human-readable reasons, curated resource links (URLs), and category tags |

#### 8. NLP Content Analyzer — TF-IDF + Truncated SVD (Latent Semantic Analysis)

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/nlp_analyzer.py` |
| **Algorithm** | TF-IDF Vectorization → Truncated SVD (50-dim LSA) → MiniBatch K-Means Clustering |
| **Pipeline** | Text preprocessing → TF-IDF (2000 features, bigrams, sublinear TF) → SVD dimensionality reduction → 8-cluster K-Means |
| **Input** | Page titles, domain names, URL paths — with custom stop words and tokenization |
| **Output** | Topic clusters with keyword labels, topic relevance scores, learning pathway (ordered progression), content diversity score (Shannon entropy), vocabulary richness, average content similarity (cosine) |
| **Metrics** | Explained variance ≈ 97.4% |
| **Topic Labels** | Auto-inferred: Programming & Development, Data Science & ML, Web Development, Cloud & DevOps, Research & Academic, Design & Creative, Social & Communication, Entertainment, News & Information |

#### 9. Neural Collaborative Filter — NCF with MLP

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/collaborative.py` |
| **Algorithm** | Neural Collaborative Filtering (MLPRegressor) |
| **Architecture** | 16 → 64 → 32 → 16 → 1 neurons |
| **Domain Encoding (8)** | domain_length, subdomain_count, has_www, tld_type, is_known_productive, is_known_social, is_known_entertainment, learning_keyword_score |
| **Context Encoding (8)** | hour_of_day, day_of_week, session_duration, productivity_score, tab_count, unique_domains, productive_ratio, focus_score |
| **Output** | Engagement score (0–1) per domain; top-K domain recommendations with predicted engagement, domain type, and contextual reason |
| **Metrics** | R² ≈ 0.772 |
| **Training** | 500 synthetic user-domain interactions modeling productive vs. social vs. entertainment engagement patterns across work/evening hours |

#### 10. Temporal Pattern Predictor — Sequence-Based MLP (LSTM-like)

| Property | Detail |
|----------|--------|
| **File** | `backend/ml/temporal.py` |
| **Algorithm** | Sliding-window MLP simulating recurrent (LSTM-like) behavior |
| **Architecture** | 56 → 64 → 32 → 16 → 4 neurons |
| **Window** | 7 days × 8 features per step = 56 input dimensions |
| **Features Per Step (8)** | total_time_hours, productive_ratio, social_ratio, entertainment_ratio, unique_domains, session_count, focus_score, day_of_week |
| **Outputs (4)** | predicted_total_hours, predicted_productive_ratio, predicted_focus_score, predicted_sessions |
| **Additional** | Optimal deep-work hours, learning hours, break hours, hourly productivity heatmap (6 AM – 11 PM), 7-day rolling forecast, confidence based on variance |
| **Training** | 120 synthetic days (4 months) with weekday/weekend patterns and productivity trend |

---

## Flask API Endpoints

### Health & Information

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with timestamp and model count |
| `GET` | `/api/models` | All 10 ML model metadata and architecture details |

### Data Ingestion

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync` | Sync current tab data, tab groups, and session to backend |
| `POST` | `/api/import-history` | Import Chrome browsing history (up to 5000 items, 30 days) |

### Session Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Create a new browsing session |
| `GET` | `/api/sessions` | Get recent sessions (with `?limit=N`) |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Log a tab event (opened, closed, activated, idle) |

### Domain Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats/domains` | Domain stats for a period (`?period=today\|week\|month\|year`) |
| `GET` | `/api/stats/top-domains` | Top domains by time (`?period=week&limit=10`) |
| `GET` | `/api/stats/categories` | Category breakdown by time and visits |
| `GET` | `/api/stats/summary` | Comprehensive browsing summary |
| `GET` | `/api/stats/hourly` | Hourly activity for a date (`?date=2026-01-15`) |

### Productivity

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/productivity/scores` | Productivity scores over time (`?period=month`) |
| `GET` | `/api/productivity/today` | Today's productivity score and breakdown |

### ML — Traditional Models (1–6)

| Method | Endpoint | Model | Description |
|--------|----------|-------|-------------|
| `POST` | `/api/ml/classify` | #1 Naive Bayes | Classify a domain or batch of domains |
| `POST` | `/api/ml/cluster` | #2 K-Means | Get browsing behavior cluster for a day |
| `POST` | `/api/ml/predict-productivity` | #3 Random Forest | Predict productivity score |
| `POST` | `/api/ml/detect-anomaly` | #4 Isolation Forest | Detect browsing anomalies |
| `GET` | `/api/ml/forecast` | #5 Ridge + ES | Forecast future browsing patterns (`?days=7`) |
| `POST` | `/api/ml/focus` | #6 Decision Tree | Get focus/break recommendation |
| `GET` | `/api/ml/schedule` | #6 Decision Tree | Get optimal daily schedule |
| `POST` | `/api/ml/insights` | All 10 | Comprehensive insights from all models |
| `POST` | `/api/ml/train` | All 10 | Retrain all ML/DL models with available data |

### DL — Deep Learning Models (7–10)

| Method | Endpoint | Model | Description |
|--------|----------|-------|-------------|
| `POST` | `/api/ml/recommendations` | #7 MLP | Learning content recommendations (top-K with resources) |
| `POST` | `/api/ml/content-analysis` | #8 NLP/LSA | Topic extraction and content analysis |
| `POST` | `/api/ml/collaborative` | #9 NCF | Domain engagement predictions via collaborative filtering |
| `POST` | `/api/ml/temporal` | #10 Temporal | Time pattern predictions (next_day / week / optimal_hours) |
| `GET` | `/api/ml/optimal-hours` | #10 Temporal | Best hours for deep work and learning |

### Goals & Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/goals` | Get active user goals |
| `POST` | `/api/goals` | Create a new goal |
| `GET` | `/api/export` | Export all database data as JSON |

---

## Database Schema

### Backend — SQLite (`backend/data/supriai.db`, 8 tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sessions` | Browsing session tracking | session_id (UNIQUE), start_time, end_time, tab_count, total_active_time, productivity_score |
| `tabs` | Individual tab records | tab_id, url, domain, title, timestamp, session_id, active_time, date, category |
| `domain_stats` | Per-domain per-day aggregates | domain + date (UNIQUE pair), visit_count, total_active_time, tab_count, category |
| `tab_events` | Tab lifecycle events | tab_id, event_type (opened/closed/activated/idle), timestamp, domain, url |
| `chrome_history` | Imported Chrome history | url, title, domain, visit_count, last_visit_time, category |
| `productivity_scores` | Daily scoring | date (UNIQUE), score, productive_time, social_time, entertainment_time, focus_sessions |
| `ml_predictions` | Cached ML outputs | prediction_type, prediction_data (JSON), confidence, valid_until |
| `user_goals` | User productivity goals | goal_type, target_value, current_value, start_date, end_date, status |

**Indexes:** 10 indexes on frequently queried columns (domain, date, timestamp, session_id, category).

### Frontend — IndexedDB (`SupriAI_DB`, version 1, 4 object stores)

| Store | keyPath | Purpose |
|-------|---------|---------|
| `tabs` | auto-increment | Client-side tab record mirror |
| `sessions` | auto-increment | Client-side session tracking |
| `domain_stats` | auto-increment | Per-domain aggregates with unique [domain, date] index |
| `tab_events` | auto-increment | Tab lifecycle events with tabId, eventType, timestamp indexes |

---

## Tech Stack

### Frontend — Chrome Extension

| Technology | Version | Purpose |
|-----------|---------|---------|
| Chrome Extensions API | Manifest V3 | Tab tracking, storage, history, notifications, scripting |
| JavaScript (ES6+) | — | All extension logic (consolidated single `script.js`) |
| HTML5 / CSS3 | — | Popup UI with Material Design styling |
| Chart.js | Bundled | Pie, line, doughnut, and bar charts |
| DOMPurify | Bundled | XSS sanitization of AI-generated HTML |
| Google Sans | .woff | Custom typography (400, 500, 700 weights) |
| Gemini 1.5 Flash API | — | Page summarization and content curation |

### Backend — Python/Flask

| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.10+ | Backend language |
| Flask | 3.1.0 | REST API framework |
| Flask-CORS | 5.0.1 | Chrome extension cross-origin support |
| Flask-SocketIO | 5.5.1 | Real-time communication support |
| scikit-learn | 1.6.1 | All 10 ML/DL models |
| NumPy | 2.2.3 | Numerical computation |
| pandas | 2.2.3 | Data manipulation |
| SciPy | 1.15.2 | Statistical functions and smoothing |
| matplotlib | 3.10.0 | Server-side visualization |
| joblib | 1.4.2 | Model serialization (.pkl) |
| python-dateutil | 2.9.0 | Date/time utilities |
| APScheduler | 3.11.0 | Scheduled background tasks |
| SQLite3 | Built-in | Database (WAL mode + foreign keys) |

---

## Project Structure

```
SupriAI/
├── manifest.json                          # Chrome extension manifest (MV3)
├── popup.html                             # Extension popup UI (8 tabs)
├── backend.bat                            # Windows launcher script
├── README.md
│
├── assets/
│   ├── config/
│   │   ├── keys.js                        # Gemini API key (gitignored)
│   │   ├── keys.example.js                # Template for keys.js
│   │   └── README.md
│   ├── fonts/
│   │   ├── GoogleSans-Regular.woff
│   │   ├── GoogleSans-Medium.woff
│   │   └── GoogleSans-Bold.woff
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── scripts/
│   │   ├── script.js                      # Unified popup controller (~1960 lines)
│   │   ├── background-enhanced.js         # Service worker (530 lines)
│   │   ├── content.js                     # Page content extractor (69 lines)
│   │   ├── services/
│   │   │   ├── backendAPI.js              # Lightweight API client for service worker
│   │   │   └── database.js               # IndexedDB service (565 lines)
│   │   └── lib/
│   │       ├── chart.js                   # Chart.js library
│   │       └── purify.min.js              # DOMPurify library
│   └── styles/
│       └── styles.css                     # Unified stylesheet (~1490 lines)
│
└── backend/
    ├── app.py                             # Flask REST API (33 routes)
    ├── config.py                          # Configuration & website categories
    ├── database.py                        # SQLite DB manager (8 tables)
    ├── requirements.txt                   # Python dependencies
    ├── data/                              # Runtime: supriai.db (auto-created)
    └── ml/
        ├── __init__.py
        ├── engine.py                      # ML orchestrator (all 10 models)
        ├── classifier.py                  # #1  Multinomial Naive Bayes
        ├── clustering.py                  # #2  K-Means Clustering
        ├── productivity.py                # #3  Random Forest Regressor
        ├── anomaly.py                     # #4  Isolation Forest
        ├── forecasting.py                 # #5  Ridge Regression + Exp. Smoothing
        ├── focus.py                       # #6  Decision Tree Classifier
        ├── recommendation.py              # #7  MLP Neural Network (DL)
        ├── nlp_analyzer.py                # #8  TF-IDF + SVD / LSA (DL)
        ├── collaborative.py               # #9  Neural Collaborative Filter (DL)
        ├── temporal.py                    # #10 Temporal Sequence MLP (DL)
        └── trained_models/                # Serialized .pkl model files
```

---

## Installation & Setup

### Prerequisites

- **Google Chrome** (version 88 or later)
- **Python 3.10+**
- **pip** (Python package manager)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/jayanthansenthilkumar/SupriAI.git
cd SupriAI
```

### Step 2 — Setup the Python Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The Flask server starts at `http://127.0.0.1:5000` and initializes all 10 ML/DL models on startup:

```
╔═══════════════════════════════════════════════════╗
║           SupriAI Backend Server                  ║
║   Flask + SQLite + 10 ML/DL Algorithms            ║
╠═══════════════════════════════════════════════════╣
║  Traditional ML Models:                           ║
║  1. Naive Bayes       - Website Classification    ║
║  2. K-Means           - Browsing Clustering       ║
║  3. Random Forest     - Productivity Prediction   ║
║  4. Isolation Forest  - Anomaly Detection         ║
║  5. Ridge Reg. + ES   - Time Series Forecast      ║
║  6. Decision Tree     - Focus Recommendation      ║
╠───────────────────────────────────────────────────╣
║  Deep Learning Models:                            ║
║  7.  MLP Neural Net   - Content Recommendation    ║
║  8.  TF-IDF + LSA     - NLP Content Analysis      ║
║  9.  Neural CF        - Collaborative Filtering   ║
║  10. Temporal MLP     - Time Pattern Prediction   ║
╠═══════════════════════════════════════════════════╣
║  Server: http://127.0.0.1:5000                    ║
╚═══════════════════════════════════════════════════╝
```

> **Windows shortcut:** Double-click `backend.bat` to auto-install dependencies and start the server.

### Step 3 — Configure Gemini API Key

```bash
cp assets/config/keys.example.js assets/config/keys.js
```

Edit `assets/config/keys.js` and add your [Gemini API key](https://aistudio.google.com/apikey):

```javascript
const CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
};
```

### Step 4 — Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `SupriAI` project root folder
5. Pin the SupriAI extension to your toolbar

### Step 5 — Start Using

1. Click the **SupriAI icon** in your toolbar to open the popup
2. The **Overview** tab shows real-time browsing stats immediately
3. Go to **AI Insights** and click **"Import Chrome History"** to feed 30 days of data into the ML pipeline
4. Click **"Retrain ML Models"** to train all 10 models on your data
5. Switch between tabs to explore all features

---

## Usage Guide

### Getting ML Predictions

1. **Import history** — AI Insights tab → "Import Chrome History" (imports up to 5000 entries from the last 30 days)
2. **Train models** — "Retrain ML Models" button trains all 10 algorithms on your data
3. **View insights** — All insight cards auto-refresh with predictions

### Curating Content

1. Go to the **Curate** tab
2. Select a domain from the dropdown (populated from your open tabs)
3. Click **"Start Curation"** — Gemini AI analyzes tabs in 3 steps
4. Review quality ratings and learning plan
5. Optionally close low-quality tabs

### Summarizing Pages

1. Navigate to any webpage you want to summarize
2. Click the SupriAI icon → **Summary** tab
3. Click **"Summarize This Page"**
4. Read the AI-generated bullet-point summary

### Managing Time Limits

1. Go to **Settings** tab
2. Under "Time Limits", enter a domain (e.g., `youtube.com`) and minutes
3. Click **Add** — you'll get Chrome notification alerts when limits are exceeded

### Exporting Data

1. Go to **History** tab
2. Click **"Export Data"** at the bottom
3. A JSON file downloads with all your browsing analytics

---

## Chrome Permissions

| Permission | Why It's Needed |
|-----------|----------------|
| `tabs` | Query, track, and manage browser tabs for real-time monitoring |
| `storage` | Persist settings, tab data, session state, and learning plans via `chrome.storage.local` |
| `alarms` | Schedule periodic time-limit checks and backend sync |
| `windows` | Detect minimized windows to pause active time tracking |
| `activeTab` | Access the current tab for content extraction (summarization) |
| `scripting` | Inject `content.js` into pages for text extraction |
| `history` | Import Chrome browsing history (up to 5000 items, 30 days) for ML training |
| `notifications` | Show time-limit alerts with "Close Tab" action button |
| `<all_urls>` | Allow content script injection on any URL and fetch to Flask backend |

---

## Configuration

### Extension Settings (UI-configurable)

| Setting | Default | Description |
|---------|---------|-------------|
| Site Time Limits | youtube.com: 2 min, facebook.com: 30 min, twitter.com: 20 min | Per-domain notification limits |
| Productive Sites | github.com, stackoverflow.com, docs.google.com, linkedin.com | Sites classified as productive |
| Social Sites | facebook.com, twitter.com, instagram.com, youtube.com | Sites classified as social |

### Backend Config (`backend/config.py`)

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| Server Host | `127.0.0.1` | `FLASK_HOST` |
| Server Port | `5000` | `FLASK_PORT` |
| Debug Mode | `True` | `FLASK_DEBUG` |
| Database Path | `backend/data/supriai.db` | — |
| Min Training Data | 10 data points | — |
| Retrain Interval | 6 hours | — |
| Website Categories | 6 categories, 86 predefined domains | — |
| Productivity Weights | productive=1.0, communication=0.7, news=0.4, shopping=0.2, entertainment=0.1, social=0.1 | — |

---

## Design System

The extension UI follows **Google Material Design** principles with a compact 420px popup layout.

### Typography

- **Font**: Google Sans (Regular 400, Medium 500, Bold 700) with system fallbacks
- **Sizes**: H1 22px, Tab buttons 11.5px, Stat values 28px, Body 14px

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--primary-color` | `#1a73e8` | Primary actions, links, active tabs |
| `--primary-hover` | `#1557b0` | Button hover states |
| `--error-color` | `#d93025` | Time limit warnings, errors |
| `--success-color` | `#188038` | Backend online, trained models |
| `--warning-color` | `#f9ab00` | Anomaly alerts, learning hours |
| `--info-color` | `#9334e6` | DL badges, leisure mode |
| `--text-primary` | `#202124` | Main text |
| `--text-secondary` | `#5f6368` | Labels and descriptions |
| `--bg-subtle` | `#f1f3f4` | Input backgrounds, alternating rows |

### Spacing & Radius

- **Spacing**: 4px / 8px / 16px / 24px / 32px
- **Border Radius**: 4px / 8px / 12px / 16px / 9999px (pill)
- **Shadows**: 3 elevation levels (Material Design)

### Key UI Components

- Score circle with `conic-gradient` progress ring
- Insight cards with gradient headers and collapsible bodies
- ML badge (blue) and DL badge (purple) for model tagging
- Schedule timeline with color-coded focus/break/leisure slots
- Recommendation cards with confidence bars and resource links
- Toast notifications with slide-up animation
- Skeleton shimmer loading states

---

## Screenshots

> *Add screenshots of the extension popup showing:*
> 1. Overview tab with quick stats and charts
> 2. AI Insights tab with all 10 ML/DL predictions
> 3. Learning Recommendations with DL confidence scores
> 4. NLP Content Analysis with topic bars and learning pathway
> 5. Temporal Predictions with hourly heatmap
> 6. Curate tab with 3-step AI workflow
> 7. Summary tab with Gemini-generated page summary
> 8. History tab with productivity trend chart
> 9. Settings tab with backend connection status
> 10. Flask backend terminal with 10-model initialization

---

## License

This project is developed as a **Final Year Project** for academic purposes.

---

## Developer

**Jayanthan Senthilkumar**

Built with Chrome Extensions API, Python Flask, scikit-learn, Gemini AI, and Chart.js.
# SupriAI - Complete Project Overview

## 🎯 Project Purpose

SupriAI is a Chrome extension that tracks and analyzes your browsing habits with:

- **Real-time tab tracking** with persistent database storage
- **AI-powered content summarization** using Google's Gemini API
- **Browsing analytics** with interactive charts and insights
- **Productivity analysis** comparing productive vs social media time
- **Tab management** with time limits and inactive tab detection
- **Content curation** workflow for organizing information

## 📁 Project Structure

```
SupriAI/
├── manifest.json                    # Extension configuration
├── popup.html                       # Main UI
├── popup.css                        # UI styles
├── popup.js                         # Frontend logic
├── background-enhanced.js           # Background service worker with database
├── config.js                        # App configuration
├── gamification.js                  # Gamification features
│
├── config/
│   └── keys.js                      # API keys (Gemini API)
│
├── services/
│   ├── database.js                  # IndexedDB database service
│   ├── databaseQueryHelper.js       # Database query utilities
│   ├── dataMigration.js             # Data migration tool
│   ├── gemini.js                    # Gemini API integration
│   └── curationService.js           # Content curation service
│
├── components/
│   └── curationWorkflow.js          # Curation workflow UI
│
├── scripts/
│   └── content.js                   # Content script for page extraction
│
├── lib/
│   ├── chart.js                     # Chart.js library
│   └── purify.min.js                # DOMPurify for sanitization
│
├── styles/
│   ├── curation.css                 # Curation styles
│   └── fonts.css                    # Font imports
│
├── fonts/
│   ├── GoogleSans-Regular.woff
│   ├── GoogleSans-Medium.woff
│   └── GoogleSans-Bold.woff
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── examples/
│   └── database-usage-examples.js   # Database usage examples
│
└── Documentation/
    ├── README.md                    # Main documentation
    ├── DATABASE_README.md           # Database API reference
    ├── QUICKSTART_DATABASE.md       # Database quick start
    ├── DATABASE_IMPLEMENTATION_SUMMARY.md
    ├── DATABASE_FEATURE_COMPLETE.md
    ├── DATABASE_ARCHITECTURE.txt    # Visual architecture
    ├── FIXES.md                     # Known fixes
    ├── GEMINI_API_FIX.md           # API fix details
    └── schema.sql                   # SQLite schema
```

## 🔄 Data Flow Architecture

### 1. Tab Tracking Flow

```
User Opens Tab
    ↓
Chrome fires tabs.onActivated event
    ↓
background-enhanced.js trackTab()
    ↓
┌─────────────────────────────────┐
│  Parallel Operations:           │
│  1. Update in-memory tabData    │
│  2. Save to chrome.storage      │
│  3. Save to IndexedDB           │
│  4. Log event to tab_events     │
│  5. Update domain_stats         │
│  6. Update session data         │
└─────────────────────────────────┘
    ↓
Data available for:
- Real-time charts in Overview tab
- History tab queries
- Analytics and insights
```

### 2. Frontend-Backend Connection

```
Popup UI (popup.html/js)
    ↓
DatabaseQueryHelper.getBrowsingSummary('week')
    ↓
chrome.runtime.sendMessage({ action: 'getTabHistory' })
    ↓
background-enhanced.js message handler
    ↓
dbService.getTabsByDateRange(startDate, endDate)
    ↓
IndexedDB query with indexes
    ↓
Return data to popup
    ↓
Display in History tab
```

### 3. Summary Feature Flow

```
User clicks "Summarize This Page"
    ↓
popup.js injects content.js
    ↓
content.js extracts page text
    ↓
popup.js sends to Gemini API
    ↓
services/gemini.js makes API call
    ↓
Gemini returns summary
    ↓
DOMPurify sanitizes HTML
    ↓
Display in Summary tab
```

## 🗄️ Database Schema

### Tables (IndexedDB Stores)

#### 1. **tabs**

Stores individual tab records

```javascript
{
  id: 1,                           // Auto-increment
  tabId: 123,                      // Chrome tab ID
  url: "https://github.com",
  domain: "github.com",
  title: "GitHub",
  favicon: "https://...",
  timestamp: 1707200000000,        // Unix timestamp
  sessionId: "session_123",
  activeTime: 120000,              // Milliseconds
  date: "2026-02-06",             // YYYY-MM-DD
  metadata: "{}"                   // JSON string
}
```

#### 2. **sessions**

Tracks browsing sessions

```javascript
{
  id: 1,
  sessionId: "session_123",
  startTime: 1707200000000,
  endTime: 1707210000000,
  tabCount: 15,
  totalActiveTime: 1800000
}
```

#### 3. **domain_stats**

Daily domain statistics

```javascript
{
  id: 1,
  domain: "github.com",
  date: "2026-02-06",
  visitCount: 25,
  totalActiveTime: 3600000,
  tabCount: 10,
  lastVisit: 1707210000000
}
```

#### 4. **tab_events**

Event log for debugging

```javascript
{
  id: 1,
  tabId: 123,
  eventType: "opened",  // opened, closed, activated, idle
  timestamp: 1707200000000,
  sessionId: "session_123",
  url: "https://github.com",
  domain: "github.com",
  metadata: "{}"
}
```

## 🎨 Frontend Components

### Tabs in Popup

1. **Curate** - Content curation workflow
2. **Summary** - AI-powered page summarization
3. **Overview** - Charts and analytics (default)
4. **History** - Database-powered browsing history ✨ NEW
5. **Tab Groups** - Grouped tabs by domain
6. **Inactive Tabs** - Tabs inactive for >5 minutes
7. **Settings** - Time limits and site categories

### History Tab Features (NEW)

- **Period selector**: Today, This Week, This Month
- **Statistics cards**: Total tabs, unique domains, total time, visits
- **Top domains**: Most visited domains with stats
- **Recent tabs**: Last 10 tabs with timestamps
- **Export button**: Download all data as JSON

## 🔌 API Integration

### Gemini API

- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Purpose**: AI-powered content summarization
- **Configuration**: `config/keys.js`
- **Usage**: `services/gemini.js`

### Chrome Extension APIs

- **tabs**: Tab management and tracking
- **storage**: Local data persistence
- **alarms**: Scheduled tasks
- **windows**: Window management
- **scripting**: Content script injection

## 💾 Data Storage

### 1. Chrome Storage (chrome.storage.local)

- **Purpose**: Fast, temporary data
- **Contents**:
  - `tabData`: Current tab information
  - `tabGroups`: Grouped tabs by domain
  - `settings`: User preferences
  - `currentSessionId`: Active session ID

### 2. IndexedDB (via database.js)

- **Purpose**: Persistent, queryable storage
- **Contents**:
  - All tab history
  - Session data
  - Domain statistics
  - Event logs
- **Capacity**: Several GB (browser-dependent)

## 🚀 How It All Works Together

### Initialization (Extension Load)

1. `background-enhanced.js` starts
2. Database initializes (`dbService.init()`)
3. New session created
4. Existing tabs tracked
5. 10-second interval starts for time tracking

### User Opens Popup

1. `popup.html` loads
2. Scripts load in order:
   - Chart.js (charts)
   - DOMPurify (sanitization)
   - config/keys.js (API keys)
   - services/gemini.js (AI)
   - services/databaseQueryHelper.js (DB queries) ✨
   - popup.js (UI logic)
3. Default tab (Overview) displays
4. Charts render with current data

### User Clicks History Tab ✨

1. `switchTab('history')` called
2. `loadHistoryData()` executes
3. `DatabaseQueryHelper.getBrowsingSummary('week')` called
4. Message sent to background script
5. Background queries IndexedDB
6. Data returned to popup
7. UI updates with:
   - Statistics cards
   - Top 5 domains
   - Recent 10 tabs

### User Clicks "Summarize This Page"

1. Content script injected
2. Page text extracted
3. Sent to Gemini API
4. Summary returned
5. HTML sanitized
6. Displayed in Summary tab

### User Browses Web

1. Tab events tracked continuously
2. Data saved to:
   - Memory (tabData)
   - chrome.storage (fast access)
   - IndexedDB (persistent)
3. Every 10 seconds:
   - Active time updated
   - Domain stats updated
   - Session updated
4. Charts auto-update on popup open

## 🎯 Key Features

### ✅ Implemented

- [x] Real-time tab tracking
- [x] Persistent database storage
- [x] Session management
- [x] Domain statistics
- [x] Event logging
- [x] AI summarization
- [x] Interactive charts
- [x] Productivity analysis
- [x] Time limits
- [x] Inactive tab detection
- [x] Content curation
- [x] **History tab with database integration** ✨
- [x] **Data export to JSON** ✨
- [x] **Browsing statistics** ✨

### 🔮 Future Enhancements

- [ ] Server-side sync with SQLite
- [ ] Advanced ML-based insights
- [ ] Full-text search
- [ ] Tags and categories
- [ ] Weekly/monthly reports
- [ ] CSV/Excel export
- [ ] Privacy controls
- [ ] Multi-device sync

## 🛠️ Development Workflow

### Making Changes

1. **Frontend Changes** (popup.html/css/js)
   - Edit files
   - Reload extension in `chrome://extensions/`
   - Test in popup

2. **Background Changes** (background-enhanced.js)
   - Edit file
   - Reload extension
   - Check console for errors
   - Test functionality

3. **Database Changes** (services/database.js)
   - Edit schema/methods
   - Reload extension
   - Database auto-migrates
   - Test queries

### Testing

1. **Manual Testing**
   - Open popup
   - Switch between tabs
   - Check console for errors
   - Verify data persistence

2. **Database Testing**

   ```javascript
   // In browser console
   chrome.runtime.sendMessage({ action: "getTabHistory" }, console.log);
   chrome.runtime.sendMessage({ action: "getDomainStats" }, console.log);
   ```

3. **Export Testing**
   - Click "Export Data" in History tab
   - Verify JSON file downloads
   - Check data completeness

## 📊 Performance

### Optimizations

- **Indexed queries**: Fast lookups by domain, date, session
- **Batch operations**: Multiple updates in single transaction
- **Lazy loading**: Data loaded only when needed
- **Debounced updates**: Prevent excessive writes
- **Efficient storage**: JSON metadata for flexibility

### Monitoring

- Console logs for debugging
- Error handling throughout
- Performance metrics in background
- Storage quota monitoring

## 🔒 Privacy & Security

- **Local-first**: All data stored locally
- **No tracking**: No external analytics
- **API keys**: Stored locally, not transmitted
- **Sanitization**: All HTML sanitized before display
- **User control**: Full data export and deletion

## 📚 Documentation

### For Users

- **README.md**: Getting started
- **QUICKSTART_DATABASE.md**: Database quick start
- **FIXES.md**: Troubleshooting

### For Developers

- **DATABASE_README.md**: Complete API reference
- **DATABASE_ARCHITECTURE.txt**: Visual architecture
- **schema.sql**: Database schema
- **examples/**: Code examples

## 🎓 Learning Resources

### Understanding the Stack

- **IndexedDB**: Browser-native NoSQL database
- **Chrome Extensions**: Manifest V3 architecture
- **Service Workers**: Background processing
- **Gemini API**: Google's AI model

### Key Concepts

- **Session**: Browsing session from start to end
- **Domain Stats**: Aggregated daily statistics
- **Event Log**: Detailed activity timeline
- **Query Helper**: Simplified database access

## ✨ What Makes This Special

1. **Full-Stack Integration**: Frontend ↔ Backend ↔ Database
2. **Real-time Updates**: Live tracking and analytics
3. **Persistent Storage**: Data survives browser restarts
4. **AI-Powered**: Gemini API for summarization
5. **Production-Ready**: Error handling, validation, sanitization
6. **Well-Documented**: 2500+ lines of documentation
7. **Extensible**: Easy to add new features

## 🎉 Current Status

**Version**: 0.0.2
**Status**: ✅ Fully Functional
**Features**: All core features implemented
**Database**: Fully integrated and working
**Frontend**: Connected to backend
**Documentation**: Complete

---

**Last Updated**: February 6, 2026
**Total Code**: 5000+ lines
**Total Documentation**: 2500+ lines
**Ready for**: Production use
