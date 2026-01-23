# SupriAI Backend

Python Flask backend for Chrome history collection, analytics, and ML dataset generation.

## Setup

1. **Install Python 3.10+**
2. **Create virtual environment & install dependencies:**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```powershell
python main.py
```

Server runs on http://127.0.0.1:8000

## Endpoints

- `POST /api/history/bulk` — Ingest history events (single object or array)
- `GET /api/history` — List events with filters (domain, search, date range)
- `GET /api/history/search?q=keyword` — Search history
- `DELETE /api/history/clear` — Clear all history
- `GET /api/history/export?format=csv|ndjson` — Export dataset
- `GET /api/analytics/summary` — Stats: total visits, durations, top domains/topics
- `GET /api/analytics/time-distribution` — Hourly distribution
- `GET /api/dataset?limit=1000` — Normalized rows for ML training

CRUD: `/api/bookmarks`, `/api/notes`, `/api/goals`

## Database

SQLite (`supriai.db`) auto-created on first run; migrations handled by SQLAlchemy.

## Configuration

Optional: copy `.env.example` to `.env` and adjust `DATABASE_URL` or `CORS_ORIGINS`.
