"""
SupriAI - Unified AI Engine
Complete AI/ML functionality for automated learning companion
Combines all ML, NLP, and AI features in a single module
"""

import re
import time
import math
import json
import hashlib
from collections import Counter
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Try to import Gemini
gemini_client = None
try:
    from google import genai
    from google.genai import types
    if GEMINI_API_KEY:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("✨ SupriAI Engine Initialized with Gemini AI")
except ImportError:
    print("⚠️ Google GenAI not available. Using local AI engine.")


# ==========================================
# TOPIC CLASSIFICATION DATA
# ==========================================

TOPIC_KEYWORDS = {
    "Programming": {
        "keywords": ["python", "javascript", "java", "code", "coding", "function", "api", 
                    "html", "css", "database", "react", "angular", "vue", "node", "npm",
                    "git", "github", "algorithm", "data structure", "software", "developer",
                    "programming", "backend", "frontend", "fullstack", "debug", "compile",
                    "typescript", "rust", "golang", "c++", "ruby", "php", "sql", "mongodb",
                    "docker", "kubernetes", "microservices", "devops"],
        "weight": 1.2,
        "related": ["Web Development", "Data Science"]
    },
    "Data Science": {
        "keywords": ["data", "machine learning", "ml", "ai", "artificial intelligence",
                    "statistics", "analysis", "pandas", "numpy", "neural network", "deep learning",
                    "tensorflow", "pytorch", "scikit", "regression", "classification",
                    "clustering", "visualization", "jupyter", "notebook", "dataset", "model",
                    "nlp", "natural language", "computer vision", "kaggle", "analytics"],
        "weight": 1.3,
        "related": ["Programming", "Mathematics"]
    },
    "Web Development": {
        "keywords": ["web", "website", "html", "css", "javascript", "responsive", "bootstrap",
                    "tailwind", "sass", "less", "webpack", "vite", "dom", "browser", "http",
                    "rest", "graphql", "ajax", "json", "xml", "seo", "accessibility",
                    "nextjs", "nuxt", "gatsby", "svelte", "pwa", "spa"],
        "weight": 1.1,
        "related": ["Programming", "Design & UX"]
    },
    "Cloud & DevOps": {
        "keywords": ["aws", "azure", "gcp", "cloud", "docker", "kubernetes", "terraform",
                    "jenkins", "ci/cd", "deployment", "infrastructure", "serverless", "lambda",
                    "ec2", "s3", "container", "orchestration", "monitoring", "logging"],
        "weight": 1.2,
        "related": ["Programming", "Data Science"]
    },
    "Cybersecurity": {
        "keywords": ["security", "hacking", "penetration", "vulnerability", "encryption",
                    "firewall", "malware", "phishing", "authentication", "authorization",
                    "oauth", "jwt", "ssl", "tls", "cryptography", "ethical hacking"],
        "weight": 1.4,
        "related": ["Programming", "Cloud & DevOps"]
    },
    "Mathematics": {
        "keywords": ["algebra", "calculus", "geometry", "equation", "theorem", "number",
                    "mathematical", "formula", "probability", "statistics", "graph",
                    "matrix", "vector", "integral", "derivative", "function", "proof",
                    "linear algebra", "discrete math", "optimization"],
        "weight": 1.0,
        "related": ["Data Science", "Programming"]
    },
    "Business & Finance": {
        "keywords": ["business", "startup", "entrepreneur", "marketing", "sales", "finance",
                    "investment", "stock", "market", "management", "strategy", "revenue",
                    "profit", "growth", "customer", "product", "service", "company",
                    "accounting", "economics", "trading", "cryptocurrency", "blockchain"],
        "weight": 1.1,
        "related": ["Data Science", "Personal Development"]
    },
    "Design & UX": {
        "keywords": ["design", "ui", "ux", "user interface", "user experience", "figma",
                    "sketch", "photoshop", "illustrator", "graphic", "typography", "color",
                    "layout", "wireframe", "prototype", "visual", "creative", "branding",
                    "animation", "motion design", "3d", "blender"],
        "weight": 1.0,
        "related": ["Web Development", "Personal Development"]
    },
    "Personal Development": {
        "keywords": ["productivity", "habit", "motivation", "mindset", "goal", "success",
                    "self improvement", "meditation", "mindfulness", "wellness", "health",
                    "fitness", "exercise", "sleep", "focus", "concentration", "leadership",
                    "communication", "public speaking", "time management"],
        "weight": 0.9,
        "related": ["Business & Finance"]
    },
    "History": {
        "keywords": ["war", "ancient", "century", "empire", "king", "queen", "revolution",
                    "historical", "civilization", "dynasty", "medieval", "renaissance",
                    "colonial", "world war", "history", "historian", "archaeological"],
        "weight": 1.0,
        "related": []
    },
    "Science": {
        "keywords": ["physics", "biology", "chemistry", "quantum", "space", "energy", "cell",
                    "molecule", "atom", "experiment", "laboratory", "scientific", "research",
                    "hypothesis", "theory", "evolution", "genetics", "astronomy", "planet"],
        "weight": 1.0,
        "related": ["Mathematics", "Data Science"]
    },
    "Language Learning": {
        "keywords": ["language", "vocabulary", "grammar", "pronunciation", "fluent",
                    "spanish", "french", "german", "chinese", "japanese", "korean",
                    "english", "translation", "linguistics", "native", "speak"],
        "weight": 0.9,
        "related": ["Personal Development"]
    }
}

