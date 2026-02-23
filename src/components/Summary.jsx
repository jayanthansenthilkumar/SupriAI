import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, Copy, CheckCircle } from 'lucide-react';

export default function Summary() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setSummary('');
    try {
      // Try to get page content via Chrome extension API if available
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
            if (response?.content) {
              setSummary(response.content.slice(0, 2000));
            } else {
              setSummary('Could not extract page content. This feature works best within the Chrome extension popup.');
            }
            setLoading(false);
          });
          return;
        }
      }
      setSummary('Page summarization requires the Chrome extension context. Open SupriAI from the Chrome toolbar to use this feature.');
    } catch {
      setSummary('Summarization is available through the Chrome extension popup.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h2><FileText size={24} /> Page Summary</h2>
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3>Summarize Any Webpage</h3>
        <p className="text-secondary" style={{ marginBottom: '16px' }}>
          Enter a URL or use within the Chrome extension to summarize the currently active page.
        </p>

        <div className="input-group">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="input-control"
          />
          <button className="btn btn-primary" onClick={handleSummarize} disabled={loading}>
            {loading ? <RefreshCw size={14} className="spin" /> : <FileText size={14} />}
            {loading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>

        {summary && (
          <motion.div className="summary-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="summary-header">
              <h4>Summary</h4>
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="summary-content" dangerouslySetInnerHTML={{ __html: summary }} />
          </motion.div>
        )}
      </motion.div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h3>How It Works</h3>
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-num">1</span>
            <div>
              <strong>Content Extraction</strong>
              <p>Extracts the main content from the webpage using smart selectors</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-num">2</span>
            <div>
              <strong>AI Processing</strong>
              <p>Processes the content through NLP models to identify key points</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-num">3</span>
            <div>
              <strong>Summary Generation</strong>
              <p>Generates a concise, readable summary with key takeaways</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
