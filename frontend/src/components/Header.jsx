import React from 'react';
import { RefreshCw, Download, Clock } from 'lucide-react';
import './Header.css';

export default function Header({ onRefresh, onExport, isLoading, metadata }) {
    const formatDate = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <header className="app-header glass">
            <div className="header-left">
                <h1 className="header-title">
                    <span className="title-accent">📊</span> Dashboard GEO Monitoring
                </h1>
                <div className="header-meta">
                    <Clock size={12} />
                    <span>Dernière MAJ: {formatDate(metadata?.timestamp)}</span>
                    {metadata?.is_demo && (
                        <span className="demo-badge">DÉMO</span>
                    )}
                </div>
            </div>
            <div className="header-actions">
                <button
                    className="btn btn-secondary"
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                    <span>Rafraîchir</span>
                </button>
                <button className="btn btn-primary" onClick={onExport}>
                    <Download size={16} />
                    <span>Exporter</span>
                </button>
            </div>
        </header>
    );
}
