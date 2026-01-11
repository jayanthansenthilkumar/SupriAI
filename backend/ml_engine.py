"""
SupriAI - ML Engine Module
Content Classification & Analytics Processing
Clean, well-structured ML operations
"""

import re
import time
from collections import Counter
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# ==========================================
# TOPIC CLASSIFICATION KEYWORDS
# ==========================================
TOPIC_KEYWORDS = {
    "Programming": [
        "python", "javascript", "java", "code", "coding", "function", "api", 
        "html", "css", "database", "react", "angular", "vue", "node", "npm",
        "git", "github", "algorithm", "data structure", "software", "developer",
        "programming", "backend", "frontend", "fullstack", "debug", "compile",
        "typescript", "rust", "golang", "c++", "ruby", "php", "sql", "mongodb"
    ],
    "Data Science": [
        "data", "machine learning", "ml", "ai", "artificial intelligence",
        "statistics", "analysis", "pandas", "numpy", "neural network", "deep learning",
        "tensorflow", "pytorch", "scikit", "regression", "classification",
        "clustering", "visualization", "jupyter", "notebook", "dataset", "model"
    ],
    "Web Development": [
        "web", "website", "html", "css", "javascript", "responsive", "bootstrap",
        "tailwind", "sass", "less", "webpack", "vite", "dom", "browser", "http",
        "rest", "graphql", "ajax", "json", "xml", "seo", "accessibility"
    ],
    "History": [
        "war", "ancient", "century", "empire", "king", "queen", "revolution",
        "historical", "civilization", "dynasty", "medieval", "renaissance",
        "colonial", "world war", "history", "historian", "archaeological"
    ],
    "Science": [
        "physics", "biology", "chemistry", "quantum", "space", "energy", "cell",
        "molecule", "atom", "experiment", "laboratory", "scientific", "research",
        "hypothesis", "theory", "evolution", "genetics", "astronomy", "planet"
    ],
    "Mathematics": [
        "algebra", "calculus", "geometry", "equation", "theorem", "number",
        "mathematical", "formula", "probability", "statistics", "graph",
        "matrix", "vector", "integral", "derivative", "function", "proof"
    ],
    "Business": [
        "business", "startup", "entrepreneur", "marketing", "sales", "finance",
        "investment", "stock", "market", "management", "strategy", "revenue",
        "profit", "growth", "customer", "product", "service", "company"
    ],
    "Design": [
        "design", "ui", "ux", "user interface", "user experience", "figma",
        "sketch", "photoshop", "illustrator", "graphic", "typography", "color",
        "layout", "wireframe", "prototype", "visual", "creative", "branding"
    ],
    "Language Learning": [
        "language", "vocabulary", "grammar", "pronunciation", "fluent",
        "spanish", "french", "german", "chinese", "japanese", "korean",
        "english", "translation", "linguistics", "native", "speak"
    ],
    "Personal Development": [
        "productivity", "habit", "motivation", "mindset", "goal", "success",
        "self improvement", "meditation", "mindfulness", "wellness", "health",
        "fitness", "exercise", "sleep", "focus", "concentration"
    ]
}

# Topic icons mapping
TOPIC_ICONS = {
    "Programming": "ri-code-s-slash-line",
    "Data Science": "ri-bar-chart-grouped-fill",
    "Web Development": "ri-global-line",
    "History": "ri-ancient-gate-line",
    "Science": "ri-flask-line",
    "Mathematics": "ri-calculator-line",
    "Business": "ri-briefcase-line",
    "Design": "ri-palette-line",
    "Language Learning": "ri-translate-2",
    "Personal Development": "ri-user-star-line",
    "General Interest": "ri-lightbulb-line"
}

# Topic colors mapping
TOPIC_COLORS = {
    "Programming": "#1a73e8",
    "Data Science": "#188038",
    "Web Development": "#f9ab00",
    "History": "#a142f4",
    "Science": "#e8710a",
    "Mathematics": "#d93025",
    "Business": "#0d652d",
    "Design": "#c5221f",
    "Language Learning": "#1967d2",
    "Personal Development": "#9334e6",
    "General Interest": "#5f6368"
}


# ==========================================
# CONTENT CLASSIFICATION
# ==========================================

