import React from 'react';
import {
    BarChart3, Shield, Wifi, WifiOff, Target, MessageSquare, Bell,
    FolderOpen, FileText, Clock, Search, Smile, Cpu, User
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isBackendOnline, brand, sector, onReset, activeTab, onTabChange }) {
    const navItems = [
        { key: 'dashboard', icon: BarChart3, label: "Vue d'ensemble" },
        { key: 'benchmark', icon: Shield, label: 'Benchmarks' },
        { key: 'prompts', icon: MessageSquare, label: 'Requetes' },
        { key: 'alerts', icon: Bell, label: 'Alertes' },
        { key: 'projects', icon: FolderOpen, label: 'Mes marques' },
        { key: 'exports', icon: FileText, label: 'Rapports' },
        { key: 'account', icon: User, label: 'Compte' },
    ];

    const analysisItems = [
        { key: 'history', icon: Clock, label: 'Tendances' },
        { key: 'keywords', icon: Search, label: 'Intentions' },
        { key: 'sentiment', icon: Smile, label: 'Sentiment' },
        { key: 'llm-status', icon: Cpu, label: 'LLM' },
    ];

    return (
        <aside className="sidebar">
            {/* Project Switcher */}
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <Target size={16} strokeWidth={2.5} color="white" />
                </div>
                <div className="logo-text">
                    <span className="logo-title">{brand || 'GEO Monitor'}</span>
                    <span className="logo-subtitle">{sector || 'Assurance'} • #1</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-title">Navigation</div>
                {navItems.map(item => (
                    <a
                        key={item.key}
                        className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
                        onClick={() => onTabChange && onTabChange(item.key)}
                    >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                    </a>
                ))}

                <div className="nav-separator" />

                <div className="nav-section-title">Analyse</div>
                {analysisItems.map(item => (
                    <a
                        key={item.key}
                        className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
                        onClick={() => onTabChange && onTabChange(item.key)}
                    >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className={`status-badge ${isBackendOnline ? 'online' : 'offline'}`}>
                    {isBackendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span>{isBackendOnline ? 'API Connectée' : 'Mode Démo'}</span>
                </div>
                <div className="sidebar-version">v3.0.0 • GEO Monitor</div>
                {onReset && (
                    <button onClick={onReset} className="btn-reset-brand">
                        Retour aux projets
                    </button>
                )}
            </div>
        </aside>
    );
}
