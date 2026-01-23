from datetime import datetime
from io import StringIO
import csv
from typing import List
from urllib.parse import urlparse

from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy.orm import Session

from config import settings
from database import Base, engine, get_session
from models import HistoryEvent, Bookmark, Note, Goal
from analytics import summarize_history, time_distribution

Base.metadata.create_all(bind=engine)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": settings.cors_origins}})


def extract_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.hostname or "unknown"


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def render_api_docs():
    """Render API documentation page"""
    from flask import Response
    html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SupriAI API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px; }
        h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; font-size: 1.1rem; }
        .endpoint-group { background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .endpoint-group h2 { color: #1a73e8; margin-bottom: 15px; border-bottom: 2px solid #e8f0fe; padding-bottom: 10px; }
        .endpoint { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-left: 4px solid #1a73e8; border-radius: 5px; }
        .method { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; margin-right: 10px; }
        .get { background: #10b981; color: white; }
        .post { background: #3b82f6; color: white; }
        .put { background: #f59e0b; color: white; }
        .delete { background: #ef4444; color: white; }
        .path { font-family: 'Courier New', monospace; color: #1f2937; font-size: 1.05rem; }
        .description { margin: 10px 0; color: #6b7280; }
        code { background: #e8f0fe; padding: 2px 6px; border-radius: 3px; font-size: 0.9rem; color: #1967d2; }
        .status { display: inline-block; padding: 20px; background: #10b981; color: white; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧠 SupriAI Backend API</h1>
            <p class="subtitle">Chrome Learning Companion - REST API v1.0</p>
        </header>
        <div class="status">✅ Status: <strong>Running</strong> | Port: <strong>8000</strong></div>
        <div class="endpoint-group">
            <h2>📊 History & Analytics</h2>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/history/bulk</span>
                <p class="description">Ingest browsing history (single or array)</p>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/history</span>
                <p class="description">List history with filters (limit, offset, domain, search)</p>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/analytics/summary</span>
                <p class="description">Analytics: visits, durations, top domains/topics</p>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/dataset</span>
                <p class="description">Export ML dataset (limit param)</p>
            </div>
        </div>
        <div class="endpoint-group">
            <h2>🔖 Bookmarks | 📝 Notes | 🎯 Goals</h2>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/bookmarks</span> | <span class="path">/api/notes</span> | <span class="path">/api/goals</span>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/bookmarks</span> | <span class="path">/api/notes</span> | <span class="path">/api/goals</span>
            </div>
        </div>
        <div style="text-align:center;padding:30px;color:#6b7280;">
            <p>🚀 SupriAI Backend | For full docs see <code>/backend/README.md</code></p>
        </div>
    </div>
</body>
</html>'''
    return Response(html, mimetype='text/html')


@app.route("/")
def index():
    return render_api_docs()


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "message": "SupriAI Backend is running"})


@app.post("/api/history/bulk")
def ingest_history():
    payload = request.get_json(force=True, silent=True) or []
    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list):
        return jsonify({"error": "Payload must be a list"}), 400

    inserted = 0
    skipped = 0
    with get_session() as db:
        for item in payload:
            url = item.get("url")
            visited_at = parse_dt(item.get("visited_at"))
            if not url or not visited_at:
                skipped += 1
                continue

            domain = extract_domain(url)
            exists = (
                db.query(HistoryEvent)
                .filter(HistoryEvent.url == url, HistoryEvent.visited_at == visited_at)
                .first()
            )
            if exists:
                skipped += 1
                continue

            event = HistoryEvent(
                url=url,
                domain=domain,
                title=item.get("title"),
                visited_at=visited_at,
                duration_seconds=item.get("duration_seconds", 0) or 0,
                source=item.get("source", "chrome"),
                topic=item.get("topic") or "Unknown",
                content_snippet=item.get("content_snippet"),
                meta=item.get("metadata") or {},
            )
            db.add(event)
            inserted += 1
        db.commit()
    return jsonify({"inserted": inserted, "skipped": skipped})


@app.get("/api/history")
def list_history():
    limit = min(int(request.args.get("limit", 100)), 500)
    offset = int(request.args.get("offset", 0))
    domain = request.args.get("domain")
    start = parse_dt(request.args.get("start"))
    end = parse_dt(request.args.get("end"))
    search = request.args.get("search")

    with get_session() as db:
        query = db.query(HistoryEvent)
        if domain:
            query = query.filter(HistoryEvent.domain == domain)
        if start:
            query = query.filter(HistoryEvent.visited_at >= start)
        if end:
            query = query.filter(HistoryEvent.visited_at <= end)
        if search:
            like = f"%{search}%"
            query = query.filter(HistoryEvent.title.ilike(like) | HistoryEvent.url.ilike(like))

        events = query.order_by(HistoryEvent.visited_at.desc()).offset(offset).limit(limit).all()
        return jsonify([serialize_event(e) for e in events])


@app.get("/api/history/export")
def export_history():
    fmt = request.args.get("format", "csv")
    with get_session() as db:
        events = db.query(HistoryEvent).order_by(HistoryEvent.visited_at.desc()).all()

    if fmt == "ndjson":
        lines = [event_to_json_line(e) for e in events]
        return jsonify({"filename": "history.ndjson", "content": "\n".join(lines)})

    output = StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "id",
            "url",
            "domain",
            "title",
            "visited_at",
            "duration_seconds",
            "source",
            "topic",
            "content_snippet",
        ],
    )
    writer.writeheader()
    for e in events:
        writer.writerow({
            "id": e.id,
            "url": e.url,
            "domain": e.domain,
            "title": e.title or "",
            "visited_at": e.visited_at.isoformat(),
            "duration_seconds": e.duration_seconds,
            "source": e.source,
            "topic": e.topic,
            "content_snippet": e.content_snippet or "",
        })
    return jsonify({"filename": "history.csv", "content": output.getvalue()})


@app.get("/api/analytics/summary")
def analytics_summary():
    with get_session() as db:
        summary = summarize_history(db)
    return jsonify(summary)


@app.get("/api/analytics/time-distribution")
def analytics_time():
    with get_session() as db:
        rows = time_distribution(db)
    return jsonify(rows)


@app.get("/api/dataset")
def dataset():
    limit = min(int(request.args.get("limit", 1000)), 5000)
    with get_session() as db:
        events = (
            db.query(HistoryEvent)
            .order_by(HistoryEvent.visited_at.desc())
            .limit(limit)
            .all()
        )
    rows = [
        {
            "url": e.url,
            "domain": e.domain,
            "title": e.title,
            "visited_at": e.visited_at.isoformat(),
            "duration_seconds": e.duration_seconds,
            "topic": e.topic,
        }
        for e in events
    ]
    return jsonify({"rows": rows, "count": len(rows)})


@app.get("/api/history/search")
def search_history():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"status": "success", "results": []})

    like = f"%{query}%"
    with get_session() as db:
        results = (
            db.query(HistoryEvent)
            .filter(HistoryEvent.title.ilike(like) | HistoryEvent.url.ilike(like))
            .order_by(HistoryEvent.visited_at.desc())
            .limit(200)
            .all()
        )
    return jsonify({"status": "success", "results": [serialize_event(r) for r in results]})


@app.delete("/api/history/clear")
def clear_history():
    with get_session() as db:
        deleted = db.query(HistoryEvent).delete()
        db.commit()
    return jsonify({"status": "success", "deleted": deleted})


@app.post("/api/bookmarks")
def create_bookmark():
    payload = request.get_json(force=True, silent=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"error": "url is required"}), 400
    with get_session() as db:
        bookmark = Bookmark(url=url, title=payload.get("title"), note=payload.get("note"))
        db.add(bookmark)
        db.commit()
        db.refresh(bookmark)
        return jsonify(serialize_bookmark(bookmark)), 201


@app.get("/api/bookmarks")
def list_bookmarks():
    with get_session() as db:
        bookmarks = db.query(Bookmark).order_by(Bookmark.created_at.desc()).all()
        return jsonify([serialize_bookmark(b) for b in bookmarks])


@app.delete("/api/bookmarks/<int:bookmark_id>")
def delete_bookmark(bookmark_id: int):
    with get_session() as db:
        bookmark = db.get(Bookmark, bookmark_id)
        if not bookmark:
            return jsonify({"error": "Bookmark not found"}), 404
        db.delete(bookmark)
        db.commit()
        return jsonify({"status": "deleted"})


@app.post("/api/notes")
def create_note():
    payload = request.get_json(force=True, silent=True) or {}
    title = payload.get("title")
    content = payload.get("content")
    if not title or not content:
        return jsonify({"error": "title and content are required"}), 400
    with get_session() as db:
        note = Note(title=title, content=content, tags=payload.get("tags"))
        db.add(note)
        db.commit()
        db.refresh(note)
        return jsonify(serialize_note(note)), 201


@app.get("/api/notes")
def list_notes():
    with get_session() as db:
        notes = db.query(Note).order_by(Note.created_at.desc()).all()
        return jsonify([serialize_note(n) for n in notes])


@app.put("/api/notes/<int:note_id>")
def update_note(note_id: int):
    payload = request.get_json(force=True, silent=True) or {}
    with get_session() as db:
        note = db.get(Note, note_id)
        if not note:
            return jsonify({"error": "Note not found"}), 404
        if "title" in payload:
            note.title = payload.get("title")
        if "content" in payload:
            note.content = payload.get("content")
        if "tags" in payload:
            note.tags = payload.get("tags")
        db.commit()
        db.refresh(note)
        return jsonify(serialize_note(note))


@app.delete("/api/notes/<int:note_id>")
def delete_note(note_id: int):
    with get_session() as db:
        note = db.get(Note, note_id)
        if not note:
            return jsonify({"error": "Note not found"}), 404
        db.delete(note)
        db.commit()
        return jsonify({"status": "deleted"})


@app.post("/api/goals")
def create_goal():
    payload = request.get_json(force=True, silent=True) or {}
    title = payload.get("title")
    target_minutes = payload.get("target_minutes")
    if not title or target_minutes is None:
        return jsonify({"error": "title and target_minutes are required"}), 400
    with get_session() as db:
        goal = Goal(
            title=title,
            target_minutes=int(target_minutes),
            deadline=parse_dt(payload.get("deadline")),
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return jsonify(serialize_goal(goal)), 201


@app.get("/api/goals")
def list_goals():
    with get_session() as db:
        goals = db.query(Goal).order_by(Goal.created_at.desc()).all()
        return jsonify([serialize_goal(g) for g in goals])


@app.put("/api/goals/<int:goal_id>")
def update_goal(goal_id: int):
    payload = request.get_json(force=True, silent=True) or {}
    with get_session() as db:
        goal = db.get(Goal, goal_id)
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
        if "progress_minutes" in payload:
            goal.progress_minutes = int(payload.get("progress_minutes") or 0)
        if "status" in payload and payload.get("status"):
            goal.status = payload.get("status")
        db.commit()
        db.refresh(goal)
        return jsonify(serialize_goal(goal))


@app.delete("/api/goals/<int:goal_id>")
def delete_goal(goal_id: int):
    with get_session() as db:
        goal = db.get(Goal, goal_id)
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
        db.delete(goal)
        db.commit()
        return jsonify({"status": "deleted"})


def serialize_event(event: HistoryEvent) -> dict:
    return {
        "id": event.id,
        "url": event.url,
        "domain": event.domain,
        "title": event.title,
        "visited_at": event.visited_at.isoformat(),
        "duration_seconds": event.duration_seconds,
        "source": event.source,
        "topic": event.topic,
        "content_snippet": event.content_snippet,
        "metadata": event.meta,
    }


def serialize_bookmark(bookmark: Bookmark) -> dict:
    return {
        "id": bookmark.id,
        "url": bookmark.url,
        "title": bookmark.title,
        "note": bookmark.note,
        "created_at": bookmark.created_at.isoformat(),
    }


def serialize_note(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
        "created_at": note.created_at.isoformat(),
    }


def serialize_goal(goal: Goal) -> dict:
    return {
        "id": goal.id,
        "title": goal.title,
        "target_minutes": goal.target_minutes,
        "progress_minutes": goal.progress_minutes,
        "deadline": goal.deadline.isoformat() if goal.deadline else None,
        "status": goal.status,
        "created_at": goal.created_at.isoformat(),
    }


def event_to_json_line(event: HistoryEvent) -> str:
    import json

    payload = {
        "id": event.id,
        "url": event.url,
        "domain": event.domain,
        "title": event.title,
        "visited_at": event.visited_at.isoformat(),
        "duration_seconds": event.duration_seconds,
        "source": event.source,
        "topic": event.topic,
        "content_snippet": event.content_snippet,
    }
    return json.dumps(payload)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Starting SupriAI Backend Server")
    print("="*60)
    print(f"📍 API Documentation: http://127.0.0.1:8000/")
    print(f"🏥 Health Check: http://127.0.0.1:8000/api/health")
    print(f"📊 Database: {settings.database_url}")
    print("="*60 + "\n")
    
    try:
        app.run(host="0.0.0.0", port=8000, debug=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"\n❌ Error: {e}")
