"""
Deep Learning Content Recommendation Engine
ML Algorithm #7: Multi-Layer Perceptron (Neural Network) Recommender

Uses a neural network to recommend learning content based on browsing
history, domain preferences, time-of-day patterns, and engagement signals.
Combines content-based and collaborative features in a deep architecture.
"""
import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import cross_val_score
import joblib
import os
from datetime import datetime
from collections import Counter
import config


class DeepRecommender:
    """
    Neural Network-based Learning Content Recommender.

    Architecture:
    - Input layer: 18 features (browsing behavior, temporal, engagement)
    - Hidden layer 1: 128 neurons (ReLU activation)
    - Hidden layer 2: 64 neurons (ReLU activation)
    - Hidden layer 3: 32 neurons (ReLU activation)
    - Output layer: N learning categories (softmax)

    Features:
    - Domain visit frequency vectors
    - Time-of-day patterns (hour encoding)
    - Category engagement ratios
    - Session duration patterns
    - Productivity context signals
    - Recency-weighted interest scores
    """

    LEARNING_CATEGORIES = [
        'programming', 'data_science', 'web_development', 'cloud_computing',
        'cybersecurity', 'design', 'mathematics', 'research', 'language_learning',
        'business', 'general_knowledge', 'career_development'
    ]

    LEARNING_DOMAINS = {
        'programming': [
            'github.com', 'stackoverflow.com', 'leetcode.com', 'hackerrank.com',
            'codeforces.com', 'codepen.io', 'repl.it', 'geeksforgeeks.org',
            'programiz.com', 'tutorialspoint.com', 'w3schools.com'
        ],
        'data_science': [
            'kaggle.com', 'towardsdatascience.com', 'analyticsvidhya.com',
            'machinelearningmastery.com', 'fast.ai', 'paperswithcode.com',
            'huggingface.co', 'tensorflow.org', 'pytorch.org', 'scikit-learn.org'
        ],
        'web_development': [
            'developer.mozilla.org', 'css-tricks.com', 'freecodecamp.org',
            'dev.to', 'smashingmagazine.com', 'web.dev', 'nextjs.org',
            'react.dev', 'vuejs.org', 'angular.io', 'tailwindcss.com'
        ],
        'cloud_computing': [
            'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
            'digitalocean.com', 'heroku.com', 'vercel.com', 'netlify.com',
            'docker.com', 'kubernetes.io'
        ],
        'cybersecurity': [
            'owasp.org', 'hackerone.com', 'portswigger.net', 'tryhackme.com',
            'hackthebox.com', 'cybrary.it', 'sans.org'
        ],
        'design': [
            'figma.com', 'dribbble.com', 'behance.net', 'canva.com',
            'adobe.com', 'sketch.com', 'uxdesign.cc'
        ],
        'mathematics': [
            'khanacademy.org', 'brilliant.org', 'mathworld.wolfram.com',
            'wolframalpha.com', 'symbolab.com', 'desmos.com'
        ],
        'research': [
            'scholar.google.com', 'arxiv.org', 'researchgate.net',
            'academia.edu', 'pubmed.ncbi.nlm.nih.gov', 'ieee.org',
            'springer.com', 'sciencedirect.com'
        ],
        'language_learning': [
            'duolingo.com', 'babbel.com', 'rosettastone.com',
            'memrise.com', 'busuu.com', 'lingoda.com'
        ],
        'business': [
            'linkedin.com', 'hbr.org', 'investopedia.com',
            'bloomberg.com', 'forbes.com', 'entrepreneur.com'
        ],
        'general_knowledge': [
            'wikipedia.org', 'britannica.com', 'quora.com',
            'ted.com', 'edx.org', 'coursera.org', 'udemy.com'
        ],
        'career_development': [
            'glassdoor.com', 'indeed.com', 'linkedin.com',
            'naukri.com', 'angel.co', 'levels.fyi'
        ]
    }

    # Recommended resources per category
    LEARNING_RESOURCES = {
        'programming': [
            {'title': 'LeetCode Practice', 'url': 'https://leetcode.com', 'type': 'practice'},
            {'title': 'FreeCodeCamp Tutorials', 'url': 'https://freecodecamp.org', 'type': 'tutorial'},
            {'title': 'GitHub Trending Projects', 'url': 'https://github.com/trending', 'type': 'exploration'},
        ],
        'data_science': [
            {'title': 'Kaggle Competitions', 'url': 'https://kaggle.com/competitions', 'type': 'practice'},
            {'title': 'Towards Data Science', 'url': 'https://towardsdatascience.com', 'type': 'reading'},
            {'title': 'Fast.ai Courses', 'url': 'https://fast.ai', 'type': 'course'},
        ],
        'web_development': [
            {'title': 'MDN Web Docs', 'url': 'https://developer.mozilla.org', 'type': 'reference'},
            {'title': 'CSS-Tricks Guides', 'url': 'https://css-tricks.com', 'type': 'tutorial'},
            {'title': 'Web.dev Learn', 'url': 'https://web.dev/learn', 'type': 'course'},
        ],
        'cloud_computing': [
            {'title': 'AWS Free Tier Labs', 'url': 'https://aws.amazon.com/free', 'type': 'practice'},
            {'title': 'Google Cloud Skills Boost', 'url': 'https://cloudskillsboost.google', 'type': 'course'},
            {'title': 'Docker Getting Started', 'url': 'https://docker.com/get-started', 'type': 'tutorial'},
        ],
        'cybersecurity': [
            {'title': 'TryHackMe Rooms', 'url': 'https://tryhackme.com', 'type': 'practice'},
            {'title': 'OWASP Top 10', 'url': 'https://owasp.org/Top10', 'type': 'reference'},
            {'title': 'PortSwigger Web Security', 'url': 'https://portswigger.net/web-security', 'type': 'course'},
        ],
        'design': [
            {'title': 'Figma Tutorials', 'url': 'https://figma.com/resources/learn-design', 'type': 'tutorial'},
            {'title': 'Dribbble Inspiration', 'url': 'https://dribbble.com', 'type': 'exploration'},
            {'title': 'UX Design Articles', 'url': 'https://uxdesign.cc', 'type': 'reading'},
        ],
        'mathematics': [
            {'title': 'Khan Academy Math', 'url': 'https://khanacademy.org/math', 'type': 'course'},
            {'title': 'Brilliant Problem Solving', 'url': 'https://brilliant.org', 'type': 'practice'},
            {'title': 'Desmos Graphing', 'url': 'https://desmos.com', 'type': 'tool'},
        ],
        'research': [
            {'title': 'Google Scholar', 'url': 'https://scholar.google.com', 'type': 'search'},
            {'title': 'ArXiv Latest Papers', 'url': 'https://arxiv.org/list/cs/recent', 'type': 'reading'},
            {'title': 'Papers With Code', 'url': 'https://paperswithcode.com', 'type': 'exploration'},
        ],
        'language_learning': [
            {'title': 'Duolingo Practice', 'url': 'https://duolingo.com', 'type': 'practice'},
            {'title': 'Memrise Vocabulary', 'url': 'https://memrise.com', 'type': 'practice'},
            {'title': 'BBC Languages', 'url': 'https://bbc.co.uk/languages', 'type': 'course'},
        ],
        'business': [
            {'title': 'HBR Articles', 'url': 'https://hbr.org', 'type': 'reading'},
            {'title': 'Investopedia Learning', 'url': 'https://investopedia.com', 'type': 'reference'},
            {'title': 'LinkedIn Learning', 'url': 'https://linkedin.com/learning', 'type': 'course'},
        ],
        'general_knowledge': [
            {'title': 'TED Talks', 'url': 'https://ted.com', 'type': 'video'},
            {'title': 'Coursera Courses', 'url': 'https://coursera.org', 'type': 'course'},
            {'title': 'edX Programs', 'url': 'https://edx.org', 'type': 'course'},
        ],
        'career_development': [
            {'title': 'LinkedIn Skills', 'url': 'https://linkedin.com/learning', 'type': 'course'},
            {'title': 'Glassdoor Interview Prep', 'url': 'https://glassdoor.com', 'type': 'preparation'},
            {'title': 'Levels.fyi Compensation', 'url': 'https://levels.fyi', 'type': 'reference'},
        ]
    }

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(self.LEARNING_CATEGORIES)
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'deep_recommender.pkl')
        self.is_trained = False
        self._build_domain_index()
        if self._load_model():
            print("  [DeepRecommender] Loaded saved model from disk.")
        else:
            print("  [DeepRecommender] No saved model found, training from scratch...")
            self._train_with_synthetic_data()

    def _build_domain_index(self):
        """Build reverse mapping: domain -> category"""
        self.domain_to_category = {}
        for category, domains in self.LEARNING_DOMAINS.items():
            for domain in domains:
                self.domain_to_category[domain] = category

    def _extract_features(self, browsing_data):
        """
        Extract 18-dimensional feature vector from browsing data.

        Features:
        [0]  hour_of_day (0-23, normalized)
        [1]  day_of_week (0-6, normalized)
        [2]  productive_ratio (0-1)
        [3]  social_ratio (0-1)
        [4]  entertainment_ratio (0-1)
        [5]  news_ratio (0-1)
        [6]  total_browsing_minutes
        [7]  unique_domains_count
        [8]  avg_session_duration
        [9]  programming_affinity (0-1)
        [10] data_science_affinity (0-1)
        [11] web_dev_affinity (0-1)
        [12] cloud_affinity (0-1)
        [13] research_affinity (0-1)
        [14] design_affinity (0-1)
        [15] tab_switch_rate
        [16] focus_score (0-1)
        [17] recency_weight (0-1)
        """
        cat_times = browsing_data.get('category_times', {})
        total = max(sum(cat_times.values()), 1)

        domains = browsing_data.get('domains', [])
        domain_counts = Counter(domains) if isinstance(domains, list) else \
            {d: 1 for d in domains} if isinstance(domains, dict) else {}

        # Compute category affinities from domain history
        category_hits = Counter()
        for domain in domain_counts:
            for cat, cat_domains in self.LEARNING_DOMAINS.items():
                if any(cd in domain for cd in cat_domains):
                    category_hits[cat] += domain_counts.get(domain, 1)

        total_hits = max(sum(category_hits.values()), 1)

        features = [
            browsing_data.get('hour_of_day', datetime.now().hour) / 23.0,
            browsing_data.get('day_of_week', datetime.now().weekday()) / 6.0,
            cat_times.get('productive', 0) / total,
            cat_times.get('social', 0) / total,
            cat_times.get('entertainment', 0) / total,
            cat_times.get('news', 0) / total,
            min(browsing_data.get('total_time', 0) / 3600000, 10.0),  # cap at 10h
            min(browsing_data.get('unique_domains', 5) / 50.0, 1.0),
            min(browsing_data.get('avg_session_minutes', 30) / 120.0, 1.0),
            category_hits.get('programming', 0) / total_hits,
            category_hits.get('data_science', 0) / total_hits,
            category_hits.get('web_development', 0) / total_hits,
            category_hits.get('cloud_computing', 0) / total_hits,
            category_hits.get('research', 0) / total_hits,
            category_hits.get('design', 0) / total_hits,
            min(browsing_data.get('tab_switches', 5) / 50.0, 1.0),
            browsing_data.get('focus_score', 0.5),
            browsing_data.get('recency_weight', 0.5)
        ]
        return features

    def _train_with_synthetic_data(self):
        """Pre-train the neural network with synthetic browsing patterns"""
        np.random.seed(42)
        X = []
        y = []

        for idx, category in enumerate(self.LEARNING_CATEGORIES):
            for _ in range(80):  # 80 samples per category = 960 total
                features = np.random.uniform(0.05, 0.3, 18)

                # Bias features toward category patterns
                if category == 'programming':
                    features[2] = np.random.uniform(0.5, 0.95)  # high productive
                    features[9] = np.random.uniform(0.4, 0.9)   # programming affinity
                    features[16] = np.random.uniform(0.5, 0.9)  # high focus
                elif category == 'data_science':
                    features[2] = np.random.uniform(0.4, 0.85)
                    features[10] = np.random.uniform(0.4, 0.9)  # ds affinity
                    features[14] = np.random.uniform(0.1, 0.4)  # some research
                elif category == 'web_development':
                    features[2] = np.random.uniform(0.4, 0.85)
                    features[11] = np.random.uniform(0.4, 0.9)  # web dev affinity
                    features[9] = np.random.uniform(0.2, 0.5)   # some programming
                elif category == 'cloud_computing':
                    features[2] = np.random.uniform(0.5, 0.9)
                    features[12] = np.random.uniform(0.4, 0.9)  # cloud affinity
                elif category == 'cybersecurity':
                    features[2] = np.random.uniform(0.4, 0.85)
                    features[9] = np.random.uniform(0.2, 0.6)
                    features[16] = np.random.uniform(0.5, 0.85)
                elif category == 'design':
                    features[14] = np.random.uniform(0.4, 0.9)  # design affinity
                    features[2] = np.random.uniform(0.3, 0.7)
                elif category == 'mathematics':
                    features[2] = np.random.uniform(0.4, 0.9)
                    features[16] = np.random.uniform(0.5, 0.9)
                    features[13] = np.random.uniform(0.2, 0.5)
                elif category == 'research':
                    features[13] = np.random.uniform(0.4, 0.9)  # research affinity
                    features[2] = np.random.uniform(0.5, 0.9)
                    features[16] = np.random.uniform(0.5, 0.85)
                elif category == 'language_learning':
                    features[6] = np.random.uniform(0.1, 0.5)   # moderate time
                    features[8] = np.random.uniform(0.2, 0.6)   # shorter sessions
                elif category == 'business':
                    features[5] = np.random.uniform(0.2, 0.5)   # reads news
                    features[2] = np.random.uniform(0.3, 0.7)
                elif category == 'general_knowledge':
                    features[7] = np.random.uniform(0.3, 0.7)   # many domains
                    features[4] = np.random.uniform(0.1, 0.4)   # some entertainment
                elif category == 'career_development':
                    features[2] = np.random.uniform(0.3, 0.7)
                    features[3] = np.random.uniform(0.15, 0.4)  # some social (linkedin)

                # Add noise
                features += np.random.normal(0, 0.03, 18)
                features = np.clip(features, 0, 1)

                X.append(features)
                y.append(category)

        X = np.array(X)
        y_encoded = self.label_encoder.transform(y)

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)

        self.model = MLPClassifier(
            hidden_layer_sizes=(128, 64, 32),
            activation='relu',
            solver='adam',
            alpha=0.001,        # L2 regularization
            learning_rate='adaptive',
            learning_rate_init=0.001,
            max_iter=500,
            n_iter_no_change=20,
            random_state=42,
            verbose=False
        )
        self.model.fit(X_scaled, y_encoded)
        self.is_trained = True

        # Compute cross-validated accuracy
        scores = cross_val_score(self.model, X_scaled, y_encoded, cv=5, scoring='accuracy')
        self._cv_accuracy = float(np.mean(scores))
        self._n_samples = len(X)

        print(f"  [DeepRecommender] Trained MLP (128-64-32) on {len(X)} samples, "
              f"CV accuracy: {self._cv_accuracy:.3f}")

    def train(self, browsing_records=None):
        """
        Retrain with real browsing data (augmented with synthetic).
        Returns training metrics.
        """
        if not browsing_records or len(browsing_records) < 5:
            return {
                'status': 'using_pretrained',
                'samples': self._n_samples,
                'cv_accuracy': self._cv_accuracy
            }

        # Extract features from real records
        X_real = []
        y_real = []
        for record in browsing_records:
            features = self._extract_features(record)
            # Infer label from dominant domain category
            label = self._infer_label(record)
            if label:
                X_real.append(features)
                y_real.append(label)

        if len(X_real) < 3:
            return {'status': 'insufficient_labeled_data', 'samples': len(X_real)}

        # Combine real + synthetic (re-generate synthetic for balance)
        self._train_with_synthetic_data()

        # Fine-tune with real data
        X_real = np.array(X_real)
        y_encoded = self.label_encoder.transform(y_real)
        X_scaled = self.scaler.transform(X_real)

        self.model.partial_fit(X_scaled, y_encoded)

        try:
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'label_encoder': self.label_encoder
            }, self.model_path)
        except Exception:
            pass

        return {
            'status': 'retrained',
            'real_samples': len(X_real),
            'total_samples': self._n_samples + len(X_real),
            'cv_accuracy': self._cv_accuracy
        }

    def _infer_label(self, record):
        """Infer learning category from browsing record domains"""
        domains = record.get('domains', [])
        if isinstance(domains, dict):
            domains = list(domains.keys())

        category_counts = Counter()
        for domain in domains:
            for cat, cat_domains in self.LEARNING_DOMAINS.items():
                if any(cd in domain for cd in cat_domains):
                    category_counts[cat] += 1

        if category_counts:
            return category_counts.most_common(1)[0][0]
        return None

    def recommend(self, browsing_data, top_k=5):
        """
        Generate top-K learning recommendations based on browsing context.

        Returns:
            {
                'recommendations': [
                    {
                        'category': 'programming',
                        'confidence': 0.87,
                        'reason': '...',
                        'resources': [...]
                    }, ...
                ],
                'model_info': {...}
            }
        """
        if not self.is_trained:
            return {'error': 'Model not trained', 'recommendations': []}

        features = self._extract_features(browsing_data)
        X = np.array([features])
        X_scaled = self.scaler.transform(X)

        # Get class probabilities from the neural network
        probabilities = self.model.predict_proba(X_scaled)[0]
        class_indices = np.argsort(probabilities)[::-1][:top_k]

        recommendations = []
        for idx in class_indices:
            category = self.label_encoder.inverse_transform([idx])[0]
            confidence = float(probabilities[idx])

            if confidence < 0.02:
                continue

            reason = self._generate_reason(category, features, confidence)
            resources = self.LEARNING_RESOURCES.get(category, [])

            recommendations.append({
                'category': category,
                'confidence': round(confidence, 4),
                'reason': reason,
                'resources': resources,
                'tags': self._get_tags(category)
            })

        return {
            'recommendations': recommendations,
            'model': 'MLP Neural Network (128-64-32)',
            'algorithm': 'Deep Learning',
            'features_used': 18,
            'timestamp': datetime.now().isoformat()
        }

    def _generate_reason(self, category, features, confidence):
        """Generate human-readable explanation for a recommendation"""
        reasons = {
            'programming': "Your browsing shows strong coding activity — keep building!",
            'data_science': "You have been exploring data & ML topics — deep dive recommended",
            'web_development': "Frontend/backend patterns detected — level up your web skills",
            'cloud_computing': "Cloud platform interest detected — explore certifications",
            'cybersecurity': "Security-focused browsing detected — practice ethical hacking",
            'design': "Creative browsing patterns suggest design interest",
            'mathematics': "Analytical browsing pattern — strengthen your math foundations",
            'research': "Academic browsing detected — explore latest research papers",
            'language_learning': "Varied content consumption — try structured language learning",
            'business': "Professional reading patterns — expand business knowledge",
            'general_knowledge': "Broad curiosity detected — structured courses recommended",
            'career_development': "Career-oriented browsing — prepare for growth opportunities"
        }

        base = reasons.get(category, f"Based on your browsing patterns")

        # Add contextual detail
        if features[2] > 0.6:
            base += " (high productivity detected)"
        elif features[4] > 0.3:
            base += " (balance entertainment with learning)"
        if features[16] > 0.7:
            base += " — great focus level!"

        return base

    def _get_tags(self, category):
        """Get display tags for a category"""
        tag_map = {
            'programming': ['Code', 'Practice', 'DSA'],
            'data_science': ['ML', 'Data', 'Python'],
            'web_development': ['HTML/CSS', 'JS', 'React'],
            'cloud_computing': ['AWS', 'DevOps', 'Docker'],
            'cybersecurity': ['Security', 'Ethical Hacking', 'CTF'],
            'design': ['UI/UX', 'Figma', 'Creative'],
            'mathematics': ['Algebra', 'Calculus', 'Discrete'],
            'research': ['Papers', 'Academic', 'ArXiv'],
            'language_learning': ['Languages', 'Vocabulary', 'Grammar'],
            'business': ['Finance', 'Strategy', 'HBR'],
            'general_knowledge': ['Courses', 'TED', 'MOOCs'],
            'career_development': ['Resume', 'Interview', 'Skills']
        }
        return tag_map.get(category, [category])

    def get_model_info(self):
        """Return model metadata"""
        info = {
            'name': 'Deep Learning Content Recommender',
            'algorithm': 'Multi-Layer Perceptron (MLP)',
            'architecture': '18 → 128 → 64 → 32 → 12',
            'activation': 'ReLU',
            'optimizer': 'Adam',
            'regularization': 'L2 (alpha=0.001) + Early Stopping',
            'categories': len(self.LEARNING_CATEGORIES),
            'features': 18,
            'is_trained': self.is_trained,
            'total_parameters': self._count_parameters()
        }
        if hasattr(self, '_cv_accuracy'):
            info['cv_accuracy'] = round(self._cv_accuracy, 4)
        return info

    def _count_parameters(self):
        """Count total trainable parameters in the neural network"""
        if not self.model or not hasattr(self.model, 'coefs_'):
            return 0
        total = 0
        for coef in self.model.coefs_:
            total += coef.size
        for intercept in self.model.intercepts_:
            total += intercept.size
        return total

    def _save_model(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'label_encoder': self.label_encoder
            }, self.model_path)

    def _load_model(self):
        """Load model from disk"""
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data['model']
                self.scaler = data['scaler']
                self.label_encoder = data['label_encoder']
                self.is_trained = True
                return True
            except Exception as e:
                print(f"  [DeepRecommender] Failed to load saved model: {e}")
                try:
                    os.remove(self.model_path)
                except OSError:
                    pass
        return False
