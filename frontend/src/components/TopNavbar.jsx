import React from 'react';
import { Activity, Download, RefreshCw, Target, Wifi, WifiOff } from 'lucide-react';
import './TopNavbar.css';

const TAB_LABELS = {
  dashboard: "Vue d'ensemble",
  benchmark: 'Benchmarks',
  prompts: 'Requetes',
  alerts: 'Alertes',
  projects: 'Mes marques',
  exports: 'Rapports',
  account: 'Compte',
  history: 'Tendances',
  keywords: 'Intentions',
  sentiment: 'Sentiment',
  'llm-status': 'LLM'
};

export default function TopNavbar({
  brand,
  onRefresh,
  onExport,
  isLoading,
  isBackendOnline,
  onReset,
  exportSlot,
  activeTab
}) {
  const currentLabel = TAB_LABELS[activeTab] || "Vue d'ensemble";

  return (
    <nav className="top-navbar">
      <div className="nav-primary">
        <div className="nav-brand">
          <div className="brand-icon-shell">
            <Target size={18} className="brand-icon" />
          </div>
          <div className="brand-copy">
            <span className="brand-name">GEO Arctic</span>
            <span className="brand-meta">Console de pilotage</span>
          </div>
        </div>

        <div className="nav-context">
          <span className="nav-context-label">Projet actif</span>
          <strong>{brand || 'Workspace'}</strong>
          <span>{currentLabel}</span>
        </div>
      </div>

      <div className="nav-actions">
        {onRefresh && (
          <button onClick={onRefresh} disabled={isLoading} className="nav-btn">
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Relancer l analyse</span>
          </button>
        )}

        {exportSlot ? exportSlot : onExport && (
          <button onClick={onExport} className="nav-btn">
            <Download size={16} />
            <span>Exporter</span>
          </button>
        )}

        {onReset && (
          <button onClick={onReset} className="nav-btn nav-btn-reset">
            <span>Changer de projet</span>
          </button>
        )}
      </div>

      <div className="nav-status-shell">
        <div className={`status-indicator ${isBackendOnline ? 'online' : 'offline'}`}>
          {isBackendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isBackendOnline ? 'Donnees live' : 'Mode demo'}</span>
        </div>
        <div className="nav-status-detail">
          <Activity size={14} />
          <span>{isLoading ? 'Run en cours' : 'Pret'}</span>
        </div>
      </div>
    </nav>
  );
}
