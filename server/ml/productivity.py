"""
Productivity Score Predictor using Random Forest Regression
ML Algorithm #3: Random Forest Regressor

Predicts daily productivity score (0-100) based on browsing patterns.
Uses historical browsing data as features to train a regression model.
"""
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime
import config


class ProductivityPredictor:
    """
    Predicts productivity score using Random Forest Regression.
    
    Features:
    - Day of week (one-hot encoded)
    - Hour distribution (morning, afternoon, evening, night ratios)
    - Category time ratios 
    - Number of unique domains
    - Total browsing time
    - Previous day's productivity score
    - 7-day rolling average productivity
    """

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'productivity_predictor.pkl')
        self.feature_names = [
            'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat', 'day_sun',
            'morning_ratio', 'afternoon_ratio', 'evening_ratio', 'night_ratio',
            'productive_ratio', 'social_ratio', 'entertainment_ratio',
            'news_ratio', 'shopping_ratio', 'communication_ratio',
            'unique_domains', 'total_time_hours', 'prev_day_score',
            'rolling_7d_score', 'session_count', 'avg_session_length'
        ]
        self.importance_scores = {}
        if self._load_model():
            print("  [ProductivityPredictor] Loaded saved model from disk.")
        else:
            print("  [ProductivityPredictor] No saved model found, will train when data is available.")

    def prepare_features(self, records):
        """
        Prepare features from browsing records.
        
        Args:
            records: list of dicts with daily browsing data
        
        Returns: numpy array of features
        """
        features = []
        for i, record in enumerate(records):
            # Day of week (one-hot)
            day_of_week = [0] * 7
            date_str = record.get('date', datetime.now().strftime('%Y-%m-%d'))
            try:
                day_idx = datetime.strptime(date_str, '%Y-%m-%d').weekday()
                day_of_week[day_idx] = 1
            except ValueError:
                day_of_week[0] = 1

            # Hour distribution ratios
            hourly = record.get('hourly_activity', [0] * 24)
            total_activity = max(sum(hourly), 1)
            morning = sum(hourly[6:12]) / total_activity      # 6am-12pm
            afternoon = sum(hourly[12:18]) / total_activity    # 12pm-6pm
            evening = sum(hourly[18:22]) / total_activity      # 6pm-10pm
            night = (sum(hourly[22:]) + sum(hourly[:6])) / total_activity  # 10pm-6am

            # Category ratios
            cat_times = record.get('category_times', {})
            total_cat = max(sum(cat_times.values()), 1)

            # Previous day score
            prev_score = records[i - 1].get('productivity_score', 50) if i > 0 else 50

            # Rolling 7-day average
            start_idx = max(0, i - 7)
            rolling_scores = [r.get('productivity_score', 50) for r in records[start_idx:i]]
            rolling_avg = np.mean(rolling_scores) if rolling_scores else 50

            feature_vector = (
                day_of_week +
                [morning, afternoon, evening, night] +
                [
                    cat_times.get('productive', 0) / total_cat,
                    cat_times.get('social', 0) / total_cat,
                    cat_times.get('entertainment', 0) / total_cat,
                    cat_times.get('news', 0) / total_cat,
                    cat_times.get('shopping', 0) / total_cat,
                    cat_times.get('communication', 0) / total_cat,
                ] +
                [
                    min(record.get('unique_domains', 0) / 50.0, 1.0),
                    min(record.get('total_time', 0) / 3600000 / 12.0, 1.0),
                    prev_score / 100.0,
                    rolling_avg / 100.0,
                    min(record.get('session_count', 1) / 20.0, 1.0),
                    min(record.get('avg_session_minutes', 30) / 120.0, 1.0)
                ]
            )
            features.append(feature_vector)

        return np.array(features)

    def train(self, records):
        """
        Train the Random Forest model.
        
        Args:
            records: list of daily records with productivity scores
        """
        if len(records) < config.MIN_DATA_POINTS_FOR_TRAINING:
            return {
                'error': f'Need at least {config.MIN_DATA_POINTS_FOR_TRAINING} days of data, got {len(records)}'
            }

        X = self.prepare_features(records)
        y = np.array([r.get('productivity_score', 50) for r in records])

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # Train Random Forest
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=3,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled, y)

        # Feature importance
        self.importance_scores = dict(zip(
            self.feature_names,
            [round(float(imp), 4) for imp in self.model.feature_importances_]
        ))

        # Cross-validation
        cv_folds = min(5, len(records))
        cv_scores = cross_val_score(self.model, X_scaled, y, cv=cv_folds, scoring='r2')

        self._save_model()

        return {
            'r2_score': round(float(np.mean(cv_scores)), 3),
            'r2_std': round(float(np.std(cv_scores)), 3),
            'feature_importance': dict(sorted(
                self.importance_scores.items(),
                key=lambda x: x[1], reverse=True
            )[:10]),
            'training_samples': len(records),
            'oob_prediction_std': round(float(np.std(self.model.predict(X_scaled) - y)), 2)
        }

    def predict(self, record):
        """Predict productivity score for a day"""
        if not self.model:
            return self._heuristic_predict(record)

        X = self.prepare_features([record])
        X_scaled = self.scaler.transform(X)
        
        prediction = float(self.model.predict(X_scaled)[0])
        prediction = max(0, min(100, prediction))  # Clamp to [0, 100]

        # Get prediction from each tree for confidence interval
        tree_predictions = np.array([tree.predict(X_scaled)[0] for tree in self.model.estimators_])
        confidence_lower = float(np.percentile(tree_predictions, 10))
        confidence_upper = float(np.percentile(tree_predictions, 90))

        return {
            'predicted_score': round(prediction, 1),
            'confidence_interval': [round(max(0, confidence_lower), 1),
                                     round(min(100, confidence_upper), 1)],
            'method': 'random_forest',
            'top_factors': self._get_top_factors(record)
        }

    def _heuristic_predict(self, record):
        """Fallback heuristic prediction"""
        cat_times = record.get('category_times', {})
        total = max(sum(cat_times.values()), 1)
        
        score = 0
        for category, weight in config.CATEGORY_PRODUCTIVITY_WEIGHTS.items():
            ratio = cat_times.get(category, 0) / total
            score += ratio * weight * 100
        
        return {
            'predicted_score': round(score, 1),
            'confidence_interval': [max(0, score - 15), min(100, score + 15)],
            'method': 'heuristic',
            'top_factors': []
        }

    def _get_top_factors(self, record):
        """Get top contributing factors for a prediction"""
        if not self.importance_scores:
            return []
        
        sorted_features = sorted(self.importance_scores.items(), key=lambda x: x[1], reverse=True)
        return [{'feature': name, 'importance': imp} for name, imp in sorted_features[:5]]

    def get_model_info(self):
        """Get model information"""
        return {
            'algorithm': 'Random Forest Regression',
            'n_estimators': 100,
            'max_depth': 10,
            'features': self.feature_names,
            'feature_importance': self.importance_scores,
            'trained': self.model is not None
        }

    def _save_model(self):
        """Save model"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'importance_scores': self.importance_scores
            }, self.model_path)

    def _load_model(self):
        """Load model"""
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data['model']
                self.scaler = data['scaler']
                self.importance_scores = data.get('importance_scores', {})
                return True
            except Exception as e:
                print(f"  [ProductivityPredictor] Failed to load saved model: {e}")
                try:
                    os.remove(self.model_path)
                except OSError:
                    pass
        return False
