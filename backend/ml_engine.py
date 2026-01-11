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
from google import genai
from google.genai import types

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

gemini_client = None

if GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("✨ Gemini API Client Initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize Gemini Client: {e}")
else:
    print("⚠️ Gemini API Key not found. Using simulated ML engine.")

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
# ADVANCED NLP ENGINE
# ==========================================

class NLPProcessor:
    """Advanced NLP processing for text analysis"""
    
    # TF-IDF inspired weighting
    @staticmethod
    def calculate_tfidf_score(word: str, document: str, corpus_frequency: Dict[str, int]) -> float:
        """Calculate TF-IDF score for a word"""
        # Term Frequency
        doc_words = document.lower().split()
        tf = doc_words.count(word.lower()) / max(len(doc_words), 1)
        
        # Inverse Document Frequency (simulated with keyword importance)
        total_docs = max(sum(corpus_frequency.values()), 1)
        doc_count = corpus_frequency.get(word.lower(), 1)
        idf = math.log(total_docs / doc_count + 1)
        
        return tf * idf
    
    @staticmethod
    def extract_ngrams(text: str, n: int = 2) -> List[str]:
        """Extract n-grams from text for phrase detection"""
        words = re.findall(r'\b[a-z]+\b', text.lower())
        ngrams = []
        for i in range(len(words) - n + 1):
            ngrams.append(' '.join(words[i:i+n]))
        return ngrams
    
    @staticmethod
    def calculate_semantic_similarity(text1: str, text2: str) -> float:
        """Calculate cosine similarity between two texts (bag of words approach)"""
        words1 = set(re.findall(r'\b[a-z]+\b', text1.lower()))
        words2 = set(re.findall(r'\b[a-z]+\b', text2.lower()))
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)
    
    @staticmethod
    def sentiment_analysis(text: str) -> Dict[str, Any]:
        """Simple sentiment analysis based on keyword detection"""
        positive_words = {
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'love', 'best', 'awesome', 'helpful', 'useful', 'interesting',
            'success', 'achieved', 'completed', 'improved', 'learned', 'mastered'
        }
        negative_words = {
            'bad', 'poor', 'terrible', 'awful', 'hate', 'worst', 'boring',
            'difficult', 'hard', 'confusing', 'failed', 'stuck', 'frustrated',
            'lost', 'confused', 'struggling', 'problem', 'error', 'bug'
        }
        
        words = set(re.findall(r'\b[a-z]+\b', text.lower()))
        
        pos_count = len(words & positive_words)
        neg_count = len(words & negative_words)
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
        """Extract named entities from text"""
        entities = {
            'technologies': [],
            'languages': [],
            'frameworks': [],
            'concepts': [],
            'tools': []
        }
        
        tech_patterns = {
            'technologies': ['python', 'javascript', 'java', 'sql', 'html', 'css', 'typescript', 
                           'rust', 'golang', 'c\\+\\+', 'ruby', 'php', 'swift', 'kotlin'],
            'frameworks': ['react', 'angular', 'vue', 'django', 'flask', 'express', 'spring',
                          'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'bootstrap',
                          'tailwind', 'next\\.?js', 'node\\.?js'],
            'concepts': ['machine learning', 'deep learning', 'neural network', 'api', 'database',
                        'algorithm', 'data structure', 'design pattern', 'rest', 'graphql',
                        'microservice', 'cloud computing', 'devops', 'agile', 'scrum'],
            'tools': ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 
                     'jira', 'figma', 'vscode', 'jupyter', 'postman']
        }
        
        text_lower = text.lower()
        
        for category, patterns in tech_patterns.items():
            for pattern in patterns:
                if re.search(r'\b' + pattern + r'\b', text_lower):
                    clean_name = pattern.replace('\\', '').replace('.?', '.').title()
                    if clean_name not in entities[category]:
                        entities[category].append(clean_name)
        
        return entities


# ==========================================
# DEEP LEARNING PATTERN RECOGNITION (Simulated)
# ==========================================

