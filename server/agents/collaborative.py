"""
Neural Collaborative Filtering for Browsing Pattern Recommendations
ML Algorithm #9: Neural Collaborative Filtering (NCF)

Implements a neural network-based collaborative filtering approach
that models user-domain interactions via learned embeddings.
Predicts which domains/content the user is likely to engage with
based on implicit feedback patterns (time spent, visit frequency).
"""
import numpy as np
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import joblib
import os
from datetime import datetime
from collections import defaultdict
import config


class NeuralCollaborativeFilter:
    """
    Neural Collaborative Filtering for browsing recommendations.

    This model learns latent representations (embeddings) of domains
    and user browsing contexts, then predicts engagement scores.

    Architecture:
    - Domain feature encoding: domain → feature vector (via handcrafted features)
    - Context feature encoding: temporal + behavioral features
    - Concatenated vector → MLP (64-32-16) → predicted engagement score

    Unlike matrix-factorization CF, the MLP can learn non-linear
    interactions between user context and domain features.
    """

    def __init__(self):
        self.model = None
        self.domain_scaler = StandardScaler()
        self.context_scaler = StandardScaler()
        self.engagement_scaler = MinMaxScaler()
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'collaborative_filter.pkl')
        self.is_trained = False
        self.domain_features_cache = {}
        self._known_domains = set()
        if self._load_model():
            print("  [CollaborativeFilter] Loaded saved model from disk.")
        else:
            print("  [CollaborativeFilter] No saved model found, training from scratch...")
            self._train_with_synthetic()

    def _encode_domain(self, domain):
        """
        Encode a domain into a fixed-length feature vector.
        
        Features (8 dimensions):
        [0] domain_length (normalized)
        [1] subdomain_count
        [2] has_www (binary)
        [3] tld_type (educational=1, org=0.8, com=0.5, other=0.3)
        [4] is_known_productive (binary)
        [5] is_known_social (binary)
        [6] is_known_entertainment (binary)
        [7] keyword_score (presence of learning-related keywords)
        """
        if domain in self.domain_features_cache:
            return self.domain_features_cache[domain]

        parts = domain.split('.')
        tld = parts[-1] if parts else ''

        tld_score = {'edu': 1.0, 'org': 0.8, 'gov': 0.9, 'ac': 1.0,
                     'com': 0.5, 'io': 0.6, 'dev': 0.7, 'net': 0.4}.get(tld, 0.3)

        # Check against known categories from config
        productive_domains = config.WEBSITE_CATEGORIES.get('productive', [])
        social_domains = config.WEBSITE_CATEGORIES.get('social', [])
        entertainment_domains = config.WEBSITE_CATEGORIES.get('entertainment', [])

        is_productive = 1.0 if any(pd in domain for pd in productive_domains) else 0.0
        is_social = 1.0 if any(sd in domain for sd in social_domains) else 0.0
        is_entertainment = 1.0 if any(ed in domain for ed in entertainment_domains) else 0.0

        learning_keywords = ['learn', 'edu', 'course', 'tutorial', 'docs', 'wiki',
                           'academy', 'school', 'study', 'guide', 'reference', 'dev']
        keyword_score = sum(1 for kw in learning_keywords if kw in domain.lower()) / len(learning_keywords)

        features = [
            min(len(domain) / 30.0, 1.0),
            min(len(parts) / 5.0, 1.0),
            1.0 if 'www' in parts else 0.0,
            tld_score,
            is_productive,
            is_social,
            is_entertainment,
            keyword_score
        ]

        self.domain_features_cache[domain] = features
        return features

    def _encode_context(self, context):
        """
        Encode browsing context into a feature vector.

        Features (8 dimensions):
        [0] hour_of_day (normalized 0-1)
        [1] day_of_week (normalized 0-1)
        [2] session_duration (normalized)
        [3] productivity_score (0-100 → 0-1)
        [4] tab_count (normalized)
        [5] unique_domains_visited (normalized)
        [6] productive_ratio
        [7] focus_score
        """
        return [
            context.get('hour_of_day', datetime.now().hour) / 23.0,
            context.get('day_of_week', datetime.now().weekday()) / 6.0,
            min(context.get('session_duration', 30) / 180.0, 1.0),
            context.get('productivity_score', 50) / 100.0,
            min(context.get('tab_count', 5) / 30.0, 1.0),
            min(context.get('unique_domains', 5) / 50.0, 1.0),
            context.get('productive_ratio', 0.5),
            context.get('focus_score', 0.5)
        ]

    def _train_with_synthetic(self):
        """Pre-train with synthetic user-domain interaction data"""
        np.random.seed(42)
        X = []
        y = []

        # Define typical interactions
        productive_domains = [
            'github.com', 'stackoverflow.com', 'leetcode.com', 'kaggle.com',
            'developer.mozilla.org', 'docs.google.com', 'coursera.org',
            'freecodecamp.org', 'udemy.com', 'medium.com', 'dev.to',
            'arxiv.org', 'scholar.google.com', 'khanacademy.org'
        ]
        social_domains = [
            'facebook.com', 'twitter.com', 'instagram.com', 'reddit.com',
            'tiktok.com', 'discord.com'
        ]
        entertainment_domains = [
            'youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com'
        ]

        all_domains = productive_domains + social_domains + entertainment_domains

        for _ in range(500):
            domain = np.random.choice(all_domains)
            is_prod = domain in productive_domains

            # Random context
            hour = np.random.randint(0, 24)
            day = np.random.randint(0, 7)
            session_dur = np.random.uniform(5, 120)
            prod_score = np.random.uniform(20, 90)
            tabs = np.random.randint(2, 25)
            domains_visited = np.random.randint(3, 30)
            prod_ratio = np.random.uniform(0.1, 0.9)
            focus = np.random.uniform(0.2, 0.9)

            context = {
                'hour_of_day': hour,
                'day_of_week': day,
                'session_duration': session_dur,
                'productivity_score': prod_score,
                'tab_count': tabs,
                'unique_domains': domains_visited,
                'productive_ratio': prod_ratio,
                'focus_score': focus
            }

            domain_features = self._encode_domain(domain)
            context_features = self._encode_context(context)
            combined = domain_features + context_features

            # Engagement score (target):
            # Higher for productive domains during focus hours
            base_engagement = 0.3
            if is_prod:
                base_engagement = 0.6
                if 9 <= hour <= 17:  # work hours
                    base_engagement += 0.15
                if prod_ratio > 0.5:
                    base_engagement += 0.1
                if focus > 0.6:
                    base_engagement += 0.1
            else:
                if hour >= 20 or hour <= 6:  # evening/night
                    base_engagement += 0.15
                if prod_ratio < 0.3:
                    base_engagement += 0.1

            engagement = np.clip(base_engagement + np.random.normal(0, 0.08), 0, 1)

            X.append(combined)
            y.append(engagement)

        X = np.array(X)
        y = np.array(y)

        # Scale features
        self.domain_scaler.fit(X[:, :8])
        self.context_scaler.fit(X[:, 8:])
        X_scaled = np.hstack([
            self.domain_scaler.transform(X[:, :8]),
            self.context_scaler.transform(X[:, 8:])
        ])

        self.model = MLPRegressor(
            hidden_layer_sizes=(64, 32, 16),
            activation='relu',
            solver='adam',
            alpha=0.001,
            learning_rate='adaptive',
            learning_rate_init=0.001,
            max_iter=500,
            random_state=42,
            verbose=False
        )
        self.model.fit(X_scaled, y)
        self.is_trained = True

        self._known_domains = set(all_domains)

        # Training score
        train_score = self.model.score(X_scaled, y)
        self._train_r2 = float(train_score)
        self._n_interactions = len(X)

        print(f"  [CollaborativeFilter] Trained NCF (64-32-16) on {len(X)} interactions, "
              f"R² = {self._train_r2:.3f}")

    def train(self, interaction_data=None):
        """
        Train/retrain with real interaction data.

        Args:
            interaction_data: list of dicts with 'domain', 'context', 'engagement'
        """
        if not interaction_data or len(interaction_data) < 10:
            return {
                'status': 'using_pretrained',
                'interactions': self._n_interactions,
                'r2_score': self._train_r2
            }

        X = []
        y = []
        for item in interaction_data:
            domain_features = self._encode_domain(item['domain'])
            context_features = self._encode_context(item.get('context', {}))
            combined = domain_features + context_features
            X.append(combined)
            y.append(item.get('engagement', 0.5))
            self._known_domains.add(item['domain'])

        X = np.array(X)
        y = np.array(y)

        X_scaled = np.hstack([
            self.domain_scaler.transform(X[:, :8]),
            self.context_scaler.transform(X[:, 8:])
        ])

        self.model.partial_fit(X_scaled, y)

        try:
            joblib.dump({
                'model': self.model,
                'domain_scaler': self.domain_scaler,
                'context_scaler': self.context_scaler
            }, self.model_path)
        except Exception:
            pass

        return {
            'status': 'retrained',
            'new_interactions': len(X),
            'total_known_domains': len(self._known_domains),
            'r2_score': self._train_r2
        }

    def predict_engagement(self, domain, context):
        """
        Predict how engaged the user would be with a domain given the context.

        Returns:
            float: engagement score 0-1
        """
        if not self.is_trained:
            return 0.5

        domain_features = self._encode_domain(domain)
        context_features = self._encode_context(context)
        combined = np.array([domain_features + context_features])

        combined_scaled = np.hstack([
            self.domain_scaler.transform(combined[:, :8]),
            self.context_scaler.transform(combined[:, 8:])
        ])

        score = float(self.model.predict(combined_scaled)[0])
        return max(0, min(1, score))

    def recommend_domains(self, context, candidate_domains=None, top_k=10):
        """
        Recommend domains given the current browsing context.

        Args:
            context: dict with browsing context features
            candidate_domains: list of domains to rank (if None, use all known)
            top_k: number of recommendations to return

        Returns:
            list of dicts with domain, predicted_engagement, reason
        """
        if not self.is_trained:
            return {'error': 'Model not trained', 'recommendations': []}

        if candidate_domains is None:
            candidate_domains = list(self._known_domains)

        if not candidate_domains:
            return {'recommendations': [], 'message': 'No candidate domains'}

        # Score all candidates
        scores = []
        for domain in candidate_domains:
            engagement = self.predict_engagement(domain, context)
            scores.append((domain, engagement))

        # Sort by predicted engagement
        scores.sort(key=lambda x: x[1], reverse=True)
        top_results = scores[:top_k]

        recommendations = []
        for domain, score in top_results:
            recommendations.append({
                'domain': domain,
                'predicted_engagement': round(score, 4),
                'domain_type': self._get_domain_type(domain),
                'reason': self._generate_cf_reason(domain, score, context)
            })

        return {
            'recommendations': recommendations,
            'context_used': {
                'hour': context.get('hour_of_day', 'unknown'),
                'focus_score': context.get('focus_score', 'unknown')
            },
            'model': 'Neural Collaborative Filtering (64-32-16)',
            'algorithm': 'Neural Collaborative Filtering',
            'timestamp': datetime.now().isoformat()
        }

    def _get_domain_type(self, domain):
        """Determine domain type"""
        productive = config.WEBSITE_CATEGORIES.get('productive', [])
        social = config.WEBSITE_CATEGORIES.get('social', [])
        entertainment = config.WEBSITE_CATEGORIES.get('entertainment', [])

        if any(pd in domain for pd in productive):
            return 'productive'
        elif any(sd in domain for sd in social):
            return 'social'
        elif any(ed in domain for ed in entertainment):
            return 'entertainment'
        return 'other'

    def _generate_cf_reason(self, domain, score, context):
        """Generate human-readable reason for recommendation"""
        domain_type = self._get_domain_type(domain)
        hour = context.get('hour_of_day', 12)
        focus = context.get('focus_score', 0.5)

        if domain_type == 'productive':
            if score > 0.7:
                reason = f"Highly relevant to your current productive session"
            elif 9 <= hour <= 17:
                reason = f"Good match for your work-hours browsing pattern"
            else:
                reason = f"Aligns with your learning interests"
        elif domain_type == 'social':
            if hour >= 18:
                reason = "Social browsing suits your evening pattern"
            else:
                reason = "Quick social check — monitor time spent"
        else:
            if focus > 0.6:
                reason = "Consider after your focused work session"
            else:
                reason = "Matches your current browsing mood"

        return reason

    def get_model_info(self):
        """Return model metadata"""
        return {
            'name': 'Neural Collaborative Filter',
            'algorithm': 'Neural Collaborative Filtering (NCF)',
            'architecture': '16 → 64 → 32 → 16 → 1',
            'input_features': '8 domain + 8 context = 16',
            'activation': 'ReLU',
            'optimizer': 'Adam',
            'output': 'Engagement Score (0-1)',
            'known_domains': len(self._known_domains),
            'is_trained': self.is_trained,
            'r2_score': round(self._train_r2, 4) if hasattr(self, '_train_r2') else None
        }

    def _save_model(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            joblib.dump({
                'model': self.model,
                'domain_scaler': self.domain_scaler,
                'context_scaler': self.context_scaler
            }, self.model_path)

    def _load_model(self):
        """Load model from disk"""
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.model = data['model']
            self.domain_scaler = data['domain_scaler']
            self.context_scaler = data['context_scaler']
            self.is_trained = True
            return True
        return False
