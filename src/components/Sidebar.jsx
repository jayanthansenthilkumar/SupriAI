import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, BrainCircuit, FileText, Clock, FolderOpen, Moon, Settings, Bookmark } from 'lucide-react';

const tabs = [
  { id: 'overview',  icon: <LayoutDashboard size={16} />, label: 'Overview' },
  { id: 'insights',  icon: <BrainCircuit size={16} />,    label: 'AI Insights' },
  { id: 'curate',    icon: <Bookmark size={16} />,        label: 'Curate' },
  { id: 'summary',   icon: <FileText size={16} />,        label: 'Summary' },
  { id: 'history',   icon: <Clock size={16} />,           label: 'History' },
  { id: 'groups',    icon: <FolderOpen size={16} />,      label: 'Groups' },
  { id: 'inactive',  icon: <Moon size={16} />,            label: 'Inactive' },
  { id: 'settings',  icon: <Settings size={16} />,        label: 'Settings' },
];

export default function Sidebar({ activeTab, onTabChange }) {
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
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            className={`sidebar-link ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>
    </nav>
  );
}