class DeepLearningEngine:
    """Advanced learning pattern analysis using Gemini AI or Simulated Heuristics"""
    
    @staticmethod
    def analyze_learning_patterns(history: List[Dict]) -> Dict[str, Any]:
        """Analyze browsing history to identify learning patterns"""
        
        # Try Gemini User Analysis first
        if gemini_client:
            try:
                print("🧠 Analyzing patterns with Gemini AI...")
                return DeepLearningEngine._analyze_with_gemini(history)
            except Exception as e:
                print(f"Gemini Analysis Failed: {e}. Falling back to simulation.")
        
        # Fallback to simulation
        if not history:
            return {
                'pattern_type': 'new_learner',
                'confidence': 0.0,
                'insights': ['Start exploring to build your learning profile']
            }
        
        # Extract features from history
        features = DeepLearningEngine._extract_features(history)
        
        # Simulated pattern classification
        patterns = DeepLearningEngine._classify_patterns(features)
        
        # Generate insights
        insights = DeepLearningEngine._generate_insights(patterns, features)
        
        return {
            'pattern_type': patterns['dominant_pattern'],
            'confidence': patterns['confidence'],
            'patterns': patterns,
            'features': features,
            'insights': insights
        }

    @staticmethod
    def _analyze_with_gemini(history: List[Dict]) -> Dict[str, Any]:
        """Use Gemini to analyze learning history"""
        # Prepare context (limit to last 50 items to avoid token limits)
        recent_history = history[:50]
        history_text = "\n".join([f"- {item.get('title', 'Untitled')} ({item.get('visitCount', 1)} visits)" for item in recent_history])
        
        prompt = f"""
        Analyze this user's browsing history and act as an expert educational psychologist.
        
        History:
        {history_text}
        
        Task:
        1. Identify their primary learning interests (Topics).
        2. Determine their learning style (Deep Diver, Explorer, Consistent, Binge Learner).
        3. Provide 3 specific, encouraging insights/tips.
        4. Estimate their skill level for top topics.

        Return ONLY JSON in this format:
        {{
            "pattern_type": "one of: deep_learner, explorer, consistent, binge_learner, skill_builder",
            "confidence": 0.85,
            "features": {{
                "primary_topic": "Topic Name",
                "topic_distribution": {{ "Topic1": 10, "Topic2": 5 }}
            }},
            "insights": ["Insight 1", "Insight 2", "Insight 3"]
        }}
        """
        
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash", 
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # Clean response
        text = response.text.strip()
        # Remove markdown code blocks if present (though response_mime_type should handle it)
        if text.startswith('```'):
            text = text.split('\n', 1)[1]
            if text.endswith('```'):
                text = text[:-3]
        
        return json.loads(text)
    
    @staticmethod
    def _extract_features(history: List[Dict]) -> Dict[str, Any]:
        """Extract numerical features from browsing history"""
        domains = Counter(item.get('domain', 'unknown') for item in history)
        titles = [item.get('title', '') for item in history]
        visit_counts = [item.get('visitCount', 1) for item in history]
        
        # Time-based features
        timestamps = [item.get('lastVisitTime', 0) for item in history]
        
        # Topic classification for all items
        topics = []
        for item in history:
            topic, conf = classify_content(item.get('title', ''), item.get('url', ''))
            topics.append(topic)
        
        topic_dist = Counter(topics)
        
        # Calculate features
        features = {
            'total_visits': len(history),
            'unique_domains': len(domains),
            'avg_visits_per_domain': sum(visit_counts) / max(len(domains), 1),
            'top_domains': domains.most_common(5),
            'topic_distribution': dict(topic_dist),
            'primary_topic': topic_dist.most_common(1)[0][0] if topic_dist else 'General Interest',
            'topic_diversity': len(topic_dist),
            'focus_score': DeepLearningEngine._calculate_focus_score(topic_dist),
            'consistency_score': DeepLearningEngine._calculate_consistency_score(timestamps)
        }
        
        return features
    
    @staticmethod
    def _calculate_focus_score(topic_dist: Counter) -> float:
        """Calculate how focused the learning is (0-1)"""
        if not topic_dist:
            return 0.0
        
        total = sum(topic_dist.values())
        if total == 0:
            return 0.0
        
        # Higher score if concentrated in fewer topics
        top_topic_ratio = topic_dist.most_common(1)[0][1] / total if topic_dist else 0
        return round(top_topic_ratio, 2)
    
    @staticmethod
    def _calculate_consistency_score(timestamps: List[float]) -> float:
        """Calculate learning consistency based on visit patterns"""
        if len(timestamps) < 2:
            return 0.5
        
        # Sort timestamps
        sorted_ts = sorted([t for t in timestamps if t > 0])
        if len(sorted_ts) < 2:
            return 0.5
        
        # Calculate time gaps between visits
        gaps = []
        for i in range(1, len(sorted_ts)):
            gap = sorted_ts[i] - sorted_ts[i-1]
            gaps.append(gap)
        
        if not gaps:
            return 0.5
        
        # Lower variance = higher consistency
        avg_gap = sum(gaps) / len(gaps)
        variance = sum((g - avg_gap) ** 2 for g in gaps) / len(gaps)
        
        # Normalize to 0-1 (lower variance = higher score)
        consistency = 1 / (1 + math.log1p(variance / (1000 * 60 * 60)))  # Normalize by hours
        return round(min(consistency, 1.0), 2)
    
    @staticmethod
    def _classify_patterns(features: Dict) -> Dict[str, Any]:
        """Classify learning patterns using simulated neural network"""
        
        patterns = {
            'deep_learner': 0.0,    # Focuses deeply on few topics
            'explorer': 0.0,         # Explores many diverse topics
            'consistent': 0.0,       # Regular learning schedule
            'binge_learner': 0.0,    # Intense but irregular
            'skill_builder': 0.0     # Focused on practical skills
        }
        
        focus = features.get('focus_score', 0)
        diversity = features.get('topic_diversity', 0)
        consistency = features.get('consistency_score', 0)
        total_visits = features.get('total_visits', 0)
        
        # Simulated neural network activation (sigmoid-like scoring)
        patterns['deep_learner'] = focus * 0.7 + (1 - min(diversity/10, 1)) * 0.3
        patterns['explorer'] = (1 - focus) * 0.5 + min(diversity/10, 1) * 0.5
        patterns['consistent'] = consistency * 0.8 + min(total_visits/100, 1) * 0.2
        patterns['binge_learner'] = (1 - consistency) * 0.5 + min(total_visits/50, 1) * 0.5
        patterns['skill_builder'] = focus * 0.4 + consistency * 0.6
        
        # Apply softmax-like normalization
        total = sum(patterns.values())
        if total > 0:
            patterns = {k: round(v/total, 3) for k, v in patterns.items()}
        
        # Find dominant pattern
        dominant = max(patterns, key=patterns.get)
        
        return {
            'scores': patterns,
            'dominant_pattern': dominant,
            'confidence': round(patterns[dominant], 2)
        }
    
    @staticmethod
    def _generate_insights(patterns: Dict, features: Dict) -> List[str]:
        """Generate personalized insights based on patterns"""
        insights = []
        dominant = patterns.get('dominant_pattern', 'explorer')
        primary_topic = features.get('primary_topic', 'General')
        
        insight_templates = {
            'deep_learner': [
                f"You're deeply focused on {primary_topic}. This specialization approach builds expertise!",
                "Consider creating projects to apply your deep knowledge.",
                "Your focused learning style is excellent for mastering complex topics."
            ],
            'explorer': [
                "You have a curious mind exploring many topics!",
                "Consider connecting concepts across different domains for innovative thinking.",
                "Your diverse interests can lead to unique interdisciplinary insights."
            ],
            'consistent': [
                "Your consistent learning habits are building strong foundations!",
                "Regular practice leads to long-term retention. Keep it up!",
                "Your disciplined approach will pay off in skill mastery."
            ],
            'binge_learner': [
                "You have intense learning sessions! Try spacing them for better retention.",
                "Consider setting regular learning schedules to maintain momentum.",
                "Your enthusiasm is great - adding consistency will amplify results."
            ],
            'skill_builder': [
                f"You're effectively building practical {primary_topic} skills!",
                "Consider working on real-world projects to solidify your skills.",
                "Your practical approach is ideal for career advancement."
            ]
        }
        
        insights = insight_templates.get(dominant, ["Keep exploring and learning!"])
        
        # Add topic-specific insight
        if features.get('topic_diversity', 0) > 3:
            insights.append(f"You've explored {features['topic_diversity']} different topics!")
        
        return insights[:3]  # Return top 3 insights


