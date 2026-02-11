"""
SupriAI ML Engine - Orchestrates all ML models
Provides unified interface for the Flask API
"""
import numpy as np
from datetime import datetime, timedelta
from ml.classifier import WebsiteCategoryClassifier
from ml.clustering import BrowsingClusterer
from ml.productivity import ProductivityPredictor
from ml.anomaly import AnomalyDetector
from ml.forecasting import TimeSeriesForecaster
from ml.focus import FocusRecommender
import config


class MLEngine:
    """
    Central ML engine that manages all 6 ML models:
    1. Naive Bayes - Website Category Classification
    2. K-Means - Browsing Habit Clustering
    3. Random Forest - Productivity Score Prediction
    4. Isolation Forest - Anomaly Detection
    5. Linear Regression + Exp. Smoothing - Time Series Forecasting
    6. Decision Tree - Focus Time Recommendation
    """

    def __init__(self):
        print("Initializing SupriAI ML Engine...")
        self.classifier = WebsiteCategoryClassifier()
        self.clusterer = BrowsingClusterer()
        self.productivity_predictor = ProductivityPredictor()
        self.anomaly_detector = AnomalyDetector()
        self.forecaster = TimeSeriesForecaster()
        self.focus_recommender = FocusRecommender()
        
        # Pre-train focus recommender with synthetic data
        self.focus_recommender.train()
        print("ML Engine initialized with 6 models.")

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
            # Update domain categories in database
            for domain, classification in zip(domains, classifications):
                for date_record in domain_stats:
                    if date_record['domain'] == domain:
                        db.save_domain_stats(domain, date_record['date'], {
                            'visitCount': 0, 'activeTime': 0, 'tabCount': 0,
                            'category': classification['category']
                        })

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

        return results

    def get_comprehensive_insights(self, day_data, db=None):
        """Get all ML insights for a day"""
        insights = {
            'timestamp': datetime.now().isoformat(),
            'models_used': []
        }

        # 1. Category classification for domains
        if 'domains' in day_data:
            insights['domain_categories'] = self.classify_domains(day_data['domains'])
            insights['models_used'].append('Naive Bayes Classifier')

        # 2. Browsing cluster
        cluster = self.get_browsing_cluster(day_data)
        insights['browsing_cluster'] = cluster
        insights['models_used'].append('K-Means Clustering')

        # 3. Productivity prediction
        productivity = self.predict_productivity(day_data)
        insights['productivity_prediction'] = productivity
        insights['models_used'].append('Random Forest Regression')

        # 4. Anomaly detection
        anomaly = self.detect_anomaly(day_data)
        insights['anomaly_detection'] = anomaly
        insights['models_used'].append('Isolation Forest')

        # 5. Focus recommendation
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

        # 6. Time series forecast
        forecast = self.forecast(7)
        if 'error' not in forecast:
            insights['forecast'] = forecast
            insights['models_used'].append('Time Series Forecasting')

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
        """Get information about all models"""
        return {
            'models': {
                'website_classifier': self.classifier.get_model_info(),
                'browsing_clusterer': self.clusterer.get_model_info(),
                'productivity_predictor': self.productivity_predictor.get_model_info(),
                'anomaly_detector': self.anomaly_detector.get_model_info(),
                'time_series_forecaster': self.forecaster.get_model_info(),
                'focus_recommender': self.focus_recommender.get_model_info()
            },
            'total_models': 6,
            'algorithms': [
                'Multinomial Naive Bayes (TF-IDF)',
                'K-Means Clustering',
                'Random Forest Regression',
                'Isolation Forest',
                'Linear Regression + Exponential Smoothing',
                'Decision Tree Classifier'
            ]
        }