TOPIC_ICONS = {
    "Programming": "ri-code-s-slash-line",
    "Data Science": "ri-bar-chart-grouped-fill",
    "Web Development": "ri-global-line",
    "Cloud & DevOps": "ri-cloud-line",
    "Cybersecurity": "ri-shield-keyhole-line",
    "History": "ri-ancient-gate-line",
    "Science": "ri-flask-line",
    "Mathematics": "ri-calculator-line",
    "Business & Finance": "ri-briefcase-line",
    "Design & UX": "ri-palette-line",
    "Language Learning": "ri-translate-2",
    "Personal Development": "ri-user-star-line",
    "General Interest": "ri-lightbulb-line"
}

TOPIC_COLORS = {
    "Programming": "#1a73e8",
    "Data Science": "#188038",
    "Web Development": "#f9ab00",
    "Cloud & DevOps": "#4285f4",
    "Cybersecurity": "#ea4335",
    "History": "#a142f4",
    "Science": "#e8710a",
    "Mathematics": "#d93025",
    "Business & Finance": "#0d652d",
    "Design & UX": "#c5221f",
    "Language Learning": "#1967d2",
    "Personal Development": "#9334e6",
    "General Interest": "#5f6368"
}


# ==========================================
# CONTENT CLASSIFICATION
# ==========================================

def classify_content(text: str, title: str = "", url: str = "") -> Tuple[str, float]:
    """Classify content into a learning topic using keyword matching"""
    if not text and not title:
        return "General Interest", 0.0
    
    combined = f"{title} {text} {url}".lower()
    words = re.findall(r'\b[a-z]+\b', combined)
    word_set = set(words)
    
    scores = {}
    for topic, data in TOPIC_KEYWORDS.items():
        score = 0
        keywords = data["keywords"]
        weight = data.get("weight", 1.0)
        
        for keyword in keywords:
            if ' ' in keyword:
                if keyword in combined:
                    score += 3 * weight
            elif keyword in word_set:
                score += 1 * weight
        
        scores[topic] = score
    
    if not scores or max(scores.values()) == 0:
        return "General Interest", 0.0
    
    best_topic = max(scores, key=scores.get)
    total = sum(scores.values())
    confidence = min((scores[best_topic] / total) * 100, 95.0) if total > 0 else 0
    
    return best_topic, round(confidence, 2)


def get_topic_icon(topic: str) -> str:
    return TOPIC_ICONS.get(topic, "ri-lightbulb-line")


def get_topic_color(topic: str) -> str:
    return TOPIC_COLORS.get(topic, "#5f6368")


# ==========================================
# ENGAGEMENT SCORING
# ==========================================

def calculate_engagement(duration: float, scroll_percent: float, clicks: int, 
                         mouse_distance: float = 0) -> int:
    """Calculate engagement score (0-100) based on user interactions"""
    time_score = min(duration / 600, 1.0) * 40
    scroll_score = (scroll_percent / 100) * 30
    click_score = min(clicks / 10, 1.0) * 20
    mouse_score = min(mouse_distance / 10000, 1.0) * 10
    
    total = time_score + scroll_score + click_score + mouse_score
    return min(round(total), 100)


def get_engagement_level(score: int) -> str:
    if score >= 80: return "Excellent"
    elif score >= 60: return "Good"
    elif score >= 40: return "Moderate"
    elif score >= 20: return "Low"
    return "Minimal"


# ==========================================
# ANALYTICS PROCESSING
# ==========================================

_analytics_cache = {"data": None, "timestamp": 0, "ttl": 30}


def aggregate_analytics(logs: List[Dict]) -> Dict:
    """Process logs into dashboard-ready analytics"""
    global _analytics_cache
    current_time = time.time()
    
    if (_analytics_cache["data"] and 
        (current_time - _analytics_cache["timestamp"] < _analytics_cache["ttl"])):
        return _analytics_cache["data"]
    
    if not logs:
        return {
            "total_minutes": 0, "total_sessions": 0, "topics_count": 0,
            "engagement_score": 0, "top_topic": "None", "topic_distribution": {},
            "weekly_trends": [0] * 7, "recent_activity": [], "daily_average": 0,
            "most_active_day": "N/A", "daily_activity": []
        }
    
    total_seconds = sum(log.get('duration', 0) for log in logs)
    total_minutes = int(total_seconds / 60)
    
    topic_counts = Counter(log.get('topic', 'General Interest') for log in logs)
    topic_distribution = dict(topic_counts)
    top_topic = topic_counts.most_common(1)[0][0] if topic_counts else "None"
    
    engagement_scores = [log.get('engagement_score', 0) for log in logs]
    avg_engagement = int(sum(engagement_scores) / len(engagement_scores)) if engagement_scores else 0
    
    weekly_trends = calculate_weekly_trends(logs)
    daily_activity = calculate_daily_activity(logs, 28)
    
    recent_activity = []
    for log in logs[:10]:
        recent_activity.append({
            "id": log.get('id'), "title": log.get('title', 'Untitled'),
            "topic": log.get('topic', 'General'), "time": log.get('timestamp'),
            "score": log.get('engagement_score', 0), "duration": log.get('duration', 0),
            "url": log.get('url', '')
        })
    
    days_active = len(set(log.get('timestamp', '')[:10] for log in logs if log.get('timestamp')))
    daily_average = round(total_minutes / max(days_active, 1))
    
    day_counts = Counter()
    for log in logs:
        timestamp = log.get('timestamp', '')
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                day_counts[dt.strftime('%A')] += 1
            except: pass
    most_active_day = day_counts.most_common(1)[0][0] if day_counts else "N/A"
    
    result = {
        "total_minutes": total_minutes, "total_sessions": len(logs),
        "topics_count": len(topic_distribution), "engagement_score": avg_engagement,
        "top_topic": top_topic, "topic_distribution": topic_distribution,
        "weekly_trends": weekly_trends, "recent_activity": recent_activity,
        "daily_average": daily_average, "most_active_day": most_active_day,
        "topic_icon": get_topic_icon(top_topic), "topic_color": get_topic_color(top_topic),
        "daily_activity": daily_activity
    }
    
    _analytics_cache["data"] = result
    _analytics_cache["timestamp"] = current_time
    return result


