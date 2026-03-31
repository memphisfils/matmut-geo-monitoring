import React from 'react';
import SentimentChart from '../SentimentChart';
import InsightsPanel from '../InsightsPanel';

export default function SentimentTab({ config, data }) {
  return (
    <div className="dashboard-section">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="ph-title"><span className="text-gradient">Sentiment IA & Insights Qualitatifs</span></h1>
        <p className="ph-subtitle">Perception par les LLM et recommandations de posture.</p>
      </header>
      <div className="dashboard-grid">
        <div className="grid-left">
          <SentimentChart ranking={data?.ranking} brand={config.brand} />
          <InsightsPanel insights={data?.insights} brand={config.brand} />
        </div>
      </div>
    </div>
  );
}
