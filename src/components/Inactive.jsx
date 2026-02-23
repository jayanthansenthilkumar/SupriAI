import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Clock, X, AlertCircle } from 'lucide-react';

export default function Inactive() {
  const [inactiveTabs, setInactiveTabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInactiveTabs();
  }, []);

  const loadInactiveTabs = async () => {
    setLoading(true);
    try {
      // Check if Chrome extension API is available
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['tabData'], ({ tabData }) => {
          if (tabData) {
            const now = Date.now();
            const inactive = Object.entries(tabData)
              .filter(([_, data]) => {
                const inactiveTime = data.lastInactiveTime
                  ? now - data.lastInactiveTime
                  : 0;
                return !data.isActive && inactiveTime > 5 * 60 * 1000; // > 5 mins
              })
              .map(([tabId, data]) => ({
                tabId: parseInt(tabId),
                domain: data.domain,
                url: data.url,
                title: data.title || data.domain,
                inactiveFor: data.lastInactiveTime ? now - data.lastInactiveTime : 0,
                totalActiveTime: data.totalActiveTime || 0,
              }))
              .sort((a, b) => b.inactiveFor - a.inactiveFor);
            setInactiveTabs(inactive);
          }
          setLoading(false);
        });
      } else {
        // Not in extension context
        setInactiveTabs([]);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const closeTab = (tabId) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.remove(tabId, () => {
        setInactiveTabs(prev => prev.filter(t => t.tabId !== tabId));
      });
    }
  };

  const closeAll = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const ids = inactiveTabs.map(t => t.tabId);
      chrome.tabs.remove(ids, () => {
        setInactiveTabs([]);
      });
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0m';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Moon size={24} /> Inactive Tabs</h2>
        {inactiveTabs.length > 0 && (
          <button className="btn btn-error" onClick={closeAll}>
            <X size={14} /> Close All ({inactiveTabs.length})
          </button>
        )}
      </div>

      {loading ? (
        <p className="empty-text">Scanning tabs...</p>
      ) : inactiveTabs.length > 0 ? (
        <div className="inactive-list">
          {inactiveTabs.map((tab, i) => (
            <motion.div
              key={tab.tabId}
              className="inactive-card"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="inactive-info">
                <span className="inactive-domain">{tab.domain}</span>
                <span className="inactive-title" title={tab.title}>{(tab.title || '').slice(0, 50)}</span>
                <div className="inactive-meta">
                  <span><Clock size={12} /> Idle: {formatDuration(tab.inactiveFor)}</span>
                  <span>Active: {formatDuration(tab.totalActiveTime)}</span>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => closeTab(tab.tabId)}>
                <X size={14} /> Close
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center">
          <Moon size={48} color="var(--google-grey-300)" style={{ marginBottom: '16px' }} />
          <h3>No Inactive Tabs</h3>
          <p className="text-secondary">
            {typeof chrome !== 'undefined' && chrome.tabs
              ? 'All your tabs are currently active. Great job keeping things tidy!'
              : 'Inactive tab detection requires the Chrome extension context. Open SupriAI from the Chrome toolbar.'}
          </p>
        </div>
      )}

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h3><AlertCircle size={18} /> About Inactive Tab Detection</h3>
        <p className="text-secondary">
          Tabs inactive for more than 5 minutes are listed here. Closing unused tabs helps
          save memory and improve browser performance. The extension automatically tracks
          tab activity in the background.
        </p>
      </motion.div>
    </div>
  );
}
