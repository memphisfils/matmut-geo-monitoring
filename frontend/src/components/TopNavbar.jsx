import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FolderOpen,
  LogOut,
  Plus,
  RefreshCw,
  Settings2,
  Target,
  UserRound
} from 'lucide-react';
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

function getInitials(user) {
  const source = user?.name || user?.email || 'GU';
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function TopNavbar({
  brand,
  user,
  onRefresh,
  isLoading,
  onReset,
  exportSlot,
  activeTab,
  onCreateAnalysis,
  onOpenProjects,
  onOpenAccount,
  onLogout
}) {
  const currentLabel = TAB_LABELS[activeTab] || "Vue d'ensemble";
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!accountOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountOpen]);

  return (
    <nav className="top-navbar">
      <div className="nav-primary">
        <div className="nav-brand compact">
          <div className="brand-icon-shell">
            <Target size={18} className="brand-icon" />
          </div>
          <div className="brand-copy">
            <span className="brand-name">GEO Arctic</span>
            <span className="brand-meta">Workspace</span>
          </div>
        </div>

        <div className="nav-context">
          <span className="nav-context-label">Projet actif</span>
          <div className="nav-context-row">
            <strong>{brand || 'Workspace'}</strong>
            <span className="nav-tab-pill">{currentLabel}</span>
          </div>
        </div>
      </div>

      <div className="nav-actions">
        {onCreateAnalysis && (
          <button onClick={onCreateAnalysis} className="nav-btn nav-btn-accent">
            <Plus size={16} />
            <span>Nouvelle analyse</span>
          </button>
        )}

        {onRefresh && (
          <button onClick={onRefresh} disabled={isLoading} className="nav-btn">
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Relancer l analyse</span>
          </button>
        )}

        {exportSlot}

        {onReset && (
          <button onClick={onReset} className="nav-btn nav-btn-reset">
            <span>Changer de projet</span>
          </button>
        )}
      </div>

      {user ? (
        <div className="nav-account" ref={accountRef}>
          <button
            type="button"
            className={`nav-account-trigger ${accountOpen ? 'open' : ''}`}
            onClick={() => setAccountOpen((current) => !current)}
          >
            <span className="nav-account-avatar">{getInitials(user)}</span>
            <span className="nav-account-copy">
              <strong>{user.name || 'Compte'}</strong>
              <small>{user.email}</small>
            </span>
            <ChevronDown size={14} className={`nav-account-chevron ${accountOpen ? 'open' : ''}`} />
          </button>

          {accountOpen && (
            <div className="nav-account-dropdown">
              <div className="nav-account-summary">
                <span className="nav-account-summary-avatar">{getInitials(user)}</span>
                <div className="nav-account-summary-copy">
                  <strong>{user.name || 'Compte utilisateur'}</strong>
                  <span>{user.email}</span>
                </div>
              </div>

              <button
                type="button"
                className="nav-account-option"
                onClick={() => {
                  setAccountOpen(false);
                  onOpenAccount && onOpenAccount();
                }}
              >
                <span className="nav-account-option-icon"><Settings2 size={16} /></span>
                <div className="nav-account-option-copy">
                  <strong>Compte et preferences</strong>
                  <span>Ouvrir les reglages utilisateur</span>
                </div>
              </button>

              <button
                type="button"
                className="nav-account-option"
                onClick={() => {
                  setAccountOpen(false);
                  onOpenProjects && onOpenProjects();
                }}
              >
                <span className="nav-account-option-icon"><FolderOpen size={16} /></span>
                <div className="nav-account-option-copy">
                  <strong>Mes projets</strong>
                  <span>Reprendre une marque ou ouvrir son historique</span>
                </div>
              </button>

              <button
                type="button"
                className="nav-account-option"
                onClick={() => {
                  setAccountOpen(false);
                  onCreateAnalysis && onCreateAnalysis();
                }}
              >
                <span className="nav-account-option-icon"><Plus size={16} /></span>
                <div className="nav-account-option-copy">
                  <strong>Nouvelle analyse</strong>
                  <span>Ouvrir la fenetre de configuration d une nouvelle marque</span>
                </div>
              </button>

              <button
                type="button"
                className="nav-account-option danger"
                onClick={() => {
                  setAccountOpen(false);
                  onLogout && onLogout();
                }}
              >
                <span className="nav-account-option-icon"><LogOut size={16} /></span>
                <div className="nav-account-option-copy">
                  <strong>Se deconnecter</strong>
                  <span>Fermer la session du navigateur</span>
                </div>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="nav-account-placeholder">
          <UserRound size={16} />
        </div>
      )}
    </nav>
  );
}
