"""
NLP Content Analyzer using TF-IDF + Truncated SVD (Latent Semantic Analysis)
ML Algorithm #8: Natural Language Processing Pipeline

Analyzes browsing content (titles, domains, URLs) to extract topics,
compute content similarity, and identify learning pathways using
Latent Semantic Analysis — a dimensionality reduction technique
applied to TF-IDF document-term matrices.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import MiniBatchKMeans
import joblib
import os
import re
from datetime import datetime
from collections import Counter, defaultdict
import config


class NLPContentAnalyzer:
    """
    NLP pipeline for browsing content analysis.

    Pipeline stages:
    1. Text preprocessing — tokenize titles, domains, URL paths
    2. TF-IDF vectorization — convert text to weighted term vectors
    3. Truncated SVD (LSA) — reduce to latent semantic space (50 dims)
    4. Content clustering — group similar content together
    5. Topic extraction — identify dominant topics per cluster
    6. Similarity scoring — find related content via cosine similarity

    Applications:
    - Extract learning topics from browsing history
    - Find content clusters (what user studies together)
    - Recommend similar content based on past reading
    - Build a knowledge graph of user interests
    """

    # Stop words for browsing content
    STOP_WORDS = {
        'http', 'https', 'www', 'com', 'org', 'net', 'io', 'html', 'php',
        'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was',
        'has', 'have', 'will', 'can', 'how', 'what', 'why', 'when', 'who',
        'all', 'about', 'your', 'you', 'get', 'new', 'best', 'top', 'one',
        'free', 'more', 'page', 'home', 'site', 'web', 'online'
    }

    def __init__(self):
        self.tfidf = TfidfVectorizer(
            max_features=2000,
            min_df=1,
            max_df=0.95,
            ngram_range=(1, 2),
            stop_words='english',
            sublinear_tf=True
        )
        self.svd = TruncatedSVD(n_components=50, random_state=42)
        self.clusterer = MiniBatchKMeans(n_clusters=8, random_state=42, n_init=3)
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'nlp_analyzer.pkl')
        self.is_trained = False
        self._corpus = []
        self._tfidf_matrix = None
        self._lsa_matrix = None
        self._labels = None
        self._topic_keywords = {}
        if self._load_model():
            print("  [NLPAnalyzer] Loaded saved model from disk.")
        else:
            print("  [NLPAnalyzer] No saved model found, will train when data is available.")

    def _preprocess_text(self, text):
        """Clean and tokenize browsing content text"""
        if not text:
            return ''
        # Lowercase
        text = text.lower()
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        # Split domain-like tokens
        text = re.sub(r'[._\-/]', ' ', text)
        # Remove special characters
        text = re.sub(r'[^a-z0-9\s]', '', text)
        # Remove stop words
        tokens = text.split()
        # Keep meaningful short tokens like 'ai', 'ml', 'js', 'ui', 'ux', 'db', 'os', 'qa'
        keep_short = {'ai', 'ml', 'js', 'ts', 'ui', 'ux', 'db', 'os', 'qa', 'ci', 'cd', 'go', 'r'}
        tokens = [t for t in tokens if t not in self.STOP_WORDS and (len(t) > 2 or t in keep_short)]
        return ' '.join(tokens)

    def _extract_text_from_entry(self, entry):
        """Extract analyzable text from a browsing history entry"""
        parts = []

        title = entry.get('title', '')
        if title:
            parts.append(self._preprocess_text(title))

        domain = entry.get('domain', '')
        if domain:
            parts.append(self._preprocess_text(domain))

        url = entry.get('url', '')
        if url:
            # Extract path segments as content signals
            path = re.sub(r'https?://[^/]+', '', url)
            parts.append(self._preprocess_text(path))

        category = entry.get('category', '')
        if category:
            parts.append(category)

        return ' '.join(parts)

    def train(self, browsing_history):
        """
        Train the NLP pipeline on browsing history.

        Args:
            browsing_history: list of dicts with 'title', 'domain', 'url', 'category'

        Returns:
            dict with training metrics
        """
        if not browsing_history or len(browsing_history) < 3:
            return self._train_with_synthetic()

        # Build corpus
        self._corpus = []
        for entry in browsing_history:
            text = self._extract_text_from_entry(entry)
            if len(text.strip()) > 5:
                self._corpus.append(text)

        if len(self._corpus) < 3:
            return self._train_with_synthetic()

        return self._fit_pipeline()

    def _train_with_synthetic(self):
        """Train with synthetic browsing corpus when real data is insufficient"""
        synthetic_entries = [
            # Programming
            {'title': 'Python Tutorial Complete Guide', 'domain': 'python.org', 'category': 'productive'},
            {'title': 'JavaScript ES6 Features Overview', 'domain': 'developer.mozilla.org', 'category': 'productive'},
            {'title': 'React Hooks useState useEffect', 'domain': 'react.dev', 'category': 'productive'},
            {'title': 'Git Version Control Commands', 'domain': 'github.com', 'category': 'productive'},
            {'title': 'CSS Flexbox Grid Layout Guide', 'domain': 'css-tricks.com', 'category': 'productive'},
            {'title': 'Node.js Express REST API Tutorial', 'domain': 'nodejs.org', 'category': 'productive'},
            {'title': 'TypeScript Generics Advanced Types', 'domain': 'typescriptlang.org', 'category': 'productive'},
            {'title': 'Docker Container Kubernetes Deploy', 'domain': 'docker.com', 'category': 'productive'},
            {'title': 'SQL Database Query Optimization', 'domain': 'stackoverflow.com', 'category': 'productive'},
            {'title': 'Algorithm Data Structure Binary Tree', 'domain': 'leetcode.com', 'category': 'productive'},
            # Data Science / ML
            {'title': 'Machine Learning Neural Network Deep Learning', 'domain': 'kaggle.com', 'category': 'productive'},
            {'title': 'Pandas DataFrame Data Analysis Python', 'domain': 'pandas.pydata.org', 'category': 'productive'},
            {'title': 'TensorFlow Keras Model Training', 'domain': 'tensorflow.org', 'category': 'productive'},
            {'title': 'Scikit Learn Classification Regression', 'domain': 'scikit-learn.org', 'category': 'productive'},
            {'title': 'Natural Language Processing NLP Transformers', 'domain': 'huggingface.co', 'category': 'productive'},
            {'title': 'Computer Vision Image Recognition CNN', 'domain': 'paperswithcode.com', 'category': 'productive'},
            # Academic
            {'title': 'Research Paper Academic Journal', 'domain': 'scholar.google.com', 'category': 'productive'},
            {'title': 'ArXiv Preprint Machine Learning Paper', 'domain': 'arxiv.org', 'category': 'productive'},
            {'title': 'Linear Algebra Calculus Mathematics', 'domain': 'khanacademy.org', 'category': 'productive'},
            # Social / Entertainment
            {'title': 'Social Media Feed Posts Trending', 'domain': 'twitter.com', 'category': 'social'},
            {'title': 'Video Streaming Watch Movie Online', 'domain': 'youtube.com', 'category': 'entertainment'},
            {'title': 'Reddit Discussion Community Forum', 'domain': 'reddit.com', 'category': 'social'},
            {'title': 'Music Playlist Streaming Audio', 'domain': 'spotify.com', 'category': 'entertainment'},
            {'title': 'News Headlines Today World Events', 'domain': 'cnn.com', 'category': 'news'},
            {'title': 'Online Shopping Deals Products', 'domain': 'amazon.com', 'category': 'shopping'},
            # Cloud & DevOps
            {'title': 'AWS Lambda Serverless CloudFormation', 'domain': 'aws.amazon.com', 'category': 'productive'},
            {'title': 'Google Cloud Platform GCP Functions', 'domain': 'cloud.google.com', 'category': 'productive'},
            {'title': 'CI CD Pipeline GitHub Actions Deploy', 'domain': 'github.com', 'category': 'productive'},
            # Design
            {'title': 'UI UX Design Figma Prototyping', 'domain': 'figma.com', 'category': 'productive'},
            {'title': 'Color Theory Typography Web Design', 'domain': 'dribbble.com', 'category': 'productive'},
        ]

        self._corpus = [self._extract_text_from_entry(e) for e in synthetic_entries]
        result = self._fit_pipeline()
        result['data_source'] = 'synthetic'
        return result

    def _fit_pipeline(self):
        """Fit the TF-IDF → SVD → KMeans pipeline"""
        # Step 1: TF-IDF
        self._tfidf_matrix = self.tfidf.fit_transform(self._corpus)

        # Step 2: Truncated SVD (LSA)
        n_components = min(50, len(self._corpus) - 1, self._tfidf_matrix.shape[1] - 1)
        if n_components < 2:
            n_components = 2
        self.svd = TruncatedSVD(n_components=n_components, random_state=42)
        self._lsa_matrix = self.svd.fit_transform(self._tfidf_matrix)

        # Step 3: Cluster in LSA space
        n_clusters = min(8, len(self._corpus))
        self.clusterer = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, n_init=3)
        self._labels = self.clusterer.fit_predict(self._lsa_matrix)

        # Step 4: Extract topic keywords per cluster
        self._extract_topics()

        self.is_trained = True
        explained_var = float(np.sum(self.svd.explained_variance_ratio_))

        print(f"  [NLPAnalyzer] Trained on {len(self._corpus)} documents, "
              f"{n_clusters} clusters, {n_components} LSA dims, "
              f"explained variance: {explained_var:.3f}")

        return {
            'status': 'trained',
            'documents': len(self._corpus),
            'vocabulary_size': len(self.tfidf.vocabulary_),
            'lsa_dimensions': n_components,
            'explained_variance': round(explained_var, 4),
            'clusters': n_clusters,
            'topic_keywords': self._topic_keywords
        }

    def _extract_topics(self):
        """Extract top keywords for each cluster"""
        feature_names = self.tfidf.get_feature_names_out()
        self._topic_keywords = {}

        for cluster_id in range(self.clusterer.n_clusters):
            # Get documents in this cluster
            mask = self._labels == cluster_id
            if not np.any(mask):
                continue

            # Average TF-IDF for cluster
            cluster_tfidf = self._tfidf_matrix[mask].mean(axis=0)
            cluster_array = np.asarray(cluster_tfidf).flatten()

            # Top keywords
            top_indices = cluster_array.argsort()[-8:][::-1]
            keywords = [feature_names[i] for i in top_indices if cluster_array[i] > 0]

            self._topic_keywords[f'topic_{cluster_id}'] = {
                'keywords': keywords[:6],
                'size': int(np.sum(mask)),
                'label': self._infer_topic_label(keywords)
            }

    def _infer_topic_label(self, keywords):
        """Infer a human-readable topic label from keywords"""
        keyword_str = ' '.join(keywords).lower()

        topic_patterns = {
            'Programming & Development': ['python', 'javascript', 'code', 'programming', 'react', 'node', 'api', 'git', 'typescript'],
            'Data Science & ML': ['machine', 'learning', 'data', 'neural', 'tensorflow', 'pandas', 'kaggle', 'model', 'sklearn'],
            'Web Development': ['css', 'html', 'web', 'frontend', 'backend', 'design', 'layout', 'flexbox', 'grid'],
            'Cloud & DevOps': ['aws', 'cloud', 'docker', 'kubernetes', 'deploy', 'serverless', 'lambda', 'pipeline'],
            'Research & Academic': ['paper', 'research', 'academic', 'journal', 'arxiv', 'scholar', 'mathematics'],
            'Design & Creative': ['design', 'figma', 'typography', 'color', 'prototyping', 'dribbble'],
            'Social & Communication': ['social', 'media', 'post', 'community', 'discussion', 'reddit', 'twitter'],
            'Entertainment': ['video', 'music', 'streaming', 'watch', 'movie', 'spotify'],
            'News & Information': ['news', 'headlines', 'world', 'events', 'today'],
        }

        best_match = 'General'
        best_score = 0
        for label, pattern_words in topic_patterns.items():
            score = sum(1 for pw in pattern_words if pw in keyword_str)
            if score > best_score:
                best_score = score
                best_match = label

        return best_match

    def analyze_content(self, browsing_entries):
        """
        Analyze a set of browsing entries and return NLP insights.

        Returns:
            {
                'topics': [...],
                'content_clusters': [...],
                'learning_pathway': [...],
                'vocabulary_richness': float,
                'content_diversity': float
            }
        """
        if not self.is_trained:
            self._train_with_synthetic()

        if not browsing_entries:
            return {'error': 'No content to analyze', 'topics': []}

        # Process entries
        texts = [self._extract_text_from_entry(e) for e in browsing_entries]
        texts = [t for t in texts if len(t.strip()) > 5]

        if not texts:
            return {'error': 'No analyzable content', 'topics': []}

        # Transform through pipeline
        tfidf_vectors = self.tfidf.transform(texts)
        lsa_vectors = self.svd.transform(tfidf_vectors)

        # Assign to clusters
        cluster_labels = self.clusterer.predict(lsa_vectors)

        # Collect topic distribution
        topic_dist = Counter(cluster_labels)
        topics = []
        for cluster_id, count in topic_dist.most_common():
            topic_key = f'topic_{cluster_id}'
            if topic_key in self._topic_keywords:
                topic_info = self._topic_keywords[topic_key]
                topics.append({
                    'id': cluster_id,
                    'label': topic_info['label'],
                    'keywords': topic_info['keywords'],
                    'document_count': count,
                    'relevance': round(count / len(texts), 3)
                })

        # Compute content similarity matrix
        if len(lsa_vectors) > 1:
            sim_matrix = cosine_similarity(lsa_vectors)
            avg_similarity = float(np.mean(sim_matrix[np.triu_indices_from(sim_matrix, k=1)]))
        else:
            avg_similarity = 1.0

        # Vocabulary richness: unique terms / total terms
        all_text = ' '.join(texts)
        tokens = all_text.split()
        vocab_richness = len(set(tokens)) / max(len(tokens), 1)

        # Content diversity: how spread across clusters
        cluster_entropy = self._entropy(list(topic_dist.values()))
        max_entropy = np.log2(max(self.clusterer.n_clusters, 1))
        content_diversity = cluster_entropy / max(max_entropy, 1)

        # Learning pathway: ordered topic progression
        pathway = self._build_learning_pathway(topics)

        return {
            'topics': topics,
            'learning_pathway': pathway,
            'vocabulary_richness': round(vocab_richness, 4),
            'content_diversity': round(content_diversity, 4),
            'avg_content_similarity': round(avg_similarity, 4),
            'total_documents_analyzed': len(texts),
            'model': 'TF-IDF + Truncated SVD (LSA) + MiniBatch K-Means',
            'algorithm': 'Natural Language Processing',
            'timestamp': datetime.now().isoformat()
        }

    def find_similar_content(self, query_text, top_k=5):
        """Find most similar content in the corpus to a query"""
        if not self.is_trained or not self._corpus:
            return []

        processed = self._preprocess_text(query_text)
        if not processed:
            return []

        query_tfidf = self.tfidf.transform([processed])
        query_lsa = self.svd.transform(query_tfidf)

        similarities = cosine_similarity(query_lsa, self._lsa_matrix)[0]
        top_indices = similarities.argsort()[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                'content': self._corpus[idx][:100],
                'similarity': round(float(similarities[idx]), 4),
                'cluster': int(self._labels[idx])
            })
        return results

    def _build_learning_pathway(self, topics):
        """
        Build a suggested learning pathway from detected topics.
        Orders topics from foundational to advanced.
        """
        # Priority order for learning pathways
        priority = {
            'Research & Academic': 1,
            'Programming & Development': 2,
            'Data Science & ML': 3,
            'Web Development': 4,
            'Cloud & DevOps': 5,
            'Design & Creative': 6,
            'General': 7,
            'News & Information': 8,
            'Social & Communication': 9,
            'Entertainment': 10
        }

        sorted_topics = sorted(
            topics,
            key=lambda t: priority.get(t['label'], 7)
        )

        pathway = []
        for i, topic in enumerate(sorted_topics):
            pathway.append({
                'step': i + 1,
                'topic': topic['label'],
                'keywords': topic['keywords'][:3],
                'focus_level': 'high' if topic['relevance'] > 0.3 else
                              'medium' if topic['relevance'] > 0.1 else 'low'
            })

        return pathway

    def _entropy(self, counts):
        """Compute Shannon entropy of a distribution"""
        total = sum(counts)
        if total == 0:
            return 0
        probs = [c / total for c in counts if c > 0]
        return -sum(p * np.log2(p) for p in probs)

    def get_model_info(self):
        """Return model metadata"""
        return {
            'name': 'NLP Content Analyzer',
            'algorithm': 'TF-IDF + Truncated SVD (Latent Semantic Analysis)',
            'pipeline': ['TF-IDF Vectorization', 'Truncated SVD (LSA)', 'MiniBatch K-Means'],
            'lsa_dimensions': self.svd.n_components if hasattr(self.svd, 'components_') else 50,
            'vocabulary_size': len(self.tfidf.vocabulary_) if hasattr(self.tfidf, 'vocabulary_') and self.tfidf.vocabulary_ else 0,
            'corpus_size': len(self._corpus),
            'is_trained': self.is_trained,
            'explained_variance': round(float(np.sum(self.svd.explained_variance_ratio_)), 4)
                if hasattr(self.svd, 'explained_variance_ratio_') else 0
        }

    def _save_model(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.is_trained:
            joblib.dump({
                'tfidf': self.tfidf,
                'svd': self.svd,
                'clusterer': self.clusterer,
                'corpus': self._corpus,
                'tfidf_matrix': self._tfidf_matrix,
                'lsa_matrix': self._lsa_matrix,
                'labels': self._labels,
                'topic_keywords': self._topic_keywords
            }, self.model_path)

    def _load_model(self):
        """Load model from disk"""
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.tfidf = data['tfidf']
            self.svd = data['svd']
            self.clusterer = data['clusterer']
            self._corpus = data['corpus']
            self._tfidf_matrix = data['tfidf_matrix']
            self._lsa_matrix = data['lsa_matrix']
            self._labels = data['labels']
            self._topic_keywords = data['topic_keywords']
            self.is_trained = True
            return True
        return False
