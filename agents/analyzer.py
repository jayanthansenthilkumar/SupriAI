import sqlite3
import json
import os
import random
import time

def connect_db():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'server', 'supri.db')
    return sqlite3.connect(db_path)

def analyze_browsing_patterns():
    try:
        conn = connect_db()
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tabs';")
        if not cursor.fetchone():
            return {
                "productivity_score": 0,
                "top_domains": [],
                "ai_feedback": "Database empty or not initialized",
                "predicted_score": 0
            }

        # Fetch recent tabs
        cursor.execute("SELECT domain, duration, is_active FROM tabs ORDER BY visit_time DESC LIMIT 100")
        tabs = cursor.fetchall()
        
        if not tabs:
            return {
                "productivity_score": "N/A",
                "top_domains": [],
                "ai_feedback": "No browsing data found yet. Start browsing to generate insights.",
                "predicted_score": "--"
            }
            
        domains = {}
        for domain, duration, is_active in tabs:
            if domain not in domains:
                domains[domain] = 0
            domains[domain] += 1
            
        top_domains = sorted(domains.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Mock ML Model predictions based on data
        # In a real scenario, we would use scikit-learn models like RandomForest, KMeans like seen in the original project
        predicted_score = random.randint(50, 95)
        
        feedback = "Your browsing profile seems balanced."
        if predicted_score > 80:
            feedback = "Great productivity! You're optimizing your time well."
        elif predicted_score < 60:
            feedback = "AI detects unusual patterns. Recommend taking a deep focus break."
            
        insight = {
            "productivity_score": len(tabs) * random.randint(1, 5),
            "top_domains": top_domains,
            "ai_feedback": feedback,
            "predicted_score": predicted_score,
            "timestamp": time.time()
        }
        
        conn.close()
        return insight
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = analyze_browsing_patterns()
    print(json.dumps(result))
