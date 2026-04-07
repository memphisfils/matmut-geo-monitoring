import React, { useEffect, useState } from 'react';
import AnimatedNumber from './AnimatedNumber';
import './LLMBreakdown.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getConfLevel(confidence) {
  if (confidence >= 75) return 'high';
  if (confidence >= 45) return 'mid';
  return 'low';
}

function makeDemoData(brand) {
  const competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C'];
  const allBrands = [brand, ...competitors];
  const models = ['qwen3.5'];
  const byModel = { 'qwen3.5': {} };

  allBrands.forEach((item) => {
    const seed = item.split('').reduce((acc, char) => acc + char.charCodeAt(0) * 31, 0);
    let state = seed;
    const rand = () => {
      state = (state * 1664525 + 1013904223) & 0xffffffff;
      return (state >>> 0) / 0xffffffff;
    };

    byModel['qwen3.5'][item] = {
      mention_rate: Math.round(30 + rand() * 55),
      global_score: Math.round(20 + rand() * 60),
      avg_position: parseFloat((1.2 + rand() * 4).toFixed(1))
    };
  });

  const confidence = {};
  allBrands.forEach((item) => {
    confidence[item] = {
      confidence: null,
      divergence_level: 'N/A',
      std_dev: 0,
      avg_mention_rate: byModel['qwen3.5'][item]?.mention_rate || 0,
      per_model: { 'qwen3.5': byModel['qwen3.5'][item]?.mention_rate || 0 }
    };
  });

  return {
    models,
    by_model: byModel,
    confidence,
    main_brand_confidence: confidence[brand] || {},
    summary: {
      strongest_model: 'qwen3.5',
      weakest_model: 'qwen3.5',
      mention_spread: 0,
      agreement_score: null,
      divergence_level: 'N/A',
      model_count: 1
    },
    brand,
    metadata: { is_demo: true }
  };
}

export default function LLMBreakdown({ brand, projectId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (brand) params.set('brand', brand);
        if (projectId) params.set('project_id', projectId);
        const response = await fetch(`${API_URL}/metrics/by-model?${params.toString()}`, {
          credentials: 'include'
        });
        const payload = response.ok ? await response.json() : makeDemoData(brand);
        if (!cancelled) {
          setData({ ...payload, _brand: brand });
        }
      } catch {
        if (!cancelled) {
          setData({ ...makeDemoData(brand), _brand: brand });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [brand, projectId]);

  if (!brand || !data || data._brand !== brand) {
    return (
      <div className="llm-wrapper">
        <div className="llm-loading">Chargement...</div>
      </div>
    );
  }

  const models = data.models || [];
  const byModel = data.by_model || {};
  const confMap = data.confidence || {};
  const summary = data.summary || {};
  const singleModel = models.length <= 1;
  const mainConf = confMap[brand] || {};
  const confidenceValue = typeof mainConf.confidence === 'number' ? mainConf.confidence : null;
  const agreementValue = typeof summary.agreement_score === 'number' ? summary.agreement_score : null;
  const allBrands = Object.keys(Object.values(byModel)[0] || {})
    .sort((left, right) => {
      const avgLeft = models.reduce((sum, model) => sum + (byModel[model]?.[left]?.global_score || 0), 0) / (models.length || 1);
      const avgRight = models.reduce((sum, model) => sum + (byModel[model]?.[right]?.global_score || 0), 0) / (models.length || 1);
      return avgRight - avgLeft;
    })
    .slice(0, 6);
  const averageMention = models.length
    ? Math.round(models.reduce((sum, model) => sum + (byModel[model]?.[brand]?.mention_rate || 0), 0) / models.length)
    : 0;

  const summaryCards = [
    {
      label: 'Actifs',
      numeric: summary.model_count ?? (models.length || 1),
      note: models.join(', ') || 'qwen3.5'
    },
    {
      label: 'Mention',
      numeric: averageMention,
      suffix: '%',
      note: 'moyenne'
    },
    {
      label: 'Leader',
      text: summary.strongest_model || models[0] || 'n/a',
      note: 'meilleur moteur'
    },
    {
      label: 'Accord',
      numeric: singleModel ? null : agreementValue,
      suffix: singleModel ? '' : '%',
      text: singleModel ? 'N/A' : null,
      note: singleModel ? 'modele unique' : (summary.divergence_level || 'n/a')
    }
  ];

  return (
    <div className="llm-wrapper">
      <div className="llm-header">
        <div className="llm-header-copy">
          <h3 className="llm-title">Comparatif inter-modeles</h3>
          <p>{brand} - accord, spread et mention par moteur</p>
        </div>
        <div className={`llm-conf-badge ${singleModel ? 'single' : confidenceValue == null ? 'single' : getConfLevel(confidenceValue)}`}>
          {singleModel ? 'Modele unique' : confidenceValue == null ? 'Confiance partielle' : (
            <>
              <AnimatedNumber value={confidenceValue} decimals={0} suffix="%" /> confiance
            </>
          )}
        </div>
      </div>

      <div className="llm-summary-band">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className={`llm-summary-card ${card.label === 'Accord' && !singleModel && agreementValue != null ? getConfLevel(agreementValue) : ''}`.trim()}
          >
            <span>{card.label}</span>
            <strong>
              {typeof card.numeric === 'number'
                ? <AnimatedNumber value={card.numeric} decimals={0} suffix={card.suffix || ''} />
                : (card.text || 'n/a')}
            </strong>
            <p>{card.note}</p>
          </article>
        ))}
      </div>

      {singleModel ? (
        <div className="llm-single-note">
          Ajoutez d'autres modeles dans <code>.env</code> pour ouvrir la divergence inter-LLM.
        </div>
      ) : null}

      <div className="llm-table-scroll">
        <table className="llm-table">
          <thead>
            <tr>
              <th className="llm-th-brand">Marque</th>
              {models.map((model) => (
                <th key={model} className="llm-th-model">{model}</th>
              ))}
              {!singleModel && <th className="llm-th-conf">Spread</th>}
            </tr>
          </thead>
          <tbody>
            {allBrands.map((item) => {
              const conf = confMap[item] || {};
              return (
                <tr key={item} className={item === brand ? 'llm-row-target' : ''}>
                  <td className="llm-td-brand">{item}</td>
                  {models.map((model) => {
                    const rate = byModel[model]?.[item]?.mention_rate ?? 0;
                    return (
                      <td key={model} className="llm-td-val">
                        <div className="llm-cell">
                          <div className={`llm-cell-bar ${item === brand ? 'target' : ''}`} style={{ width: `${rate}%` }} />
                          <span className="llm-cell-num">
                            <AnimatedNumber value={rate} decimals={0} suffix="%" />
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  {!singleModel && (
                    <td className="llm-td-conf">
                      {conf.std_dev != null ? (
                        <span className={`llm-div-badge ${getConfLevel(100 - conf.std_dev * 2.5)}`}>
                          +/- <AnimatedNumber value={conf.std_dev} decimals={1} suffix="%" />
                        </span>
                      ) : '-'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!singleModel && (
        <div className="llm-legend">
          <span className="llm-leg high">Faible divergence</span>
          <span className="llm-leg mid">Divergence moderee</span>
          <span className="llm-leg low">Forte divergence</span>
        </div>
      )}
    </div>
  );
}