def calculate_weekly_trends(logs: List[Dict]) -> List[int]:
    """Calculate minutes spent per day for the last 7 days"""
    today = datetime.now().date()
    weekly_data = {i: 0 for i in range(7)}
    
    for log in logs:
        timestamp = log.get('timestamp', '')
        if not timestamp: continue
        try:
            log_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
            days_ago = (today - log_date).days
            if 0 <= days_ago < 7:
                day_index = 6 - days_ago
                weekly_data[day_index] += log.get('duration', 0) / 60
        except: pass
    
    return [round(weekly_data[i]) for i in range(7)]


def calculate_daily_activity(logs: List[Dict], days: int = 28) -> List[int]:
    """Calculate session counts per day for heatmap"""
    today = datetime.now().date()
    daily_counts = {i: 0 for i in range(days)}
    
    for log in logs:
        timestamp = log.get('timestamp', '')
        if not timestamp: continue
        try:
            log_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
            days_ago = (today - log_date).days
            if 0 <= days_ago < days:
                day_index = days - 1 - days_ago
                daily_counts[day_index] += 1
        except: pass
    
    return [daily_counts[i] for i in range(days)]


def get_topic_breakdown(logs: List[Dict]) -> List[Dict]:
    """Get detailed breakdown by topic"""
    topic_data = {}
    
    for log in logs:
        topic = log.get('topic', 'General Interest')
        if topic not in topic_data:
            topic_data[topic] = {'count': 0, 'total_time': 0, 'total_engagement': 0,
                                'icon': get_topic_icon(topic), 'color': get_topic_color(topic)}
        topic_data[topic]['count'] += 1
        topic_data[topic]['total_time'] += log.get('duration', 0)
        topic_data[topic]['total_engagement'] += log.get('engagement_score', 0)
    
    result = []
    for topic, data in topic_data.items():
        result.append({
            'topic': topic, 'sessions': data['count'],
            'total_minutes': round(data['total_time'] / 60),
            'avg_engagement': round(data['total_engagement'] / data['count']) if data['count'] > 0 else 0,
            'icon': data['icon'], 'color': data['color']
        })
    
    result.sort(key=lambda x: x['sessions'], reverse=True)
    return result


# ==========================================
# SMART CONTENT ANALYZER
# ==========================================

class SmartContentAnalyzer:
    """Advanced content analysis with AI-powered insights"""
    
    @classmethod
    def analyze_content(cls, text: str, title: str = "", url: str = "") -> Dict[str, Any]:
        """Comprehensive content analysis"""
        combined = f"{title} {text} {url}".lower()
        
        topic, confidence = classify_content(text, title, url)
        entities = cls._extract_entities(combined)
        complexity = cls._analyze_complexity(text)
        content_type = cls._detect_content_type(url, title)
        learning_value = cls._calculate_learning_value(topic, confidence, complexity, content_type)
        keywords = cls._extract_keywords(text, 10)
        
        return {
            "topic": topic, "confidence": confidence, "entities": entities,
            "complexity": complexity, "content_type": content_type,
            "learning_value": learning_value, "keywords": keywords,
            "related_topics": TOPIC_KEYWORDS.get(topic, {}).get("related", [])
        }
    
    @classmethod
    def _extract_entities(cls, text: str) -> Dict[str, List[str]]:
        entities = {'technologies': [], 'frameworks': [], 'concepts': [], 'tools': []}
        patterns = {
            'technologies': ['python', 'javascript', 'java', 'sql', 'typescript', 'rust', 'golang'],
            'frameworks': ['react', 'angular', 'vue', 'django', 'flask', 'tensorflow', 'pytorch'],
            'concepts': ['machine learning', 'deep learning', 'api', 'algorithm', 'data structure'],
            'tools': ['git', 'docker', 'kubernetes', 'aws', 'vscode', 'jupyter']
        }
        
        for category, keywords in patterns.items():
            for keyword in keywords:
                if re.search(r'\b' + keyword + r'\b', text):
                    clean = keyword.title()
                    if clean not in entities[category]:
                        entities[category].append(clean)
        return entities
    
    @classmethod
    def _analyze_complexity(cls, text: str) -> Dict[str, Any]:
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        word_count = len(words)
        avg_word_length = sum(len(w) for w in words) / max(len(words), 1)
        avg_sentence_length = word_count / max(len(sentences), 1)
        
        if avg_sentence_length < 10 and avg_word_length < 5:
            level, score = "Beginner", 30
        elif avg_sentence_length < 20 and avg_word_length < 6:
            level, score = "Intermediate", 60
        else:
            level, score = "Advanced", 85
        
        return {"level": level, "score": score, "word_count": word_count}
    
    @classmethod
    def _detect_content_type(cls, url: str, title: str) -> str:
        url_lower = url.lower()
        if any(x in url_lower for x in ['youtube.com', 'vimeo.com']): return "video"
        elif any(x in url_lower for x in ['github.com', 'gitlab.com']): return "repository"
        elif 'stackoverflow.com' in url_lower: return "q&a"
        elif any(x in url_lower for x in ['docs.', 'documentation']): return "documentation"
        elif 'tutorial' in url_lower or 'tutorial' in title.lower(): return "tutorial"
        elif any(x in url_lower for x in ['udemy', 'coursera', 'edx']): return "course"
        elif any(x in url_lower for x in ['blog', 'medium.com', 'dev.to']): return "article"
        return "article"
    
    @classmethod
    def _calculate_learning_value(cls, topic: str, confidence: float, 
                                  complexity: Dict, content_type: str) -> int:
        base_score = 50
        if confidence > 70: base_score += 15
        elif confidence > 40: base_score += 8
        
        base_score += (complexity.get("score", 50) - 50) * 0.2
        
        type_bonus = {"tutorial": 15, "course": 20, "documentation": 10, "video": 12,
                     "repository": 18, "article": 5, "q&a": 8}
        base_score += type_bonus.get(content_type, 0)
        
        return min(max(int(base_score), 0), 100)
    
    @classmethod
    def _extract_keywords(cls, text: str, max_keywords: int = 10) -> List[str]:
        words = re.findall(r'\b[a-z]{4,}\b', text.lower())
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 
                     'this', 'that', 'with', 'will', 'your', 'from', 'they', 'which'}
        filtered = [w for w in words if w not in stop_words]
        return [word for word, _ in Counter(filtered).most_common(max_keywords)]


