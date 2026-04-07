import React, { useMemo } from 'react';
import { Activity, ArrowUpRight, CalendarClock, ScanSearch, Waves } from 'lucide-react';
import MetricTape from '../MetricTape';
import TrendChart from '../TrendChart';
import './AnalysisTabs.css';

function formatDateLabel(value) {
  return value || 'maintenant';
}

export default function HistoryTab({ config, trendHistory, data }) {
  const latestEntry = trendHistory?.[trendHistory.length - 1] || null;
  const previousEntry = trendHistory?.length > 1 ? trendHistory[trendHistory.length - 2] : null;
  const latestScore = typeof latestEntry?.[config.brand] === 'number'
    ? latestEntry[config.brand]
    : data?.ranking?.find((item) => item.brand === config.brand)?.global_score || 0;
  const previousScore = typeof previousEntry?.[config.brand] === 'number' ? previousEntry[config.brand] : null;
  const delta = typeof previousScore === 'number' ? latestScore - previousScore : null;

  const recentSnapshots = useMemo(() => (
    [...(trendHistory || [])]
      .slice(-5)
      .reverse()
      .map((entry) => ({
        date: formatDateLabel(entry.date),
        score: entry[config.brand]
      }))
  ), [config.brand, trendHistory]);

  const scoreRange = useMemo(() => {
    const values = (trendHistory || []).map((entry) => entry[config.brand]).filter((value) => typeof value === 'number');
    if (!values.length) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, [config.brand, trendHistory]);

  const tapeItems = [
    { label: 'Snapshots', value: trendHistory?.length || 0, meta: 'historique' },
    { label: 'Dernier score', value: latestScore || 0, decimals: 1, meta: latestEntry?.date || 'run courant' },
    typeof delta === 'number'
      ? { label: 'Delta recent', value: delta, decimals: 1, signed: true, meta: 'vs snapshot precedent' }
      : { label: 'Delta recent', value: 0, meta: 'pas assez d historique' },
    {
      label: 'Amplitude',
      value: scoreRange ? scoreRange.max - scoreRange.min : 0,
      decimals: 1,
      meta: scoreRange ? `${scoreRange.min.toFixed(1)} -> ${scoreRange.max.toFixed(1)}` : 'stable'
    }
  ];

  return (
    <div className="analysis-shell">
      <section className="analysis-header">
        <div className="analysis-heading">
          <span className="analysis-kicker">Tendances</span>
          <h2>Trajectoire de visibilite pour {config.brand}</h2>
          <p>
            Cette vue doit repondre a une question simple: est-ce que la marque monte,
            recule ou stagne dans le temps, et sur quelle profondeur d historique.
          </p>
          <div className="analysis-summary-line">
            <span className="analysis-chip">{trendHistory?.length || 0} snapshot(s)</span>
            <span className="analysis-chip">{latestEntry?.date || 'run courant'}</span>
          </div>
        </div>

        <div className="analysis-hero-panel">
          <div className="analysis-hero-grid">
            <div>
              <span>Dernier score</span>
              <strong>{latestScore.toFixed(1)}</strong>
            </div>
            <div>
              <span>Variation courte</span>
              <strong className={delta != null && delta < 0 ? 'analysis-down' : 'analysis-up'}>
                {delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pts` : 'n/a'}
              </strong>
            </div>
            <div>
              <span>Amplitude</span>
              <strong>{scoreRange ? `${(scoreRange.max - scoreRange.min).toFixed(1)} pts` : 'n/a'}</strong>
            </div>
          </div>
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <div className="analysis-layout">
        <div className="analysis-main">
          <TrendChart data={trendHistory} brand={config.brand} />
        </div>

        <aside className="analysis-rail">
          <section className="analysis-panel emphasis">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Lecture du moment</span>
                <h3>Ce que dit la courbe</h3>
              </div>
            </div>
            <div className="analysis-note-list">
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Activity size={18} /></div>
                <div>
                  <strong>{delta != null && delta < 0 ? 'Recul recent' : 'Signal stable'}</strong>
                  <p>
                    {delta != null
                      ? `Le dernier mouvement est de ${delta > 0 ? '+' : ''}${delta.toFixed(1)} point(s) sur ${config.brand}.`
                      : 'Une seule mesure est disponible pour le moment. La vraie lecture tendance apparaitra au prochain run.'}
                  </p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Waves size={18} /></div>
                <div>
                  <strong>Profondeur d historique</strong>
                  <p>{trendHistory?.length || 0} point(s) disponibles. L ideal produit commence a partir de 5 runs comparables.</p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><ArrowUpRight size={18} /></div>
                <div>
                  <strong>Action recommandee</strong>
                  <p>Relancer l analyse apres un changement de contenu ou de benchmark pour rendre la trajectoire interpretable.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="analysis-panel">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Snapshots</span>
                <h3>Dernieres mesures</h3>
              </div>
              <span className="analysis-panel-meta">5 plus recentes</span>
            </div>

            <div className="analysis-snapshot-list">
              {recentSnapshots.map((snapshot) => (
                <div key={snapshot.date} className="analysis-snapshot-item">
                  <div>
                    <span className="analysis-snapshot-label"><CalendarClock size={14} /> {snapshot.date}</span>
                    <p className="analysis-snapshot-meta">Score du snapshot</p>
                  </div>
                  <strong className="analysis-snapshot-value">
                    {typeof snapshot.score === 'number' ? snapshot.score.toFixed(1) : 'n/a'}
                  </strong>
                </div>
              ))}
              {!recentSnapshots.length && (
                <div className="analysis-snapshot-item">
                  <div>
                    <span className="analysis-snapshot-label"><ScanSearch size={14} /> Historique vide</span>
                    <p className="analysis-snapshot-meta">Un nouveau run alimentera cette liste.</p>
                  </div>
                  <strong className="analysis-snapshot-value">0</strong>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
