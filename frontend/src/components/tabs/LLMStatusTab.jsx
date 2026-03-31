import React from 'react';
import LLMBreakdown from '../LLMBreakdown';

export default function LLMStatusTab({ config }) {
  return (
    <div className="dashboard-section">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="ph-title"><span className="text-gradient">Status des Moteurs & Performance Brute</span></h1>
        <p className="ph-subtitle">Analyse segmentee par LLM et connectivite.</p>
      </header>
      <div className="dashboard-grid">
        <div className="grid-left">
          <LLMBreakdown brand={config.brand} projectId={config.projectId} />
        </div>
      </div>
    </div>
  );
}
