import React from 'react';
import TrendChart from '../TrendChart';

export default function HistoryTab({ config, trendHistory }) {
  return (
    <div className="dashboard-section">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="ph-title"><span className="text-gradient">Historique & Tendances</span></h1>
        <p className="ph-subtitle">Suivez l'evolution de la visibilite de {config.brand} dans le temps.</p>
      </header>
      <div className="dashboard-grid">
        <section className="chart-section premium-card" style={{ width: '100%' }}>
          <div className="section-header">
            <h2 className="section-title">Share of Voice & Score ({config.brand})</h2>
          </div>
          <TrendChart data={trendHistory} brand={config.brand} />
        </section>
      </div>
    </div>
  );
}
