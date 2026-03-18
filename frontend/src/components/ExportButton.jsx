import React, { useState, useEffect } from 'react';
import './ExportButton.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Bouton d'export PDF/HTML — Sprint 4
 */
export default function ExportButton({ brand }) {
  const [pdfAvailable, setPdfAvailable] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [open, setOpen]                 = useState(false);
  const [lastExport, setLastExport]     = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/export/pdf/check`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPdfAvailable(d.available))
      .catch(() => setPdfAvailable(false));
  }, []);

  const handleExport = async (format = 'pdf') => {
    setLoading(true);
    setOpen(false);
    try {
      const url = `${API_URL}/export/${format === 'json' ? '' : `pdf${format === 'html' ? '?format=html' : ''}`}`;
      const resp = await fetch(url.endsWith('/') ? url.slice(0, -1) : url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const blob     = await resp.blob();
      const date_str = new Date().toISOString().split('T')[0];
      const ext      = format === 'json' ? 'json' : (format === 'html' ? 'html' : 'pdf');
      const fname    = `geo-${(brand || 'rapport').toLowerCase().replace(/\s+/g, '-')}-${date_str}.${ext}`;

      const link = document.createElement('a');
      link.href  = URL.createObjectURL(blob);
      link.download = fname;
      link.click();
      URL.revokeObjectURL(link.href);
      setLastExport({ format: ext, name: fname, time: new Date().toLocaleTimeString('fr-FR') });
    } catch (err) {
      console.error('[EXPORT]', err);
      alert(`Erreur lors de l'export : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonExport = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const resp  = await fetch(`${API_URL}/export`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data  = await resp.json();
      const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const date_str = new Date().toISOString().split('T')[0];
      const fname    = `geo-${(brand || 'export').toLowerCase().replace(/\s+/g, '-')}-${date_str}.json`;
      const link     = document.createElement('a');
      link.href      = URL.createObjectURL(blob);
      link.download  = fname;
      link.click();
      URL.revokeObjectURL(link.href);
      setLastExport({ format: 'json', name: fname, time: new Date().toLocaleTimeString('fr-FR') });
    } catch (err) {
      console.error('[EXPORT JSON]', err);
      alert(`Erreur JSON : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eb-wrapper">
      <button
        className={`eb-main-btn ${loading ? 'loading' : ''}`}
        onClick={() => !loading && setOpen(o => !o)}
        disabled={loading}
      >
        {loading
          ? <span className="eb-spinner" />
          : <span className="eb-icon">↓</span>
        }
        <span className="eb-label">
          {loading ? 'Génération…' : 'Exporter'}
        </span>
        {!loading && <span className="eb-chevron">{open ? '▲' : '▼'}</span>}
      </button>

      {open && (
        <div className="eb-dropdown">
          <button
            className={`eb-option ${!pdfAvailable ? 'disabled' : 'primary'}`}
            onClick={() => pdfAvailable && handleExport('pdf')}
            disabled={!pdfAvailable}
          >
            <span className="eb-opt-icon">📄</span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Rapport PDF</span>
              <span className="eb-opt-desc">
                {pdfAvailable === null
                  ? 'Vérification…'
                  : pdfAvailable
                    ? 'Rapport complet, mise en page professionnelle'
                    : 'WeasyPrint requis — voir docs'
                }
              </span>
            </div>
            {pdfAvailable && <span className="eb-opt-arrow">→</span>}
            {pdfAvailable === false && <span className="eb-opt-badge">INDISPO</span>}
          </button>

          <button className="eb-option" onClick={() => handleExport('html')}>
            <span className="eb-opt-icon">🌐</span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Rapport HTML</span>
              <span className="eb-opt-desc">
                {pdfAvailable === false
                  ? 'Fallback PDF — ouvrir dans le navigateur'
                  : 'Version web du rapport PDF'}
              </span>
            </div>
            <span className="eb-opt-arrow">→</span>
          </button>

          <div className="eb-divider" />

          <button className="eb-option" onClick={handleJsonExport}>
            <span className="eb-opt-icon">{ }</span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Données JSON</span>
              <span className="eb-opt-desc">Métriques brutes — pour intégration</span>
            </div>
            <span className="eb-opt-arrow">→</span>
          </button>

          {pdfAvailable === false && (
            <div className="eb-install-note">
              <code>pip install weasyprint</code>
              <span>pour activer le PDF natif</span>
            </div>
          )}
        </div>
      )}

      {lastExport && !open && (
        <div className="eb-last">
          ✓ {lastExport.format.toUpperCase()} · {lastExport.time}
        </div>
      )}
    </div>
  );
}
