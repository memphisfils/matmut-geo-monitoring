import React, { useMemo } from 'react';
import { AlertTriangle, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react';
import MetricTape from '../MetricTape';
import SentimentChart from '../SentimentChart';
import InsightsPanel from '../InsightsPanel';
import './AnalysisTabs.css';

function getSentimentTone(score) {
  if (score > 20) return 'good';
  if (score < -20) return 'risk';
  return 'watch';
}

function getSentimentLabel(score) {
  if (score > 20) return 'positif';
  if (score < -20) return 'negatif';
  return 'neutre';
}

export default function SentimentTab({ config, data }) {
  const ranking = useMemo(() => data?.ranking || [], [data?.ranking]);
  const insights = data?.insights || {};
  const target = ranking.find((item) => item.brand === config.brand) || ranking[0];
  const score = target?.sentiment_score || 0;
  const tone = getSentimentTone(score);

  const strengthCount = insights?.strengths?.length || 0;
  const weaknessCount = insights?.weaknesses?.length || 0;
  const actionCount = insights?.recommendations?.length || 0;

  const competitors = useMemo(() => (
    ranking
      .filter((item) => item.brand !== config.brand)
      .slice(0, 3)
      .map((item) => ({
        brand: item.brand,
        score: item.sentiment_score || 0
      }))
  ), [config.brand, ranking]);

  const tapeItems = [
    { label: 'Sentiment', value: score, decimals: 0, meta: getSentimentLabel(score) },
    { label: 'Points forts', value: strengthCount, meta: 'dans les insights' },
    { label: 'Faiblesses', value: weaknessCount, meta: 'a surveiller' },
    { label: 'Actions', value: actionCount, meta: 'prioritaires' }
  ];

  return (
    <div className="analysis-shell">
      <section className="analysis-header">
        <div className="analysis-heading">
          <span className="analysis-kicker">Sentiment</span>
          <h2>Perception qualitative de {config.brand}</h2>
          <p>
            Cette page doit expliquer si le ton des reponses aide ou freine la marque,
            puis traduire ce signal en actions claires pour le contenu et le positionnement.
          </p>
          <div className="analysis-summary-line">
            <span className={`analysis-tone ${tone}`}>{getSentimentLabel(score)}</span>
            <span className="analysis-chip">rang {insights?.rank ? `#${insights.rank}` : 'n/a'}</span>
          </div>
        </div>

        <div className="analysis-hero-panel">
          <div className="analysis-hero-grid">
            <div>
              <span>Score de ton</span>
              <strong>{score.toFixed(0)}</strong>
            </div>
            <div>
              <span>Signal principal</span>
              <strong>{getSentimentLabel(score)}</strong>
            </div>
            <div>
              <span>Actions</span>
              <strong>{actionCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <div className="analysis-layout">
        <div className="analysis-main">
          <SentimentChart ranking={ranking} brand={config.brand} />
          <InsightsPanel insights={insights} brand={config.brand} />
        </div>

        <aside className="analysis-rail">
          <section className="analysis-panel emphasis">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Lecture du ton</span>
                <h3>Ce que vous devez retenir</h3>
              </div>
            </div>
            <div className="analysis-note-list">
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><HeartHandshake size={18} /></div>
                <div>
                  <strong>Perception actuelle</strong>
                  <p>Le sentiment ressort en <strong>{getSentimentLabel(score)}</strong> avec un score de {score.toFixed(0)} sur ce snapshot.</p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><ShieldCheck size={18} /></div>
                <div>
                  <strong>Posture recommandee</strong>
                  <p>Conserver les formulations bien citees et renforcer les contenus qui rassurent sur la fiabilite et la preuve produit.</p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><AlertTriangle size={18} /></div>
                <div>
                  <strong>Point de vigilance</strong>
                  <p>Un bon score de ton ne compense pas une absence de marque. Il doit etre lu avec les vues `Requetes` et `Benchmark`.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="analysis-panel">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Concurrents</span>
                <h3>Comparaison rapide du ton</h3>
              </div>
            </div>
            <div className="analysis-category-list">
              {competitors.map((item) => (
                <div key={item.brand} className="analysis-category-item">
                  <div className="analysis-category-topline">
                    <div className="analysis-category-copy">
                      <span className="analysis-category-label">{item.brand}</span>
                      <strong>{item.score.toFixed(0)}</strong>
                    </div>
                    <span className={`analysis-inline-pill ${getSentimentTone(item.score)}`}>{getSentimentLabel(item.score)}</span>
                  </div>
                  <div className="analysis-progress">
                    <div
                      className="analysis-progress-fill"
                      style={{ width: `${Math.max(0, Math.min(100, item.score + 50))}%` }}
                    />
                  </div>
                </div>
              ))}
              {!competitors.length && (
                <div className="analysis-note-item">
                  <div className="analysis-note-icon"><Sparkles size={18} /></div>
                  <div>
                    <strong>Comparaison indisponible</strong>
                    <p>Le run ne contient pas encore assez de concurrents pour une lecture comparative de ton.</p>
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