# ==========================================
# LEARNING PATH GENERATOR
# ==========================================

class LearningPathGenerator:
    """AI-powered learning path generation"""
    
    LEARNING_PATHS = {
        "Programming": {
            "beginner": [
                {"title": "Programming Fundamentals", "duration": "2 weeks", "topics": ["Variables", "Control Flow", "Functions"]},
                {"title": "Data Structures Basics", "duration": "2 weeks", "topics": ["Arrays", "Lists", "Dictionaries"]},
                {"title": "Object-Oriented Programming", "duration": "3 weeks", "topics": ["Classes", "Inheritance", "Polymorphism"]}
            ],
            "intermediate": [
                {"title": "Advanced Data Structures", "duration": "3 weeks", "topics": ["Trees", "Graphs", "Hash Tables"]},
                {"title": "Algorithms & Problem Solving", "duration": "4 weeks", "topics": ["Sorting", "Searching", "Dynamic Programming"]}
            ],
            "advanced": [
                {"title": "System Design", "duration": "4 weeks", "topics": ["Scalability", "Distributed Systems", "Caching"]},
                {"title": "Clean Architecture", "duration": "3 weeks", "topics": ["SOLID", "Clean Code", "Refactoring"]}
            ]
        },
        "Data Science": {
            "beginner": [
                {"title": "Python for Data Science", "duration": "2 weeks", "topics": ["NumPy", "Pandas", "Matplotlib"]},
                {"title": "Statistics Fundamentals", "duration": "3 weeks", "topics": ["Descriptive Stats", "Probability"]}
            ],
            "intermediate": [
                {"title": "Machine Learning Basics", "duration": "4 weeks", "topics": ["Regression", "Classification", "Clustering"]}
            ],
            "advanced": [
                {"title": "Deep Learning", "duration": "5 weeks", "topics": ["Neural Networks", "CNNs", "Transformers"]}
            ]
        },
        "Web Development": {
            "beginner": [
                {"title": "HTML & CSS Fundamentals", "duration": "2 weeks", "topics": ["Semantic HTML", "CSS Flexbox"]},
                {"title": "JavaScript Basics", "duration": "3 weeks", "topics": ["DOM Manipulation", "Events"]}
            ],
            "intermediate": [
                {"title": "React/Vue Framework", "duration": "4 weeks", "topics": ["Components", "State Management"]},
                {"title": "Backend Development", "duration": "4 weeks", "topics": ["Node.js/Python", "REST APIs"]}
            ],
            "advanced": [
                {"title": "Full-Stack Architecture", "duration": "3 weeks", "topics": ["Microservices", "GraphQL"]}
            ]
        }
    }
    
    @classmethod
    def generate_path(cls, topic: str, current_level: str, learning_history: List[Dict] = None) -> Dict[str, Any]:
        topic_paths = cls.LEARNING_PATHS.get(topic, cls.LEARNING_PATHS.get("Programming"))
        
        if current_level not in ["beginner", "intermediate", "advanced"]:
            current_level = "beginner"
        
        path_modules = []
        if current_level == "beginner":
            path_modules.extend(topic_paths.get("beginner", []))
            path_modules.extend(topic_paths.get("intermediate", [])[:1])
        elif current_level == "intermediate":
            path_modules.extend(topic_paths.get("intermediate", []))
            path_modules.extend(topic_paths.get("advanced", [])[:1])
        else:
            path_modules.extend(topic_paths.get("advanced", []))
        
        total_weeks = sum(int(m["duration"].split()[0]) for m in path_modules)
        
        resources = [
            {"name": "LeetCode", "url": "https://leetcode.com", "type": "practice"},
            {"name": "freeCodeCamp", "url": "https://freecodecamp.org", "type": "course"}
        ]
        
        return {
            "topic": topic, "level": current_level, "modules": path_modules,
            "total_duration": f"{total_weeks} weeks", "resources": resources,
            "generated_at": datetime.now().isoformat()
        }


# ==========================================
# INSIGHTS GENERATOR
# ==========================================

