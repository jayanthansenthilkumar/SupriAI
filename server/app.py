"""
SupriAI Flask Backend
Main application with REST API for Chrome Extension + ML Engine
"""
import os
import sys
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from database import DatabaseManager, db
from ml.engine import MLEngine


# ==================== Flask App Setup ====================

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
CORS(app, origins=['*'])  # Allow Chrome extension

# Handle numpy types in JSON serialization
import numpy as np
from flask.json.provider import DefaultJSONProvider

class NumpyJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

app.json = NumpyJSONProvider(app)

# Initialize ML Engine
ml_engine = MLEngine()


# ==================== Showcase UI ====================

@app.route('/', methods=['GET'])
@app.route('/showcase', methods=['GET'])
def showcase_page():
    """Render a simple backend showcase page for local demo usage."""
    return render_template('showcase.html')


# ==================== Health & Info ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'version': '1.0.0',
        'name': 'SupriAI Backend',
        'timestamp': datetime.now().isoformat(),
        'ml_models': ml_engine.get_all_models_info()['total_models']
    })


@app.route('/api/models', methods=['GET'])
def get_models_info():
    """Get information about all ML models"""
    return jsonify(ml_engine.get_all_models_info())


# ==================== Data Ingestion ====================

@app.route('/api/sync', methods=['POST'])
def sync_data():
    """Sync browsing data from Chrome extension"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        # Sync tab data
        tab_data = data.get('tabData', {})
        tab_groups = data.get('tabGroups', {})
        session_id = data.get('sessionId')

        today = datetime.now().strftime('%Y-%m-%d')
        synced_count = 0

        for tab_id, tab_info in tab_data.items():
            domain = tab_info.get('domain', '')
            if not domain:
                continue

            # Classify the domain
            classification = ml_engine.classify_domain(domain)
            category = classification['category']

            # Save tab
            db.save_tab({
                'tabId': int(tab_id),
                'url': tab_info.get('url', ''),
                'domain': domain,
                'title': tab_info.get('title', ''),
                'timestamp': tab_info.get('startTime', int(datetime.now().timestamp() * 1000)),
                'sessionId': session_id,
                'activeTime': tab_info.get('totalActiveTime', 0),
                'date': today,
                'category': category
            })

            # Save domain stats
            db.save_domain_stats(domain, today, {
                'visitCount': 1,
                'activeTime': tab_info.get('totalActiveTime', 0),
                'tabCount': 1,
                'category': category
            })

            synced_count += 1

        # Calculate and save daily productivity score
        productivity_data = _calculate_daily_productivity(tab_data, today)
        db.save_productivity_score(today, productivity_data)

        return jsonify({
            'success': True,
            'synced': synced_count,
            'date': today,
            'productivity_score': productivity_data['score']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/import-history', methods=['POST'])
def import_chrome_history():
    """Import Chrome browsing history"""
    data = request.get_json()
    if not data or 'history' not in data:
        return jsonify({'error': 'No history data provided'}), 400

    try:
        history_items = data['history']
        
        # Classify and process each item
        processed = []
        for item in history_items:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(item.get('url', ''))
                domain = parsed.hostname or ''
                
                if not domain or domain in ['newtab', 'extensions', 'settings']:
                    continue

                classification = ml_engine.classify_domain(domain)
                
                processed.append({
                    'url': item.get('url', ''),
                    'title': item.get('title', ''),
                    'domain': domain,
                    'visitCount': item.get('visitCount', 1),
                    'lastVisitTime': item.get('lastVisitTime', 0),
                    'typedCount': item.get('typedCount', 0),
                    'category': classification['category']
                })
            except Exception:
                continue

        imported = db.import_chrome_history(processed)

        return jsonify({
            'success': True,
            'imported': imported,
            'total_submitted': len(history_items)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Session Management ====================

@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new browsing session"""
    data = request.get_json() or {}
    session_id = data.get('sessionId', f"session_{int(datetime.now().timestamp())}")
    
    try:
        db.create_session(session_id)
        return jsonify({'success': True, 'sessionId': session_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get recent sessions"""
    limit = request.args.get('limit', 10, type=int)
    return jsonify(db.get_sessions(limit))


# ==================== Tab Events ====================

@app.route('/api/events', methods=['POST'])
def log_event():
    """Log a tab event"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400
    
    try:
        db.log_tab_event(data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Domain Statistics ====================

@app.route('/api/stats/domains', methods=['GET'])
def get_domain_stats():
    """Get domain statistics"""
    period = request.args.get('period', 'week')
    start_date, end_date = _get_date_range(period)
    
    stats = db.get_domain_stats(start_date, end_date)
    return jsonify({
        'period': period,
        'start_date': start_date,
        'end_date': end_date,
        'stats': stats
    })


@app.route('/api/stats/top-domains', methods=['GET'])
def get_top_domains():
    """Get top domains by time"""
    period = request.args.get('period', 'week')
    limit = request.args.get('limit', 10, type=int)
    start_date, end_date = _get_date_range(period)
    
    domains = db.get_top_domains(start_date, end_date, limit)
    return jsonify({
        'period': period,
        'domains': domains
    })


@app.route('/api/stats/categories', methods=['GET'])
def get_category_stats():
    """Get category breakdown"""
    period = request.args.get('period', 'week')
    start_date, end_date = _get_date_range(period)
    
    categories = db.get_category_breakdown(start_date, end_date)
    return jsonify({
        'period': period,
        'categories': categories
    })


@app.route('/api/stats/summary', methods=['GET'])
def get_browsing_summary():
    """Get comprehensive browsing summary"""
    period = request.args.get('period', 'week')
    start_date, end_date = _get_date_range(period)
    
    summary = db.get_browsing_summary(start_date, end_date)
    summary['period'] = period
    return jsonify(summary)


@app.route('/api/stats/hourly', methods=['GET'])
def get_hourly_activity():
    """Get hourly activity breakdown"""
    date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    activity = db.get_hourly_activity(date)
    return jsonify({'date': date, 'hourly': activity})


# ==================== Productivity ====================

@app.route('/api/productivity/scores', methods=['GET'])
def get_productivity_scores():
    """Get productivity scores over time"""
    period = request.args.get('period', 'month')
    start_date, end_date = _get_date_range(period)
    
    scores = db.get_productivity_scores(start_date, end_date)
    return jsonify({
        'period': period,
        'scores': scores
    })


@app.route('/api/productivity/today', methods=['GET'])
def get_today_productivity():
    """Get today's productivity analysis"""
    today = datetime.now().strftime('%Y-%m-%d')
    scores = db.get_productivity_scores(today, today)
    
    if scores:
        return jsonify(scores[0])
    
    return jsonify({
        'date': today,
        'score': 0,
        'message': 'No data for today yet'
    })


# ==================== ML Endpoints ====================

@app.route('/api/ml/classify', methods=['POST'])
def classify_domain():
    """Classify a website domain"""
    data = request.get_json()
    domain = data.get('domain') if data else None
    domains = data.get('domains') if data else None

    if domain:
        return jsonify(ml_engine.classify_domain(domain))
    elif domains:
        results = ml_engine.classify_domains(domains)
        return jsonify({'classifications': results})
    
    return jsonify({'error': 'Provide domain or domains'}), 400


@app.route('/api/ml/cluster', methods=['POST'])
def get_cluster():
    """Get browsing behavior cluster for a day"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    result = ml_engine.get_browsing_cluster(data)
    return jsonify(result)


@app.route('/api/ml/predict-productivity', methods=['POST'])
def predict_productivity():
    """Predict productivity score"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    result = ml_engine.predict_productivity(data)
    return jsonify(result)


@app.route('/api/ml/detect-anomaly', methods=['POST'])
def detect_anomaly():
    """Detect browsing anomalies"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    result = ml_engine.detect_anomaly(data)
    return jsonify(result)


@app.route('/api/ml/forecast', methods=['GET'])
def forecast():
    """Forecast future browsing patterns"""
    days = request.args.get('days', 7, type=int)
    result = ml_engine.forecast(days)
    return jsonify(result)


@app.route('/api/ml/focus', methods=['POST'])
def get_focus_recommendation():
    """Get focus time recommendation"""
    data = request.get_json()
    if not data:
        # Use default current state
        data = {
            'hour_of_day': datetime.now().hour,
            'day_of_week': datetime.now().weekday(),
            'productive_ratio': 0.5,
            'social_ratio': 0.1,
            'entertainment_ratio': 0.1,
            'minutes_since_break': 30,
            'session_length': 30,
            'tab_switches': 5,
            'unique_domains_hour': 5,
            'productivity_score': 50
        }
    
    result = ml_engine.get_focus_recommendation(data)
    return jsonify(result)


@app.route('/api/ml/schedule', methods=['GET'])
def get_optimal_schedule():
    """Get optimal daily schedule"""
    result = ml_engine.get_optimal_schedule()
    return jsonify(result)


@app.route('/api/ml/tree-structure', methods=['GET'])
def get_tree_structure():
    """Get decision tree structure as JSON for popup tree visualization"""
    max_depth = request.args.get('depth', 4, type=int)
    tree = ml_engine.get_tree_structure(max_depth)
    if tree:
        return jsonify({'tree': tree})
    return jsonify({'error': 'Decision tree model not trained yet', 'tree': None})


@app.route('/api/ml/insights', methods=['POST'])
def get_comprehensive_insights():
    """Get all ML insights for current browsing state"""
    data = request.get_json()
    if not data:
        # Provide default data structure
        data = {
            'category_times': {'productive': 1800000, 'social': 300000, 'entertainment': 600000},
            'total_time': 2700000,
            'unique_domains': 10,
            'peak_hour': datetime.now().hour,
            'session_count': 3,
            'avg_session_minutes': 30,
            'focus_score': 0.5,
            'minutes_since_break': 30,
            'session_length': 45,
            'tab_switches': 8
        }
    
    insights = ml_engine.get_comprehensive_insights(data, db)
    return jsonify(insights)


@app.route('/api/ml/train', methods=['POST'])
def train_all_models():
    """Train all ML models with available data"""
    try:
        results = ml_engine.train_all(db)
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Deep Learning Endpoints ====================

@app.route('/api/ml/recommendations', methods=['POST'])
def get_learning_recommendations():
    """Get AI-powered learning content recommendations (DL Model #7)"""
    data = request.get_json() or {}

    # Build browsing context from request or defaults
    browsing_data = {
        'category_times': data.get('category_times', {
            'productive': 1800000, 'social': 300000, 'entertainment': 600000
        }),
        'total_time': data.get('total_time', 2700000),
        'unique_domains': data.get('unique_domains', 10),
        'domains': data.get('domains', []),
        'hour_of_day': data.get('hour_of_day', datetime.now().hour),
        'day_of_week': data.get('day_of_week', datetime.now().weekday()),
        'avg_session_minutes': data.get('avg_session_minutes', 30),
        'tab_switches': data.get('tab_switches', 5),
        'focus_score': data.get('focus_score', 0.5),
        'recency_weight': data.get('recency_weight', 0.5)
    }

    top_k = data.get('top_k', 5)
    result = ml_engine.get_learning_recommendations(browsing_data, top_k)
    return jsonify(result)


@app.route('/api/ml/content-analysis', methods=['POST'])
def analyze_content():
    """Analyze browsing content with NLP (DL Model #8)"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    entries = data.get('entries', [])
    if not entries:
        # Try building from domains
        domains = data.get('domains', [])
        entries = [{'domain': d, 'title': d, 'url': f'https://{d}'} for d in domains]

    if not entries:
        return jsonify({'error': 'No entries or domains provided'}), 400

    result = ml_engine.get_content_analysis(entries)
    return jsonify(result)


@app.route('/api/ml/collaborative', methods=['POST'])
def get_collaborative_recommendations():
    """Get domain recommendations via Neural Collaborative Filtering (DL Model #9)"""
    data = request.get_json() or {}

    context = {
        'hour_of_day': data.get('hour_of_day', datetime.now().hour),
        'day_of_week': data.get('day_of_week', datetime.now().weekday()),
        'session_duration': data.get('session_duration', 30),
        'productivity_score': data.get('productivity_score', 50),
        'tab_count': data.get('tab_count', 5),
        'unique_domains': data.get('unique_domains', 10),
        'productive_ratio': data.get('productive_ratio', 0.5),
        'focus_score': data.get('focus_score', 0.5)
    }

    candidate_domains = data.get('candidate_domains', None)
    top_k = data.get('top_k', 10)

    result = ml_engine.get_domain_recommendations(context, candidate_domains, top_k)
    return jsonify(result)


@app.route('/api/ml/temporal', methods=['POST'])
def get_temporal_predictions():
    """Predict future browsing patterns (DL Model #10)"""
    data = request.get_json() or {}

    recent_days = data.get('recent_days', [])
    if not recent_days:
        # Generate default day data
        recent_days = [{
            'total_time': 3600000 * 4,
            'category_times': {'productive': 2000000, 'social': 500000, 'entertainment': 1000000},
            'unique_domains': 15,
            'session_count': 5,
            'focus_score': 0.5,
            'day_of_week': (datetime.now().weekday() - i) % 7
        } for i in range(7)]

    predict_type = data.get('type', 'next_day')

    if predict_type == 'week':
        result = ml_engine.predict_week_temporal(recent_days)
    elif predict_type == 'optimal_hours':
        result = ml_engine.get_optimal_hours()
    else:
        result = ml_engine.predict_temporal(recent_days)

    return jsonify(result)


@app.route('/api/ml/optimal-hours', methods=['GET'])
def get_optimal_study_hours():
    """Get optimal hours for deep work and learning"""
    result = ml_engine.get_optimal_hours()
    return jsonify(result)


# ==================== Goals ====================

@app.route('/api/goals', methods=['GET'])
def get_goals():
    """Get active user goals"""
    goals = db.get_active_goals()
    return jsonify({'goals': goals})


@app.route('/api/goals', methods=['POST'])
def create_goal():
    """Create a new goal"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400
    
    try:
        db.save_goal(data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Data Export ====================

@app.route('/api/export', methods=['GET'])
def export_data():
    """Export all data"""
    data = db.export_all_data()
    return jsonify(data)


# ==================== Helper Functions ====================

def _get_date_range(period):
    """Convert period string to date range"""
    today = datetime.now()
    end_date = today.strftime('%Y-%m-%d')

    if period == 'today':
        start_date = end_date
    elif period == 'week':
        start_date = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    elif period == 'month':
        start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    elif period == 'year':
        start_date = (today - timedelta(days=365)).strftime('%Y-%m-%d')
    else:
        start_date = (today - timedelta(days=7)).strftime('%Y-%m-%d')

    return start_date, end_date


def _calculate_daily_productivity(tab_data, date):
    """Calculate productivity score from tab data"""
    category_times = {}
    total_time = 0

    for tab_info in tab_data.values():
        domain = tab_info.get('domain', '')
        active_time = tab_info.get('totalActiveTime', 0)
        total_time += active_time

        # Get category
        classification = ml_engine.classify_domain(domain)
        category = classification['category']
        category_times[category] = category_times.get(category, 0) + active_time

    # Calculate weighted score
    if total_time == 0:
        return {'score': 0, 'total_time': 0}

    score = 0
    for category, time_ms in category_times.items():
        weight = config.CATEGORY_PRODUCTIVITY_WEIGHTS.get(category, 0.3)
        ratio = time_ms / total_time
        score += ratio * weight * 100

    # Find top productive and distraction domains
    domain_times = {}
    for tab_info in tab_data.values():
        domain = tab_info.get('domain', '')
        domain_times[domain] = domain_times.get(domain, 0) + tab_info.get('totalActiveTime', 0)

    sorted_domains = sorted(domain_times.items(), key=lambda x: x[1], reverse=True)
    
    return {
        'score': round(score, 1),
        'productive_time': category_times.get('productive', 0),
        'social_time': category_times.get('social', 0),
        'entertainment_time': category_times.get('entertainment', 0),
        'other_time': sum(v for k, v in category_times.items()
                         if k not in ['productive', 'social', 'entertainment']),
        'total_time': total_time,
        'top_productive_domain': sorted_domains[0][0] if sorted_domains else '',
        'top_distraction_domain': sorted_domains[-1][0] if len(sorted_domains) > 1 else ''
    }


# ==================== Run Server ====================

if __name__ == '__main__':
    # Create data directory
    os.makedirs(os.path.join(config.BASE_DIR, 'data'), exist_ok=True)
    os.makedirs(config.ML_MODEL_DIR, exist_ok=True)

    # Keep startup logs ASCII-only so default Windows terminals don't crash on encoding.
    banner_lines = [
        "=======================================================",
        "                SupriAI Backend Server",
        "         Flask + SQLite + 10 ML/DL Algorithms",
        "-------------------------------------------------------",
        " Traditional ML Models:",
        "  1. Naive Bayes      - Website Classification",
        "  2. K-Means          - Browsing Clustering",
        "  3. Random Forest    - Productivity Prediction",
        "  4. Isolation Forest - Anomaly Detection",
        "  5. Ridge Reg + ES   - Time Series Forecast",
        "  6. Decision Tree    - Focus Recommendation",
        "-------------------------------------------------------",
        " Deep Learning Models:",
        "  7. MLP Neural Net   - Content Recommendation",
        "  8. TF-IDF + LSA     - NLP Content Analysis",
        "  9. Neural CF        - Collaborative Filtering",
        " 10. Temporal MLP     - Time Pattern Prediction",
        "-------------------------------------------------------",
        f" Server: http://{config.HOST}:{config.PORT}",
        f" API:    http://{config.HOST}:{config.PORT}/api",
        "=======================================================",
    ]
    print("\n" + "\n".join(banner_lines) + "\n")

    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
