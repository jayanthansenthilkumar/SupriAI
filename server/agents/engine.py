"""
SupriAI ML Engine - Orchestrates all ML models
Provides unified interface for the Flask API

10 ML/DL Algorithms:
  Traditional ML: Naive Bayes, K-Means, Random Forest, Isolation Forest,
                  Ridge Regression + Exp. Smoothing, Decision Tree
  Deep Learning:  MLP Recommendation, NLP/LSA Content Analysis,
                  Neural Collaborative Filtering, Temporal Sequence Prediction
"""
import numpy as np
from datetime import datetime, timedelta
from ml.classifier import WebsiteCategoryClassifier
from ml.clustering import BrowsingClusterer
from ml.productivity import ProductivityPredictor
from ml.anomaly import AnomalyDetector
from ml.forecasting import TimeSeriesForecaster
from ml.focus import FocusRecommender
from ml.recommendation import DeepRecommender
from ml.nlp_analyzer import NLPContentAnalyzer
from ml.collaborative import NeuralCollaborativeFilter
from ml.temporal import TemporalPredictor
import config


class MLEngine:
    """
    Central ML engine that manages all 10 ML/DL models:

    Traditional ML (scikit-learn):
    1. Multinomial Naive Bayes  - Website Category Classification
    2. K-Means Clustering       - Browsing Habit Clustering
    3. Random Forest Regressor  - Productivity Score Prediction
    4. Isolation Forest          - Anomaly Detection
    5. Ridge Regression + ES     - Time Series Forecasting
    6. Decision Tree Classifier  - Focus Time Recommendation

    Deep Learning (Neural Networks):
    7.  MLP Neural Network       - Learning Content Recommendation
    8.  TF-IDF + LSA (SVD)       - NLP Content Analysis
    9.  Neural Collaborative Filter - Domain Engagement Prediction
    10. Temporal MLP (RNN-like)  - Browsing Time Prediction
    """

    def __init__(self):
        print("Initializing SupriAI ML Engine (10 models)...")

        # Traditional ML models (1-6)
        self.classifier = WebsiteCategoryClassifier()
        self.clusterer = BrowsingClusterer()
        self.productivity_predictor = ProductivityPredictor()
        self.anomaly_detector = AnomalyDetector()
        self.forecaster = TimeSeriesForecaster()
        self.focus_recommender = FocusRecommender()

        # Deep Learning models (7-10)
        self.deep_recommender = DeepRecommender()
        self.nlp_analyzer = NLPContentAnalyzer()
        self.collaborative_filter = NeuralCollaborativeFilter()
        self.temporal_predictor = TemporalPredictor()

        # Pre-train focus recommender with synthetic data
        self.focus_recommender.train()
        print("ML Engine initialized with 10 models (6 ML + 4 DL).")

    def classify_domain(self, domain):
        """Classify a website domain"""
        return self.classifier.classify(domain)

    def classify_domains(self, domains):
        """Classify multiple domains"""
        return self.classifier.classify_batch(domains)

    def get_browsing_cluster(self, day_data):
        """Predict browsing behavior cluster"""
        return self.clusterer.predict(day_data)

    def train_clusters(self, daily_data):
        """Train browsing clusters"""
        return self.clusterer.train(daily_data)

    def predict_productivity(self, record):
        """Predict productivity score"""
        return self.productivity_predictor.predict(record)

    def train_productivity(self, records):
        """Train productivity predictor"""
        return self.productivity_predictor.train(records)

    def detect_anomaly(self, day_data):
        """Detect browsing anomalies"""
        return self.anomaly_detector.detect(day_data)

    def train_anomaly_detector(self, daily_data):
        """Train anomaly detector"""
        return self.anomaly_detector.train(daily_data)

    def forecast(self, days_ahead=7):
        """Forecast future patterns"""
        return self.forecaster.forecast(days_ahead)

    def train_forecaster(self, records):
        """Train time series forecaster"""
        self.forecaster.load_history(records)
        return self.forecaster.train()

    def get_focus_recommendation(self, current_state):
        """Get focus/break recommendation"""
        return self.focus_recommender.recommend(current_state)

    def get_optimal_schedule(self, historical_data=None):
        """Get optimal daily schedule"""
        return self.focus_recommender.get_optimal_schedule(historical_data or [])

    def get_tree_structure(self, max_depth=4):
        """Get decision tree structure as JSON for visualization"""
        return self.focus_recommender.export_tree_json(max_depth)

    # ==================== Deep Learning Models (7-10) ====================

    def get_learning_recommendations(self, browsing_data, top_k=5):
        """#7 — MLP Neural Network content recommendations"""
        return self.deep_recommender.recommend(browsing_data, top_k)

    def get_content_analysis(self, browsing_entries):
        """#8 — NLP/LSA content topic analysis"""
        return self.nlp_analyzer.analyze_content(browsing_entries)

    def get_domain_recommendations(self, context, candidate_domains=None, top_k=10):
        """#9 — Neural Collaborative Filtering domain recommendations"""
        return self.collaborative_filter.recommend_domains(context, candidate_domains, top_k)

    def predict_temporal(self, recent_days):
        """#10 — Temporal MLP next-day prediction"""
        return self.temporal_predictor.predict_next_day(recent_days)

    def predict_week_temporal(self, recent_days):
        """#10 — Temporal MLP week-ahead prediction"""
        return self.temporal_predictor.predict_week(recent_days)

    def get_optimal_hours(self):
        """#10 — Best hours for deep work/learning"""
        return self.temporal_predictor.predict_optimal_hours()

    def train_all(self, db):
        """Train all models with data from database"""
        results = {}
        data = db.get_all_data_for_ml()

        # 1. Classify domains
        domain_stats = data.get('domain_stats', [])
        domains = list(set(d['domain'] for d in domain_stats))
        if domains:
            classifications = self.classify_domains(domains)
            results['classifier'] = {
                'classified_domains': len(domains),
                'model_info': self.classifier.get_model_info()
            }
            # Update domain categories in database (category only, preserve existing stats)
            category_map = {domain: cls['category'] for domain, cls in zip(domains, classifications)}
            for date_record in domain_stats:
                domain = date_record['domain']
                if domain in category_map:
                    try:
                        with db.get_connection() as conn:
                            conn.execute(
                                "UPDATE domain_stats SET category = ? WHERE domain = ? AND date = ?",
                                (category_map[domain], domain, date_record['date'])
                            )
                    except Exception:
                        pass  # Skip if update fails

        # 2. Prepare daily records for other models
        daily_records = self._aggregate_daily_data(data)

        if len(daily_records) >= 5:
            # Train clustering
            cluster_result = self.train_clusters(daily_records)
            results['clustering'] = cluster_result

            # Train anomaly detector
            anomaly_result = self.train_anomaly_detector(daily_records)
            results['anomaly_detection'] = anomaly_result

        if len(daily_records) >= config.MIN_DATA_POINTS_FOR_TRAINING:
            # Train productivity predictor
            prod_result = self.train_productivity(daily_records)
            results['productivity'] = prod_result

        if len(daily_records) >= 7:
            # Train forecaster
            forecast_result = self.train_forecaster(daily_records)
            results['forecasting'] = forecast_result

        # Train focus recommender (always has synthetic data fallback)
        focus_result = self.focus_recommender.train()
        results['focus'] = focus_result

        # ---- Deep Learning models ----

        # 7. Deep Recommender
        rec_result = self.deep_recommender.train(daily_records if len(daily_records) >= 5 else None)
        results['deep_recommender'] = rec_result

        # 8. NLP Content Analyzer — build corpus from chrome history
        history_entries = data.get('chrome_history', [])
        if not history_entries:
            # Fallback: build entries from domain_stats
            history_entries = [
                {'domain': d['domain'], 'title': d.get('title', d['domain']),
                 'url': f"https://{d['domain']}", 'category': d.get('category', '')}
                for d in domain_stats
            ]
        nlp_result = self.nlp_analyzer.train(history_entries)
        results['nlp_analyzer'] = nlp_result

        # 9. Neural Collaborative Filter
        cf_interactions = []
        for record in daily_records:
            for domain, time_ms in record.get('domain_times', {}).items():
                cf_interactions.append({
                    'domain': domain,
                    'context': {
                        'hour_of_day': 12,
                        'day_of_week': 3,
                        'session_duration': record.get('avg_session_minutes', 30),
                        'productivity_score': record.get('productivity_score', 50),
                        'tab_count': record.get('unique_domains', 10),
                        'unique_domains': record.get('unique_domains', 10),
                        'productive_ratio': record.get('focus_score', 0.5),
                        'focus_score': record.get('focus_score', 0.5)
                    },
                    'engagement': min(time_ms / 3600000, 1.0)  # normalize by 1 hour
                })
        cf_result = self.collaborative_filter.train(cf_interactions if len(cf_interactions) >= 10 else None)
        results['collaborative_filter'] = cf_result

        # 10. Temporal Predictor
        temporal_result = self.temporal_predictor.train(daily_records if len(daily_records) >= 10 else None)
        results['temporal_predictor'] = temporal_result

        return results

    def get_comprehensive_insights(self, day_data, db=None):
        """Get all ML insights for a day"""
        insights = {
            'timestamp': datetime.now().isoformat(),
            'models_used': []
        }

        # 1. Category classification for domains
        try:
            if 'domains' in day_data:
                insights['domain_categories'] = self.classify_domains(day_data['domains'])
                insights['models_used'].append('Naive Bayes Classifier')
        except Exception as e:
            insights['domain_categories'] = {'error': str(e)}

        # 2. Browsing cluster
        try:
            cluster = self.get_browsing_cluster(day_data)
            insights['browsing_cluster'] = cluster
            insights['models_used'].append('K-Means Clustering')
        except Exception as e:
            insights['browsing_cluster'] = {'error': str(e)}

        # 3. Productivity prediction
        productivity = {'predicted_score': 50}
        try:
            productivity = self.predict_productivity(day_data)
            insights['productivity_prediction'] = productivity
            insights['models_used'].append('Random Forest Regression')
        except Exception as e:
            insights['productivity_prediction'] = {'error': str(e)}

        # 4. Anomaly detection
        try:
            anomaly = self.detect_anomaly(day_data)
            insights['anomaly_detection'] = anomaly
            insights['models_used'].append('Isolation Forest')
        except Exception as e:
            insights['anomaly_detection'] = {'error': str(e)}

        # 5. Focus recommendation
        try:
            current_state = {
                'hour_of_day': datetime.now().hour,
                'day_of_week': datetime.now().weekday(),
                'productive_ratio': day_data.get('category_times', {}).get('productive', 0) /
                                   max(sum(day_data.get('category_times', {}).values()), 1),
                'social_ratio': day_data.get('category_times', {}).get('social', 0) /
                               max(sum(day_data.get('category_times', {}).values()), 1),
                'entertainment_ratio': day_data.get('category_times', {}).get('entertainment', 0) /
                                      max(sum(day_data.get('category_times', {}).values()), 1),
                'minutes_since_break': day_data.get('minutes_since_break', 30),
                'session_length': day_data.get('session_length', 30),
                'tab_switches': day_data.get('tab_switches', 5),
                'unique_domains_hour': day_data.get('unique_domains', 5),
                'productivity_score': productivity.get('predicted_score', 50)
            }
            focus = self.get_focus_recommendation(current_state)
            insights['focus_recommendation'] = focus
            insights['models_used'].append('Decision Tree Classifier')
        except Exception as e:
            insights['focus_recommendation'] = {'error': str(e)}

        # 6. Time series forecast
        try:
            forecast = self.forecast(7)
            if 'error' not in forecast:
                insights['forecast'] = forecast
                insights['models_used'].append('Time Series Forecasting')
        except Exception as e:
            insights['forecast'] = {'error': str(e)}

        # ---- Deep Learning Insights ----

        # 7. Deep Learning recommendations
        try:
            recommendations = self.deep_recommender.recommend(day_data, top_k=5)
            insights['learning_recommendations'] = recommendations
            insights['models_used'].append('MLP Neural Network Recommender')
        except Exception as e:
            insights['learning_recommendations'] = {'error': str(e)}

        # 8. NLP Content Analysis
        try:
            # Build entries from available domain/title data
            entries = []
            for domain in day_data.get('domains', []):
                entries.append({'domain': domain, 'title': domain, 'url': f'https://{domain}'})
            if entries:
                content_analysis = self.nlp_analyzer.analyze_content(entries)
                insights['content_analysis'] = content_analysis
                insights['models_used'].append('NLP/LSA Content Analyzer')
        except Exception as e:
            insights['content_analysis'] = {'error': str(e)}

        # 9. Collaborative Filtering domain recommendations
        try:
            cf_context = {
                'hour_of_day': datetime.now().hour,
                'day_of_week': datetime.now().weekday(),
                'session_duration': day_data.get('session_length', 30),
                'productivity_score': productivity.get('predicted_score', 50),
                'tab_count': day_data.get('unique_domains', 10),
                'unique_domains': day_data.get('unique_domains', 10),
                'productive_ratio': current_state['productive_ratio'],
                'focus_score': current_state.get('productivity_score', 50) / 100
            }
            cf_recs = self.collaborative_filter.recommend_domains(cf_context, top_k=5)
            insights['domain_recommendations'] = cf_recs
            insights['models_used'].append('Neural Collaborative Filtering')
        except Exception as e:
            insights['domain_recommendations'] = {'error': str(e)}

        # 10. Temporal predictions
        try:
            # Provide recent window as single-day records
            recent = [day_data] * self.temporal_predictor.WINDOW_SIZE
            temporal = self.temporal_predictor.predict_next_day(recent)
            insights['temporal_prediction'] = temporal
            insights['models_used'].append('Temporal MLP Predictor')

            optimal = self.temporal_predictor.predict_optimal_hours()
            insights['optimal_hours'] = optimal
        except Exception as e:
            insights['temporal_prediction'] = {'error': str(e)}

        return insights

    def _aggregate_daily_data(self, data):
        """Aggregate raw data into daily records for ML"""
        domain_stats = data.get('domain_stats', [])
        productivity_scores = data.get('productivity_scores', [])

        # Group by date
        daily = {}
        for stat in domain_stats:
            date = stat.get('date')
            if not date:
                continue
            if date not in daily:
                daily[date] = {
                    'date': date,
                    'category_times': {},
                    'domain_times': {},
                    'total_time': 0,
                    'unique_domains': 0,
                    'session_count': 1,
                    'peak_hour': 12,
                    'hourly_activity': [0] * 24,
                    'avg_session_minutes': 30,
                    'focus_score': 0.5
                }
            
            category = stat.get('category', 'unknown')
            active_time = stat.get('total_active_time', 0)
            
            daily[date]['category_times'][category] = \
                daily[date]['category_times'].get(category, 0) + active_time
            daily[date]['domain_times'][stat['domain']] = active_time
            daily[date]['total_time'] += active_time
            daily[date]['unique_domains'] = len(daily[date]['domain_times'])

        # Add productivity scores
        prod_by_date = {p['date']: p['score'] for p in productivity_scores}
        for date, record in daily.items():
            record['productivity_score'] = prod_by_date.get(date, 50)
            
            # Calculate focus score
            cat = record['category_times']
            total = max(sum(cat.values()), 1)
            record['focus_score'] = cat.get('productive', 0) / total

        # Sort by date
        records = sorted(daily.values(), key=lambda x: x['date'])
        return records

    def get_all_models_info(self):
        """Get information about all 10 models"""
        return {
            'models': {
                'website_classifier': self.classifier.get_model_info(),
                'browsing_clusterer': self.clusterer.get_model_info(),
                'productivity_predictor': self.productivity_predictor.get_model_info(),
                'anomaly_detector': self.anomaly_detector.get_model_info(),
                'time_series_forecaster': self.forecaster.get_model_info(),
                'focus_recommender': self.focus_recommender.get_model_info(),
                'deep_recommender': self.deep_recommender.get_model_info(),
                'nlp_analyzer': self.nlp_analyzer.get_model_info(),
                'collaborative_filter': self.collaborative_filter.get_model_info(),
                'temporal_predictor': self.temporal_predictor.get_model_info()
            },
            'total_models': 10,
            'algorithms': [
                'Multinomial Naive Bayes (TF-IDF)',
                'K-Means Clustering',
                'Random Forest Regression',
                'Isolation Forest',
                'Linear Regression + Exponential Smoothing',
                'Decision Tree Classifier',
                'MLP Neural Network (Deep Recommender)',
                'TF-IDF + Truncated SVD / LSA (NLP Analyzer)',
                'Neural Collaborative Filtering (NCF)',
                'Temporal Sequence MLP (LSTM-like Predictor)'
            ],
            'categories': {
                'traditional_ml': 6,
                'deep_learning': 4,
                'total': 10
            }
        }
