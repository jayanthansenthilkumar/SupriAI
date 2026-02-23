"""
Browsing Habit Clustering using K-Means
ML Algorithm #2: K-Means Clustering

Groups users' browsing patterns into distinct behavioral clusters:
- Focus Worker: Mostly productive sites, long focused sessions
- Social Butterfly: Heavy social media usage
- Content Consumer: Entertainment and media heavy
- Balanced Browser: Even distribution across categories
- Night Owl / Early Bird: Based on peak activity hours
"""
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import joblib
import os
import config


class BrowsingClusterer:
    """
    K-Means clustering of daily browsing behavior patterns.
    
    Features per day:
    - Time spent per category (productive, social, entertainment, news, shopping, communication)
    - Peak activity hour
    - Number of unique domains
    - Total browsing time
    - Session count
    - Average session length
    """

    def __init__(self, n_clusters=5):
        self.n_clusters = n_clusters
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'browsing_clusters.pkl')
        self.cluster_labels = {
            0: 'Focus Worker',
            1: 'Social Butterfly',
            2: 'Content Consumer',
            3: 'Balanced Browser',
            4: 'Casual Surfer'
        }
        self.feature_names = [
            'productive_ratio', 'social_ratio', 'entertainment_ratio',
            'news_ratio', 'shopping_ratio', 'communication_ratio',
            'peak_hour', 'unique_domains', 'total_time_hours',
            'avg_session_minutes', 'focus_score'
        ]
        if self._load_model():
            print("  [Clusterer] Loaded saved model from disk.")
        else:
            print("  [Clusterer] No saved model found, will train when data is available.")

    def prepare_features(self, daily_data):
        """
        Prepare feature vectors from daily browsing data.
        
        Args:
            daily_data: list of dicts with keys:
                - category_times: dict of category -> milliseconds
                - peak_hour: int (0-23)
                - unique_domains: int
                - total_time: int (milliseconds)
                - session_count: int
        
        Returns: numpy array of features
        """
        features = []
        for day in daily_data:
            cat_times = day.get('category_times', {})
            total = max(sum(cat_times.values()), 1)  # Avoid division by zero

            feature_vector = [
                cat_times.get('productive', 0) / total,
                cat_times.get('social', 0) / total,
                cat_times.get('entertainment', 0) / total,
                cat_times.get('news', 0) / total,
                cat_times.get('shopping', 0) / total,
                cat_times.get('communication', 0) / total,
                day.get('peak_hour', 12) / 24.0,
                min(day.get('unique_domains', 0) / 50.0, 1.0),
                min(day.get('total_time', 0) / 3600000 / 12.0, 1.0),  # Normalize to 12 hours
                min(day.get('avg_session_minutes', 0) / 120.0, 1.0),  # Normalize to 2 hours
                day.get('focus_score', 0.5)
            ]
            features.append(feature_vector)

        return np.array(features)

    def train(self, daily_data):
        """Train the K-Means model"""
        if len(daily_data) < self.n_clusters:
            return {'error': f'Need at least {self.n_clusters} data points, got {len(daily_data)}'}

        X = self.prepare_features(daily_data)
        X_scaled = self.scaler.fit_transform(X)

        # Find optimal number of clusters using elbow method
        best_k = self.n_clusters
        if len(daily_data) >= 10:
            inertias = []
            silhouettes = []
            k_range = range(2, min(8, len(daily_data)))
            
            for k in k_range:
                km = KMeans(n_clusters=k, random_state=42, n_init=10)
                km.fit(X_scaled)
                inertias.append(km.inertia_)
                if k >= 2:
                    silhouettes.append(silhouette_score(X_scaled, km.labels_))

            # Use silhouette score to pick best k
            if silhouettes:
                best_idx = np.argmax(silhouettes)
                best_k = list(k_range)[best_idx]

        self.n_clusters = best_k
        self.model = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        self.model.fit(X_scaled)

        # Calculate cluster quality metrics
        labels = self.model.labels_
        sil_score = silhouette_score(X_scaled, labels) if best_k >= 2 else 0

        # Analyze cluster characteristics
        cluster_profiles = self._analyze_clusters(X, labels)

        self._save_model()

        return {
            'n_clusters': best_k,
            'silhouette_score': round(float(sil_score), 3),
            'inertia': round(float(self.model.inertia_), 3),
            'cluster_sizes': [int(np.sum(labels == i)) for i in range(best_k)],
            'cluster_profiles': cluster_profiles
        }

    def predict(self, day_data):
        """Predict cluster for a single day's data"""
        if not self.model:
            return {'cluster': -1, 'label': 'Unknown', 'confidence': 0}

        X = self.prepare_features([day_data])
        X_scaled = self.scaler.transform(X)
        
        cluster = int(self.model.predict(X_scaled)[0])
        
        # Calculate distance to cluster center for confidence
        distances = self.model.transform(X_scaled)[0]
        min_dist = distances[cluster]
        max_dist = max(distances)
        confidence = 1.0 - (min_dist / max_dist) if max_dist > 0 else 0.5

        label = self.cluster_labels.get(cluster, f'Cluster {cluster}')

        return {
            'cluster': cluster,
            'label': label,
            'confidence': round(float(confidence), 3),
            'distances': {self.cluster_labels.get(i, f'Cluster {i}'): round(float(d), 3)
                          for i, d in enumerate(distances)}
        }

    def _analyze_clusters(self, X, labels):
        """Analyze characteristics of each cluster"""
        profiles = {}
        for i in range(self.n_clusters):
            mask = labels == i
            if not np.any(mask):
                continue
            cluster_data = X[mask]
            means = np.mean(cluster_data, axis=0)
            
            # Determine cluster personality
            dominant_idx = np.argmax(means[:6])  # First 6 are category ratios
            categories = ['productive', 'social', 'entertainment', 'news', 'shopping', 'communication']
            dominant_cat = categories[dominant_idx]

            # Assign meaningful label
            if dominant_cat == 'productive' and means[0] > 0.5:
                label = 'Focus Worker'
            elif dominant_cat == 'social' and means[1] > 0.3:
                label = 'Social Butterfly'
            elif dominant_cat == 'entertainment' and means[2] > 0.3:
                label = 'Content Consumer'
            elif means[6] > 0.75:  # Late peak hour (normalized)
                label = 'Night Owl'
            elif means[6] < 0.35:  # Early peak hour
                label = 'Early Bird'
            else:
                label = 'Balanced Browser'

            self.cluster_labels[i] = label
            profiles[label] = {
                'size': int(np.sum(mask)),
                'avg_productive_ratio': round(float(means[0]), 3),
                'avg_social_ratio': round(float(means[1]), 3),
                'avg_entertainment_ratio': round(float(means[2]), 3),
                'avg_peak_hour': round(float(means[6] * 24), 1),
                'avg_total_time_hours': round(float(means[8] * 12), 1),
                'dominant_category': dominant_cat
            }

        return profiles

    def get_model_info(self):
        """Get model information"""
        return {
            'algorithm': 'K-Means Clustering',
            'n_clusters': self.n_clusters,
            'cluster_labels': self.cluster_labels,
            'features': self.feature_names,
            'trained': self.model is not None
        }

    def _save_model(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'cluster_labels': self.cluster_labels,
                'n_clusters': self.n_clusters
            }, self.model_path)

    def _load_model(self):
        """Load model from disk"""
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.model = data['model']
            self.scaler = data['scaler']
            self.cluster_labels = data['cluster_labels']
            self.n_clusters = data['n_clusters']
            return True
        return False
