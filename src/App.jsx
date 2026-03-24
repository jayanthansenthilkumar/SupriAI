import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ExternalLink, Server } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import AIInsights from './components/AIInsights';
import Curate from './components/Curate';
import Summary from './components/Summary';
import History from './components/History';
import Groups from './components/Groups';
import Inactive from './components/Inactive';
import SettingsPage from './components/Settings';
import ServerShowcase from './components/ServerShowcase';
import { checkHealth } from './services/api';
import './index.css';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

const ROUTES = [
  { id: 'overview', path: '/overview', title: 'Overview', component: Overview },
  { id: 'insights', path: '/insights', title: 'AI Insights', component: AIInsights },
  { id: 'curate', path: '/curate', title: 'Curate', component: Curate },
  { id: 'summary', path: '/summary', title: 'Summary', component: Summary },
  { id: 'history', path: '/history', title: 'History', component: History },
  { id: 'groups', path: '/groups', title: 'Groups', component: Groups },
  { id: 'inactive', path: '/inactive', title: 'Inactive', component: Inactive },
  { id: 'settings', path: '/settings', title: 'Settings', component: SettingsPage },
  { id: 'showcase', path: '/showcase', title: 'API Showcase', component: ServerShowcase },
];

function ServicePorts() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h2><Server size={24} /> Service Ports</h2>
      </div>
      <div className="card">
        <h3>Where to Access Each Service</h3>
        <p className="text-secondary">
          Use these endpoints while developing and testing. Keep frontend and backend servers running for full functionality.
        </p>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Frontend (Vite)</span>
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="route-link">
              http://localhost:5173 <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Node API</span>
            <a href="http://localhost:3001/api/health" target="_blank" rel="noreferrer" className="route-link">
              http://localhost:3001/api/health <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Python API</span>
            <a href="http://127.0.0.1:5000/api/health" target="_blank" rel="noreferrer" className="route-link">
              http://127.0.0.1:5000/api/health <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="page-content">
      <div className="card text-center">
        <h3>Page not found</h3>
        <p className="text-secondary">The route you opened does not exist. Choose one of the main pages below.</p>
        <div className="route-links-grid">
          {ROUTES.map((route) => (
            <Link key={route.path} to={route.path} className="route-chip">
              {route.title}
            </Link>
          ))}
          <Link to="/ports" className="route-chip">Service Ports</Link>
          <Link to="/showcase" className="route-chip">API Showcase</Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  const currentRoute = ROUTES.find((route) => route.path === location.pathname);
  const pageTitle = currentRoute?.title || (location.pathname === '/ports' ? 'Service Ports' : 'Route Not Found');

  return (
    <div className="app-layout">
      <Sidebar routes={ROUTES} />
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-title">{pageTitle}</h2>
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
            key={location.pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={{ duration: 0.25 }}
            className="page-wrapper"
          >
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              {ROUTES.map((route) => {
                const RouteComponent = route.component;
                return <Route key={route.path} path={route.path} element={<RouteComponent />} />;
              })}
              <Route path="/ports" element={<ServicePorts />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
