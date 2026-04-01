import React, { useEffect, useState } from 'react';
import { ChevronDown, Code2, Download, FileCode2, FileText, Loader2 } from 'lucide-react';
import './ExportButton.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ExportButton({ brand, projectId }) {
  const [pdfAvailable, setPdfAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastExport, setLastExport] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/export/pdf/check`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setPdfAvailable(payload.available))
      .catch(() => setPdfAvailable(false));
  }, []);

  const handleBlobDownload = (blob, filename) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async (format = 'pdf') => {
    setLoading(true);
    setOpen(false);
    setFeedback(null);

    try {
      const basePath = format === 'json' ? `${API_URL}/export` : `${API_URL}/export/pdf`;
      const params = new URLSearchParams();
      if (format === 'html') params.set('format', 'html');
      if (brand) params.set('brand', brand);
      if (projectId) params.set('project_id', projectId);
      const url = params.toString() ? `${basePath}?${params.toString()}` : basePath;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const ext = format === 'json' ? 'json' : format === 'html' ? 'html' : 'pdf';
      const fileName = `geo-${(brand || 'rapport').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${ext}`;

      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        handleBlobDownload(blob, fileName);
      } else {
        const blob = await response.blob();
        handleBlobDownload(blob, fileName);
      }

      setLastExport({
        format: ext.toUpperCase(),
        time: new Date().toLocaleTimeString('fr-FR')
      });
      setFeedback({
        tone: 'success',
        message: `${ext.toUpperCase()} exporte pour ${brand || 'le projet actif'}.`
      });
    } catch (error) {
      console.error('[EXPORT]', error);
      setFeedback({
        tone: 'error',
        message: `Export impossible: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eb-wrapper">
      <button
        type="button"
        className={`eb-main-btn ${loading ? 'loading' : ''}`}
        onClick={() => !loading && setOpen((current) => !current)}
        disabled={loading}
      >
        {loading ? <Loader2 size={14} className="eb-spin" /> : <Download size={14} />}
        <span className="eb-label">{loading ? 'Generation...' : 'Exporter'}</span>
        {!loading && <ChevronDown size={14} className={`eb-chevron ${open ? 'open' : ''}`} />}
      </button>

      {open && (
        <div className="eb-dropdown">
          <button
            type="button"
            className={`eb-option ${!pdfAvailable ? 'disabled' : 'primary'}`}
            onClick={() => pdfAvailable && handleExport('pdf')}
            disabled={!pdfAvailable}
          >
            <span className="eb-opt-icon"><FileText size={16} /></span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Rapport PDF</span>
              <span className="eb-opt-desc">
                {pdfAvailable === null
                  ? 'Verification du moteur PDF...'
                  : pdfAvailable
                    ? 'Rapport executive et partageable'
                    : 'Moteur PDF indisponible'}
              </span>
            </div>
            {pdfAvailable === false && <span className="eb-opt-badge">OFF</span>}
          </button>

          <button type="button" className="eb-option" onClick={() => handleExport('html')}>
            <span className="eb-opt-icon"><FileCode2 size={16} /></span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Rapport HTML</span>
              <span className="eb-opt-desc">Version web du rapport, immediate a ouvrir</span>
            </div>
          </button>

          <button type="button" className="eb-option" onClick={() => handleExport('json')}>
            <span className="eb-opt-icon"><Code2 size={16} /></span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Donnees JSON</span>
              <span className="eb-opt-desc">Export brut pour integration ou audit</span>
            </div>
          </button>

          {pdfAvailable === false && (
            <div className="eb-install-note">
              <code>pip install weasyprint</code>
              <span>pour activer l'export PDF natif cote backend</span>
            </div>
          )}
        </div>
      )}

      {lastExport && !open && (
        <div className="eb-last">
          {lastExport.format} · {lastExport.time}
        </div>
      )}

      {feedback && !open && (
        <div className={`eb-feedback ${feedback.tone}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
