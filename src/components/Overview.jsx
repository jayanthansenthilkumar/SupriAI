import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, BarChart3, BrainCircuit, Globe, TrendingUp, RefreshCw
} from 'lucide-react';
import {
  getSummary, getTodayProductivity, getTopDomains,
  getCategoryStats, getFocusRecommendation
} from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

const COLORS = ['#1a73e8', '#188038', '#d93025', '#f9ab00', '#9334e6', '#00897b', '#e8710a'];

export default function Overview() {
  const [stats, setStats] = useState({ unique_domains: 0, total_visits: 0, total_time: 0 });
  const [productivity, setProductivity] = useState({ score: 0 });
  const [topDomains, setTopDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, p, d, c, f] = await Promise.all([
        getSummary('today').catch(() => ({})),
        getTodayProductivity().catch(() => ({ score: 0 })),
        getTopDomains('today', 5).catch(() => ({ domains: [] })),
        getCategoryStats('today').catch(() => ({ categories: [] })),
        getFocusRecommendation().catch(() => null),
      ]);
      setStats(s);
      setProductivity(p);
      setTopDomains(d.domains || []);
      setCategories(c.categories || []);
      setFocus(f);
    } catch (err) {
      console.error('Overview load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '0m';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const pieData = categories.map((c, i) => ({
    name: c.category || 'Unknown',
    value: c.total_time || 0,
    color: COLORS[i % COLORS.length],
  }));

  const scoreColor = productivity.score >= 70 ? 'var(--success-color)' :
    productivity.score >= 40 ? 'var(--warning-color)' : 'var(--error-color)';

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Activity size={24} /> Today's Overview</h2>
        <button className="btn btn-outline" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stat-icon blue"><Globe size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Unique Sites</span>
            <span className="stat-value">{stats.unique_domains || 0}</span>
          </div>
        </motion.div>

        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-icon green"><TrendingUp size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Visits</span>
            <span className="stat-value">{stats.total_visits || 0}</span>
          </div>
        </motion.div>

        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="stat-icon purple"><BarChart3 size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Active Time</span>
            <span className="stat-value">{formatTime(stats.total_time)}</span>
          </div>
        </motion.div>

        <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="stat-icon" style={{ background: scoreColor + '20', color: scoreColor }}>
            <BrainCircuit size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Productivity</span>
            <span className="stat-value" style={{ color: scoreColor }}>{Math.round(productivity.score || 0)}%</span>
          </div>
        </motion.div>
      </div>

      <div className="grid-2">
        {/* Focus Card */}
        <motion.div className="card focus-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h3><BrainCircuit size={18} /> Focus Recommendation</h3>
          <p className="focus-text">
            {focus?.recommendation || 'Connect to backend to receive personalized focus recommendations.'}
          </p>
          {focus?.focus_state && (
            <span className={`badge badge-${focus.focus_state === 'deep_focus' ? 'success' : focus.focus_state === 'break_needed' ? 'warning' : 'info'}`}>
              {focus.focus_state.replace(/_/g, ' ')}
            </span>
          )}
        </motion.div>

        {/* Category Distribution */}
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3>Category Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatTime(val)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-text">No category data yet. Browse some sites to generate data.</p>
          )}
          <div className="legend">
            {pieData.map((entry, i) => (
              <span key={i} className="legend-item">
                <span className="legend-dot" style={{ background: entry.color }} />
                {entry.name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Domains */}
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <h3><Globe size={18} /> Top Domains Today</h3>
        {topDomains.length > 0 ? (
          <div className="domain-list">
            {topDomains.map((d, i) => (
              <div key={i} className="domain-item">
                <div className="domain-rank">{i + 1}</div>
                <div className="domain-info">
                  <span className="domain-name">{d.domain}</span>
                  <span className="domain-category">{d.category || 'unknown'}</span>
                </div>
                <div className="domain-time">{formatTime(d.total_time)}</div>
                <div className="domain-visits">{d.visits} visits</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No browsing data recorded today.</p>
        )}
      </motion.div>
    </div>
  );
}