# ==========================================
# AI CHAT ASSISTANT ENGINE
# ==========================================

class ChatAssistant:
    """AI-powered chat assistant using Gemini or Rule-based fallback"""
    
    KNOWLEDGE_BASE = {
        'greeting': [
            "Hello! I'm SupriAI, your intelligent learning assistant. How can I help you grow today?",
            "Hi there! I'm ready to help you master new skills. What's on your mind?",
        ],
        'help': [
            "I can help you with:\n• Personalized learning roadmaps\n• Explaining complex concepts\n• Finding the best resources\n• Debugging code or checking understanding\nJust ask!",
        ]
    }
    
    @staticmethod
    def process_message(message: str, context: Dict = None) -> Dict[str, Any]:
        """Process user message and generate intelligent response"""
        
        if gemini_client:
            try:
                return ChatAssistant._process_with_gemini(message, context)
            except Exception as e:
                print(f"Gemini Chat Failed: {e}. Falling back to knowledge base.")
        
        # Fallback Logic
        message_lower = message.lower().strip()
        context = context or {}
        intent = ChatAssistant._classify_intent(message_lower)
        response = ChatAssistant._generate_response(intent, message_lower, context)
        suggestions = ChatAssistant._get_suggestions(intent, context)
        
        return {
            'response': response,
            'intent': intent,
            'suggestions': suggestions,
            'timestamp': datetime.now().isoformat()
        }

    @staticmethod
    def _process_with_gemini(message: str, context: Dict) -> Dict[str, Any]:
        """Use Gemini to generate chat response"""
        context = context or {}
        history_summary = context.get('historyAnalysis', {})
        
        system_instruction = f"""
        You are SupriAI, an enthusiastic and knowledgeable AI Learning Assistant.
        Your goal is to help the user learn effectively, stay motivated, and achieve their goals.
        
        User Context:
        - Primary Interest: {history_summary.get('primary_topic', 'General')}
        - Learning Style: {history_summary.get('pattern_type', 'Unknown')}
        - Recent Progress: {history_summary.get('total_visits', 0)} sessions logged.
        
        Guidelines:
        - Be encouraging, concise, and practical.
        - Use markdown for formatting (bullet points, bold text).
        - If asked for resources, suggest high-quality tutorials or documentation.
        - If asked about code, explain it clearly.
        
        Response Format:
        Return a JSON object:
        {{
            "response": "Your markdown response here...",
            "intent": "detected_intent",
            "suggestions": ["Follow-up 1", "Follow-up 2", "Follow-up 3"]
        }}
        """
        
        prompt = f"{system_instruction}\n\nUser Message: {message}"
        
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
             config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        text = response.text.strip()
        
        try:
            return json.loads(text)
        except:
             return {
                'response': response.text,
                'intent': 'general',
                'suggestions': ["Continue", "Explain more"],
                'timestamp': datetime.now().isoformat()
            }

    @staticmethod
    def _classify_intent(message: str) -> str:
        # Existing fallback implementation...
        if any(word in message for word in ['hello', 'hi', 'hey']): return 'greeting'
        if any(word in message for word in ['help', 'what can you do']): return 'help'
        return 'general'

    @staticmethod
    def _generate_response(intent: str, message: str, context: Dict) -> str:
        # Simple fallback response
        if intent == 'greeting': return "Hello! I'm SupriAI (Offline Mode). How can I help?"
        return "I'm currently in offline mode using basic responses. Connect Gemini API for full intelligence!"

    @staticmethod
    def _get_suggestions(intent: str, context: Dict) -> List[str]:
        return ["Check Progress", "View Recommendations", "Set Goal"]


