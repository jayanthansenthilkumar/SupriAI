import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Sparkles, Star, BookOpen, RefreshCw } from 'lucide-react';
import { getLearningRecommendations, getContentAnalysis } from '../services/api';

export default function Curate() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setStep(1);
    try {
      const [recs, content] = await Promise.all([
        getLearningRecommendations({ top_k: 8 }).catch(() => null),
        getContentAnalysis({ domains: [] }).catch(() => null),
      ]);
      setRecommendations(recs);
      setAnalysis(content);
      setStep(2);
    } catch (err) {
      console.error('Curation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setRecommendations(null);
    setAnalysis(null);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Bookmark size={24} /> AI Content Curation</h2>
        {step > 0 && (
          <button className="btn btn-outline" onClick={handleReset}>
            <RefreshCw size={14} /> Reset
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="steps">
        <div className={`step ${step >= 0 ? 'active' : ''}`}>
          <span className="step-num">1</span> Analyze Intent
        </div>
        <div className="step-line" />
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-num">2</span> Rate Content
        </div>
        <div className="step-line" />
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-num">3</span> Learning Plan
        </div>
      </div>

      {step === 0 && (
        <motion.div className="card text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Sparkles size={48} color="var(--primary-color)" style={{ marginBottom: '16px' }} />
          <h3>AI-Powered Content Curation</h3>
          <p className="text-secondary">
            Analyze your browsing patterns using ML models to generate personalized
            learning recommendations and content quality ratings.
          </p>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading} style={{ marginTop: '16px' }}>
            <BrainIcon /> Start Analysis
          </button>
        </motion.div>
      )}

      {step === 1 && loading && (
        <motion.div className="card text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RefreshCw size={48} className="spin" color="var(--primary-color)" style={{ marginBottom: '16px' }} />
          <h3>Analyzing your browsing data...</h3>
          <p className="text-secondary">Running ML models to generate recommendations</p>
        </motion.div>
      )}

      {step === 2 && (
        <>
          {/* Content Analysis */}
          {analysis && !analysis.error && (
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3><BookOpen size={18} /> Content Analysis</h3>
              {analysis.topics && analysis.topics.length > 0 && (
                <div>
                  <h4>Detected Topics</h4>
                  <div className="tag-list">
                    {analysis.topics.map((t, i) => (
                      <span key={i} className="tag">{typeof t === 'string' ? t : t.topic || t.name || JSON.stringify(t)}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.content_diversity !== undefined && (
                <p><strong>Content Diversity:</strong> {Math.round(analysis.content_diversity * 100)}%</p>
              )}
              {analysis.vocabulary_richness !== undefined && (
                <p><strong>Vocabulary Richness:</strong> {Math.round(analysis.vocabulary_richness * 100)}%</p>
              )}
            </motion.div>
          )}

          {/* Learning Recommendations */}
          {recommendations?.recommendations && (
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <h3><Star size={18} /> Learning Recommendations</h3>
              <div className="rec-grid">
                {recommendations.recommendations.map((rec, i) => (
                  <motion.div key={i} className="rec-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}>
                    <div className="rec-header">
                      <span className="rec-category">{rec.category || 'General'}</span>
                      <span className="rec-score">{Math.round((rec.score || 0) * 100)}%</span>
                    </div>
                    {rec.resources && rec.resources.length > 0 && (
                      <div className="rec-resources">
                        {rec.resources.slice(0, 3).map((r, j) => (
                          <a key={j} href={r.url} target="_blank" rel="noopener noreferrer" className="rec-link">
                            {r.title || r.name || r.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {!recommendations?.recommendations && !analysis && (
            <div className="card">
              <p className="empty-text">No recommendations available. Ensure the Python backend is running and has training data.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BrainIcon() {
  return <Sparkles size={16} />;
}
