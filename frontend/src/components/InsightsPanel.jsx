import React from 'react';
import './Charts.css';

export default function InsightsPanel({ insights, brand }) {
  if (!insights) return null;

  const strengths = insights.strengths?.length ? insights.strengths : ['Aucun point fort remonte pour ce snapshot.'];
  const weaknesses = insights.weaknesses?.length ? insights.weaknesses : ['Aucune faiblesse critique detectee.'];
  const recommendations = insights.recommendations?.length ? insights.recommendations : ['Aucune recommandation immediate.'];

  return (
    <div className="chart-container chart-full">
      <div className="chart-header">
        <div className="chart-header-copy">
          <h3>Insights {brand}</h3>
          <span>Lecture operationnelle des points forts, risques et actions</span>
        </div>
        {insights.rank ? (
          <span className="chart-badge">Rang #{insights.rank}</span>
        ) : null}
      </div>

      <div className="chart-body">
        <div className="insights-panel">
          <div className="insights-summary">
            <span className="insights-pill">{weaknesses.length} faiblesse{weaknesses.length > 1 ? 's' : ''}</span>
            <span className="insights-pill">{strengths.length} point{strengths.length > 1 ? 's' : ''} fort{strengths.length > 1 ? 's' : ''}</span>
            <span className="insights-pill">{recommendations.length} action{recommendations.length > 1 ? 's' : ''}</span>
          </div>

          <div className="insights-grid">
            <section className="insight-card">
              <h4>Points faibles</h4>
              <ul>
                {weaknesses.map((item, index) => (
                  <li key={index} className={insights.weaknesses?.length ? 'text-red' : 'text-muted'}>
                    - {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="insight-card">
              <h4>Points forts</h4>
              <ul>
                {strengths.map((item, index) => (
                  <li key={index} className={insights.strengths?.length ? 'text-green' : 'text-muted'}>
                    + {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="insight-card">
              <h4>Recommandations</h4>
              <ul>
                {recommendations.map((item, index) => (
                  <li key={index} className={insights.recommendations?.length ? 'text-yellow' : 'text-muted'}>
                    &gt; {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