def classify_content(text: str, title: str = "") -> Tuple[str, float]:
    """
    Classify content into a learning topic using keyword matching.
    Returns: (topic_name, confidence_score)
    """
    if not text and not title:
        return "General Interest", 0.0
    
    combined_text = f"{title} {text}".lower()
    
    # Clean and tokenize text
    words = re.findall(r'\b[a-z]+\b', combined_text)
    word_counts = Counter(words)
    
    # Score each topic
    scores = {}
    for topic, keywords in TOPIC_KEYWORDS.items():
        topic_score = 0
        for keyword in keywords:
            # Handle multi-word keywords
            if ' ' in keyword:
                if keyword in combined_text:
                    topic_score += 3  # Higher weight for phrase matches
            else:
                topic_score += word_counts.get(keyword, 0)
        scores[topic] = topic_score
    
    # Get best topic
    best_topic = max(scores, key=scores.get)
    total_score = sum(scores.values())
    
    if scores[best_topic] == 0:
        return "General Interest", 0.0
    
    confidence = round((scores[best_topic] / max(total_score, 1)) * 100, 2)
    confidence = min(confidence, 95.0)  # Cap at 95%
    
    return best_topic, confidence


def get_topic_icon(topic: str) -> str:
    """Get the icon class for a topic"""
    return TOPIC_ICONS.get(topic, "ri-lightbulb-line")


def get_topic_color(topic: str) -> str:
    """Get the color for a topic"""
    return TOPIC_COLORS.get(topic, "#5f6368")


# ==========================================
# ENGAGEMENT SCORING
# ==========================================

def calculate_engagement(duration: float, scroll_percent: float, clicks: int, 
                         mouse_distance: float = 0) -> int:
    """
    Calculate engagement score (0-100) based on user interactions.
    """
    # Duration score (max 40 points) - cap at 10 minutes
    time_score = min(duration / 600, 1.0) * 40
    
    # Scroll score (max 30 points)
    scroll_score = (scroll_percent / 100) * 30
    
    # Click score (max 20 points) - cap at 10 clicks
    click_score = min(clicks / 10, 1.0) * 20
    
    # Mouse activity score (max 10 points) - indicates active reading
    mouse_score = min(mouse_distance / 10000, 1.0) * 10
    
    total = time_score + scroll_score + click_score + mouse_score
    return min(round(total), 100)


def get_engagement_level(score: int) -> str:
    """Get engagement level label"""
    if score >= 80:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Moderate"
    elif score >= 20:
        return "Low"
    return "Minimal"


# ==========================================
# ANALYTICS PROCESSING
# ==========================================

# Cache for analytics
_analytics_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 30  # Cache for 30 seconds
}


