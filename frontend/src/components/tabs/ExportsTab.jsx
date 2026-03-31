import React from 'react';
import { FileText } from 'lucide-react';
import PanelState from '../PanelState';
import ExportButton from '../ExportButton';

export default function ExportsTab({ config }) {
  return (
    <div className="dashboard-section">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="ph-title"><span className="text-gradient">Rapports</span></h1>
        <p className="ph-subtitle">Exportez la vue active de {config.brand} en PDF, HTML ou JSON.</p>
      </header>
      <PanelState
        icon={FileText}
        tone="success"
        title="Rapport pret a l export"
        description={`Le projet ${config.brand} est charge. Vous pouvez generer un export partageable ou recuperer les donnees brutes.`}
        actions={<ExportButton brand={config.brand} projectId={config.projectId} />}
      />
    </div>
  );
}
