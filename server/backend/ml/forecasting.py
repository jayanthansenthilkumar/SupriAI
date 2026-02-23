"""
Browsing Time Series Forecasting using Linear Regression + Exponential Smoothing
ML Algorithm #5: Time Series Forecasting

Predicts future browsing patterns:
- Expected browsing time for next day/week
- Category usage trends
- Peak activity hour predictions
- Productivity trend forecasting
"""
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge
from scipy.signal import savgol_filter
import joblib
import os
from datetime import datetime, timedelta
import config


class TimeSeriesForecaster:
    """
    Time Series forecasting for browsing behavior.
    
    Uses combination of:
    - Linear Regression for trend detection
    - Exponential Smoothing for seasonal patterns
    - Moving averages for smoothing
    
    Predicts:
    - Daily total browsing time
    - Category-wise time trends
    - Productivity score trend
    """

    def __init__(self):
        self.trend_model = None
        self.alpha = 0.3  # Exponential smoothing parameter
        self.model_path = os.path.join(config.ML_MODEL_DIR, 'time_series.pkl')
        self.history = {
            'total_time': [],
            'productive_time': [],
            'social_time': [],
            'entertainment_time': [],
            'productivity_scores': [],
            'dates': []
        }

    def add_data_point(self, date, data):
        """Add a daily data point"""
        self.history['dates'].append(date)
        self.history['total_time'].append(data.get('total_time', 0))
        self.history['productive_time'].append(data.get('productive_time', 0))
        self.history['social_time'].append(data.get('social_time', 0))
        self.history['entertainment_time'].append(data.get('entertainment_time', 0))
        self.history['productivity_scores'].append(data.get('productivity_score', 50))

    def load_history(self, records):
        """Load historical data for training"""
        self.history = {
            'total_time': [],
            'productive_time': [],
            'social_time': [],
            'entertainment_time': [],
            'productivity_scores': [],
            'dates': []
        }
        for record in records:
            cat = record.get('category_times', {})
            self.history['dates'].append(record.get('date'))
            self.history['total_time'].append(record.get('total_time', 0))
            self.history['productive_time'].append(cat.get('productive', 0))
            self.history['social_time'].append(cat.get('social', 0))
            self.history['entertainment_time'].append(cat.get('entertainment', 0))
            self.history['productivity_scores'].append(record.get('productivity_score', 50))

    def train(self):
        """Train the forecasting models"""
        n = len(self.history['dates'])
        if n < 7:
            return {'error': f'Need at least 7 days of data, got {n}'}

        results = {}
        
        # Train trend model for each series
        X = np.arange(n).reshape(-1, 1)
        
        for series_name in ['total_time', 'productive_time', 'social_time',
                            'entertainment_time', 'productivity_scores']:
            y = np.array(self.history[series_name])
            
            # Fit linear trend
            model = Ridge(alpha=1.0)
            model.fit(X, y)
            
            trend_direction = 'increasing' if model.coef_[0] > 0 else 'decreasing'
            trend_strength = abs(float(model.coef_[0]))

            # Calculate exponential smoothing values
            smoothed = self._exponential_smoothing(y)
            
            results[series_name] = {
                'trend': trend_direction,
                'trend_strength': round(trend_strength, 3),
                'current_value': round(float(y[-1]), 2),
                'smoothed_value': round(float(smoothed[-1]), 2),
                'mean': round(float(np.mean(y)), 2),
                'std': round(float(np.std(y)), 2)
            }

        self.trend_model = results
        self._save_model()

        return {
            'training_days': n,
            'trends': results
        }

    def forecast(self, days_ahead=7):
        """Forecast future browsing patterns"""
        n = len(self.history['dates'])
        if n < 3:
            return {'error': 'Insufficient data for forecasting'}

        forecasts = {}
        
        for series_name in ['total_time', 'productive_time', 'social_time',
                            'entertainment_time', 'productivity_scores']:
            y = np.array(self.history[series_name])
            
            # Combine trend + exponential smoothing
            X = np.arange(n).reshape(-1, 1)
            model = Ridge(alpha=1.0)
            model.fit(X, y)

            # Forecast
            future_X = np.arange(n, n + days_ahead).reshape(-1, 1)
            trend_forecast = model.predict(future_X)

            # Apply exponential smoothing adjustment
            smoothed = self._exponential_smoothing(y)
            last_smooth = smoothed[-1]
            last_trend = model.predict(X[-1:])
            adjustment = last_smooth - last_trend[0]
            
            adjusted_forecast = trend_forecast + adjustment

            # Ensure non-negative
            adjusted_forecast = np.maximum(adjusted_forecast, 0)

            # Generate dates
            if self.history['dates'] and self.history['dates'][-1]:
                try:
                    last_date = datetime.strptime(self.history['dates'][-1], '%Y-%m-%d')
                    forecast_dates = [(last_date + timedelta(days=i+1)).strftime('%Y-%m-%d')
                                     for i in range(days_ahead)]
                except (ValueError, TypeError):
                    forecast_dates = [f'Day +{i+1}' for i in range(days_ahead)]
            else:
                forecast_dates = [f'Day +{i+1}' for i in range(days_ahead)]

            # Confidence bands (wider as we go further)
            std = np.std(y)
            confidence_multiplier = np.array([1 + 0.1 * i for i in range(days_ahead)])
            upper = adjusted_forecast + std * confidence_multiplier
            lower = np.maximum(adjusted_forecast - std * confidence_multiplier, 0)

            forecasts[series_name] = {
                'values': [round(float(v), 2) for v in adjusted_forecast],
                'dates': forecast_dates,
                'upper_bound': [round(float(v), 2) for v in upper],
                'lower_bound': [round(float(v), 2) for v in lower],
                'trend': 'increasing' if model.coef_[0] > 0 else 'decreasing'
            }

        # Overall summary
        total_forecast = forecasts.get('total_time', {}).get('values', [])
        prod_forecast = forecasts.get('productivity_scores', {}).get('values', [])

        summary = {
            'forecast_period': f'{days_ahead} days',
            'expected_avg_daily_time': round(np.mean(total_forecast), 2) if total_forecast else 0,
            'expected_productivity_trend': forecasts.get('productivity_scores', {}).get('trend', 'stable'),
            'expected_avg_productivity': round(np.mean(prod_forecast), 1) if prod_forecast else 50
        }

        return {
            'forecasts': forecasts,
            'summary': summary
        }

    def _exponential_smoothing(self, data, alpha=None):
        """Simple exponential smoothing"""
        alpha = alpha or self.alpha
        n = len(data)
        smoothed = np.zeros(n)
        smoothed[0] = data[0]
        
        for i in range(1, n):
            smoothed[i] = alpha * data[i] + (1 - alpha) * smoothed[i - 1]
        
        return smoothed

    def get_trend_analysis(self):
        """Get current trend analysis"""
        if not self.history['dates'] or len(self.history['dates']) < 3:
            return {'error': 'Insufficient data'}

        analysis = {}
        for series_name in ['total_time', 'productivity_scores']:
            y = np.array(self.history[series_name])
            
            # Short-term trend (last 7 days)
            recent = y[-min(7, len(y)):]
            short_trend = np.mean(np.diff(recent)) if len(recent) > 1 else 0
            
            # Long-term trend
            long_trend = np.mean(np.diff(y)) if len(y) > 1 else 0

            # Moving averages
            ma_7 = np.mean(y[-7:]) if len(y) >= 7 else np.mean(y)
            ma_30 = np.mean(y[-30:]) if len(y) >= 30 else np.mean(y)

            analysis[series_name] = {
                'short_term_trend': 'increasing' if short_trend > 0 else 'decreasing',
                'long_term_trend': 'increasing' if long_trend > 0 else 'decreasing',
                'ma_7': round(float(ma_7), 2),
                'ma_30': round(float(ma_30), 2),
                'current': round(float(y[-1]), 2),
                'is_improving': (series_name == 'productivity_scores' and short_trend > 0) or
                               (series_name == 'total_time' and short_trend < 0)
            }

        return analysis

    def get_model_info(self):
        """Get model information"""
        return {
            'algorithm': 'Linear Regression + Exponential Smoothing',
            'smoothing_alpha': self.alpha,
            'data_points': len(self.history.get('dates', [])),
            'trained': self.trend_model is not None
        }

    def _save_model(self):
        """Save model"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump({
            'history': self.history,
            'trend_model': self.trend_model,
            'alpha': self.alpha
        }, self.model_path)

    def _load_model(self):
        """Load model"""
        if os.path.exists(self.model_path):
            data = joblib.load(self.model_path)
            self.history = data['history']
            self.trend_model = data['trend_model']
            self.alpha = data.get('alpha', 0.3)
            return True
        return False