def aggregate_analytics(logs: List[Dict]) -> Dict:
    """
    Process logs into dashboard-ready analytics.
    Returns comprehensive stats for the frontend.
    """
    global _analytics_cache
    current_time = time.time()
    
    # Check cache
    if (_analytics_cache["data"] and 
        (current_time - _analytics_cache["timestamp"] < _analytics_cache["ttl"])):
        return _analytics_cache["data"]
    
    if not logs:
        return {
            "total_minutes": 0,
            "total_sessions": 0,
            "topics_count": 0,
            "engagement_score": 0,
            "top_topic": "None",
            "topic_distribution": {},
            "weekly_trends": [0] * 7,
            "recent_activity": [],
            "daily_average": 0,
            "most_active_day": "N/A"
        }
    
    # Calculate total time
    total_seconds = sum(log.get('duration', 0) for log in logs)
    total_minutes = int(total_seconds / 60)
    
    # Topic distribution
    topic_counts = Counter(log.get('topic', 'General Interest') for log in logs)
    topic_distribution = dict(topic_counts)
    
    # Top topic
    top_topic = topic_counts.most_common(1)[0][0] if topic_counts else "None"
    
    # Average engagement
    engagement_scores = [log.get('engagement_score', 0) for log in logs]
    avg_engagement = int(sum(engagement_scores) / len(engagement_scores)) if engagement_scores else 0
    
    # Weekly trends (last 7 days)
    weekly_trends = calculate_weekly_trends(logs)
    
    # Recent activity (top 10)
    recent_activity = []
    for log in logs[:10]:
        recent_activity.append({
            "id": log.get('id'),
            "title": log.get('title', 'Untitled'),
            "topic": log.get('topic', 'General'),
            "time": log.get('timestamp'),
            "score": log.get('engagement_score', 0),
            "duration": log.get('duration', 0),
            "url": log.get('url', '')
        })
    
    # Calculate daily average
    days_active = len(set(log.get('timestamp', '')[:10] for log in logs if log.get('timestamp')))
    daily_average = round(total_minutes / max(days_active, 1))
    
    # Most active day
    day_counts = Counter()
    for log in logs:
        timestamp = log.get('timestamp', '')
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                day_counts[dt.strftime('%A')] += 1
            except:
                pass
    most_active_day = day_counts.most_common(1)[0][0] if day_counts else "N/A"
    
    # Daily activity for heatmap (last 28 days - 4 weeks)
    daily_activity = calculate_daily_activity(logs, 28)
    
    result = {
        "total_minutes": total_minutes,
        "total_sessions": len(logs),
        "topics_count": len(topic_distribution),
        "engagement_score": avg_engagement,
        "top_topic": top_topic,
        "topic_distribution": topic_distribution,
        "weekly_trends": weekly_trends,
        "recent_activity": recent_activity,
        "daily_average": daily_average,
        "most_active_day": most_active_day,
        "topic_icon": get_topic_icon(top_topic),
        "topic_color": get_topic_color(top_topic),
        "daily_activity": daily_activity
    }
    
    # Update cache
    _analytics_cache["data"] = result
    _analytics_cache["timestamp"] = current_time
    
    return result


def calculate_weekly_trends(logs: List[Dict]) -> List[int]:
    """Calculate minutes spent per day for the last 7 days"""
    today = datetime.now().date()
    weekly_data = {i: 0 for i in range(7)}  # 0 = 6 days ago, 6 = today
    
    for log in logs:
        timestamp = log.get('timestamp', '')
        if not timestamp:
            continue
        
        try:
            log_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
            days_ago = (today - log_date).days
            
            if 0 <= days_ago < 7:
                day_index = 6 - days_ago  # Convert to array index
                weekly_data[day_index] += log.get('duration', 0) / 60  # Convert to minutes
        except:
            pass
    
    return [round(weekly_data[i]) for i in range(7)]


def calculate_daily_activity(logs: List[Dict], days: int = 28) -> List[int]:
    """Calculate session counts per day for heatmap (last N days)"""
    today = datetime.now().date()
    daily_counts = {i: 0 for i in range(days)}
    
    for log in logs:
        timestamp = log.get('timestamp', '')
        if not timestamp:
            continue
        
        try:
            log_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
            days_ago = (today - log_date).days
            
            if 0 <= days_ago < days:
                day_index = days - 1 - days_ago
                daily_counts[day_index] += 1
        except:
            pass
    
    return [daily_counts[i] for i in range(days)]


def get_topic_breakdown(logs: List[Dict]) -> List[Dict]:
    """Get detailed breakdown by topic"""
    topic_data = {}
    
    for log in logs:
        topic = log.get('topic', 'General Interest')
        if topic not in topic_data:
            topic_data[topic] = {
                'count': 0,
                'total_time': 0,
                'total_engagement': 0,
                'icon': get_topic_icon(topic),
                'color': get_topic_color(topic)
            }
        
        topic_data[topic]['count'] += 1
        topic_data[topic]['total_time'] += log.get('duration', 0)
        topic_data[topic]['total_engagement'] += log.get('engagement_score', 0)
    
    # Calculate averages and format
    result = []
    for topic, data in topic_data.items():
        result.append({
            'topic': topic,
            'sessions': data['count'],
            'total_minutes': round(data['total_time'] / 60),
            'avg_engagement': round(data['total_engagement'] / data['count']) if data['count'] > 0 else 0,
            'icon': data['icon'],
            'color': data['color']
        })
    
    # Sort by session count
    result.sort(key=lambda x: x['sessions'], reverse=True)
    return result


# ==========================================
# RECOMMENDATIONS ENGINE
# ==========================================