class InsightsGenerator:
    """Generate AI-powered learning insights"""
    
    @classmethod
    def generate_insights(cls, analytics: Dict, history: List[Dict]) -> Dict[str, Any]:
        return {
            "summary": cls._generate_summary(analytics),
            "strengths": cls._identify_strengths(analytics),
            "areas_to_improve": cls._identify_improvements(analytics),
            "trends": cls._analyze_trends(history),
            "predictions": cls._make_predictions(analytics),
            "recommendations": cls._generate_recommendations(analytics),
            "generated_at": datetime.now().isoformat()
        }
    
    @classmethod
    def _generate_summary(cls, analytics: Dict) -> str:
        total_mins = analytics.get("total_minutes", 0)
        sessions = analytics.get("total_sessions", 0)
        top_topic = analytics.get("top_topic", "various topics")
        engagement = analytics.get("engagement_score", 0)
        
        if sessions == 0:
            return "Start your learning journey! Your personalized insights will appear here."
        
        hours, mins = divmod(total_mins, 60)
        level = "excellent" if engagement > 75 else "good" if engagement > 50 else "moderate"
        
        return f"You've invested {hours}h {mins}m across {sessions} sessions. " \
               f"Primary focus: {top_topic} with {level} engagement ({engagement}%)."
    
    @classmethod
    def _identify_strengths(cls, analytics: Dict) -> List[Dict]:
        strengths = []
        topic_dist = analytics.get("topic_distribution", {})
        
        if topic_dist:
            top_topics = sorted(topic_dist.items(), key=lambda x: x[1], reverse=True)[:3]
            for topic, count in top_topics:
                strengths.append({"area": topic, "evidence": f"{count} sessions", "icon": "ri-star-line"})
        
        if analytics.get("engagement_score", 0) > 70:
            strengths.append({"area": "Deep Focus", "evidence": f"{analytics['engagement_score']}% engagement", "icon": "ri-focus-3-line"})
        
        return strengths[:5]
    
    @classmethod
    def _identify_improvements(cls, analytics: Dict) -> List[Dict]:
        improvements = []
        
        if analytics.get("engagement_score", 50) < 50:
            improvements.append({"area": "Focus", "suggestion": "Try shorter, more focused sessions", "priority": "high"})
        
        if len(analytics.get("topic_distribution", {})) == 1:
            improvements.append({"area": "Breadth", "suggestion": "Explore related topics", "priority": "medium"})
        
        return improvements
    
    @classmethod
    def _analyze_trends(cls, history: List[Dict]) -> Dict[str, Any]:
        if len(history) < 2:
            return {"trend": "neutral", "description": "Not enough data"}
        
        mid = len(history) // 2
        recent_avg = sum(h.get("engagement_score", 0) for h in history[:mid]) / max(mid, 1)
        older_avg = sum(h.get("engagement_score", 0) for h in history[mid:]) / max(len(history) - mid, 1)
        
        if recent_avg > older_avg * 1.1:
            return {"trend": "improving", "description": "Your engagement is trending upward!"}
        elif recent_avg < older_avg * 0.9:
            return {"trend": "declining", "description": "Consider refreshing your approach."}
        return {"trend": "stable", "description": "Your patterns are consistent."}
    
    @classmethod
    def _make_predictions(cls, analytics: Dict) -> Dict[str, Any]:
        sessions_per_week = analytics.get("total_sessions", 0) / 4
        hours_per_week = analytics.get("total_minutes", 0) / 60 / 4
        
        if sessions_per_week >= 5 and hours_per_week >= 5:
            prediction, confidence = "advanced", 85
        elif sessions_per_week >= 3 and hours_per_week >= 3:
            prediction, confidence = "intermediate", 75
        else:
            prediction, confidence = "beginner+", 60
        
        return {"predicted_level_3m": prediction, "confidence": confidence,
                "message": f"At current pace, reach {prediction} level in ~3 months"}
    
    @classmethod
    def _generate_recommendations(cls, analytics: Dict) -> List[Dict]:
        top_topic = analytics.get("top_topic", "General")
        topic_recs = {
            "Programming": "Practice coding challenges on LeetCode",
            "Data Science": "Work on a Kaggle competition",
            "Web Development": "Build and deploy a personal project"
        }
        
        recommendations = []
        if top_topic in topic_recs:
            recommendations.append({"type": "practice", "title": "Hands-On", "description": topic_recs[top_topic], "priority": "high"})
        
        recommendations.append({"type": "routine", "title": "Build a Routine", "description": "Study at the same time daily", "priority": "medium"})
        return recommendations[:4]


# ==========================================
# SKILL ASSESSMENT
# ==========================================

