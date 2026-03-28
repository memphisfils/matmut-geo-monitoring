import React, { useState, useEffect } from 'react';
import './LLMBreakdown.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Score de confiance par modèle LLM.
 * Montre la divergence entre les modèles pour chaque marque.
 *
 * Quand un seul modèle est configuré (plan gratuit) :
 *   → affiche les scores + note "activez plusieurs modèles pour la divergence"
 */
export default function LLMBreakdown({ brand }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    fetch(`${API_URL}/metrics/by-model`)
      .then(r => r.ok ? r.json() : Promise.reject('unavailable'))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => {
        setData(makeDemoData(brand));
        setLoading(false);
      });
  }, [brand]);

  if (loading) return (
    <div className="llm-wrapper">
      <div className="llm-loading">CHARGEMENT…</div>
    </div>
  );

  if (!data) return null;

  const models   = data.models || [];
  const byModel  = data.by_model || {};
  const confMap  = data.confidence || {};
  const singleModel = models.length <= 1;

  // Toutes les marques triées par score global (moyenne)
  const allBrands = Object.keys(
    Object.values(byModel)[0] || {}
  ).sort((a, b) => {
    const avgA = models.reduce((s, m) => s + (byModel[m]?.[a]?.global_score || 0), 0) / (models.length || 1);
    const avgB = models.reduce((s, m) => s + (byModel[m]?.[b]?.global_score || 0), 0) / (models.length || 1);
    return avgB - avgA;
  });

  const mainConf = confMap[brand] || {};

  return (
    <div className="llm-wrapper">
      <div className="llm-header">
        <h3 className="llm-title">SCORE DE CONFIANCE — {brand?.toUpperCase()}</h3>
        {!singleModel && mainConf.confidence != null && (
          <div className={`llm-conf-badge ${getConfLevel(mainConf.confidence)}`}>
            {mainConf.confidence}% confiance · divergence {mainConf.divergence_level}
          </div>
        )}
        {singleModel && (
          <div className="llm-conf-badge single">
            Modèle unique — divergence N/A
          </div>
        )}
      </div>

      {singleModel && (
        <div className="llm-single-note">
          Ajoutez d'autres modèles dans <code>.env</code> : <code>OLLAMA_MODELS=qwen3.5,llama3.2:8b</code>
          pour calculer la divergence inter-LLM.
        </div>
      )}

      {/* Tableau modèles × marques */}
      <div className="llm-table-scroll">
        <table className="llm-table">
          <thead>
            <tr>
              <th className="llm-th-brand">MARQUE</th>
              {models.map(m => (
                <th key={m} className="llm-th-model">{m}</th>
              ))}
              {!singleModel && <th className="llm-th-conf">DIVERGENCE</th>}
            </tr>
          </thead>
          <tbody>
            {allBrands.map(b => {
              const conf = confMap[b] || {};
              return (
                <tr key={b} className={b === brand ? 'llm-row-target' : ''}>
                  <td className="llm-td-brand">{b}</td>
                  {models.map(m => {
                    const rate = byModel[m]?.[b]?.mention_rate ?? 0;
                    return (
                      <td key={m} className="llm-td-val">
                        <div className="llm-cell">
                          <div
                            className="llm-cell-bar"
                            style={{ width: `${rate}%`, background: b === brand ? 'var(--accent-secondary)' : '#dddddd' }}
                          />
                          <span className="llm-cell-num">{rate}%</span>
                        </div>
                      </td>
                    );
                  })}
                  {!singleModel && (
                    <td className="llm-td-conf">
                      {conf.std_dev != null
                        ? <span className={`llm-div-badge ${getConfLevel(100 - conf.std_dev * 2.5)}`}>
                            ±{conf.std_dev}%
                          </span>
                        : '—'
                      }
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Légende confiance */}
      {!singleModel && (
        <div className="llm-legend">
          <span className="llm-leg high">■ Faible divergence — résultats fiables</span>
          <span className="llm-leg mid">■ Divergence modérée</span>
          <span className="llm-leg low">■ Forte divergence — interpréter avec précaution</span>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getConfLevel(confidence) {
  if (confidence >= 75) return 'high';
  if (confidence >= 45) return 'mid';
  return 'low';
}

function makeDemoData(brand) {
  const competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C'];
  const allBrands   = [brand, ...competitors];
  const models      = ['qwen3.5'];

  const byModel = { 'qwen3.5': {} };

  allBrands.forEach(b => {
    const seed = b.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 0);
    let s = seed;
    const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    byModel['qwen3.5'][b] = {
      mention_rate:  Math.round(30 + rand() * 55),
      global_score:  Math.round(20 + rand() * 60),
      avg_position:  parseFloat((1.2 + rand() * 4).toFixed(1))
    };
  });

  const confidence = {};
  allBrands.forEach(b => {
    confidence[b] = { confidence: null, divergence_level: 'N/A — modèle unique', std_dev: 0,
                      avg_mention_rate: byModel['qwen3.5'][b]?.mention_rate || 0,
                      per_model: { 'qwen3.5': byModel['qwen3.5'][b]?.mention_rate || 0 } };
  });

  return { models, by_model: byModel, confidence,
           main_brand_confidence: confidence[brand] || {},
           brand, metadata: { is_demo: true } };
}
