import React from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BrainCircuit, FileText, Clock, FolderOpen, Moon, Settings, Bookmark, Server } from 'lucide-react';

const iconById = {
  overview: <LayoutDashboard size={16} />,
  insights: <BrainCircuit size={16} />,
  curate: <Bookmark size={16} />,
  summary: <FileText size={16} />,
  history: <Clock size={16} />,
  groups: <FolderOpen size={16} />,
  inactive: <Moon size={16} />,
  settings: <Settings size={16} />,
};

export default function Sidebar({ routes = [] }) {
  const navItems = routes.map((route) => ({
    id: route.id,
    path: route.path,
    label: route.title,
    icon: iconById[route.id] || <LayoutDashboard size={16} />,
  }));

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <BrainCircuit size={28} color="var(--primary-color)" />
        <div>
          <h1 className="sidebar-title">SupriAI</h1>
          <span className="version-badge">v3.0</span>
        </div>
      </div>
      <div className="sidebar-nav">
        {navItems.map((item) => (
          <motion.div
            key={item.path}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          </motion.div>
        ))}

        <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}>
          <NavLink
            to="/ports"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Server size={16} />
            <span>Service Ports</span>
          </NavLink>
        </motion.div>
      </div>
    </nav>
  );
}