class SkillAssessment:
    """AI-powered skill level assessment"""
    
    @classmethod
    def assess_skills(cls, learning_history: List[Dict]) -> Dict[str, Any]:
        proficiency = cls._calculate_proficiency(learning_history)
        overall = cls._determine_overall_level(proficiency)
        velocity = cls._calculate_velocity(learning_history)
        
        return {
            "overall_level": overall, "topic_proficiency": proficiency,
            "learning_velocity": velocity, "assessed_at": datetime.now().isoformat()
        }
    
    @classmethod
    def _calculate_proficiency(cls, history: List[Dict]) -> List[Dict]:
        topic_data = {}
        for log in history:
            topic = log.get("topic", "General")
            duration = log.get("duration", 0) / 60
            engagement = log.get("engagement_score", 50)
            
            if topic not in topic_data:
                topic_data[topic] = {"time": 0, "sessions": 0, "engagement_sum": 0}
            topic_data[topic]["time"] += duration
            topic_data[topic]["sessions"] += 1
            topic_data[topic]["engagement_sum"] += engagement
        
        proficiencies = []
        for topic, data in topic_data.items():
            avg_engagement = data["engagement_sum"] / max(data["sessions"], 1)
            time_factor = min(data["time"] / 600, 1)
            session_factor = min(data["sessions"] / 20, 1)
            engagement_factor = avg_engagement / 100
            
            proficiency = (time_factor * 0.4 + session_factor * 0.3 + engagement_factor * 0.3) * 100
            level = "Advanced" if proficiency >= 70 else "Intermediate" if proficiency >= 40 else "Beginner"
            
            proficiencies.append({
                "topic": topic, "proficiency": round(proficiency, 1),
                "level": level, "hours": round(data["time"] / 60, 1), "sessions": data["sessions"]
            })
        
        proficiencies.sort(key=lambda x: x["proficiency"], reverse=True)
        return proficiencies
    
    @classmethod
    def _determine_overall_level(cls, proficiencies: List[Dict]) -> Dict[str, Any]:
        if not proficiencies:
            return {"level": "Beginner", "score": 0}
        avg = sum(p["proficiency"] for p in proficiencies) / len(proficiencies)
        level = "Advanced" if avg >= 70 else "Intermediate" if avg >= 40 else "Beginner"
        return {"level": level, "score": round(avg, 1)}
    
    @classmethod
    def _calculate_velocity(cls, history: List[Dict]) -> Dict[str, Any]:
        if len(history) < 7:
            return {"sessions_per_week": 0, "hours_per_week": 0, "trend": "insufficient_data"}
        
        sessions_per_week = len(history) / 4
        total_hours = sum(log.get("duration", 0) for log in history) / 3600
        hours_per_week = total_hours / 4
        
        trend = "excellent" if sessions_per_week >= 5 else "good" if sessions_per_week >= 3 else "needs_improvement"
        return {"sessions_per_week": round(sessions_per_week, 1), "hours_per_week": round(hours_per_week, 1), "trend": trend}


# ==========================================
# WEEKLY REPORT GENERATOR
# ==========================================

class WeeklyReportGenerator:
    """Generate automated weekly learning reports"""
    
    @classmethod
    def generate_report(cls, user_data: Dict, history: List[Dict], analytics: Dict) -> Dict[str, Any]:
        week_ago = datetime.now() - timedelta(days=7)
        weekly_history = []
        
        for log in history:
            try:
                ts = datetime.fromisoformat(log.get("timestamp", "").replace('Z', '+00:00'))
                if ts >= week_ago:
                    weekly_history.append(log)
            except: pass
        
        sessions = len(weekly_history)
        total_mins = sum(log.get("duration", 0) for log in weekly_history) / 60
        avg_engagement = sum(log.get("engagement_score", 0) for log in weekly_history) / max(sessions, 1)
        
        topics = Counter(log.get("topic") for log in weekly_history)
        
        return {
            "period": {"start": week_ago.isoformat(), "end": datetime.now().isoformat()},
            "summary": {"sessions": sessions, "total_hours": round(total_mins / 60, 1),
                       "avg_engagement": round(avg_engagement, 1), "streak": user_data.get("streak_days", 0)},
            "topic_breakdown": [{"topic": t, "sessions": c} for t, c in topics.most_common(5)],
            "recommendations": ["Keep up consistent practice!" if sessions >= 5 else "Try more sessions this week"],
            "generated_at": datetime.now().isoformat()
        }


# ==========================================
# CONTENT SUMMARIZER
# ==========================================

class ContentSummarizer:
    """AI-powered content summarization"""
    
    @classmethod
    def summarize(cls, content: str, max_length: int = 200) -> Dict[str, Any]:
        if gemini_client:
            try:
                return cls._summarize_with_gemini(content, max_length)
            except Exception as e:
                print(f"Gemini summarization failed: {e}")
        
        return cls._extractive_summary(content, max_length)
    
    @classmethod
    def _summarize_with_gemini(cls, content: str, max_length: int) -> Dict[str, Any]:
        prompt = f"Summarize in {max_length} chars. Focus on key learning points:\n{content[:3000]}"
        response = gemini_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return {"summary": response.text[:max_length], "key_points": [], "difficulty": "intermediate"}
    
    @classmethod
    def _extractive_summary(cls, content: str, max_length: int) -> Dict[str, Any]:
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 20]
        if not sentences:
            return {"summary": content[:max_length], "key_points": [], "difficulty": "unknown"}
        
        important = {'important', 'key', 'main', 'essential', 'fundamental', 'concept'}
        scored = [(s, sum(1 for w in s.lower().split() if w in important)) for s in sentences]
        scored.sort(key=lambda x: x[1], reverse=True)
        
        summary = '. '.join(s for s, _ in scored[:3])[:max_length]
        return {"summary": summary, "key_points": [s for s, _ in scored[:3]], "difficulty": "intermediate"}


# ==========================================
# SMART STUDY SCHEDULER
# ==========================================

class SmartStudyScheduler:
    """AI-powered study schedule optimization"""
    
    @classmethod
    def generate_schedule(cls, user_data: Dict, goals: List[Dict], available_hours: Dict = None) -> Dict[str, Any]:
        if not available_hours:
            available_hours = {day: [18, 19, 20, 21] for day in ["monday", "tuesday", "wednesday", "thursday", "friday"]}
            available_hours.update({"saturday": [10, 11, 14, 15], "sunday": [10, 11, 14, 15]})
        
        optimal_times = cls._analyze_optimal_times(user_data)
        schedule = []
        
        for day, hours in available_hours.items():
            for hour in hours:
                schedule.append({
                    "day": day.capitalize(), "start_time": f"{hour:02d}:00",
                    "is_optimal": hour in optimal_times.get("peak_hours", [10, 14, 19]),
                    "suggested_activity": "Deep learning" if hour in optimal_times.get("peak_hours", []) else "Review"
                })
        
        return {"weekly_schedule": schedule, "optimal_times": optimal_times, "generated_at": datetime.now().isoformat()}
    
    @classmethod
    def _analyze_optimal_times(cls, user_data: Dict) -> Dict[str, Any]:
        logs = user_data.get("recent_logs", [])
        hour_engagement = {}
        
        for log in logs:
            try:
                dt = datetime.fromisoformat(log.get("timestamp", "").replace('Z', '+00:00'))
                hour = dt.hour
                if hour not in hour_engagement:
                    hour_engagement[hour] = []
                hour_engagement[hour].append(log.get("engagement_score", 50))
            except: pass
        
        avg_by_hour = {h: sum(s) / len(s) for h, s in hour_engagement.items()}
        peak_hours = sorted(avg_by_hour, key=avg_by_hour.get, reverse=True)[:3] if avg_by_hour else [10, 14, 19]
        
        return {"peak_hours": peak_hours, "recommended_session_length": 45, "break_interval": 25}


