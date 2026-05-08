import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Activity, RefreshCw } from 'lucide-react';

export default function PythonApi() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  const checkHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:5000/api/health');
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `Request failed: ${response.status}`);
      setHealth(data);
    } catch (e) {
      setHealth(null);
      setError(e.message || 'Failed to reach Python API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Server size={24} /> Python API Health</h2>
        <button className="btn btn-primary" onClick={checkHealth} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3><Activity size={16} /> Live Health Response</h3>
        <p className="text-secondary mb-4">Endpoint: <code>http://127.0.0.1:5000/api/health</code></p>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {health ? (
          <pre className="json-preview">{JSON.stringify(health, null, 2)}</pre>
        ) : !loading && !error ? (
          <p className="text-secondary">No data.</p>
        ) : null}
      </motion.div>
    </div>
  );
}
