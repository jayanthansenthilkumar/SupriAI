import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Link as LinkIcon, Activity, Copy, CheckCircle2, RefreshCw } from 'lucide-react';

const SERVER_URL = 'http://127.0.0.1:5000';
const API_BASE = `${SERVER_URL}/api`;

const ENDPOINTS = [
  { method: 'GET', path: '/health', note: 'Backend status and model count' },
  { method: 'GET', path: '/models', note: 'Model metadata and readiness' },
  { method: 'POST', path: '/sync', note: 'Sync tab/session browsing data' },
  { method: 'POST', path: '/ml/insights', note: 'Comprehensive ML insights' },
  { method: 'POST', path: '/ml/focus', note: 'Focus recommendation output' },
];

export default function ServerShowcase() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const checkHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Request failed: ${response.status}`);
      }
      setHealth(data);
    } catch (e) {
      setHealth(null);
      setError(e.message || 'Failed to reach Flask API');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1200);
    } catch {
      setCopied('');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Server size={24} /> Flask API Showcase</h2>
        <button className="btn btn-primary" onClick={checkHealth} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Checking...' : 'Check Health'}
        </button>
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3><LinkIcon size={16} /> Route Endpoints</h3>
        <div className="endpoint-list">
          <div className="endpoint-item">
            <span className="endpoint-method get">SERVER</span>
            <span className="endpoint-url">{SERVER_URL}</span>
            <button className="btn btn-outline btn-sm" onClick={() => copyText(SERVER_URL, 'server')}>
              {copied === 'server' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied === 'server' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="endpoint-item">
            <span className="endpoint-method get">BASE</span>
            <span className="endpoint-url">{API_BASE}</span>
            <button className="btn btn-outline btn-sm" onClick={() => copyText(API_BASE, 'base')}>
              {copied === 'base' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied === 'base' ? 'Copied' : 'Copy'}
            </button>
          </div>
          {ENDPOINTS.map((ep) => {
            const fullUrl = `${API_BASE}${ep.path}`;
            const key = `${ep.method}-${ep.path}`;
            return (
              <div key={key} className="endpoint-item">
                <span className={`endpoint-method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                <span className="endpoint-url">{fullUrl}</span>
                <button className="btn btn-outline btn-sm" onClick={() => copyText(fullUrl, key)}>
                  {copied === key ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied === key ? 'Copied' : 'Copy'}
                </button>
                <span className="endpoint-note">{ep.note}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <h3><Activity size={16} /> Live Health Response</h3>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {health ? (
          <pre className="json-preview">{JSON.stringify(health, null, 2)}</pre>
        ) : (
          <p className="text-secondary">Run a live check to show the response from <code>/api/health</code>.</p>
        )}
      </motion.div>
    </div>
  );
}
