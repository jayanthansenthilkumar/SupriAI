import re
from collections import Counter
import datetime

# Predefined educational keywords for 'Zero-Shot' classification adaptation
TOPIC_KEYWORDS = {
    "Programming": ["python", "javascript", "code", "function", "api", "html", "css", "database", "react"],
    "Data Science": ["data", "machine learning", "ai", "statistics", "analysis", "pandas", "neural network"],
    "History": ["war", "ancient", "century", "empire", "king", "revolution", "historical"],
    "Science": ["physics", "biology", "chemistry", "quantum", "space", "energy", "cell"],
    "Mathematics": ["algebra", "calculus", "geometry", "equation", "theorem", "number"]
}

def classify_content(text, title):
    """
    Simulates an NLP classification model. 
    In a full production build, this would use BERT or a trained sklearn classifier.
    """
    combined_text = (title + " " + text).lower()
    
    scores = {topic: 0 for topic in TOPIC_KEYWORDS}
    
    # Simple Keyword Matching (Basic NLP)
    words = re.findall(r'\w+', combined_text)
    word_counts = Counter(words)
    
    for topic, keywords in TOPIC_KEYWORDS.items():
        for kw in keywords:
            if kw in word_counts:
                scores[topic] += word_counts[kw]
    
    # Determine best fit
    best_topic = max(scores, key=scores.get)
    total_score = sum(scores.values())
    
    confidence = 0
    if total_score > 0:
        confidence = round((scores[best_topic] / total_score) * 100, 2)
    
    if scores[best_topic] == 0:
        return "General Interest", 0
        
    return best_topic, confidence

def calculate_engagement(duration, scroll_percent, clicks):
    """
    Rule-based engagement scoring.
    """
    # Duration score (cap at 10 mins)
    time_score = min(duration / 600, 1.0) * 50
    
    # Scroll score
    scroll_score = (scroll_percent / 100) * 30
    
    # Interaction score
    click_score = min(clicks * 2, 20)
    
    return round(time_score + scroll_score + click_score)

import time

# Simple in-memory cache for High Performance UI response
_analytics_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 60  # Cache for 60 seconds
}

def aggregate_analytics(logs):
    """
    Process logs into chart-ready data structure with Caching.
    """
    global _analytics_cache
    current_time = time.time()
    
    # Return cached data if valid and logs haven't drastically changed (naive check)
    # In a real app we'd invalidate cache on new writes.
    # For now, we trust the TTL.
    if _analytics_cache["data"] and (current_time - _analytics_cache["timestamp"] < _analytics_cache["ttl"]):
        print("Serving analytics from cache")
        return _analytics_cache["data"]

    total_minutes = sum([l['duration'] for l in logs]) / 60
    
    # Topic Distribution & Top Topic
    topic_dist = {}
    for l in logs:
        t = l['topic']
        topic_dist[t] = topic_dist.get(t, 0) + 1
    
    top_topic = max(topic_dist, key=topic_dist.get) if topic_dist else "None"

    # Weekly Trends
    weekly_trends = [0] * 7
    # (Simplified: in production, parse l['timestamp'] to bucket correctly)
    if logs:
        val = len(logs)
        weekly_trends[6] = val 
    
    avg_engagement = 0
    if logs:
        avg_engagement = sum([l['engagement_score'] for l in logs]) / len(logs)

    # Serialize recent logs for UI
    recent_activity = []
    for l in logs[:10]: # Top 10
        recent_activity.append({
            "title": l['title'],
            "topic": l['topic'],
            "time": l['timestamp'], # Keep as string for now
            "score": l['engagement_score']
        })

    result = {
        "total_minutes": int(total_minutes),
        "topics_count": len(topic_dist),
        "engagement_score": int(avg_engagement),
        "top_topic": top_topic,
        "topic_distribution": topic_dist,
        "weekly_trends": weekly_trends,
        "recent_activity": recent_activity
    }
    
    # Update cache
    _analytics_cache["data"] = result
    _analytics_cache["timestamp"] = current_time
    
    return result

def get_next_recommendation(current_entry):
    """
    AI Recommendation logic.
    """
    topic = current_entry['topic']
    if topic == "Programming":
        return {"topic": "Advanced Python", "confidence": 85}
    elif topic == "Data Science":
        return {"topic": "Deep Learning Basics", "confidence": 78}
    return None

def generate_weekly_plan(logs):
    """
    Generates structured learning paths.
    """
    # Analyze dominant topic
    if not logs:
        return []

    # Get most frequent topic
    topics = [l['topic'] for l in logs]
    most_common = Counter(topics).most_common(1)[0][0]
    
    recommendations = []
    
    if most_common == "Programming":
        recommendations = [
            {"type": "Article", "title": "System Design Patterns", "description": "Level up your coding architecture skills.", "url": "#"},
            {"type": "Video", "title": "Python AsyncIO Tutorial", "description": "Master asynchronous programming.", "url": "#"}
        ]
    elif most_common == "Data Science":
        recommendations = [
            {"type": "Course", "title": "Neural Networks form Scratch", "description": "Deep dive into backpropagation.", "url": "#"}
        ]
    else:
        recommendations = [
            {"type": "General", "title": "Effective Learning Habits", "description": "Improve your retention.", "url": "#"}
        ]
        
    return recommendations