# ==========================================
# RESUME BUILDER ENGINE
# ==========================================

class ResumeBuilder:
    """Generate professional resume from learning analytics"""
    
    @staticmethod
    def generate_resume(analytics_data: Dict, user_info: Dict = None) -> Dict[str, Any]:
        """Generate a resume based on learning history and analytics"""
        
        user_info = user_info or {}
        
        # Extract skills from learning data
        skills = ResumeBuilder._extract_skills(analytics_data)
        
        # Generate skill proficiency levels
        proficiencies = ResumeBuilder._calculate_proficiency(analytics_data)
        
        # Generate learning achievements
        achievements = ResumeBuilder._generate_achievements(analytics_data)
        
        # Generate summary
        summary = ResumeBuilder._generate_summary(analytics_data, skills)
        
        # Build resume structure
        resume = {
            'header': {
                'name': user_info.get('name', 'Learning Professional'),
                'title': ResumeBuilder._suggest_title(analytics_data),
                'email': user_info.get('email', ''),
                'location': user_info.get('location', ''),
                'portfolio': user_info.get('portfolio', ''),
                'linkedin': user_info.get('linkedin', ''),
                'github': user_info.get('github', '')
            },
            'summary': summary,
            'skills': {
                'technical': skills.get('technical', []),
                'tools': skills.get('tools', []),
                'soft_skills': skills.get('soft_skills', [])
            },
            'proficiency_chart': proficiencies,
            'learning_achievements': achievements,
            'certifications': ResumeBuilder._suggest_certifications(skills),
            'projects': ResumeBuilder._suggest_projects(analytics_data),
            'generated_at': datetime.now().isoformat(),
            'learning_stats': {
                'total_hours': analytics_data.get('total_minutes', 0) // 60,
                'topics_explored': analytics_data.get('topics_count', 0),
                'sessions_completed': analytics_data.get('total_sessions', 0)
            }
        }
        
        return {
            'status': 'success',
            'resume': resume,
            'format_options': ['pdf', 'docx', 'html', 'json']
        }
    
    @staticmethod
    def _extract_skills(analytics: Dict) -> Dict[str, List[str]]:
        """Extract skills from learning analytics"""
        
        topic_dist = analytics.get('topic_distribution', {})
        
        skill_mapping = {
            'Programming': {
                'technical': ['Python', 'JavaScript', 'Problem Solving', 'Algorithm Design'],
                'tools': ['Git', 'VS Code', 'Command Line']
            },
            'Data Science': {
                'technical': ['Data Analysis', 'Machine Learning', 'Statistics', 'Python'],
                'tools': ['Jupyter', 'Pandas', 'NumPy', 'Matplotlib']
            },
            'Web Development': {
                'technical': ['HTML/CSS', 'JavaScript', 'Responsive Design', 'REST APIs'],
                'tools': ['React/Vue', 'Node.js', 'Chrome DevTools']
            },
            'Business': {
                'technical': ['Business Analysis', 'Market Research', 'Financial Analysis'],
                'tools': ['Excel', 'PowerPoint', 'Data Visualization']
            },
            'Design': {
                'technical': ['UI Design', 'UX Research', 'Visual Design', 'Prototyping'],
                'tools': ['Figma', 'Adobe Creative Suite']
            }
        }
        
        technical_skills = set()
        tools = set()
        
        for topic in topic_dist.keys():
            mapping = skill_mapping.get(topic, {})
            technical_skills.update(mapping.get('technical', []))
            tools.update(mapping.get('tools', []))
        
        # Add soft skills based on learning patterns
        soft_skills = ['Self-directed Learning', 'Continuous Improvement', 'Research Skills']
        if analytics.get('topics_count', 0) > 3:
            soft_skills.append('Adaptability')
        if analytics.get('total_sessions', 0) > 20:
            soft_skills.append('Dedication')
        
        return {
            'technical': list(technical_skills),
            'tools': list(tools),
            'soft_skills': soft_skills
        }
    
    @staticmethod
    def _calculate_proficiency(analytics: Dict) -> List[Dict]:
        """Calculate proficiency levels for each topic"""
        
        topic_dist = analytics.get('topic_distribution', {})
        total_sessions = max(analytics.get('total_sessions', 1), 1)
        
        proficiencies = []
        for topic, count in topic_dist.items():
            # Calculate proficiency based on session percentage and engagement
            percentage = (count / total_sessions) * 100
            
            if percentage > 30:
                level = 'Advanced'
                score = 85
            elif percentage > 15:
                level = 'Intermediate'
                score = 65
            else:
                level = 'Beginner'
                score = 40
            
            proficiencies.append({
                'skill': topic,
                'level': level,
                'score': score,
                'sessions': count
            })
        
        # Sort by score descending
        proficiencies.sort(key=lambda x: x['score'], reverse=True)
        return proficiencies[:6]  # Top 6 skills
    
    @staticmethod
    def _generate_achievements(analytics: Dict) -> List[Dict]:
        """Generate achievements based on learning data"""
        
        achievements = []
        
        total_mins = analytics.get('total_minutes', 0)
        total_sessions = analytics.get('total_sessions', 0)
        topics = analytics.get('topics_count', 0)
        
        if total_mins > 60:
            achievements.append({
                'title': 'Dedicated Learner',
                'description': f'Completed {total_mins // 60}+ hours of focused learning',
                'icon': 'ri-time-line'
            })
        
        if total_sessions > 10:
            achievements.append({
                'title': 'Consistent Practice',
                'description': f'Logged {total_sessions} learning sessions',
                'icon': 'ri-check-double-line'
            })
        
        if topics > 3:
            achievements.append({
                'title': 'Versatile Learner',
                'description': f'Explored {topics} different knowledge areas',
                'icon': 'ri-star-line'
            })
        
        return achievements
    
    @staticmethod
    def _generate_summary(analytics: Dict, skills: Dict) -> str:
        """Generate professional summary"""
        
        top_topic = analytics.get('top_topic', 'technology')
        hours = analytics.get('total_minutes', 0) // 60
        
        tech_skills = ', '.join(skills.get('technical', ['various technologies'])[:3])
        
        return f"""Self-motivated learner with demonstrated commitment to continuous professional development. 
Invested {hours}+ hours in structured learning with primary focus on {top_topic}. 
Developed competencies in {tech_skills} through hands-on practice and dedicated study. 
Passionate about applying technical knowledge to solve real-world problems."""
    
    @staticmethod
    def _suggest_title(analytics: Dict) -> str:
        """Suggest a professional title based on learning focus"""
        
        top_topic = analytics.get('top_topic', 'General')
        
        title_map = {
            'Programming': 'Software Developer',
            'Data Science': 'Data Science Enthusiast',
            'Web Development': 'Web Developer',
            'Business': 'Business Analyst',
            'Design': 'UI/UX Designer',
            'Mathematics': 'Quantitative Analyst',
            'Science': 'Research Enthusiast'
        }
        
        return title_map.get(top_topic, 'Technology Professional')
    
    @staticmethod
    def _suggest_certifications(skills: Dict) -> List[Dict]:
        """Suggest relevant certifications"""
        
        tech_skills = skills.get('technical', [])
        
        cert_suggestions = []
        
        if any('Python' in s for s in tech_skills):
            cert_suggestions.append({
                'name': 'Python Professional Certificate',
                'provider': 'Google/Coursera',
                'relevance': 'High'
            })
        
        if any('Data' in s or 'Machine Learning' in s for s in tech_skills):
            cert_suggestions.append({
                'name': 'Data Science Professional Certificate',
                'provider': 'IBM/Coursera',
                'relevance': 'High'
            })
        
        if any('Web' in s or 'JavaScript' in s for s in tech_skills):
            cert_suggestions.append({
                'name': 'Meta Front-End Developer Certificate',
                'provider': 'Meta/Coursera',
                'relevance': 'High'
            })
        
        return cert_suggestions[:3]
    
    @staticmethod
    def _suggest_projects(analytics: Dict) -> List[Dict]:
        """Suggest portfolio projects based on learning"""
        
        top_topic = analytics.get('top_topic', 'General')
        
        project_suggestions = {
            'Programming': [
                {'name': 'CLI Task Manager', 'description': 'Build a command-line productivity tool'},
                {'name': 'API Integration Project', 'description': 'Create an app that integrates multiple APIs'}
            ],
            'Data Science': [
                {'name': 'Data Analysis Dashboard', 'description': 'Analyze and visualize a real dataset'},
                {'name': 'ML Prediction Model', 'description': 'Build and deploy a machine learning model'}
            ],
            'Web Development': [
                {'name': 'Personal Portfolio', 'description': 'Responsive portfolio website'},
                {'name': 'Full-Stack Web App', 'description': 'Build a complete web application with database'}
            ]
        }
        
        return project_suggestions.get(top_topic, [
            {'name': 'Personal Project', 'description': 'Apply your learning to a real-world problem'}
        ])


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
    """Generate personalized learning recommendations using Gemini or heuristics"""
    if not logs:
        return [{
            "type": "Getting Started",
            "title": "Start Your Learning Journey",
            "description": "Browse educational content to get personalized recommendations.",
            "url": "https://www.coursera.org",
            "icon": "ri-rocket-line",
            "priority": "high"
        }]

    if gemini_client:
        try:
            print("🎨 Generating weekly plan with Gemini...")
            plan = _generate_plan_with_gemini(logs)
            if plan: return plan
        except Exception as e:
            print(f"Gemini Plan Generation Failed: {e}. Using fallback.")

    # Fallback/Offline Logic
    topic_counts = Counter(log.get('topic', 'General') for log in logs)
    dominant_topics = topic_counts.most_common(3)
    
    recommendations = []
    for topic, count in dominant_topics:
        recs = get_recommendations_for_topic(topic, count)
        recommendations.extend(recs)
        
    if len(dominant_topics) == 1:
        recommendations.append({
            "type": "Explore",
            "title": "Broaden Your Horizons",
            "description": "Try exploring a new topic to enhance cross-domain learning.",
            "url": "https://www.edx.org/learn",
            "icon": "ri-compass-line",
            "priority": "medium"
        })
        
    return recommendations[:4]

def _generate_plan_with_gemini(logs: List[Dict]) -> List[Dict]:
    """Use Gemini to generate a weekly learning plan"""
    # Summarize user activity
    recent = logs[:20]
    activity_summary = "\n".join([f"- {item.get('title', 'Unknown')} ({item.get('topic', 'General')})" for item in recent])
    
    prompt = f"""
    Based on this user's recent learning history, suggest 4 specific, high-quality learning resources or tasks for this week.
    
    History:
    {activity_summary}
    
    Return a valid JSON array of objects with these keys:
    - type: (Course, Project, Article, Challenge)
    - title: Resource title
    - description: Brief reason why
    - url: A valid or placeholder URL
    - icon: RemixIcon name (e.g., ri-book-line)
    - priority: high/medium
    
    Respond ONLY with JSON.
    """
    
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    text = response.text.replace('```json', '').replace('```', '').strip()
    return json.loads(text)


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
