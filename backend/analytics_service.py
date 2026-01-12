"""
SupriAI - Analytics Service
Advanced analytics and insights generation
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import defaultdict
import statistics


class AnalyticsService:
    """Service for generating advanced analytics"""
    
    @staticmethod
    def calculate_learning_velocity(logs: List[Dict], days: int = 7) -> Dict[str, Any]:
        """Calculate learning velocity (sessions per day, hours per day)"""
        if not logs:
            return {
                'sessions_per_day': 0,
                'hours_per_day': 0,
                'trend': 'stable'
            }
        
        # Group by date
        daily_data = defaultdict(lambda: {'sessions': 0, 'duration': 0})
        
        for log in logs:
            date = log.get('timestamp', '')[:10]  # YYYY-MM-DD
            daily_data[date]['sessions'] += 1
            daily_data[date]['duration'] += log.get('duration', 0)
        
        # Calculate averages
        total_days = len(daily_data) or days
        total_sessions = sum(d['sessions'] for d in daily_data.values())
        total_hours = sum(d['duration'] for d in daily_data.values()) / 3600
        
        sessions_per_day = total_sessions / total_days
        hours_per_day = total_hours / total_days
        
        # Determine trend
        if len(daily_data) >= 3:
            recent_dates = sorted(daily_data.keys())[-3:]
            older_dates = sorted(daily_data.keys())[:-3] if len(daily_data) > 3 else recent_dates
            
            recent_avg = statistics.mean([daily_data[d]['duration'] for d in recent_dates])
            older_avg = statistics.mean([daily_data[d]['duration'] for d in older_dates])
            
            if recent_avg > older_avg * 1.1:
                trend = 'increasing'
            elif recent_avg < older_avg * 0.9:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        return {
            'sessions_per_day': round(sessions_per_day, 2),
            'hours_per_day': round(hours_per_day, 2),
            'trend': trend,
            'total_sessions': total_sessions,
            'total_hours': round(total_hours, 2)
        }
    
    @staticmethod
    def calculate_focus_score(logs: List[Dict]) -> Dict[str, Any]:
        """Calculate focus score based on engagement metrics"""
        if not logs:
            return {'score': 0, 'rating': 'No Data'}
        
        engagement_scores = [log.get('engagement_score', 0) for log in logs]
        avg_engagement = statistics.mean(engagement_scores) if engagement_scores else 0
        
        # Calculate additional metrics
        total_duration = sum(log.get('duration', 0) for log in logs)
        avg_duration = total_duration / len(logs) if logs else 0
        
        # Focus score (0-100)
        focus_score = min(100, int(
            (avg_engagement * 0.6) +  # 60% weight on engagement
            (min(avg_duration / 300, 1) * 40)  # 40% weight on duration (capped at 5 min)
        ))
        
        # Rating
        if focus_score >= 80:
            rating = 'Excellent'
        elif focus_score >= 60:
            rating = 'Good'
        elif focus_score >= 40:
            rating = 'Fair'
        else:
            rating = 'Needs Improvement'
        
        return {
            'score': focus_score,
            'rating': rating,
            'avg_engagement': round(avg_engagement, 2),
            'avg_duration_minutes': round(avg_duration / 60, 2)
        }
    
    @staticmethod
    def identify_learning_patterns(logs: List[Dict]) -> Dict[str, Any]:
        """Identify learning patterns and preferences"""
        if not logs:
            return {}
        
        # Time of day analysis
        hourly_activity = defaultdict(int)
        for log in logs:
            try:
                timestamp = log.get('timestamp', '')
                hour = int(timestamp[11:13]) if len(timestamp) > 13 else 0
                hourly_activity[hour] += 1
            except:
                continue
        
        # Find peak hours
        if hourly_activity:
            peak_hour = max(hourly_activity, key=hourly_activity.get)
            if 6 <= peak_hour < 12:
                preferred_time = 'Morning'
            elif 12 <= peak_hour < 17:
                preferred_time = 'Afternoon'
            elif 17 <= peak_hour < 21:
                preferred_time = 'Evening'
            else:
                preferred_time = 'Night'
        else:
            preferred_time = 'Unknown'
        
        # Session length preference
        durations = [log.get('duration', 0) for log in logs if log.get('duration', 0) > 0]
        if durations:
            avg_session_length = statistics.mean(durations) / 60  # minutes
            if avg_session_length < 10:
                session_preference = 'Short sessions (< 10 min)'
            elif avg_session_length < 30:
                session_preference = 'Medium sessions (10-30 min)'
            else:
                session_preference = 'Long sessions (> 30 min)'
        else:
            session_preference = 'Unknown'
        
        # Topic diversity
        topics = [log.get('topic', 'Unknown') for log in logs]
        unique_topics = len(set(topics))
        diversity_score = min(100, int((unique_topics / len(topics)) * 100)) if topics else 0
        
        return {
            'preferred_time': preferred_time,
            'peak_hour': peak_hour if hourly_activity else 'N/A',
            'session_preference': session_preference,
            'avg_session_minutes': round(statistics.mean(durations) / 60, 2) if durations else 0,
            'topic_diversity_score': diversity_score,
            'unique_topics': unique_topics
        }
    
    @staticmethod
    def generate_insights(logs: List[Dict], days: int = 7) -> List[Dict[str, str]]:
        """Generate actionable insights based on analytics"""
        insights = []
        
        if not logs:
            insights.append({
                'type': 'info',
                'title': 'Start Your Learning Journey',
                'message': 'Begin browsing educational content to see personalized insights!'
            })
            return insights
        
        # Calculate metrics
        velocity = AnalyticsService.calculate_learning_velocity(logs, days)
        focus = AnalyticsService.calculate_focus_score(logs)
        patterns = AnalyticsService.identify_learning_patterns(logs)
        
        # Generate insights based on data
        
        # Velocity insights
        if velocity['trend'] == 'increasing':
            insights.append({
                'type': 'success',
                'title': 'Great Progress!',
                'message': f"Your learning activity is increasing. You're averaging {velocity['hours_per_day']} hours per day."
            })
        elif velocity['trend'] == 'decreasing':
            insights.append({
                'type': 'warning',
                'title': 'Activity Declining',
                'message': "Your learning activity has decreased recently. Try to maintain consistency!"
            })
        
        # Focus insights
        if focus['score'] >= 80:
            insights.append({
                'type': 'success',
                'title': 'Excellent Focus',
                'message': f"Your focus score is {focus['score']}/100. Keep up the great engagement!"
            })
        elif focus['score'] < 40:
            insights.append({
                'type': 'tip',
                'title': 'Improve Focus',
                'message': "Try eliminating distractions and taking regular breaks to improve focus."
            })
        
        # Pattern insights
        if patterns.get('topic_diversity_score', 0) < 30:
            insights.append({
                'type': 'tip',
                'title': 'Explore More Topics',
                'message': "Consider exploring diverse topics to broaden your knowledge base."
            })
        
        if patterns.get('preferred_time'):
            insights.append({
                'type': 'info',
                'title': f"You Learn Best in the {patterns['preferred_time']}",
                'message': f"Most of your learning happens during {patterns['preferred_time'].lower()} hours."
            })
        
        return insights


class RecommendationEngine:
    """Enhanced recommendation engine"""
    
    @staticmethod
    def generate_smart_recommendations(logs: List[Dict], goals: List[Dict] = None) -> List[Dict]:
        """Generate smart recommendations based on learning history and goals"""
        recommendations = []
        
        if not logs:
            return [{
                'title': 'Start Learning',
                'description': 'Browse educational content to get personalized recommendations',
                'type': 'get_started',
                'priority': 'high'
            }]
        
        # Analyze learning history
        topics = [log.get('topic', 'General') for log in logs]
        topic_counts = defaultdict(int)
        for topic in topics:
            topic_counts[topic] += 1
        
        # Find primary interest
        if topic_counts:
            primary_topic = max(topic_counts, key=topic_counts.get)
            
            # Recommend related topics
            related_topics = {
                'Programming': ['Web Development', 'Data Science', 'DevOps'],
                'Web Development': ['Programming', 'Design & UX', 'Cloud & DevOps'],
                'Data Science': ['Programming', 'Mathematics', 'Machine Learning'],
                'Business & Finance': ['Data Science', 'Personal Development'],
                'Design & UX': ['Web Development', 'Marketing']
            }
            
            if primary_topic in related_topics:
                for related in related_topics[primary_topic][:2]:
                    if related not in topics or topics.count(related) < 5:
                        recommendations.append({
                            'title': f'Explore {related}',
                            'description': f'Based on your interest in {primary_topic}, you might enjoy {related}',
                            'type': 'topic_expansion',
                            'priority': 'medium',
                            'topic': related
                        })
        
        # Check for learning gaps (no activity in 3+ days)
        if logs:
            latest_log = max(logs, key=lambda x: x.get('timestamp', ''))
            latest_time = datetime.fromisoformat(latest_log.get('timestamp', '').replace('Z', '+00:00').split('.')[0])
            days_since_last = (datetime.now() - latest_time).days
            
            if days_since_last >= 3:
                recommendations.append({
                    'title': 'Resume Your Learning',
                    'description': f"It's been {days_since_last} days. Continue where you left off!",
                    'type': 'engagement',
                    'priority': 'high'
                })
        
        # Goal-based recommendations
        if goals:
            for goal in goals:
                if not goal.get('is_completed'):
                    progress = (goal.get('current_value', 0) / goal.get('target_value', 1)) * 100
                    if progress < 50:
                        recommendations.append({
                            'title': f"Work on: {goal.get('title', 'Your Goal')}",
                            'description': f"You're {int(progress)}% complete. Keep going!",
                            'type': 'goal_progress',
                            'priority': 'high'
                        })
        
        return recommendations[:10]  # Limit to top 10
