"""
Focus Time Recommender using Decision Tree
ML Algorithm #6: Decision Tree Classifier

Recommends optimal focus times and break schedules based on 
browsing patterns, time of day, and historical productivity data.
"""
import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os
from datetime import datetime
import config


class FocusRecommender:
    """
    Decision Tree-based Focus Time Recommender.
    
    Classifies browsing sessions into:
    - 'deep_focus': Long productive stretches (>45 min productive)
    - 'light_work': Mixed productive browsing (20-45 min productive)
    - 'break_needed': Signs of fatigue/distraction
    - 'leisure': Intentional leisure time
    
    Recommends actions based on current state.
    """

    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'focus_recommender.pkl')
        self.feature_names = [
            'hour_of_day', 'day_of_week', 'productive_ratio',
            'social_ratio', 'entertainment_ratio',
            'minutes_since_last_break', 'current_session_length',
            'tab_switch_frequency', 'unique_domains_last_hour',
            'productivity_score_today'
        ]
        self.classes = ['deep_focus', 'light_work', 'break_needed', 'leisure']
        self.label_encoder.fit(self.classes)
        self.tree_rules = ""
        if self._load_model():
            print("  [FocusRecommender] Loaded saved model from disk.")
        else:
            print("  [FocusRecommender] No saved model found, will train when data is available.")

    def prepare_features(self, sessions):
        """Prepare feature vectors from session data"""
        features = []
        for session in sessions:
            feature_vector = [
                session.get('hour_of_day', 12) / 24.0,
                session.get('day_of_week', 0) / 6.0,
                session.get('productive_ratio', 0.5),
                session.get('social_ratio', 0.0),
                session.get('entertainment_ratio', 0.0),
                min(session.get('minutes_since_break', 30) / 120.0, 1.0),
                min(session.get('session_length', 30) / 120.0, 1.0),
                min(session.get('tab_switches', 5) / 30.0, 1.0),
                min(session.get('unique_domains_hour', 3) / 15.0, 1.0),
                session.get('productivity_score', 50) / 100.0
            ]
            features.append(feature_vector)
        return np.array(features)

    def _generate_training_data(self):
        """Generate synthetic training data based on expert rules"""
        np.random.seed(42)
        n_samples = 500
        sessions = []
        labels = []

        for _ in range(n_samples):
            hour = np.random.randint(0, 24)
            day = np.random.randint(0, 7)
            prod_ratio = np.random.beta(2, 3)
            social_ratio = np.random.beta(1, 5)
            ent_ratio = np.random.beta(1, 4)
            # Normalize
            total = prod_ratio + social_ratio + ent_ratio + 0.1
            prod_ratio /= total
            social_ratio /= total
            ent_ratio /= total

            break_minutes = np.random.exponential(45)
            session_length = np.random.exponential(40)
            tab_switches = np.random.poisson(8)
            unique_domains = np.random.poisson(5)
            prod_score = np.clip(np.random.normal(55, 20), 0, 100)

            session = {
                'hour_of_day': hour,
                'day_of_week': day,
                'productive_ratio': prod_ratio,
                'social_ratio': social_ratio,
                'entertainment_ratio': ent_ratio,
                'minutes_since_break': break_minutes,
                'session_length': session_length,
                'tab_switches': tab_switches,
                'unique_domains_hour': unique_domains,
                'productivity_score': prod_score
            }
            sessions.append(session)

            # Determine label based on rules
            if prod_ratio > 0.6 and tab_switches < 10 and break_minutes < 90:
                labels.append('deep_focus')
            elif prod_ratio > 0.35 and social_ratio < 0.25:
                labels.append('light_work')
            elif break_minutes > 90 or tab_switches > 20 or (social_ratio + ent_ratio > 0.6):
                labels.append('break_needed')
            else:
                labels.append('leisure')

        return sessions, labels

    def train(self, sessions=None, labels=None):
        """Train the Decision Tree"""
        if sessions is None or labels is None:
            sessions, labels = self._generate_training_data()

        X = self.prepare_features(sessions)
        y = self.label_encoder.transform(labels)

        self.model = DecisionTreeClassifier(
            max_depth=8,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            class_weight='balanced'
        )
        self.model.fit(X, y)

        # Extract tree rules for interpretability
        self.tree_rules = export_text(
            self.model,
            feature_names=self.feature_names,
            max_depth=5
        )

        # Cross-validation
        cv_scores = cross_val_score(self.model, X, y, cv=5, scoring='accuracy')

        # Feature importance
        importance = dict(zip(
            self.feature_names,
            [round(float(imp), 4) for imp in self.model.feature_importances_]
        ))

        self._save_model()

        return {
            'accuracy': round(float(np.mean(cv_scores)), 3),
            'accuracy_std': round(float(np.std(cv_scores)), 3),
            'feature_importance': dict(sorted(importance.items(),
                                              key=lambda x: x[1], reverse=True)),
            'tree_depth': self.model.get_depth(),
            'n_leaves': self.model.get_n_leaves(),
            'training_samples': len(sessions)
        }

    def recommend(self, current_state):
        """Get focus recommendation for current state"""
        if not self.model:
            self.train()  # Train with synthetic data

        X = self.prepare_features([current_state])
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        predicted_class = self.label_encoder.inverse_transform([prediction])[0]
        
        # Get probabilities for each class
        class_probs = {}
        for cls, prob in zip(self.label_encoder.classes_, probabilities):
            class_probs[cls] = round(float(prob), 3)

        recommendation = self._generate_recommendation(predicted_class, current_state)

        return {
            'state': predicted_class,
            'confidence': round(float(max(probabilities)), 3),
            'class_probabilities': class_probs,
            'recommendation': recommendation
        }

    def _generate_recommendation(self, state, current_state):
        """Generate actionable recommendation"""
        hour = current_state.get('hour_of_day', 12)
        minutes_since_break = current_state.get('minutes_since_break', 30)
        session_length = current_state.get('session_length', 30)

        recommendations = {
            'deep_focus': {
                'title': 'Deep Focus Mode',
                'icon': '🎯',
                'message': 'You\'re in a great focus state! Keep going.',
                'actions': [
                    f'Continue focused work for {max(15, 60 - int(session_length))} more minutes',
                    'Minimize tab switches to maintain flow',
                    'Consider using a Pomodoro timer',
                    'Block distracting sites temporarily'
                ],
                'suggested_break_in': max(15, 90 - int(minutes_since_break)),
                'color': '#34A853'
            },
            'light_work': {
                'title': 'Light Work Mode',
                'icon': '💡',
                'message': 'You\'re being moderately productive.',
                'actions': [
                    'Try to focus on one task at a time',
                    'Close unnecessary tabs',
                    'Set a specific goal for the next 30 minutes',
                    'Reduce social media check frequency'
                ],
                'suggested_break_in': max(10, 60 - int(minutes_since_break)),
                'color': '#4285F4'
            },
            'break_needed': {
                'title': 'Break Recommended',
                'icon': '☕',
                'message': 'Your focus seems to be declining. Time for a break!',
                'actions': [
                    'Take a 5-10 minute break away from the screen',
                    'Stretch or do a quick walk',
                    'Hydrate and rest your eyes',
                    'Review your goals for the day'
                ],
                'suggested_break_in': 0,
                'color': '#FBBC05'
            },
            'leisure': {
                'title': 'Leisure Time',
                'icon': '🎮',
                'message': 'Enjoy your leisure browsing!',
                'actions': [
                    'It\'s okay to relax, but set a time limit',
                    f'Consider returning to productive work by {(hour + 1) % 24}:00',
                    'Use this time mindfully',
                    'Explore something new and interesting'
                ],
                'suggested_break_in': 30,
                'color': '#EA4335'
            }
        }

        return recommendations.get(state, recommendations['light_work'])

    def get_optimal_schedule(self, historical_data):
        """Generate optimal daily schedule based on patterns"""
        if not historical_data:
            return self._default_schedule()

        # Analyze peak productivity hours
        hourly_productivity = {}
        for record in historical_data:
            hour = record.get('hour_of_day', 12)
            score = record.get('productivity_score', 50)
            if hour not in hourly_productivity:
                hourly_productivity[hour] = []
            hourly_productivity[hour].append(score)

        # Calculate average productivity per hour
        avg_by_hour = {}
        for hour, scores in hourly_productivity.items():
            avg_by_hour[hour] = np.mean(scores)

        # Find peak hours
        if avg_by_hour:
            sorted_hours = sorted(avg_by_hour.items(), key=lambda x: x[1], reverse=True)
            peak_hours = [h for h, _ in sorted_hours[:4]]
        else:
            peak_hours = [9, 10, 14, 15]

        schedule = {
            'peak_productivity_hours': sorted(peak_hours),
            'recommended_breaks': self._calculate_break_times(peak_hours),
            'focus_blocks': self._create_focus_blocks(peak_hours),
            'tips': [
                f'Your most productive hours are around {", ".join(f"{h}:00" for h in sorted(peak_hours[:2]))}',
                'Schedule deep work during peak hours',
                'Use low-productivity hours for emails and meetings',
                'Take breaks every 60-90 minutes'
            ]
        }

        return schedule

    def _calculate_break_times(self, peak_hours):
        """Calculate recommended break times"""
        breaks = []
        sorted_peaks = sorted(peak_hours)
        for i in range(len(sorted_peaks) - 1):
            mid = (sorted_peaks[i] + sorted_peaks[i + 1]) // 2
            breaks.append(f'{mid}:00')
        return breaks

    def _create_focus_blocks(self, peak_hours):
        """Create focus time blocks"""
        blocks = []
        sorted_peaks = sorted(peak_hours)
        for hour in sorted_peaks:
            blocks.append({
                'start': f'{hour:02d}:00',
                'end': f'{(hour + 1) % 24:02d}:30',
                'type': 'deep_focus',
                'duration': 90
            })
        return blocks

    def _default_schedule(self):
        """Default schedule when no data available"""
        return {
            'peak_productivity_hours': [9, 10, 14, 15],
            'recommended_breaks': ['11:00', '13:00', '16:00'],
            'focus_blocks': [
                {'start': '9:00', 'end': '10:30', 'type': 'deep_focus', 'duration': 90},
                {'start': '10:45', 'end': '12:00', 'type': 'light_work', 'duration': 75},
                {'start': '14:00', 'end': '15:30', 'type': 'deep_focus', 'duration': 90},
                {'start': '15:45', 'end': '17:00', 'type': 'light_work', 'duration': 75}
            ],
            'tips': [
                'Start tracking your browsing to get personalized recommendations',
                'Generally, morning hours tend to be most productive',
                'Take regular breaks every 60-90 minutes'
            ]
        }

    def export_tree_json(self, max_depth=4):
        """Export decision tree as nested JSON for visualization"""
        if not self.model:
            return None
        
        tree = self.model.tree_
        feature_names = self.feature_names
        try:
            class_names = list(self.label_encoder.classes_)
        except Exception:
            class_names = self.classes

        def build_node(node_id, depth=0):
            if depth >= max_depth or tree.children_left[node_id] == -1:
                # Leaf node
                class_idx = int(np.argmax(tree.value[node_id]))
                samples = int(tree.n_node_samples[node_id])
                max_val = float(np.max(tree.value[node_id]))
                return {
                    'type': 'leaf',
                    'class': class_names[class_idx] if class_idx < len(class_names) else f'class_{class_idx}',
                    'samples': samples,
                    'confidence': round(max_val / samples, 2) if samples > 0 else 0
                }
            
            feature_idx = int(tree.feature[node_id])
            threshold = float(tree.threshold[node_id])
            return {
                'type': 'split',
                'feature': feature_names[feature_idx] if feature_idx < len(feature_names) else f'feature_{feature_idx}',
                'threshold': round(threshold, 3),
                'samples': int(tree.n_node_samples[node_id]),
                'left': build_node(int(tree.children_left[node_id]), depth + 1),
                'right': build_node(int(tree.children_right[node_id]), depth + 1)
            }

        return build_node(0)

    def get_model_info(self):
        """Get model information"""
        return {
            'algorithm': 'Decision Tree Classifier',
            'classes': self.classes,
            'max_depth': 8,
            'features': self.feature_names,
            'trained': self.model is not None,
            'tree_rules_preview': self.tree_rules[:500] if self.tree_rules else ''
        }

    def _save_model(self):
        """Save model"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        if self.model:
            joblib.dump({
                'model': self.model,
                'label_encoder': self.label_encoder,
                'tree_rules': self.tree_rules
            }, self.model_path)

    def _load_model(self):
        """Load model"""
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data['model']
                self.label_encoder = data['label_encoder']
                self.tree_rules = data.get('tree_rules', '')
                return True
            except Exception as e:
                print(f"  [FocusRecommender] Failed to load saved model: {e}")
                try:
                    os.remove(self.model_path)
                except OSError:
                    pass
        return False
