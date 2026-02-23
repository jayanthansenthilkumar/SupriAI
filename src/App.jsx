import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import AIInsights from './components/AIInsights';
import Curate from './components/Curate';
import Summary from './components/Summary';
import History from './components/History';
import Groups from './components/Groups';
import Inactive from './components/Inactive';
import SettingsPage from './components/Settings';
import { checkHealth } from './services/api';
import './index.css';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const PAGES = {
  overview: Overview,
  insights: AIInsights,
  curate: Curate,
  summary: Summary,
  history: History,
  groups: Groups,
  inactive: Inactive,
  settings: SettingsPage,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  const ActivePage = PAGES[activeTab] || Overview;

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          </div>
          <div className="top-bar-right">
            <span className={`backend-indicator ${backendOnline ? 'online' : 'offline'}`}>
              <span className="indicator-dot" />
              {backendOnline ? 'Backend Online' : 'Backend Offline'}
            </span>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={{ duration: 0.25 }}
            className="page-wrapper"
          >
            <ActivePage />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
