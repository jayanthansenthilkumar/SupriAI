import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Clock, X, ExternalLink } from 'lucide-react';
import { getDomainStats } from '../services/api';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    loadGroups();
  }, [period]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await getDomainStats(period);
      // Group by category
      const categoryGroups = {};
      (data.stats || []).forEach(stat => {
        const cat = stat.category || 'unknown';
        if (!categoryGroups[cat]) {
          categoryGroups[cat] = { category: cat, domains: [], totalTime: 0, totalVisits: 0 };
        }
        categoryGroups[cat].domains.push(stat);
        categoryGroups[cat].totalTime += stat.total_time || 0;
        categoryGroups[cat].totalVisits += stat.visits || 0;
      });
      setGroups(Object.values(categoryGroups).sort((a, b) => b.totalTime - a.totalTime));
    } catch (err) {
      console.error('Groups load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '0m';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const CATEGORY_COLORS = {
    productive: '#188038', social: '#d93025', entertainment: '#f9ab00',
    news: '#1a73e8', shopping: '#9334e6', communication: '#00897b', unknown: '#5f6368'
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><FolderOpen size={24} /> Tab Groups</h2>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="select-control">
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {loading ? (
        <p className="empty-text">Loading groups...</p>
      ) : groups.length > 0 ? (
        <div className="groups-list">
          {groups.map((group, i) => (
            <motion.div
              key={group.category}
              className="group-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="group-header" style={{ borderLeft: `4px solid ${CATEGORY_COLORS[group.category] || '#5f6368'}` }}>
                <div>
                  <h3 style={{ textTransform: 'capitalize' }}>{group.category}</h3>
                  <span className="text-secondary">{group.domains.length} domains</span>
                </div>
                <div className="group-stats">
                  <span><Clock size={14} /> {formatTime(group.totalTime)}</span>
                  <span>{group.totalVisits} visits</span>
                </div>
              </div>
              <div className="group-domains">
                {group.domains.sort((a, b) => (b.total_time || 0) - (a.total_time || 0)).map((d, j) => (
                  <div key={j} className="group-domain">
                    <span className="domain-name">{d.domain}</span>
                    <span className="domain-meta">
                      {formatTime(d.total_time)} · {d.visits || 0} visits
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center">
          <FolderOpen size={48} color="var(--google-grey-300)" style={{ marginBottom: '16px' }} />
          <h3>No Tab Groups</h3>
          <p className="text-secondary">Browse some websites and sync data to see tab groups.</p>
        </div>
      )}
    </div>
  );
}
