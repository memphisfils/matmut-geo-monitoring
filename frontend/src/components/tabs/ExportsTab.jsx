import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import MetricTape from '../MetricTape';
import ExportButton from '../ExportButton';
import './ExportsTab.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const REPORT_CATALOG = [
  {
    code: 'RPT-001',
    title: 'Rapport executif',
    format: 'PDF / Email',
    audience: 'Direction, client',
    body: 'Lecture courte avec score, rang, share of voice, risques et actions prioritaires.'
  },
  {
    code: 'RPT-002',
    title: 'Rapport benchmark',
    format: 'PDF / Dashboard',
    audience: 'Marketing, SEO/GEO',
    body: 'Vue arena sur la marque, les concurrents, les ecarts de score et les leaders par run.'
  },
  {
    code: 'RPT-003',
    title: 'Rapport prompts',
    format: 'PDF / HTML',
    audience: 'SEO/GEO, contenu',
    body: 'Preuves prompt par prompt avec points forts, prompt fragile et marque absente.'
  },
  {
    code: 'RPT-004',
    title: 'Rapport incident',
    format: 'Markdown / PDF',
    audience: 'Ops, produit',
    body: 'Synthese d une alerte critique avec deltas, canal touche et action immediate.'
  },
  {
    code: 'RPT-005',
    title: 'Digest de tendances',
    format: 'PDF / Email',
    audience: 'Produit, marketing',
    body: 'Lecture 7j, 30j, 90j des mouvements de visibilite et des derives concurrentielles.'
  },
  {
    code: 'RPT-006',
    title: 'Couverture multi-modeles',
    format: 'PDF / Dashboard',
    audience: 'Produit IA, direction',
    body: 'Accord inter-LLM, divergence, modele leader et spread de mention.'
  }
];

const DELIVERABLES = [
  {
    title: 'Catalogue alertes',
    files: ['alert-types.md', 'alert-types.xlsx'],
    Icon: FileSpreadsheet
  },
  {
    title: 'Catalogue rapports',
    files: ['report-types.md', 'report-types.pdf'],
    Icon: FolderKanban
  }
];