# ==========================================
# NLP PROCESSOR
# ==========================================

class NLPProcessor:
    """Advanced NLP processing"""
    
    @staticmethod
    def sentiment_analysis(text: str) -> Dict[str, Any]:
        positive = {'good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'best', 'awesome', 'helpful'}
        negative = {'bad', 'poor', 'terrible', 'awful', 'hate', 'worst', 'boring', 'difficult', 'confusing'}
        
        words = set(re.findall(r'\b[a-z]+\b', text.lower()))
        pos_count = len(words & positive)
        neg_count = len(words & negative)
        total = pos_count + neg_count
        
        if total == 0:
            return {'sentiment': 'neutral', 'score': 0.5, 'confidence': 0.3}
        
        pos_ratio = pos_count / total
        if pos_ratio > 0.6:
            return {'sentiment': 'positive', 'score': pos_ratio, 'confidence': min(0.9, total/10)}
        elif pos_ratio < 0.4:
            return {'sentiment': 'negative', 'score': pos_ratio, 'confidence': min(0.9, total/10)}
        return {'sentiment': 'neutral', 'score': 0.5, 'confidence': min(0.7, total/10)}
    
    @staticmethod
    def extract_entities(text: str) -> Dict[str, List[str]]:
        return SmartContentAnalyzer._extract_entities(text.lower())


# ==========================================
# DEEP LEARNING ENGINE
# ==========================================

class DeepLearningEngine:
    """Learning pattern analysis using Gemini AI or heuristics"""
    
    @staticmethod
    def analyze_learning_patterns(history: List[Dict]) -> Dict[str, Any]:
        if gemini_client:
            try:
                return DeepLearningEngine._analyze_with_gemini(history)
            except Exception as e:
                print(f"Gemini Analysis Failed: {e}")
        
        if not history:
            return {'pattern_type': 'new_learner', 'confidence': 0.0, 'insights': ['Start exploring!']}
        
        features = DeepLearningEngine._extract_features(history)
        focus = features.get('focus_score', 0)
        diversity = features.get('topic_diversity', 0)
        
        if focus > 0.6:
            pattern = 'deep_learner'
        elif diversity > 5:
            pattern = 'explorer'
        else:
            pattern = 'consistent'
        
        return {
            'pattern_type': pattern, 'confidence': 0.7, 'features': features,
            'insights': [f"Your primary focus is {features.get('primary_topic', 'General')}"]
        }
    
    @staticmethod
    def _analyze_with_gemini(history: List[Dict]) -> Dict[str, Any]:
        recent = history[:50]
        history_text = "\n".join([f"- {item.get('title', 'Untitled')}" for item in recent])
        
        prompt = f"""Analyze learning history. Return JSON:
        {{"pattern_type": "deep_learner/explorer/consistent", "confidence": 0.85, 
        "features": {{"primary_topic": "Topic"}}, "insights": ["insight1"]}}
        
        History: {history_text}"""
        
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        return json.loads(response.text.strip())
    
    @staticmethod
    def _extract_features(history: List[Dict]) -> Dict[str, Any]:
        topics = [classify_content(item.get('title', ''), item.get('url', ''))[0] for item in history]
        topic_dist = Counter(topics)
        
        total = sum(topic_dist.values())
        focus_score = topic_dist.most_common(1)[0][1] / total if topic_dist and total else 0
        
        return {
            'total_visits': len(history), 'topic_distribution': dict(topic_dist),
            'primary_topic': topic_dist.most_common(1)[0][0] if topic_dist else 'General',
            'topic_diversity': len(topic_dist), 'focus_score': round(focus_score, 2)
        }


# ==========================================
# CHAT ASSISTANT
# ==========================================

class ChatAssistant:
    """AI-powered chat assistant"""
    
    @staticmethod
    def process_message(message: str, context: Dict = None) -> Dict[str, Any]:
        if gemini_client:
            try:
                return ChatAssistant._process_with_gemini(message, context)
            except Exception as e:
                print(f"Gemini Chat Failed: {e}")
        
        message_lower = message.lower()
        if any(w in message_lower for w in ['hello', 'hi', 'hey']):
            response = "Hello! I'm SupriAI. How can I help with your learning today?"
        elif 'help' in message_lower:
            response = "I can help with learning roadmaps, explaining concepts, and finding resources!"
        else:
            response = "I'm here to help with your learning journey. What would you like to explore?"
        
        return {'response': response, 'intent': 'general', 'suggestions': ["View Analytics", "Set Goal"],
                'timestamp': datetime.now().isoformat()}
    
    @staticmethod
    def _process_with_gemini(message: str, context: Dict) -> Dict[str, Any]:
        context = context or {}
        prompt = f"""You are SupriAI, a learning assistant. User message: {message}
        
        Return JSON: {{"response": "your helpful response", "intent": "detected_intent", "suggestions": ["suggestion1"]}}"""
        
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        try:
            return json.loads(response.text)
        except:
            return {'response': response.text, 'intent': 'general', 'suggestions': [],
                    'timestamp': datetime.now().isoformat()}


# ==========================================
# RESUME BUILDER
# ==========================================

class ResumeBuilder:
    """Generate resume from learning analytics"""
    
    @staticmethod
    def generate_resume(analytics_data: Dict, user_info: Dict = None) -> Dict[str, Any]:
        user_info = user_info or {}
        topic_dist = analytics_data.get('topic_distribution', {})
        top_topic = analytics_data.get('top_topic', 'Technology')
        
        title_map = {'Programming': 'Software Developer', 'Data Science': 'Data Scientist',
                    'Web Development': 'Web Developer', 'Design & UX': 'UI/UX Designer'}
        
        skills = list(topic_dist.keys())[:5]
        hours = analytics_data.get('total_minutes', 0) // 60
        
        resume = {
            'header': {
                'name': user_info.get('name', 'Learning Professional'),
                'title': title_map.get(top_topic, 'Technology Professional'),
                'email': user_info.get('email', ''), 'github': user_info.get('github', '')
            },
            'summary': f"Dedicated learner with {hours}+ hours in {top_topic}.",
            'skills': {'technical': skills, 'soft_skills': ['Self-learning', 'Problem Solving']},
            'learning_achievements': [
                {'title': 'Dedicated Learner', 'description': f'{hours}+ hours of learning'}
            ] if hours > 10 else [],
            'generated_at': datetime.now().isoformat()
        }
        
        return {'status': 'success', 'resume': resume}


# ==========================================
# RECOMMENDATIONS ENGINE
# ==========================================

def get_next_recommendation(current_entry: Dict) -> Optional[Dict]:
    """Generate real-time recommendation based on current activity"""
    topic = current_entry.get('topic', 'General Interest')
    
    recommendations = {
        "Programming": {"topic": "Advanced Concepts", "message": "Great coding! Try design patterns next."},
        "Data Science": {"topic": "Deep Learning", "message": "Try a hands-on ML project."},
        "Web Development": {"topic": "Modern Frameworks", "message": "Explore React or Vue next."}
    }
    
    if topic in recommendations:
        return {"topic": recommendations[topic]["topic"], "message": recommendations[topic]["message"],
                "related_to": topic}
    return None


def generate_weekly_plan(logs: List[Dict]) -> List[Dict]:
    """Generate personalized learning recommendations"""
    if not logs:
        return [{"type": "Getting Started", "title": "Start Your Journey",
                "description": "Browse educational content for personalized recommendations.",
                "url": "https://coursera.org", "icon": "ri-rocket-line", "priority": "high"}]
    
    topic_counts = Counter(log.get('topic', 'General') for log in logs)
    recommendations = []
    
    topic_resources = {
        "Programming": [{"type": "Practice", "title": "Coding Challenges", "url": "https://leetcode.com", "icon": "ri-code-box-line"}],
        "Data Science": [{"type": "Project", "title": "Kaggle Competition", "url": "https://kaggle.com", "icon": "ri-database-2-line"}],
        "Web Development": [{"type": "Project", "title": "Build Portfolio", "url": "https://frontendmentor.io", "icon": "ri-window-line"}]
    }
    
    for topic, count in topic_counts.most_common(3):
        if topic in topic_resources:
            for rec in topic_resources[topic]:
                rec['priority'] = 'high' if count > 5 else 'medium'
                recommendations.append(rec)
    
    return recommendations[:4]


def check_achievements(logs: List[Dict], user_stats: Dict) -> List[Dict]:
    """Check and return newly unlocked achievements"""
    achievements = []
    total_sessions = len(logs)
    unique_topics = len(set(log.get('topic') for log in logs))
    
    if total_sessions >= 1:
        achievements.append({"badge_name": "First Steps", "badge_icon": "ri-footprint-line", "description": "First learning session!"})
    if total_sessions >= 7:
        achievements.append({"badge_name": "Week Warrior", "badge_icon": "ri-medal-line", "description": "7+ sessions!"})
    if unique_topics >= 3:
        achievements.append({"badge_name": "Topic Explorer", "badge_icon": "ri-compass-3-line", "description": "Explored 3+ topics!"})
    
    streak = user_stats.get('streak_days', 0)
    if streak >= 7:
        achievements.append({"badge_name": "Consistency King", "badge_icon": "ri-fire-line", "description": "7-day streak!"})
    
    return achievements


# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    return SmartContentAnalyzer._extract_keywords(text, max_keywords)


def format_duration(seconds: float) -> str:
    if seconds < 60: return f"{int(seconds)}s"
    elif seconds < 3600: return f"{int(seconds / 60)}m"
    else: return f"{int(seconds / 3600)}h {int((seconds % 3600) / 60)}m"


# ==========================================
# EXPORTS
# ==========================================

__all__ = [
    'classify_content', 'get_topic_icon', 'get_topic_color',
    'calculate_engagement', 'get_engagement_level',
    'aggregate_analytics', 'calculate_weekly_trends', 'calculate_daily_activity', 'get_topic_breakdown',
    'SmartContentAnalyzer', 'LearningPathGenerator', 'InsightsGenerator', 'SkillAssessment',
    'WeeklyReportGenerator', 'ContentSummarizer', 'SmartStudyScheduler',
    'NLPProcessor', 'DeepLearningEngine', 'ChatAssistant', 'ResumeBuilder',
    'get_next_recommendation', 'generate_weekly_plan', 'check_achievements',
    'extract_keywords', 'format_duration'
]
