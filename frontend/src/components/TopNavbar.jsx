import React from 'react';
import { RefreshCw, Download, Wifi, WifiOff, Target } from 'lucide-react';
import './TopNavbar.css';

export default function TopNavbar({ brand, onRefresh, onExport, isLoading, isBackendOnline, onReset, activeTab, onTabChange }) {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'benchmark', label: 'Benchmark' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'alerts', label: 'Alertes' },
  ];

  return (
    <nav className="top-navbar">
      <div className="nav-brand">
        <Target size={24} className="brand-icon" />
        <span className="brand-name">{brand || 'GEO Monitor'}</span>
      </div>

      <div className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange && onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="nav-actions">
        {onRefresh && (
          <button onClick={onRefresh} disabled={isLoading} className="nav-btn">
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        )}
        {onExport && (
          <button onClick={onExport} className="nav-btn">
            <Download size={16} />
            <span>Export</span>
          </button>
        )}
        {onReset && (
          <button onClick={onReset} className="nav-btn nav-btn-reset">
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="nav-status">
        <div className={`status-indicator ${isBackendOnline ? 'online' : 'offline'}`}>
          {isBackendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isBackendOnline ? 'API' : 'DEMO'}</span>
        </div>
      </div>
    </nav>
  );
}
