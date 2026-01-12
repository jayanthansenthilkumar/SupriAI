"""
SupriAI - Flask Backend API
Complete REST API for Learning Analytics System
Clean, well-structured API endpoints
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime, timedelta
import database
import engine  # Unified AI/ML Engine

# ==========================================
# APP INITIALIZATION
# ==========================================

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for extension

# Initialize Database
database.init_db()

print("""
╔═══════════════════════════════════════════════════════╗
║           SupriAI Backend Server Started              ║
║              http://localhost:5000                    ║
╚═══════════════════════════════════════════════════════╝
""")



# ==========================================
# INDEX ROUTE
# ==========================================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/routes')
def route_directory():
    """Render API Route Directory"""
    return render_template('api_directory.html')


@app.route('/docs')
def documentation():
    """Render comprehensive project documentation"""
    return render_template('documentation.html')


@app.route('/schema')
def schema_docs():
    """Render database schema documentation with animations"""
    return render_template('schema.html')


# ==========================================
# HEALTH & STATUS ENDPOINTS
# ==========================================


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "running",
        "service": "SupriAI Backend",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/status', methods=['GET'])
def api_status():
    """Get API status and database stats"""
    try:
        stats = database.get_total_stats()
        return jsonify({
            "status": "online",
            "database": "connected",
            "total_sessions": stats.get('total_sessions', 0),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# ACTIVITY LOGGING ENDPOINTS
# ==========================================

@app.route('/log_activity', methods=['POST'])
def log_activity():
    """Log a learning activity from the extension"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        # Extract content for classification
        content = data.get('content', '')
        title = data.get('title', '')
        
        # Classify content using ML engine
        topic, confidence = engine.classify_content(content, title)
        
        # Calculate engagement score
        engagement = data.get('engagement', {})
        engagement_score = engine.calculate_engagement(
            data.get('duration', 0),
            engagement.get('maxScroll', 0),
            engagement.get('clicks', 0),
            engagement.get('mouseDistance', 0)
        )
        
        # Prepare log entry
        log_entry = {
            "url": data.get('url', ''),
            "title": title,
            "topic": topic,
            "confidence": confidence,
            "duration": data.get('duration', 0),
            "max_scroll": engagement.get('maxScroll', 0),
            "clicks": engagement.get('clicks', 0),
            "mouse_distance": engagement.get('mouseDistance', 0),
            "engagement_score": engagement_score,
            "content_preview": content[:500] if content else '',
            "timestamp": data.get('timestamp', datetime.now().isoformat())
        }
        
        # Insert into database
        log_id = database.insert_log(log_entry)
        
        # Update streak
        database.update_streak()
        
        # Get real-time recommendation
        recommendation = engine.get_next_recommendation(log_entry)
        
        return jsonify({
            "status": "success",
            "log_id": log_id,
            "topic": topic,
            "confidence": confidence,
            "engagement_score": engagement_score,
            "recommendation": recommendation
        })
        
    except Exception as e:
        print(f"❌ Error logging activity: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/bulk_log', methods=['POST'])
def bulk_log_activity():
    """Bulk log activities (for offline sync)"""
    try:
        logs = request.json
        
        if not logs or not isinstance(logs, list):
            return jsonify({"status": "error", "message": "Invalid data format"}), 400
        
        # Process each log
        processed_logs = []
        for data in logs:
            content = data.get('content', '')
            title = data.get('title', '')
            
            topic, confidence = engine.classify_content(content, title)
            engagement = data.get('engagement', {})
            engagement_score = engine.calculate_engagement(
                data.get('duration', 0),
                engagement.get('maxScroll', 0),
                engagement.get('clicks', 0),
                engagement.get('mouseDistance', 0)
            )
            
            processed_logs.append({
                "url": data.get('url', ''),
                "title": title,
                "topic": topic,
                "confidence": confidence,
                "duration": data.get('duration', 0),
                "max_scroll": engagement.get('maxScroll', 0),
                "clicks": engagement.get('clicks', 0),
                "mouse_distance": engagement.get('mouseDistance', 0),
                "engagement_score": engagement_score,
                "content_preview": content[:500] if content else '',
                "timestamp": data.get('timestamp', datetime.now().isoformat())
            })
        
        # Bulk insert
        count = database.bulk_insert_logs(processed_logs)
        
        return jsonify({
            "status": "success",
            "synced_count": count
        })
        
    except Exception as e:
        print(f"❌ Error bulk logging: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# ANALYTICS ENDPOINTS
# ==========================================

@app.route('/get_analytics', methods=['GET'])
def get_analytics():
    """Get comprehensive analytics for dashboard"""
    try:
        days = request.args.get('days', 7, type=int)
        logs = database.get_recent_logs(days=days)
        
        # Process analytics
        analytics = engine.aggregate_analytics(logs)
        
        # Get recommendations
        recommendations = engine.generate_weekly_plan(logs)
        analytics['recommendations'] = recommendations
        
        # Get user info
        user = database.get_user()
        if user:
            analytics['streak_days'] = user.get('streak_days', 0)
            analytics['total_points'] = user.get('total_points', 0)
            analytics['user_name'] = user.get('display_name', 'User')
        
        return jsonify(analytics)
        
    except Exception as e:
        print(f"❌ Error getting analytics: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/analytics/topics', methods=['GET'])
def get_topic_analytics():
    """Get detailed topic breakdown"""
    try:
        days = request.args.get('days', 30, type=int)
        logs = database.get_recent_logs(days=days)
        
        topic_breakdown = engine.get_topic_breakdown(logs)
        
        return jsonify({
            "status": "success",
            "topics": topic_breakdown
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/analytics/trends', methods=['GET'])
def get_trends():
    """Get learning trends over time"""
    try:
        days = request.args.get('days', 7, type=int)
        logs = database.get_recent_logs(days=days)
        
        weekly_trends = engine.calculate_weekly_trends(logs)
        
        return jsonify({
            "status": "success",
            "trends": weekly_trends,
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# HISTORY ENDPOINTS
# ==========================================

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get learning history"""
    try:
        days = request.args.get('days', 30, type=int)
        limit = request.args.get('limit', 100, type=int)
        topic = request.args.get('topic', None)
        
        if topic:
            logs = database.get_logs_by_topic(topic, limit=limit)
        else:
            logs = database.get_recent_logs(days=days, limit=limit)
        
        return jsonify({
            "status": "success",
            "count": len(logs),
            "history": logs
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/history/search', methods=['GET'])
def search_history():
    """Search learning history"""
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 50, type=int)
        
        if not query:
            return jsonify({"status": "error", "message": "Query required"}), 400
        
        logs = database.search_logs(query, limit=limit)
        
        return jsonify({
            "status": "success",
            "query": query,
            "count": len(logs),
            "results": logs
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/history/clear', methods=['DELETE'])
def clear_history():
    """Clear all learning history"""
    try:
        database.delete_all_logs()
        return jsonify({"status": "success", "message": "History cleared"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# GOALS ENDPOINTS
# ==========================================

@app.route('/api/goals', methods=['GET'])
def get_goals():
    """Get all goals"""
    try:
        active_only = request.args.get('active', 'true').lower() == 'true'
        goals = database.get_goals(active_only=active_only)
        
        return jsonify({
            "status": "success",
            "goals": goals
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/goals', methods=['POST'])
def create_goal():
    """Create a new goal"""
    try:
        data = request.json
        
        if not data or not data.get('title'):
            return jsonify({"status": "error", "message": "Title required"}), 400
        
        goal_id = database.create_goal(data)
        
        return jsonify({
            "status": "success",
            "goal_id": goal_id
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/goals/<int:goal_id>', methods=['PUT'])
def update_goal(goal_id):
    """Update goal progress"""
    try:
        data = request.json
        progress = data.get('progress', 0)
        
        database.update_goal_progress(goal_id, progress)
        
        return jsonify({"status": "success"})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    """Delete a goal"""
    try:
        database.delete_goal(goal_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# BOOKMARKS ENDPOINTS
# ==========================================

@app.route('/api/bookmarks', methods=['GET'])
def get_bookmarks():
    """Get all bookmarks"""
    try:
        topic = request.args.get('topic', None)
        bookmarks = database.get_bookmarks(topic=topic)
        
        return jsonify({
            "status": "success",
            "bookmarks": bookmarks
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/bookmarks', methods=['POST'])
def add_bookmark():
    """Add a bookmark"""
    try:
        data = request.json
        
        if not data or not data.get('url'):
            return jsonify({"status": "error", "message": "URL required"}), 400
        
        # Auto-classify if content provided
        if data.get('content') or data.get('title'):
            topic, _ = engine.classify_content(
                data.get('content', ''), 
                data.get('title', '')
            )
            data['topic'] = topic
        
        bookmark_id = database.add_bookmark(data)
        
        return jsonify({
            "status": "success",
            "bookmark_id": bookmark_id
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/bookmarks/<int:bookmark_id>', methods=['DELETE'])
def delete_bookmark(bookmark_id):
    """Delete a bookmark"""
    try:
        database.delete_bookmark(bookmark_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# NOTES ENDPOINTS
# ==========================================

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Get all notes/reflections"""
    try:
        limit = request.args.get('limit', 50, type=int)
        notes = database.get_notes(limit=limit)
        
        return jsonify({
            "status": "success",
            "notes": notes
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/notes', methods=['POST'])
def create_note():
    """Create a new note"""
    try:
        data = request.json
        
        if not data or not data.get('content'):
            return jsonify({"status": "error", "message": "Content required"}), 400
        
        note_id = database.create_note(data)
        
        return jsonify({
            "status": "success",
            "note_id": note_id
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    """Update a note"""
    try:
        data = request.json
        database.update_note(note_id, data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    try:
        database.delete_note(note_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# SCHEDULE ENDPOINTS
# ==========================================

@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    """Get schedule events"""
    try:
        start_date = request.args.get('start', None)
        end_date = request.args.get('end', None)
        
        events = database.get_events(start_date=start_date, end_date=end_date)
        
        return jsonify({
            "status": "success",
            "events": events
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/schedule', methods=['POST'])
def create_event():
    """Create a schedule event"""
    try:
        data = request.json
        
        if not data or not data.get('title') or not data.get('start_time'):
            return jsonify({"status": "error", "message": "Title and start_time required"}), 400
        
        event_id = database.create_event(data)
        
        return jsonify({
            "status": "success",
            "event_id": event_id
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/schedule/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete a schedule event"""
    try:
        database.delete_event(event_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# USER & SETTINGS ENDPOINTS
# ==========================================

@app.route('/api/user', methods=['GET'])
def get_user():
    """Get user profile"""
    try:
        user = database.get_user()
        if user:
            return jsonify({"status": "success", "user": user})
        return jsonify({"status": "error", "message": "User not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/user', methods=['PUT'])
def update_user():
    """Update user profile"""
    try:
        data = request.json
        database.update_user(1, data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get user settings"""
    try:
        settings = database.get_settings()
        return jsonify({"status": "success", "settings": settings})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update user settings"""
    try:
        data = request.json
        database.update_settings(1, data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# ACHIEVEMENTS ENDPOINTS
# ==========================================

@app.route('/api/achievements', methods=['GET'])
def get_achievements():
    """Get all achievements"""
    try:
        achievements = database.get_achievements()
        return jsonify({
            "status": "success",
            "achievements": achievements
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/achievements/check', methods=['POST'])
def check_achievements():
    """Check for new achievements"""
    try:
        logs = database.get_recent_logs(days=30)
        user = database.get_user()
        
        new_achievements = engine.check_achievements(logs, user or {})
        
        # Unlock new achievements
        unlocked = []
        for achievement in new_achievements:
            achievement_id = database.unlock_achievement(
                1,
                achievement['badge_name'],
                achievement['badge_icon'],
                achievement['description']
            )
            if achievement_id:
                unlocked.append(achievement)
        
        return jsonify({
            "status": "success",
            "new_achievements": unlocked
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# COMMUNITY & LEADERBOARD ENDPOINTS
# ==========================================

@app.route('/api/community/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get community leaderboard"""
    try:
        timeframe = request.args.get('timeframe', 'all')  # all, week, month
        limit = request.args.get('limit', 10, type=int)
        
        # Get top users by points
        leaderboard = database.get_leaderboard(timeframe=timeframe, limit=limit)
        
        # Get current user ranking
        user_rank = database.get_user_rank(1)
        
        return jsonify({
            "status": "success",
            "leaderboard": leaderboard,
            "user_rank": user_rank
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/community/stats', methods=['GET'])
def get_community_stats():
    """Get community statistics"""
    try:
        stats = {
            "total_users": database.get_total_users(),
            "total_learning_hours": database.get_total_learning_hours(),
            "total_achievements": database.get_total_achievements_unlocked(),
            "active_today": database.get_active_users_today()
        }
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# STATS ENDPOINTS
# ==========================================

@app.route('/api/stats/week', methods=['GET'])
def get_week_stats():
    """Get this week's statistics"""
    try:
        # Get goals completed this week
        goals = database.get_goals(active_only=False)
        week_ago = datetime.now() - timedelta(days=7)
        
        goals_completed = sum(1 for g in goals 
                            if g.get('completed_at') and 
                            datetime.fromisoformat(g['completed_at']) > week_ago)
        
        # Get learning sessions this week
        logs = database.get_recent_logs(days=7)
        sessions = len(logs)
        total_minutes = sum(log.get('duration', 0) for log in logs) // 60
        
        return jsonify({
            "status": "success",
            "goals_completed": goals_completed,
            "sessions": sessions,
            "total_minutes": total_minutes
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# RECOMMENDATIONS ENDPOINT
# ==========================================

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    """Get personalized recommendations"""
    try:
        days = request.args.get('days', 7, type=int)
        logs = database.get_recent_logs(days=days)
        
        recommendations = engine.generate_weekly_plan(logs)
        
        return jsonify({
            "status": "success",
            "recommendations": recommendations
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# TASKS / TODOS ENDPOINTS
# ==========================================

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks"""
    try:
        status = request.args.get('status', None)
        include_completed = request.args.get('include_completed', 'false').lower() == 'true'
        
        tasks = database.get_tasks(status=status, include_completed=include_completed)
        
        return jsonify({
            "status": "success",
            "tasks": tasks
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    try:
        data = request.json
        
        if not data or not data.get('title'):
            return jsonify({"status": "error", "message": "Title required"}), 400
        
        task_id = database.create_task(data)
        
        return jsonify({
            "status": "success",
            "task_id": task_id
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Get a single task"""
    try:
        task = database.get_task(task_id)
        if task:
            return jsonify({"status": "success", "task": task})
        return jsonify({"status": "error", "message": "Task not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task"""
    try:
        data = request.json
        database.update_task(task_id, data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        database.delete_task(task_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
def complete_task(task_id):
    """Mark a task as completed"""
    try:
        database.complete_task(task_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/tasks/today', methods=['GET'])
def get_tasks_due_today():
    """Get tasks due today"""
    try:
        tasks = database.get_tasks_due_today()
        return jsonify({
            "status": "success",
            "tasks": tasks
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# POMODORO / FOCUS TIMER ENDPOINTS
# ==========================================

@app.route('/api/pomodoro/start', methods=['POST'])
def start_pomodoro():
    """Start a new pomodoro session"""
    try:
        data = request.json or {}
        
        session_id = database.create_pomodoro_session({
            'task_id': data.get('task_id'),
            'session_type': data.get('session_type', 'focus'),
            'duration_minutes': data.get('duration_minutes', 25),
            'topic': data.get('topic'),
            'notes': data.get('notes')
        })
        
        return jsonify({
            "status": "success",
            "session_id": session_id,
            "message": "Pomodoro session started"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/pomodoro/<int:session_id>/complete', methods=['POST'])
def complete_pomodoro(session_id):
    """Complete a pomodoro session"""
    try:
        data = request.json or {}
        actual_duration = data.get('actual_duration', 25)
        
        database.complete_pomodoro_session(session_id, actual_duration)
        
        # Update task if linked
        if data.get('task_id'):
            task = database.get_task(data.get('task_id'))
            if task:
                new_actual = (task.get('actual_minutes', 0) or 0) + actual_duration
                database.update_task(data.get('task_id'), {'actual_minutes': new_actual})
        
        return jsonify({
            "status": "success",
            "message": "Pomodoro session completed"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/pomodoro/<int:session_id>/cancel', methods=['POST'])
def cancel_pomodoro(session_id):
    """Cancel/interrupt a pomodoro session"""
    try:
        data = request.json or {}
        actual_duration = data.get('actual_duration', 0)
        
        database.cancel_pomodoro_session(session_id, actual_duration)
        
        return jsonify({
            "status": "success",
            "message": "Pomodoro session cancelled"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/pomodoro/sessions', methods=['GET'])
def get_pomodoro_sessions():
    """Get pomodoro session history"""
    try:
        days = request.args.get('days', 7, type=int)
        sessions = database.get_pomodoro_sessions(days=days)
        
        return jsonify({
            "status": "success",
            "sessions": sessions
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/pomodoro/stats', methods=['GET'])
def get_pomodoro_stats():
    """Get pomodoro statistics"""
    try:
        days = request.args.get('days', 7, type=int)
        stats = database.get_pomodoro_stats(days=days)
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# FOCUS SETTINGS ENDPOINTS
# ==========================================

@app.route('/api/focus/settings', methods=['GET'])
def get_focus_settings():
    """Get focus/pomodoro settings"""
    try:
        settings = database.get_focus_settings()
        return jsonify({
            "status": "success",
            "settings": settings
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/focus/settings', methods=['PUT'])
def update_focus_settings():
    """Update focus/pomodoro settings"""
    try:
        data = request.json
        database.update_focus_settings(1, data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/focus/stats', methods=['GET'])
def get_focus_stats():
    """Get daily focus stats"""
    try:
        days = request.args.get('days', 7, type=int)
        stats = database.get_focus_stats(days=days)
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# REMINDERS ENDPOINTS
# ==========================================

@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    """Get all reminders"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        reminders = database.get_reminders(active_only=active_only)
        
        return jsonify({
            "status": "success",
            "reminders": reminders
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/reminders', methods=['POST'])
def create_reminder():
    """Create a new reminder"""
    try:
        data = request.json
        
        if not data or not data.get('title') or not data.get('reminder_time'):
            return jsonify({"status": "error", "message": "Title and reminder_time required"}), 400
        
        reminder_id = database.create_reminder(data)
        
        return jsonify({
            "status": "success",
            "reminder_id": reminder_id
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/reminders/upcoming', methods=['GET'])
def get_upcoming_reminders():
    """Get upcoming reminders"""
    try:
        hours = request.args.get('hours', 24, type=int)
        reminders = database.get_upcoming_reminders(hours=hours)
        
        return jsonify({
            "status": "success",
            "reminders": reminders
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/reminders/<int:reminder_id>', methods=['PUT'])
def update_reminder(reminder_id):
    """Update a reminder"""
    try:
        data = request.json
        database.update_reminder(reminder_id, data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/reminders/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    """Delete a reminder"""
    try:
        database.delete_reminder(reminder_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/reminders/<int:reminder_id>/dismiss', methods=['POST'])
def dismiss_reminder(reminder_id):
    """Dismiss/deactivate a reminder"""
    try:
        database.deactivate_reminder(reminder_id)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# PRODUCTIVITY DASHBOARD ENDPOINT
# ==========================================

@app.route('/api/productivity', methods=['GET'])
def get_productivity_dashboard():
    """Get productivity summary for dashboard"""
    try:
        summary = database.get_productivity_summary()
        
        return jsonify({
            "status": "success",
            "productivity": summary
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# CHROME HISTORY ANALYSIS ENDPOINTS
# ==========================================

@app.route('/api/history/analyze', methods=['POST'])
def analyze_history():
    """Analyze Chrome browsing history using ML/NLP"""
    try:
        data = request.json
        history = data.get('history', [])
        
        if not history:
            return jsonify({
                "status": "success",
                "message": "No history to analyze",
                "analysis": {},
                "recommendations": []
            })
        
        # Use Deep Learning Engine for pattern analysis
        deep_analysis = engine.DeepLearningEngine.analyze_learning_patterns(history)
        
        # Extract entities using NLP
        all_titles = ' '.join([item.get('title', '') for item in history])
        entities = engine.NLPProcessor.extract_entities(all_titles)
        
        # Sentiment analysis of learning content
        sentiment = engine.NLPProcessor.sentiment_analysis(all_titles)
        
        # Generate personalized recommendations
        recommendations = generate_smart_recommendations(deep_analysis, entities)
        
        # Store analysis in database
        analysis_result = {
            'pattern_type': deep_analysis.get('pattern_type', 'explorer'),
            'confidence': deep_analysis.get('confidence', 0),
            'features': deep_analysis.get('features', {}),
            'insights': deep_analysis.get('insights', []),
            'entities': entities,
            'sentiment': sentiment,
            'total_visits': len(history),
            'primary_topic': deep_analysis.get('features', {}).get('primary_topic', 'General'),
            'topic_distribution': deep_analysis.get('features', {}).get('topic_distribution', {})
        }
        
        # Save to user profile
        database.save_history_analysis(analysis_result)
        
        return jsonify({
            "status": "success",
            "analysis": analysis_result,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error analyzing history: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def generate_smart_recommendations(analysis: dict, entities: dict) -> list:
    """Generate smart recommendations based on ML analysis"""
    recommendations = []
    
    pattern = analysis.get('pattern_type', 'explorer')
    features = analysis.get('features', {})
    primary_topic = features.get('primary_topic', 'General')
    
    # Topic-specific recommendations
    topic_recommendations = {
        'Programming': [
            {
                'type': 'course',
                'title': 'Advanced Algorithm Design',
                'description': 'Master algorithms for technical interviews',
                'url': 'https://leetcode.com',
                'icon': 'ri-code-box-line',
                'priority': 'high'
            },
            {
                'type': 'practice',
                'title': 'Build a Real Project',
                'description': 'Apply your skills with a hands-on project',
                'url': 'https://github.com/practical-tutorials/project-based-learning',
                'icon': 'ri-hammer-line',
                'priority': 'high'
            }
        ],
        'Data Science': [
            {
                'type': 'course',
                'title': 'Machine Learning Specialization',
                'description': 'Deep dive into ML algorithms and applications',
                'url': 'https://www.coursera.org/specializations/machine-learning-introduction',
                'icon': 'ri-robot-line',
                'priority': 'high'
            },
            {
                'type': 'practice',
                'title': 'Kaggle Competition',
                'description': 'Test your skills on real datasets',
                'url': 'https://www.kaggle.com/competitions',
                'icon': 'ri-database-2-line',
                'priority': 'medium'
            }
        ],
        'Web Development': [
            {
                'type': 'tutorial',
                'title': 'Full-Stack Development',
                'description': 'Learn complete web application development',
                'url': 'https://fullstackopen.com',
                'icon': 'ri-stack-line',
                'priority': 'high'
            }
        ]
    }
    
    # Add topic-specific recommendations
    if primary_topic in topic_recommendations:
        recommendations.extend(topic_recommendations[primary_topic])
    
    # Pattern-based recommendations
    pattern_recommendations = {
        'deep_learner': {
            'type': 'challenge',
            'title': 'Take on a Complex Project',
            'description': 'Your deep focus is perfect for tackling advanced challenges',
            'icon': 'ri-rocket-line',
            'priority': 'high'
        },
        'explorer': {
            'type': 'focus',
            'title': 'Pick a Specialization',
            'description': 'Consider focusing deeply on one area to build expertise',
            'icon': 'ri-focus-3-line',
            'priority': 'medium'
        },
        'consistent': {
            'type': 'goal',
            'title': 'Set Weekly Milestones',
            'description': 'Your consistency is great! Add measurable goals',
            'icon': 'ri-flag-line',
            'priority': 'medium'
        },
        'binge_learner': {
            'type': 'schedule',
            'title': 'Create a Learning Schedule',
            'description': 'Spread your learning for better retention',
            'icon': 'ri-calendar-schedule-line',
            'priority': 'high'
        }
    }
    
    if pattern in pattern_recommendations:
        recommendations.append(pattern_recommendations[pattern])
    
    # Add entity-based recommendations
    tech_entities = entities.get('technologies', []) + entities.get('frameworks', [])
    if tech_entities:
        recommendations.append({
            'type': 'deep_dive',
            'title': f'Master {tech_entities[0]}',
            'description': f'You\'ve been exploring {tech_entities[0]}. Take it to the next level!',
            'icon': 'ri-book-open-line',
            'priority': 'high'
        })
    
    return recommendations[:5]  # Return top 5 recommendations


# ==========================================
# AI CHAT ASSISTANT ENDPOINTS
# ==========================================

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """Handle AI chat messages"""
    try:
        data = request.json
        message = data.get('message', '')
        context = data.get('context', {})
        
        if not message:
            return jsonify({
                "status": "error",
                "message": "No message provided"
            }), 400
        
        # Process message with Chat Assistant
        result = engine.ChatAssistant.process_message(message, context)
        
        # Save chat to history
        database.save_chat_message({
            'user_message': message,
            'ai_response': result.get('response', ''),
            'intent': result.get('intent', 'general'),
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            "status": "success",
            "response": result.get('response', ''),
            "intent": result.get('intent', 'general'),
            "suggestions": result.get('suggestions', []),
            "timestamp": result.get('timestamp', datetime.now().isoformat())
        })
        
    except Exception as e:
        print(f"❌ Error in chat: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "response": "I'm sorry, I encountered an error. Please try again."
        }), 500


@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Get chat history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        history = database.get_chat_history(limit=limit)
        
        return jsonify({
            "status": "success",
            "history": history
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/chat/clear', methods=['POST'])
def clear_chat_history():
    """Clear chat history"""
    try:
        database.clear_chat_history()
        return jsonify({"status": "success", "message": "Chat history cleared"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# AI RECOMMENDATIONS ENDPOINTS
# ==========================================

@app.route('/api/recommendations', methods=['GET'])
def get_ai_recommendations():
    """Get AI-powered learning recommendations"""
    try:
        # Get recent learning logs
        logs = database.get_recent_logs(days=30)
        
        # Get analytics
        analytics = engine.aggregate_analytics(logs)
        
        # Get stored history analysis
        history_analysis = database.get_latest_history_analysis()
        
        # Generate recommendations from weekly plan
        base_recommendations = engine.generate_weekly_plan(logs)
        
        # Add ML-enhanced recommendations if history analysis exists
        if history_analysis:
            entities = history_analysis.get('entities', {})
            pattern = history_analysis.get('pattern_type', 'explorer')
            
            # Add personalized recommendations
            personalized = generate_smart_recommendations(history_analysis, entities)
            base_recommendations.extend(personalized)
        
        # Remove duplicates and limit
        seen_titles = set()
        unique_recommendations = []
        for rec in base_recommendations:
            title = rec.get('title', '')
            if title not in seen_titles:
                seen_titles.add(title)
                unique_recommendations.append(rec)
        
        return jsonify({
            "status": "success",
            "recommendations": unique_recommendations[:6],
            "analytics_summary": {
                "total_sessions": analytics.get('total_sessions', 0),
                "top_topic": analytics.get('top_topic', 'General'),
                "engagement_score": analytics.get('engagement_score', 0)
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error getting recommendations: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# RESUME BUILDER ENDPOINTS
# ==========================================

@app.route('/api/resume/generate', methods=['POST'])
def generate_resume():
    """Generate resume from learning analytics"""
    try:
        data = request.json or {}
        user_info = data.get('user_info', {})
        
        # Get comprehensive analytics
        logs = database.get_recent_logs(days=90)
        analytics = engine.aggregate_analytics(logs)
        
        # Generate resume using Resume Builder
        result = engine.ResumeBuilder.generate_resume(analytics, user_info)
        
        # Save resume to database
        if result.get('status') == 'success':
            database.save_generated_resume(result.get('resume', {}))
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error generating resume: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/resume/latest', methods=['GET'])
def get_latest_resume():
    """Get the most recently generated resume"""
    try:
        resume = database.get_latest_resume()
        
        if resume:
            return jsonify({
                "status": "success",
                "resume": resume
            })
        else:
            return jsonify({
                "status": "not_found",
                "message": "No resume generated yet"
            }), 404
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/resume/update', methods=['PUT'])
def update_resume():
    """Update user info for resume"""
    try:
        data = request.json
        
        # Get current resume and regenerate with new user info
        logs = database.get_recent_logs(days=90)
        analytics = engine.aggregate_analytics(logs)
        
        result = engine.ResumeBuilder.generate_resume(analytics, data.get('user_info', {}))
        
        if result.get('status') == 'success':
            database.save_generated_resume(result.get('resume', {}))
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/resume/export/<format_type>', methods=['GET'])
def export_resume(format_type):
    """Export resume in specified format"""
    try:
        resume = database.get_latest_resume()
        
        if not resume:
            return jsonify({"status": "error", "message": "No resume to export"}), 404
        
        if format_type == 'json':
            return jsonify(resume)
        elif format_type == 'html':
            # Generate HTML version
            html = generate_resume_html(resume)
            return html, 200, {'Content-Type': 'text/html'}
        else:
            return jsonify({
                "status": "success",
                "resume": resume,
                "format": format_type,
                "message": f"Export as {format_type} - client-side rendering required"
            })
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


def generate_resume_html(resume: dict) -> str:
    """Generate HTML version of resume"""
    header = resume.get('header', {})
    skills = resume.get('skills', {})
    achievements = resume.get('learning_achievements', [])
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Resume - {header.get('name', 'Learning Professional')}</title>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
            h1 {{ color: #1a73e8; margin-bottom: 5px; }}
            h2 {{ color: #333; border-bottom: 2px solid #1a73e8; padding-bottom: 5px; }}
            .subtitle {{ color: #666; font-size: 1.1em; }}
            .summary {{ background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .skills {{ display: flex; flex-wrap: wrap; gap: 10px; }}
            .skill-tag {{ background: #e3f2fd; padding: 5px 12px; border-radius: 20px; font-size: 0.9em; }}
            .achievement {{ background: #f0f9ff; padding: 10px; border-left: 3px solid #1a73e8; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <h1>{header.get('name', 'Learning Professional')}</h1>
        <p class="subtitle">{header.get('title', 'Technology Professional')}</p>
        
        <h2>Professional Summary</h2>
        <div class="summary">{resume.get('summary', '')}</div>
        
        <h2>Technical Skills</h2>
        <div class="skills">
            {''.join(f'<span class="skill-tag">{s}</span>' for s in skills.get('technical', []))}
        </div>
        
        <h2>Tools & Technologies</h2>
        <div class="skills">
            {''.join(f'<span class="skill-tag">{s}</span>' for s in skills.get('tools', []))}
        </div>
        
        <h2>Learning Achievements</h2>
        {''.join(f'<div class="achievement"><strong>{a.get("title", "")}</strong><br>{a.get("description", "")}</div>' for a in achievements)}
        
        <h2>Soft Skills</h2>
        <div class="skills">
            {''.join(f'<span class="skill-tag">{s}</span>' for s in skills.get('soft_skills', []))}
        </div>
        
        <footer style="margin-top: 30px; text-align: center; color: #999; font-size: 0.8em;">
            Generated by SupriAI Learning Analytics
        </footer>
    </body>
    </html>
    """
    return html


# ==========================================
# ADVANCED AI ENDPOINTS
# ==========================================

@app.route('/api/ai/analyze-content', methods=['POST'])
def analyze_content():
    """Analyze content with AI for topic, complexity, and learning value"""
    try:
        data = request.json
        text = data.get('text', '')
        title = data.get('title', '')
        url = data.get('url', '')
        
        if not text and not title:
            return jsonify({"status": "error", "message": "Content required"}), 400
        
        analysis = engine.SmartContentAnalyzer.analyze_content(text, title, url)
        
        return jsonify({
            "status": "success",
            "analysis": analysis
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/learning-path', methods=['POST'])
def generate_learning_path():
    """Generate personalized learning path"""
    try:
        data = request.json or {}
        topic = data.get('topic', 'Programming')
        current_level = data.get('level', 'beginner')
        
        # Get user's learning history
        logs = database.get_recent_logs(days=30)
        
        path = engine.LearningPathGenerator.generate_path(
            topic, current_level, logs
        )
        
        return jsonify({
            "status": "success",
            "learning_path": path
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/smart-schedule', methods=['POST'])
def generate_smart_schedule():
    """Generate AI-optimized study schedule"""
    try:
        data = request.json or {}
        available_hours = data.get('available_hours', {})
        
        # Get user data
        logs = database.get_recent_logs(days=14)
        goals = database.get_goals(active_only=True)
        
        user_data = {
            "recent_logs": logs,
            "recent_topics": list(set(log.get('topic') for log in logs))
        }
        
        schedule = engine.SmartStudyScheduler.generate_schedule(
            user_data, goals, available_hours
        )
        
        return jsonify({
            "status": "success",
            "schedule": schedule
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/insights', methods=['GET'])
def get_ai_insights():
    """Get AI-powered learning insights"""
    try:
        days = request.args.get('days', 30, type=int)
        logs = database.get_recent_logs(days=days)
        analytics = engine.aggregate_analytics(logs)
        
        insights = engine.InsightsGenerator.generate_insights(analytics, logs)
        
        return jsonify({
            "status": "success",
            "insights": insights
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/skill-assessment', methods=['GET'])
def assess_skills():
    """Get AI skill assessment"""
    try:
        logs = database.get_recent_logs(days=60)
        
        assessment = engine.SkillAssessment.assess_skills(logs)
        
        return jsonify({
            "status": "success",
            "assessment": assessment
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/summarize', methods=['POST'])
def summarize_content():
    """Summarize content using AI"""
    try:
        data = request.json
        content = data.get('content', '')
        max_length = data.get('max_length', 200)
        
        if not content:
            return jsonify({"status": "error", "message": "Content required"}), 400
        
        summary = engine.ContentSummarizer.summarize(content, max_length)
        
        return jsonify({
            "status": "success",
            "result": summary
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/weekly-report', methods=['GET'])
def get_weekly_report():
    """Get automated AI weekly report"""
    try:
        logs = database.get_recent_logs(days=14)
        analytics = engine.aggregate_analytics(logs)
        goals = database.get_goals(active_only=True)
        user = database.get_user() or {}
        
        user_data = {
            "goals": goals,
            "streak_days": user.get('streak_days', 0)
        }
        
        report = engine.WeeklyReportGenerator.generate_report(
            user_data, logs, analytics
        )
        
        return jsonify({
            "status": "success",
            "report": report
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/auto-recommendations', methods=['GET'])
def get_auto_recommendations():
    """Get fully automated AI recommendations"""
    try:
        # Get comprehensive data
        logs = database.get_recent_logs(days=30)
        analytics = engine.aggregate_analytics(logs)
        
        # Get insights
        insights = engine.InsightsGenerator.generate_insights(analytics, logs)
        
        # Get skill assessment
        assessment = engine.SkillAssessment.assess_skills(logs)
        
        # Generate learning path for top topic
        top_topic = analytics.get('top_topic', 'Programming')
        level = assessment.get('overall_level', {}).get('level', 'beginner').lower()
        path = engine.LearningPathGenerator.generate_path(top_topic, level, logs)
        
        # Combine into automated recommendations
        recommendations = {
            "top_topic": top_topic,
            "skill_level": level,
            "insights_summary": insights.get('summary', ''),
            "strengths": insights.get('strengths', [])[:3],
            "improvements": insights.get('areas_to_improve', [])[:2],
            "next_steps": path.get('modules', [])[:3],
            "resources": path.get('resources', []),
            "predictions": insights.get('predictions', {}),
            "generated_at": datetime.now().isoformat()
        }
        
        return jsonify({
            "status": "success",
            "recommendations": recommendations
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/auto-log', methods=['POST'])
def auto_log_and_analyze():
    """Automatically log activity with AI analysis"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
        
        # Extract content for AI analysis
        content = data.get('content', '')
        title = data.get('title', '')
        url = data.get('url', '')
        
        # AI content analysis
        ai_analysis = engine.SmartContentAnalyzer.analyze_content(content, title, url)
        
        # Calculate engagement score
        engagement = data.get('engagement', {})
        engagement_score = engine.calculate_engagement(
            data.get('duration', 0),
            engagement.get('maxScroll', 0),
            engagement.get('clicks', 0),
            engagement.get('mouseDistance', 0)
        )
        
        # Prepare log entry with AI insights
        log_entry = {
            "url": url,
            "title": title,
            "topic": ai_analysis.get('topic', 'General Interest'),
            "confidence": ai_analysis.get('confidence', 0),
            "duration": data.get('duration', 0),
            "max_scroll": engagement.get('maxScroll', 0),
            "clicks": engagement.get('clicks', 0),
            "mouse_distance": engagement.get('mouseDistance', 0),
            "engagement_score": engagement_score,
            "content_preview": content[:500] if content else '',
            "timestamp": data.get('timestamp', datetime.now().isoformat())
        }
        
        # Insert into database
        log_id = database.insert_log(log_entry)
        
        # Update streak
        database.update_streak()
        
        # Get real-time recommendation
        recommendation = engine.get_next_recommendation(log_entry)
        
        return jsonify({
            "status": "success",
            "log_id": log_id,
            "ai_analysis": {
                "topic": ai_analysis.get('topic'),
                "confidence": ai_analysis.get('confidence'),
                "content_type": ai_analysis.get('content_type'),
                "learning_value": ai_analysis.get('learning_value'),
                "complexity": ai_analysis.get('complexity'),
                "keywords": ai_analysis.get('keywords', [])[:5]
            },
            "engagement_score": engagement_score,
            "recommendation": recommendation
        })
        
    except Exception as e:
        print(f"❌ Error in auto-log: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/ai/dashboard-summary', methods=['GET'])
def get_ai_dashboard_summary():
    """Get AI-enhanced dashboard summary"""
    try:
        # Get all relevant data
        logs = database.get_recent_logs(days=30)
        analytics = engine.aggregate_analytics(logs)
        user = database.get_user() or {}
        goals = database.get_goals(active_only=True)
        
        # Generate insights
        insights = engine.InsightsGenerator.generate_insights(analytics, logs)
        
        # Get skill assessment
        assessment = engine.SkillAssessment.assess_skills(logs)
        
        # Build comprehensive summary
        summary = {
            "user": {
                "name": user.get('display_name', 'Learner'),
                "streak": user.get('streak_days', 0),
                "total_points": user.get('total_points', 0)
            },
            "stats": {
                "total_sessions": analytics.get('total_sessions', 0),
                "total_hours": round(analytics.get('total_minutes', 0) / 60, 1),
                "avg_engagement": analytics.get('engagement_score', 0),
                "topics_explored": analytics.get('topics_count', 0),
                "top_topic": analytics.get('top_topic', 'None')
            },
            "skill_level": assessment.get('overall_level', {}),
            "top_proficiencies": assessment.get('topic_proficiency', [])[:3],
            "insights": {
                "summary": insights.get('summary', ''),
                "trend": insights.get('trends', {}),
                "predictions": insights.get('predictions', {})
            },
            "active_goals": len(goals),
            "recommendations": insights.get('recommendations', [])[:3],
            "weekly_trends": analytics.get('weekly_trends', []),
            "topic_distribution": analytics.get('topic_distribution', {}),
            "generated_at": datetime.now().isoformat()
        }
        
        return jsonify({
            "status": "success",
            "summary": summary
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# RUN SERVER
# ==========================================

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

