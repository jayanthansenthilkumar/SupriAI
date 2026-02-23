import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, Server, Database, Shield, Bell, CheckCircle, XCircle } from 'lucide-react';
import { checkHealth, saveSetting, getSettings } from '../services/api';

export default function SettingsPage() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [settings, setSettings] = useState({
    expressUrl: 'http://localhost:3001',
    pythonUrl: 'http://localhost:5000',
    syncInterval: '60',
    inactiveThreshold: '5',
  });
  const [saved, setSaved] = useState(false);
  const [productiveSites, setProductiveSites] = useState('github.com, stackoverflow.com, docs.google.com, linkedin.com');
  const [socialSites, setSocialSites] = useState('facebook.com, twitter.com, instagram.com, youtube.com');
  const [timeLimits, setTimeLimits] = useState('youtube.com:30, facebook.com:20, twitter.com:15');

  useEffect(() => {
    checkBackend();
    loadSettings();
  }, []);

  const checkBackend = async () => {
    try {
      const data = await checkHealth();
      setBackendStatus(data);
    } catch {
      setBackendStatus(null);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await getSettings();
      if (s.productiveSites) setProductiveSites(s.productiveSites);
      if (s.socialSites) setSocialSites(s.socialSites);
      if (s.timeLimits) setTimeLimits(s.timeLimits);
      if (s.syncInterval) setSettings(prev => ({ ...prev, syncInterval: s.syncInterval }));
      if (s.inactiveThreshold) setSettings(prev => ({ ...prev, inactiveThreshold: s.inactiveThreshold }));
    } catch {}
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        saveSetting('productiveSites', productiveSites),
        saveSetting('socialSites', socialSites),
        saveSetting('timeLimits', timeLimits),
        saveSetting('syncInterval', settings.syncInterval),
        saveSetting('inactiveThreshold', settings.inactiveThreshold),
      ]);

      // Also save to Chrome storage if available
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const parsedLimits = {};
        timeLimits.split(',').forEach(entry => {
          const [domain, mins] = entry.trim().split(':');
          if (domain && mins) parsedLimits[domain.trim()] = parseInt(mins.trim());
        });

        chrome.storage.local.set({
          settings: {
            siteLimits: parsedLimits,
            productiveSites: productiveSites.split(',').map(s => s.trim()).filter(Boolean),
            socialSites: socialSites.split(',').map(s => s.trim()).filter(Boolean),
          }
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Settings save error:', err);
    }
  };

  const ML_MODELS = [
    { name: 'Naive Bayes', type: 'ML', desc: 'Website Classification' },
    { name: 'K-Means', type: 'ML', desc: 'Browsing Clustering' },
    { name: 'Random Forest', type: 'ML', desc: 'Productivity Prediction' },
    { name: 'Isolation Forest', type: 'ML', desc: 'Anomaly Detection' },
    { name: 'Ridge + ES', type: 'ML', desc: 'Time Forecasting' },
    { name: 'Decision Tree', type: 'ML', desc: 'Focus Recommendation' },
    { name: 'MLP Neural Net', type: 'DL', desc: 'Learning Recommendations' },
    { name: 'TF-IDF + LSA', type: 'DL', desc: 'NLP Content Analysis' },
    { name: 'Neural CF', type: 'DL', desc: 'Collaborative Filtering' },
    { name: 'Temporal MLP', type: 'DL', desc: 'Time Prediction' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><SettingsIcon size={24} /> Settings</h2>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Backend Status */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3><Server size={18} /> Backend Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span>Express Server (Node.js)</span>
            <span className={`status-dot ${backendStatus ? 'online' : 'offline'}`}>
              {backendStatus ? <><CheckCircle size={14} /> Online</> : <><XCircle size={14} /> Offline</>}
            </span>
          </div>
          <div className="status-item">
            <span>Python Flask (AI/ML)</span>
            <span className={`status-dot ${backendStatus?.python_backend === 'online' ? 'online' : 'offline'}`}>
              {backendStatus?.python_backend === 'online'
                ? <><CheckCircle size={14} /> Online</>
                : <><XCircle size={14} /> Offline</>}
            </span>
          </div>
          <div className="status-item">
            <span>SQLite Database</span>
            <span className="status-dot online"><Database size={14} /> Active</span>
          </div>
        </div>
        <button className="btn btn-outline" onClick={checkBackend} style={{ marginTop: '12px' }}>
          Refresh Status
        </button>
      </motion.div>

      {/* Site Configuration */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h3><Shield size={18} /> Site Configuration</h3>

        <div className="form-group">
          <label>Productive Sites (comma-separated)</label>
          <textarea
            value={productiveSites}
            onChange={e => setProductiveSites(e.target.value)}
            className="input-control textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Social / Distraction Sites (comma-separated)</label>
          <textarea
            value={socialSites}
            onChange={e => setSocialSites(e.target.value)}
            className="input-control textarea"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Time Limits (domain:minutes, comma-separated)</label>
          <textarea
            value={timeLimits}
            onChange={e => setTimeLimits(e.target.value)}
            className="input-control textarea"
            rows={2}
            placeholder="youtube.com:30, facebook.com:20"
          />
        </div>
      </motion.div>

      {/* Sync Settings */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <h3><Bell size={18} /> Sync & Notifications</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Backend Sync Interval (seconds)</label>
            <input
              type="number"
              value={settings.syncInterval}
              onChange={e => setSettings(s => ({ ...s, syncInterval: e.target.value }))}
              className="input-control"
              min={10}
              max={300}
            />
          </div>
          <div className="form-group">
            <label>Inactive Tab Threshold (minutes)</label>
            <input
              type="number"
              value={settings.inactiveThreshold}
              onChange={e => setSettings(s => ({ ...s, inactiveThreshold: e.target.value }))}
              className="input-control"
              min={1}
              max={60}
            />
          </div>
        </div>
      </motion.div>

      {/* ML Models Info */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h3><Database size={18} /> ML/DL Models (10 Algorithms)</h3>
        <div className="model-table">
          <div className="model-table-header">
            <span>#</span>
            <span>Model</span>
            <span>Type</span>
            <span>Purpose</span>
          </div>
          {ML_MODELS.map((m, i) => (
            <div key={i} className="model-table-row">
              <span>{i + 1}</span>
              <span className="model-name">{m.name}</span>
              <span className={`badge ${m.type === 'DL' ? 'badge-info' : 'badge-success'}`}>{m.type}</span>
              <span>{m.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
