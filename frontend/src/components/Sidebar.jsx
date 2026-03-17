import React from 'react';
import {
    BarChart3, Shield, TrendingUp, Download, RefreshCw,
    Activity, Wifi, WifiOff, Target
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isBackendOnline, brand, onReset }) {
    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <Target size={28} strokeWidth={2.5} />
                </div>
                <div className="logo-text">
                    <span className="logo-title">{brand || 'GEO Monitor'}</span>
                    <span className="logo-subtitle">Visibility Dashboard</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-title">Dashboard</div>
                <a className="nav-item active" href="#dashboard">
                    <BarChart3 size={18} />
                    <span>Vue d'ensemble</span>
                </a>
                <a className="nav-item" href="#ranking">
                    <TrendingUp size={18} />
                    <span>Classement</span>
                </a>
                <a className="nav-item" href="#insights">
                    <Activity size={18} />
                    <span>Insights</span>
                </a>
            </nav>

            {/* Status */}
            <div className="sidebar-footer">
                <div className={`status-badge ${isBackendOnline ? 'online' : 'offline'}`}>
                    {isBackendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span>{isBackendOnline ? 'API Connectée' : 'Mode Démo'}</span>
                </div>
                <div className="sidebar-version">v2.0.0 • GEO Monitor</div>
                {onReset && (
                    <button onClick={onReset} className="btn-reset-brand">
                        Changer de marque
                    </button>
                )}
            </div>
        </aside>
    );
}
