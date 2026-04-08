import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Cable, ScanEye, SplitSquareVertical, Sparkles } from 'lucide-react';
import MetricTape from '../MetricTape';
import LLMBreakdown from '../LLMBreakdown';
import './AnalysisTabs.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function makeFallbackSummary(models = []) {
  return {
    summary: {
      strongest_model: models[0] || 'qwen3.5',
      weakest_model: models[models.length - 1] || models[0] || 'qwen3.5',
      mention_spread: 0,
      agreement_score: null,
      divergence_level: 'N/A',
      model_count: models.length || 1
    },
    models: models.length ? models : ['qwen3.5']
  };
}

export default function LLMStatusTab({ config }) {
  const [summaryData, setSummaryData] = useState(makeFallbackSummary(config?.models || []));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (config?.brand) params.set('brand', config.brand);
        if (config?.projectId) params.set('project_id', config.projectId);
        const response = await fetch(`${API_URL}/metrics/by-model?${params.toString()}`, {
          credentials: 'include'
        });
        const payload = response.ok ? await response.json() : makeFallbackSummary(config?.models || []);
        if (!cancelled) {
          setSummaryData(payload);
        }
      } catch {
        if (!cancelled) {
          setSummaryData(makeFallbackSummary(config?.models || []));
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [config?.brand, config?.models, config?.projectId]);

  const summary = summaryData?.summary || {};
  const models = summaryData?.models || config?.models || [];
  const tapeItems = useMemo(() => ([
    { label: 'Modeles actifs', value: summary.model_count ?? models.length ?? 1, meta: 'dans le run' },
    { label: 'Modele leader', value: 1, meta: summary.strongest_model || 'n/a' },
    {
      label: 'Accord',
      value: typeof summary.agreement_score === 'number' ? summary.agreement_score : 0,
      suffix: typeof summary.agreement_score === 'number' ? '%' : '',
      meta: typeof summary.agreement_score === 'number' ? (summary.divergence_level || 'n/a') : 'N/A'
    },
    { label: 'Spread', value: summary.mention_spread || 0, decimals: 1, meta: 'entre modeles' }
  ]), [models.length, summary.agreement_score, summary.divergence_level, summary.mention_spread, summary.model_count, summary.strongest_model]);

  return (
    <div className="analysis-shell">
      <section className="analysis-header">
        <div className="analysis-heading">
          <span className="analysis-kicker">LLM</span>
          <h2>Lecture inter-modeles pour {config.brand}</h2>
          <p>
            Cette page doit montrer si la visibilite de la marque tient selon plusieurs moteurs,
            ou si le resultat depend trop d un modele unique.
          </p>
          <div className="analysis-summary-line">
            <span className="analysis-chip">{summary.model_count ?? models.length ?? 1} modele(s)</span>
            <span className="analysis-chip">{summary.strongest_model || models[0] || 'qwen3.5'}</span>
          </div>
        </div>

        <div className="analysis-hero-panel">
          <div className="analysis-hero-grid">
            <div>
              <span>Leader</span>
              <strong>{summary.strongest_model || 'n/a'}</strong>
            </div>
            <div>
              <span>Accord</span>
              <strong>{typeof summary.agreement_score === 'number' ? `${summary.agreement_score}%` : 'N/A'}</strong>
            </div>
            <div>
              <span>Spread</span>
              <strong>{summary.mention_spread != null ? `${summary.mention_spread}` : 'n/a'}</strong>
            </div>
          </div>
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <div className="analysis-layout">
        <div className="analysis-main">
          <LLMBreakdown brand={config.brand} projectId={config.projectId} />
        </div>

        <aside className="analysis-rail">
          <section className="analysis-panel emphasis">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Lecture rapide</span>
                <h3>Comment interpréter</h3>
              </div>
            </div>
            <div className="analysis-note-list">
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Bot size={18} /></div>
                <div>
                  <strong>Modele leader</strong>
                  <p>{summary.strongest_model || 'n/a'} tire actuellement le meilleur niveau de mention pour la marque.</p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><SplitSquareVertical size={18} /></div>
                <div>
                  <strong>Divergence</strong>
                  <p>
                    {typeof summary.agreement_score === 'number'
                      ? `Accord estime a ${summary.agreement_score}% avec un spread de ${summary.mention_spread || 0}.`
                      : 'Un seul modele actif ne permet pas encore de lire une divergence inter-LLM.'}
                  </p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Sparkles size={18} /></div>
                <div>
                  <strong>Action recommandee</strong>
                  <p>Activer au moins deux moteurs stables avant de tirer une conclusion strategique sur la robustesse GEO.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="analysis-panel">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Etat moteur</span>
                <h3>Configuration active</h3>
              </div>
            </div>
            <div className="analysis-list">
              {models.map((model) => (
                <div key={model} className="analysis-llm-item">
                  <div className="analysis-llm-icon"><Cable size={18} /></div>
                  <div className="analysis-llm-copy">
                    <span>moteur</span>
                    <strong>{model}</strong>
                    <p>{model === summary.strongest_model ? 'moteur leader du snapshot' : 'moteur actif dans la comparaison'}</p>
                  </div>
                </div>
              ))}
              {!models.length && (
                <div className="analysis-llm-item">
                  <div className="analysis-llm-icon"><ScanEye size={18} /></div>
                  <div className="analysis-llm-copy">
                    <span>etat</span>
                    <strong>Aucun modele visible</strong>
                    <p>Le projet n expose pas encore sa liste de modeles actives.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
