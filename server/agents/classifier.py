"""
Website Category Classifier using Naive Bayes + TF-IDF
ML Algorithm #1: Multinomial Naive Bayes

Classifies websites into categories (productive, social, entertainment, etc.)
based on domain name features and URL patterns.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
import joblib
import os
import re
import config


class WebsiteCategoryClassifier:
    """
    Classifies websites into categories using Naive Bayes with TF-IDF features.
    
    Features extracted from domains:
    - Domain name tokens (split by dots, hyphens)  
    - TLD (top-level domain)
    - URL path keywords
    - Known domain patterns
    """

    def __init__(self):
        self.model = None
        self.pipeline = None
        self.categories = list(config.WEBSITE_CATEGORIES.keys())
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'website_classifier.pkl')
        if self._load_model():
            print("  [Classifier] Loaded saved model from disk.")
        else:
            print("  [Classifier] No saved model found, training from scratch...")
            self._build_training_data()
            self._train()

    def _build_training_data(self):
        """Build training data from config categories"""
        self.training_domains = []
        self.training_labels = []

        for category, domains in config.WEBSITE_CATEGORIES.items():
            for domain in domains:
                # Create features from domain
                features = self._extract_features(domain)
                self.training_domains.append(features)
                self.training_labels.append(category)

                # Data augmentation: add variations
                parts = domain.split('.')
                if len(parts) >= 2:
                    # Add subdomain variations
                    base = '.'.join(parts[-2:])
                    self.training_domains.append(self._extract_features(base))
                    self.training_labels.append(category)

                    # Add www prefix variant
                    www_domain = f"www.{base}"
                    self.training_domains.append(self._extract_features(www_domain))
                    self.training_labels.append(category)

    def _extract_features(self, domain):
        """Extract text features from a domain name"""
        # Remove protocol if present
        domain = re.sub(r'https?://', '', domain)
        # Remove path
        domain = domain.split('/')[0]
        
        # Tokenize domain
        tokens = re.split(r'[.\-_]', domain)
        # Remove common tokens
        stop_tokens = {'www', 'com', 'org', 'net', 'io', 'co', 'in'}
        meaningful = [t for t in tokens if t.lower() not in stop_tokens and len(t) > 1]
        
        # Add TLD as feature
        tld = domain.split('.')[-1] if '.' in domain else ''
        
        # Add domain length category
        length_cat = 'short' if len(domain) < 10 else ('medium' if len(domain) < 20 else 'long')
        
        # Combine features
        features = ' '.join(meaningful + [f'tld_{tld}', f'len_{length_cat}'])
        return features

    def _train(self):
        """Train the Naive Bayes classifier"""
        if len(self.training_domains) < 5:
            return

        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                analyzer='word',
                ngram_range=(1, 2),
                max_features=500,
                sublinear_tf=True
            )),
            ('classifier', MultinomialNB(alpha=0.1))
        ])

        self.pipeline.fit(self.training_domains, self.training_labels)

        # Calculate accuracy with cross-validation
        if len(self.training_domains) >= 10:
            scores = cross_val_score(self.pipeline, self.training_domains,
                                     self.training_labels, cv=min(5, len(set(self.training_labels))))
            self.accuracy = np.mean(scores)
        else:
            self.accuracy = 0.0

        self._save_model()

    def classify(self, domain):
        """Classify a single domain"""
        if not self.pipeline:
            return self._rule_based_classify(domain)

        features = self._extract_features(domain)
        prediction = self.pipeline.predict([features])[0]
        probabilities = self.pipeline.predict_proba([features])[0]
        confidence = float(max(probabilities))

        # If low confidence, fall back to rule-based
        if confidence < 0.4:
            return self._rule_based_classify(domain)

        return {
            'category': prediction,
            'confidence': round(confidence, 3),
            'method': 'naive_bayes'
        }

    def classify_batch(self, domains):
        """Classify multiple domains"""
        return [self.classify(domain) for domain in domains]

    def _rule_based_classify(self, domain):
        """Fallback rule-based classification"""
        domain_lower = domain.lower()
        for category, known_domains in config.WEBSITE_CATEGORIES.items():
            for known in known_domains:
                if known in domain_lower or domain_lower in known:
                    return {
                        'category': category,
                        'confidence': 0.95,
                        'method': 'rule_based'
                    }
        return {
            'category': 'unknown',
            'confidence': 0.0,
            'method': 'unknown'
        }

    def retrain(self, new_domains, new_labels):
        """Retrain with additional data"""
        self.training_domains.extend([self._extract_features(d) for d in new_domains])
        self.training_labels.extend(new_labels)
        self._train()

    def get_model_info(self):
        """Get model information"""
        return {
            'algorithm': 'Multinomial Naive Bayes with TF-IDF',
            'training_samples': len(self.training_domains),
            'categories': self.categories,
            'accuracy': round(getattr(self, 'accuracy', 0.0), 3),
            'features': 'Domain name tokens, TLD, length category'
        }

    def _save_model(self):
        """Save trained model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.pipeline:
            joblib.dump(self.pipeline, self.model_path)

    def _load_model(self):
        """Load trained model from disk"""
        if os.path.exists(self.model_path):
            self.pipeline = joblib.load(self.model_path)
            return True
        return False
