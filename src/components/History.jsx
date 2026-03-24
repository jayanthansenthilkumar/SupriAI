import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Search, Download, Filter } from 'lucide-react';
import { getHistory, getProductivityScores, exportData } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function History() {
  const [history, setHistory] = useState([]);
  const [scores, setScores] = useState([]);
  const [period, setPeriod] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        getHistory(period).catch(() => ({ history: [] })),
        getProductivityScores(period).catch(() => ({ scores: [] })),
      ]);
      setHistory(h.history || []);
      setScores((s.scores || []).reverse());
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supriai-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '0m';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  const filtered = history.filter(h =>
    !searchTerm || (h.domain || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = scores.map(s => ({
    date: s.date,
    score: Number.isFinite(Number(s.score)) ? Math.round(Number(s.score)) : 0,
  })).filter(row => row.date);

  const trendData = chartData.map((row, index) => ({
    ...row,
    label: row.date?.slice(5) || `Day ${index + 1}`,
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Clock size={24} /> Browsing History</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="select-control">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Productivity Trend */}
      {trendData.length > 0 && (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3><Filter size={16} /> Productivity Trend</h3>
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5f6368' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5f6368' }} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#1a73e8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1a73e8' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search domains or titles..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* History Table */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {loading ? (
          <p className="empty-text">Loading history...</p>
        ) : filtered.length > 0 ? (
          <div className="history-table">
            <div className="history-header">
              <span>Domain</span>
              <span>Title</span>
              <span>Category</span>
              <span>Time</span>
              <span>Date</span>
            </div>
            {filtered.slice(0, 50).map((item, i) => (
              <div key={i} className="history-row">
                <span className="domain-cell">{item.domain}</span>
                <span className="title-cell" title={item.title}>{(item.title || '').slice(0, 40)}</span>
                <span className={`category-badge cat-${item.category || 'unknown'}`}>
                  {item.category || 'unknown'}
                </span>
                <span>{formatTime(item.active_time)}</span>
                <span className="date-cell">{formatDate(item.timestamp)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No history found for this period.</p>
        )}
      </motion.div>
    </div>
  );
}