def get_next_recommendation(current_entry: Dict) -> Optional[Dict]:
    """Generate real-time recommendation based on current activity"""
    topic = current_entry.get('topic', 'General Interest')
    confidence = current_entry.get('confidence', 0)
    
    recommendations = {
        "Programming": {
            "topic": "Advanced Concepts",
            "message": "Great coding session! Consider exploring design patterns next.",
            "confidence": 85
        },
        "Data Science": {
            "topic": "Deep Learning",
            "message": "You're making progress! Try a hands-on ML project.",
            "confidence": 78
        },
        "Web Development": {
            "topic": "Modern Frameworks",
            "message": "Keep building! Explore React or Vue for your next project.",
            "confidence": 82
        },
        "Mathematics": {
            "topic": "Applied Mathematics",
            "message": "Excellent focus! Consider applying these concepts to programming.",
            "confidence": 75
        },
        "Science": {
            "topic": "Research Methods",
            "message": "Curious mind! Explore the latest scientific papers.",
            "confidence": 70
        },
        "History": {
            "topic": "Historical Analysis",
            "message": "Great historical exploration! Try connecting events to modern times.",
            "confidence": 72
        },
        "Business": {
            "topic": "Case Studies",
            "message": "Business savvy! Analyze some real-world case studies.",
            "confidence": 80
        },
        "Design": {
            "topic": "UI/UX Principles",
            "message": "Creative session! Practice with a design challenge.",
            "confidence": 77
        }
    }
    
    if topic in recommendations:
        rec = recommendations[topic]
        return {
            "topic": rec["topic"],
            "message": rec["message"],
            "confidence": rec["confidence"],
            "related_to": topic
        }
    
    return None


def generate_weekly_plan(logs: List[Dict]) -> List[Dict]:
    """Generate personalized learning recommendations"""
    if not logs:
        return [{
            "type": "Getting Started",
            "title": "Start Your Learning Journey",
            "description": "Browse educational content to get personalized recommendations.",
            "url": "https://www.coursera.org",
            "icon": "ri-rocket-line",
            "priority": "high"
        }]
    
    # Analyze dominant topics
    topic_counts = Counter(log.get('topic', 'General') for log in logs)
    dominant_topics = topic_counts.most_common(3)
    
    recommendations = []
    
    # Generate based on learning patterns
    for topic, count in dominant_topics:
        recs = get_recommendations_for_topic(topic, count)
        recommendations.extend(recs)
    
    # Add variety recommendation if user is too focused
    if len(dominant_topics) == 1:
        recommendations.append({
            "type": "Explore",
            "title": "Broaden Your Horizons",
            "description": "Try exploring a new topic to enhance cross-domain learning.",
            "url": "https://www.edx.org/learn",
            "icon": "ri-compass-line",
            "priority": "medium"
        })
    
    # Limit to 4 recommendations
    return recommendations[:4]


def get_recommendations_for_topic(topic: str, session_count: int) -> List[Dict]:
    """Get specific recommendations for a topic"""
    topic_resources = {
        "Programming": [
            {
                "type": "Practice",
                "title": "Coding Challenges",
                "description": "Sharpen your skills with algorithmic problems.",
                "url": "https://leetcode.com",
                "icon": "ri-code-box-line"
            },
            {
                "type": "Course",
                "title": "System Design Fundamentals",
                "description": "Learn to build scalable applications.",
                "url": "https://www.educative.io",
                "icon": "ri-git-branch-line"
            }
        ],
        "Data Science": [
            {
                "type": "Project",
                "title": "Kaggle Competition",
                "description": "Apply your skills to real datasets.",
                "url": "https://www.kaggle.com",
                "icon": "ri-database-2-line"
            },
            {
                "type": "Course",
                "title": "Deep Learning Specialization",
                "description": "Master neural networks and AI.",
                "url": "https://www.coursera.org/specializations/deep-learning",
                "icon": "ri-robot-line"
            }
        ],
        "Web Development": [
            {
                "type": "Project",
                "title": "Build a Portfolio Site",
                "description": "Showcase your work with a personal website.",
                "url": "https://www.frontendmentor.io",
                "icon": "ri-window-line"
            },
            {
                "type": "Tutorial",
                "title": "Modern CSS Techniques",
                "description": "Learn flexbox, grid, and animations.",
                "url": "https://css-tricks.com",
                "icon": "ri-palette-line"
            }
        ],
        "Mathematics": [
            {
                "type": "Course",
                "title": "Khan Academy Math",
                "description": "Master mathematics from basics to advanced.",
                "url": "https://www.khanacademy.org/math",
                "icon": "ri-calculator-line"
            }
        ],
        "Science": [
            {
                "type": "Article",
                "title": "Latest Scientific Discoveries",
                "description": "Stay updated with recent research.",
                "url": "https://www.nature.com",
                "icon": "ri-flask-line"
            }
        ],
        "History": [
            {
                "type": "Documentary",
                "title": "Historical Documentaries",
                "description": "Visual learning through documentaries.",
                "url": "https://www.youtube.com/history",
                "icon": "ri-film-line"
            }
        ],
        "Business": [
            {
                "type": "Course",
                "title": "Business Strategy",
                "description": "Learn from Harvard Business cases.",
                "url": "https://hbr.org",
                "icon": "ri-line-chart-line"
            }
        ],
        "Design": [
            {
                "type": "Practice",
                "title": "Daily UI Challenge",
                "description": "Improve design skills with daily prompts.",
                "url": "https://www.dailyui.co",
                "icon": "ri-artboard-line"
            }
        ]
    }
    
    resources = topic_resources.get(topic, [])
    for resource in resources:
        resource['priority'] = 'high' if session_count > 5 else 'medium'
    
    return resources


