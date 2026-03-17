import React from 'react';
import { RefreshCw, Download, Wifi, WifiOff, Target } from 'lucide-react';
import './TopNavbar.css';

export default function TopNavbar({ brand, onRefresh, onExport, isLoading, isBackendOnline, onReset }) {
  return (
    <nav className="top-navbar">
      <div className="nav-brand">
        <Target size={24} className="brand-icon" />
        <span className="brand-name">{brand || 'GEO Monitor'}</span>
      </div>

      <div className="nav-actions">
        <button onClick={onRefresh} disabled={isLoading} className="nav-btn">
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
        <button onClick={onExport} className="nav-btn">
          <Download size={16} />
          <span>Export</span>
        </button>
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
