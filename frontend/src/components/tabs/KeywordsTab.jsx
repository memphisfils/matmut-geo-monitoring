import React from 'react';
import { MentionChart, RadarCompare, CategoryHeatmap } from '../Charts';

export default function KeywordsTab({ config, data }) {
  return (
    <div className="dashboard-section">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="ph-title"><span className="text-gradient">Mots-cles & Penetration Multi-criteres</span></h1>
        <p className="ph-subtitle">Repartition par categorie et mots-cles de l'occurrence de la marque.</p>
      </header>
      <div className="dashboard-grid">
        <div className="grid-left">
          <MentionChart ranking={data?.ranking} brand={config.brand} />
          <RadarCompare ranking={data?.ranking} brand={config.brand} />
        </div>
        <div className="grid-right">
          <CategoryHeatmap categoryData={data?.category_data} brand={config.brand} ranking={data?.ranking} />
        </div>
      </div>
    </div>
  );
}
