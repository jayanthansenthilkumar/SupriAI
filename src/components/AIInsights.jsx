import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BrainCircuit, RefreshCw, Cpu, TreePine, GitBranch,
  AlertTriangle, TrendingUp, Focus, Lightbulb, BookOpen,
  Users, Timer
} from 'lucide-react';
import { trainAllModels, getMLInsights } from '../services/api';

const MODEL_CARDS = [
  { id: 'classifier', name: 'Naive Bayes', desc: 'Website Category Classification', icon: <GitBranch size={20} />, color: '#1a73e8' },
  { id: 'clustering', name: 'K-Means', desc: 'Browsing Habit Clustering', icon: <Cpu size={20} />, color: '#188038' },
  { id: 'productivity', name: 'Random Forest', desc: 'Productivity Score Prediction', icon: <TrendingUp size={20} />, color: '#f9ab00' },
  { id: 'anomaly', name: 'Isolation Forest', desc: 'Anomaly Detection', icon: <AlertTriangle size={20} />, color: '#d93025' },
  { id: 'forecasting', name: 'Ridge + ES', desc: 'Time Series Forecasting', icon: <TreePine size={20} />, color: '#9334e6' },
  { id: 'focus', name: 'Decision Tree', desc: 'Focus Recommendation', icon: <Focus size={20} />, color: '#00897b' },
  { id: 'deep_recommender', name: 'MLP Neural Net', desc: 'Learning Recommendations', icon: <Lightbulb size={20} />, color: '#e8710a' },
  { id: 'nlp_analyzer', name: 'TF-IDF + LSA', desc: 'NLP Content Analysis', icon: <BookOpen size={20} />, color: '#1557b0' },
  { id: 'collaborative', name: 'Neural CF', desc: 'Collaborative Filtering', icon: <Users size={20} />, color: '#c5221f' },
  { id: 'temporal', name: 'Temporal MLP', desc: 'Time Pattern Prediction', icon: <Timer size={20} />, color: '#137333' },
];

export default function AIInsights() {
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrain = async () => {
    setTraining(true);
    try {
      const result = await trainAllModels();
      setTrainResult(result);
    } catch (err) {
      setTrainResult({ error: err.message || 'Training failed — is Python backend running?' });
    } finally {
      setTraining(false);
    }
  };

  const handleGetInsights = async () => {
    setLoading(true);
    try {
      const result = await getMLInsights();
      setInsights(result);
    } catch (err) {
      setInsights({ error: err.message || 'Failed to get insights' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><BrainCircuit size={24} /> AI Insights — 10 ML Models</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleTrain} disabled={training}>
            <RefreshCw size={14} className={training ? 'spin' : ''} />
            {training ? 'Training...' : 'Train All Models'}
          </button>
          <button className="btn btn-outline" onClick={handleGetInsights} disabled={loading}>
            {loading ? 'Loading...' : 'Get Insights'}
          </button>
        </div>
      </div>

      {/* Model Grid */}
      <div className="model-grid">
        {MODEL_CARDS.map((model, i) => {
          const result = trainResult?.results?.[model.id];
          const insight = insights?.[model.id.replace('_', '_')];
          return (
            <motion.div
              key={model.id}
              className="model-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="model-icon" style={{ background: model.color + '20', color: model.color }}>
                {model.icon}
              </div>
              <div className="model-info">
                <h4>{model.name}</h4>
                <p>{model.desc}</p>
                {result && !result.error && (
                  <span className="badge badge-success">Trained</span>
                )}
                {result?.error && (
                  <span className="badge badge-error">Error</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Training Results */}
      {trainResult && (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Training Results</h3>
          {trainResult.error ? (
            <div className="alert alert-error">{trainResult.error}</div>
          ) : (
            <div className="results-grid">
              {trainResult.results && Object.entries(trainResult.results).map(([key, val]) => (
                <div key={key} className="result-item">
                  <span className="result-key">{key.replace(/_/g, ' ')}</span>
                  <span className="result-val">{typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Comprehensive Insights */}
      {insights && !insights.error && (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3>Comprehensive ML Insights</h3>

          {insights.models_used && (
            <div style={{ marginBottom: '16px' }}>
              <strong>Models Used:</strong>
              <div className="tag-list">
                {insights.models_used.map((m, i) => (
                  <span key={i} className="tag">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Productivity Prediction */}
          {insights.productivity_prediction && (
            <div className="insight-block">
              <h4><TrendingUp size={16} /> Productivity Prediction</h4>
              <div className="insight-value">
                Score: <strong>{Math.round(insights.productivity_prediction.predicted_score || 0)}</strong>
              </div>
            </div>
          )}

          {/* Focus Recommendation */}
          {insights.focus_recommendation && (
            <div className="insight-block">
              <h4><Focus size={16} /> Focus Recommendation</h4>
              <p>{insights.focus_recommendation.recommendation}</p>
              <span className="badge badge-info">{insights.focus_recommendation.focus_state}</span>
            </div>
          )}

          {/* Anomaly Detection */}
          {insights.anomaly_detection && (
            <div className="insight-block">
              <h4><AlertTriangle size={16} /> Anomaly Detection</h4>
              <span className={`badge ${insights.anomaly_detection.is_anomaly ? 'badge-warning' : 'badge-success'}`}>
                {insights.anomaly_detection.is_anomaly ? 'Anomaly Detected' : 'Normal Pattern'}
              </span>
            </div>
          )}

          {/* Learning Recommendations */}
          {insights.learning_recommendations?.recommendations && (
            <div className="insight-block">
              <h4><Lightbulb size={16} /> Learning Recommendations</h4>
              <div className="rec-list">
                {insights.learning_recommendations.recommendations.map((r, i) => (
                  <div key={i} className="rec-item">
                    <span className="rec-category">{r.category}</span>
                    <span className="rec-score">{Math.round((r.score || 0) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Temporal Prediction */}
          {insights.temporal_prediction && (
            <div className="insight-block">
              <h4><Timer size={16} /> Temporal Prediction</h4>
              {insights.temporal_prediction.predictions && (
                <div className="prediction-grid">
                  {Object.entries(insights.temporal_prediction.predictions).map(([k, v]) => (
                    <div key={k} className="prediction-item">
                      <span>{k.replace(/_/g, ' ')}</span>
                      <strong>{typeof v === 'number' ? Math.round(v * 100) / 100 : String(v)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {insights?.error && (
        <div className="alert alert-error">{insights.error}</div>
      )}
    </div>
  );
}