# ==========================================
# ACHIEVEMENT CHECKING
# ==========================================

def check_achievements(logs: List[Dict], user_stats: Dict) -> List[Dict]:
    """Check and return any newly unlocked achievements"""
    achievements = []
    total_sessions = len(logs)
    total_minutes = sum(log.get('duration', 0) for log in logs) / 60
    unique_topics = len(set(log.get('topic') for log in logs))
    
    # First Session
    if total_sessions >= 1:
        achievements.append({
            "badge_name": "First Steps",
            "badge_icon": "ri-footprint-line",
            "description": "Completed your first learning session!"
        })
    
    # Week Warrior (7+ sessions in a week)
    if total_sessions >= 7:
        achievements.append({
            "badge_name": "Week Warrior",
            "badge_icon": "ri-medal-line",
            "description": "Logged 7+ learning sessions in a week!"
        })
    
    # Topic Explorer (studied 3+ topics)
    if unique_topics >= 3:
        achievements.append({
            "badge_name": "Topic Explorer",
            "badge_icon": "ri-compass-3-line",
            "description": "Explored 3 or more different topics!"
        })
    
    # Deep Diver (60+ minutes in one session)
    for log in logs:
        if log.get('duration', 0) >= 3600:
            achievements.append({
                "badge_name": "Deep Diver",
                "badge_icon": "ri-focus-3-line",
                "description": "Maintained focus for over an hour!"
            })
            break
    
    # Streak achievements
    streak = user_stats.get('streak_days', 0)
    if streak >= 7:
        achievements.append({
            "badge_name": "Consistency King",
            "badge_icon": "ri-fire-line",
            "description": "Maintained a 7-day learning streak!"
        })
    
    if streak >= 30:
        achievements.append({
            "badge_name": "Month Master",
            "badge_icon": "ri-trophy-line",
            "description": "Incredible 30-day learning streak!"
        })
    
    return achievements


# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """Extract important keywords from text"""
    if not text:
        return []
    
    # Clean and tokenize
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    
    # Remove common stop words
    stop_words = {
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
        'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'could',
        'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make',
        'like', 'time', 'very', 'just', 'know', 'take', 'come', 'could', 'good',
        'some', 'them', 'than', 'then', 'into', 'year', 'your', 'with', 'this',
        'that', 'from', 'they', 'will', 'more', 'also', 'other', 'being'
    }
    
    filtered = [w for w in words if w not in stop_words]
    
    # Get most common
    word_counts = Counter(filtered)
    return [word for word, _ in word_counts.most_common(max_keywords)]


def calculate_reading_time(text: str) -> int:
    """Estimate reading time in minutes"""
    if not text:
        return 0
    
    words = len(text.split())
    # Average reading speed: 200-250 words per minute
    return max(1, round(words / 200))


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes}m"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"