export default function ExportsTab({ config, data }) {
  const [pdfSupport, setPdfSupport] = useState({ loading: true, available: false, install: '' });

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/export/pdf/check`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('check failed'))))
      .then((payload) => {
        if (cancelled) return;
        setPdfSupport({
          loading: false,
          available: Boolean(payload.available),
          install: payload.install || ''
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPdfSupport({
          loading: false,
          available: false,
          install: 'pip install weasyprint --break-system-packages'
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const promptCount = config?.prompts?.length || data?.metadata?.total_prompts || 0;
  const modelCount = config?.models?.length || 1;
  const competitorCount = config?.competitors?.length || 0;

  const tapeItems = useMemo(() => ([
    { label: 'Formats directs', value: 3, meta: 'PDF HTML JSON' },
    { label: 'Prompts couverts', value: promptCount, meta: 'dans le projet' },
    { label: 'Modeles actifs', value: modelCount, meta: 'exportables' },
    { label: 'Concurrents', value: competitorCount, meta: 'dans le benchmark' }
  ]), [competitorCount, modelCount, promptCount]);

  const formatCards = [
    {
      title: 'Rapport PDF',
      Icon: FileText,
      state: pdfSupport.loading ? 'verification en cours' : pdfSupport.available ? 'pret a generer' : 'fallback requis',
      tone: pdfSupport.loading ? 'watch' : pdfSupport.available ? 'good' : 'risk',
      body: pdfSupport.available
        ? 'Version executive et partageable du projet actif.'
        : 'Le backend peut encore sortir le rapport en HTML tant que WeasyPrint n est pas installe.'
    },
    {
      title: 'Rapport HTML',
      Icon: FileCode2,
      state: 'toujours disponible',
      tone: 'watch',
      body: 'Version immediate a ouvrir, relire ou transmettre sans attendre le moteur PDF.'
    },
    {
      title: 'Donnees JSON',
      Icon: FileJson,
      state: 'pret a auditer',
      tone: 'neutral',
      body: 'Dump brut du run pour integration, audit ou reprise par un autre systeme.'
    }
  ];

  return (
    <div className="exports-shell">
      <section className="exports-header">
        <div className="exports-heading">
          <span className="exports-kicker">Rapports</span>
          <h2>Sorties partageables pour {config.brand}</h2>
          <p>
            Cette vue rassemble l etat du moteur PDF, les formats d export deja exploitables,
            le catalogue de rapports produit et les livrables documentaires lies aux alertes.
          </p>
          <div className="exports-header-actions">
            <ExportButton brand={config.brand} projectId={config.projectId} />
          </div>
        </div>

        <div className="exports-hero-panel">
          <div className={`exports-status-card ${pdfSupport.available ? 'good' : 'watch'}`}>
            <div className="exports-status-icon">
              {pdfSupport.available ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <span>Moteur PDF</span>
              <strong>
                {pdfSupport.loading ? 'Verification...' : pdfSupport.available ? 'Pret' : 'HTML fallback'}
              </strong>
            </div>
          </div>

          <div className="exports-hero-grid">
            <div>
              <span>Projet actif</span>
              <strong>{config.brand}</strong>
            </div>
            <div>
              <span>Prompts</span>
              <strong>{promptCount}</strong>
            </div>
            <div>
              <span>Modeles</span>
              <strong>{modelCount}</strong>
            </div>
          </div>

          {!pdfSupport.available && !pdfSupport.loading && (
            <p className="exports-install-note">
              Activation PDF native cote backend: <code>{pdfSupport.install}</code>
            </p>
          )}
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <div className="exports-layout">
        <div className="exports-main">
          <section className="exports-panel">
            <div className="exports-section-head">
              <div>
                <span className="exports-section-kicker">Formats</span>
                <h3>Ce que l utilisateur peut deja sortir</h3>
              </div>
              <span className="exports-section-meta">Projet actif</span>
            </div>

            <div className="exports-format-grid">
              {formatCards.map((item) => (
                <article key={item.title} className={`exports-format-card ${item.tone}`}>
                  <div className={`exports-format-icon ${item.tone}`}>
                    <item.Icon size={18} />
                  </div>
                  <div className="exports-format-copy">
                    <strong>{item.title}</strong>
                    <span>{item.state}</span>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="exports-panel">
            <div className="exports-section-head">
              <div>
                <span className="exports-section-kicker">Catalogue</span>
                <h3>Types de rapports a exposer dans la plateforme</h3>
              </div>
              <span className="exports-section-meta">{REPORT_CATALOG.length} formats</span>
            </div>

            <div className="exports-report-list">
              {REPORT_CATALOG.map((report) => (
                <article key={report.code} className="exports-report-item">
                  <div className="exports-report-topline">
                    <span className="exports-report-code">{report.code}</span>
                    <span className="exports-report-format">{report.format}</span>
                  </div>
                  <strong>{report.title}</strong>
                  <p>{report.body}</p>
                  <span className="exports-report-audience">{report.audience}</span>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="exports-rail">
          <section className="exports-panel emphasis">
            <div className="exports-section-head">
              <div>
                <span className="exports-section-kicker">Resultat alert</span>
                <h3>Livrables deja generes</h3>
              </div>
              <span className="exports-section-meta">Dossier local</span>
            </div>

            <div className="exports-deliverable-list">
              {DELIVERABLES.map((item) => (
                <article key={item.title} className="exports-deliverable-item">
                  <div className="exports-deliverable-icon">
                    <item.Icon size={18} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.files.join(' - ')}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="exports-footnote">
              Dossier genere dans <code>resultat-alert/</code> pour cadrage produit et sortie client.
            </p>
          </section>

          <section className="exports-panel">
            <div className="exports-section-head">
              <div>
                <span className="exports-section-kicker">Couverture</span>
                <h3>Ce que le rapport doit montrer</h3>
              </div>
            </div>
            <ul className="exports-bullet-list">
              <li>Score global, rang, mention, share of voice et evolution.</li>
              <li>Benchmark concurrentiel avec ecarts et leader courant.</li>
              <li>Analyse prompt par prompt avec preuves LLM.</li>
              <li>Accord inter-modeles et divergences detectees.</li>
              <li>Actions prioritaires, risques et prochaines decisions.</li>
            </ul>
          </section>

          <section className="exports-panel">
            <div className="exports-section-head">
              <div>
                <span className="exports-section-kicker">Rappel moteur</span>
                <h3>Etat d export courant</h3>
              </div>
            </div>

            <div className="exports-mini-metrics">
              <div>
                <Bot size={16} />
                <span>Modeles</span>
                <strong>{modelCount}</strong>
              </div>
              <div>
                <Sparkles size={16} />
                <span>Prompts</span>
                <strong>{promptCount}</strong>
              </div>
              <div>
                <FolderKanban size={16} />
                <span>Concurrents</span>
                <strong>{competitorCount}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
