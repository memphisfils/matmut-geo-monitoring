import React from 'react';
import {
  BarChart3,
  Bell,
  Clock,
  Cpu,
  FileText,
  FolderOpen,
  MessageSquare,
  Search,
  Shield,
  Smile,
  Target
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ brand, sector, onReset, activeTab, onTabChange }) {
  const navItems = [
    { key: 'dashboard', icon: BarChart3, label: "Vue d'ensemble" },
    { key: 'benchmark', icon: Shield, label: 'Benchmarks' },
    { key: 'prompts', icon: MessageSquare, label: 'Requetes' },
    { key: 'alerts', icon: Bell, label: 'Alertes' },
    { key: 'projects', icon: FolderOpen, label: 'Mes marques' },
    { key: 'exports', icon: FileText, label: 'Rapports' }
  ];

  const analysisItems = [
    { key: 'history', icon: Clock, label: 'Tendances' },
    { key: 'keywords', icon: Search, label: 'Intentions' },
    { key: 'sentiment', icon: Smile, label: 'Sentiment' },
    { key: 'llm-status', icon: Cpu, label: 'LLM' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Target size={16} strokeWidth={2.5} color="white" />
          </div>
          <div className="logo-text">
            <span className="logo-title">GEO Arctic</span>
            <span className="logo-subtitle">Console GEO</span>
          </div>
        </div>

        <div className="sidebar-project">
          <div className="sidebar-project-top">
            <span className="sidebar-project-label">Projet actif</span>
            <span className="sidebar-project-chip">Vue live</span>
          </div>
          <strong>{brand || 'Aucun projet'}</strong>
          <span>{sector || 'Secteur non defini'}</span>
        </div>

      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Pilotage</div>
        {navItems.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange && onTabChange(item.key)}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}

        <div className="nav-separator" />

        <div className="nav-section-title">Analyse</div>
        {analysisItems.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange && onTabChange(item.key)}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">Espace connecte - GEO Arctic</div>
        {onReset && (
          <button onClick={onReset} className="btn-reset-brand">
            Retour aux projets
          </button>
        )}
      </div>
    </aside>
  );
}
