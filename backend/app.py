from flask import Flask, request, jsonify
from flask_cors import CORS
import database
import ml_engine
import datetime

app = Flask(__name__)
CORS(app)  # Allow extension to communicate

# Initialize DB
database.init_db()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "running"})

@app.route('/log_activity', methods=['POST'])
def log_activity():
    data = request.json
    try:
        # Pre-process content with ML
        topic, confidence = ml_engine.classify_content(data.get('content', ''), data.get('title', ''))
        
        # Calculate engagement score
        engagement_score = ml_engine.calculate_engagement(
            data.get('duration', 0),
            data.get('engagement', {}).get('maxScroll', 0),
            data.get('engagement', {}).get('clicks', 0)
        )

        entry = {
            "url": data['url'],
            "title": data['title'],
            "timestamp": data['timestamp'],
            "duration": data['duration'],
            "topic": topic,
            "confidence": confidence,
            "engagement_score": engagement_score
        }
        
        database.insert_log(entry)
        
        # Real-time recommendation check
        rec = ml_engine.get_next_recommendation(entry)
        
        return jsonify({"status": "success", "recommendation": rec})
        
    except Exception as e:
        print(f"Error logging: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/get_analytics', methods=['GET'])
def get_analytics():
    logs = database.get_recent_logs(days=7)
    
    # Process for charts
    stats = ml_engine.aggregate_analytics(logs)
    recommendations = ml_engine.generate_weekly_plan(logs)
    
    stats['recommendations'] = recommendations
    return jsonify(stats)

if __name__ == '__main__':
    print("AI Learning Backend Running on Port 5000...")
    app.run(port=5000, debug=True)
