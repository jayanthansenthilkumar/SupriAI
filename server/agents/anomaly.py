"""
Browsing Anomaly Detection using Isolation Forest
ML Algorithm #4: Isolation Forest

Detects unusual browsing patterns that deviate from normal behavior:
- Unusually long sessions on distracting sites
- Browsing at unusual hours
- Sudden spike in specific category usage
- Deviation from typical domain diversity
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
import config


class AnomalyDetector:
    """
    Isolation Forest for detecting anomalous browsing sessions.
    
    Features:
    - Total browsing time (deviation from mean)
    - Category time distribution skew
    - Active hour (unusual hours)
    - Domain diversity (too few or too many)
    - Longest single-domain session
    - Social media ratio spike
    """

    def __init__(self, contamination=0.1):
        self.contamination = contamination
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'anomaly_detector.pkl')
        self.feature_means = None
        self.feature_stds = None
        self.feature_names = [
            'total_time_hours', 'productive_ratio', 'social_ratio',
            'entertainment_ratio', 'peak_hour_normalized',
            'unique_domains_normalized', 'max_single_domain_ratio',
            'session_count', 'avg_session_length', 'category_entropy'
        ]
        if self._load_model():
            print("  [AnomalyDetector] Loaded saved model from disk.")
        else:
            print("  [AnomalyDetector] No saved model found, will train when data is available.")

    def prepare_features(self, daily_data):
        """Prepare features for anomaly detection"""
        features = []
        for day in daily_data:
            cat_times = day.get('category_times', {})
            total = max(sum(cat_times.values()), 1)

            # Calculate entropy of category distribution
            ratios = [max(v / total, 1e-10) for v in cat_times.values()] if cat_times else [1]
            entropy = -sum(r * np.log2(r) for r in ratios if r > 0)
            max_entropy = np.log2(max(len(cat_times), 1)) if cat_times else 1
            normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0

            # Max time on single domain
            domain_times = day.get('domain_times', {})
            max_domain_time = max(domain_times.values()) if domain_times else 0
            max_single_ratio = max_domain_time / total if total > 0 else 0

            feature_vector = [
                day.get('total_time', 0) / 3600000,  # Hours
                cat_times.get('productive', 0) / total,
                cat_times.get('social', 0) / total,
                cat_times.get('entertainment', 0) / total,
                day.get('peak_hour', 12) / 24.0,
                min(day.get('unique_domains', 0) / 30.0, 2.0),
                max_single_ratio,
                min(day.get('session_count', 1) / 10.0, 2.0),
                min(day.get('avg_session_minutes', 30) / 60.0, 3.0),
                normalized_entropy
            ]
            features.append(feature_vector)

        return np.array(features)

    def train(self, daily_data):
        """Train the Isolation Forest"""
        if len(daily_data) < 5:
            return {'error': f'Need at least 5 data points, got {len(daily_data)}'}

        X = self.prepare_features(daily_data)
        
        # Store mean/std for feature analysis
        self.feature_means = np.mean(X, axis=0)
        self.feature_stds = np.std(X, axis=0) + 1e-10

        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled)

        # Get anomaly scores for training data
        scores = self.model.score_samples(X_scaled)
        predictions = self.model.predict(X_scaled)
        n_anomalies = int(np.sum(predictions == -1))

        self._save_model()

        return {
            'training_samples': len(daily_data),
            'anomalies_found': n_anomalies,
            'anomaly_ratio': round(n_anomalies / len(daily_data), 3),
            'mean_anomaly_score': round(float(np.mean(scores)), 3),
            'threshold_score': round(float(np.percentile(scores, self.contamination * 100)), 3)
        }

    def detect(self, day_data):
        """Detect if a day's browsing is anomalous"""
        if not self.model:
            return self._heuristic_detect(day_data)

        X = self.prepare_features([day_data])
        X_scaled = self.scaler.transform(X)

        prediction = int(self.model.predict(X_scaled)[0])
        anomaly_score = float(self.model.score_samples(X_scaled)[0])
        is_anomaly = prediction == -1

        # Identify which features are most anomalous
        anomalous_features = self._identify_anomalous_features(X[0])

        return {
            'is_anomaly': is_anomaly,
            'anomaly_score': round(anomaly_score, 3),
            'severity': self._get_severity(anomaly_score),
            'anomalous_features': anomalous_features,
            'recommendations': self._get_recommendations(anomalous_features, day_data)
        }

    def _identify_anomalous_features(self, features):
        """Identify which features are most anomalous"""
        if self.feature_means is None:
            return []

        deviations = np.abs(features - self.feature_means) / self.feature_stds
        anomalous = []
        
        for i, (name, dev) in enumerate(zip(self.feature_names, deviations)):
            if dev > 1.5:  # More than 1.5 standard deviations
                direction = 'high' if features[i] > self.feature_means[i] else 'low'
                anomalous.append({
                    'feature': name,
                    'deviation': round(float(dev), 2),
                    'direction': direction,
                    'value': round(float(features[i]), 3),
                    'normal_range': [
                        round(float(self.feature_means[i] - self.feature_stds[i]), 3),
                        round(float(self.feature_means[i] + self.feature_stds[i]), 3)
                    ]
                })

        return sorted(anomalous, key=lambda x: x['deviation'], reverse=True)[:5]

    def _get_severity(self, score):
        """Get severity level from anomaly score"""
        if score > -0.3:
            return 'normal'
        elif score > -0.5:
            return 'mild'
        elif score > -0.7:
            return 'moderate'
        else:
            return 'severe'

    def _get_recommendations(self, anomalous_features, day_data):
        """Generate recommendations based on anomalous features"""
        recommendations = []
        for feat in anomalous_features:
            name = feat['feature']
            direction = feat['direction']

            if name == 'social_ratio' and direction == 'high':
                recommendations.append(
                    "Your social media usage is significantly above normal. "
                    "Consider setting stricter time limits."
                )
            elif name == 'entertainment_ratio' and direction == 'high':
                recommendations.append(
                    "Entertainment browsing is unusually high. "
                    "Try scheduling specific entertainment breaks."
                )
            elif name == 'total_time_hours' and direction == 'high':
                recommendations.append(
                    "You've been browsing much longer than usual. "
                    "Take regular breaks to maintain focus."
                )
            elif name == 'peak_hour_normalized' and direction == 'high':
                recommendations.append(
                    "You're browsing later than usual. "
                    "Late-night browsing can affect sleep quality."
                )
            elif name == 'category_entropy' and direction == 'low':
                recommendations.append(
                    "Your browsing is very focused on one category. "
                    "Consider diversifying your tabs for better balance."
                )
            elif name == 'max_single_domain_ratio' and direction == 'high':
                recommendations.append(
                    "You've spent an unusually long time on one website. "
                    "Consider taking a break or switching tasks."
                )

        if not recommendations:
            recommendations.append("Your browsing pattern looks normal. Keep it up!")

        return recommendations

    def _heuristic_detect(self, day_data):
        """Fallback heuristic anomaly detection"""
        cat_times = day_data.get('category_times', {})
        total = max(sum(cat_times.values()), 1)
        
        social_ratio = cat_times.get('social', 0) / total
        entertainment_ratio = cat_times.get('entertainment', 0) / total
        total_hours = day_data.get('total_time', 0) / 3600000

        is_anomaly = (social_ratio > 0.5 or entertainment_ratio > 0.5 or total_hours > 8)

        return {
            'is_anomaly': is_anomaly,
            'anomaly_score': -0.5 if is_anomaly else 0.0,
            'severity': 'moderate' if is_anomaly else 'normal',
            'anomalous_features': [],
            'recommendations': ['Browsing pattern analysis requires more data for accurate detection.']
        }

    def get_model_info(self):
        """Get model information"""
        return {
            'algorithm': 'Isolation Forest',
            'contamination': self.contamination,
            'n_estimators': 100,
            'features': self.feature_names,
            'trained': self.model is not None
        }

    def _save_model(self):
        """Save model"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'feature_means': self.feature_means,
                'feature_stds': self.feature_stds
            }, self.model_path)

    def _load_model(self):
        """Load model"""
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.model = data['model']
            self.scaler = data['scaler']
            self.feature_means = data['feature_means']
            self.feature_stds = data['feature_stds']
            return True
        return False
