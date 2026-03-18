import React, { useState, useEffect } from 'react';
import './PromptComparator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Comparateur de prompts — Sprint 3
 * Montre quels prompts génèrent le plus/moins de mentions de la marque.
 */
export default function PromptComparator({ brand }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy]   = useState('score');
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    fetch(`${API_URL}/prompts/compare`)
      .then(r => r.ok ? r.json() : Promise.reject('unavailable'))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(makeDemoData(brand)); setLoading(false); });
  }, [brand]);

  if (loading) return (
    <div className="pc-wrapper">
      <div className="pc-loading">CHARGEMENT…</div>
    </div>
  );

  if (!data) return null;

  const prompts = (data.prompts || [])
    .filter(p => {
      if (filter === 'mentioned') return p.brand_mentioned;
      if (filter === 'absent')    return !p.brand_mentioned;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'mention_rate') return b.mention_rate - a.mention_rate;
      if (sortBy === 'avg_position') {
        if (!a.avg_position) return 1;
        if (!b.avg_position) return -1;
        return a.avg_position - b.avg_position;
      }
      return b.score - a.score;
    });

  const maxScore       = Math.max(...prompts.map(p => p.score), 1);
  const mentionedCount = (data.prompts || []).filter(p => p.brand_mentioned).length;
  const absentCount    = (data.prompts || []).length - mentionedCount;

  return (
    <div className="pc-wrapper">
      <div className="pc-header">
        <div className="pc-title-block">
          <h3 className="pc-title">COMPARATEUR DE PROMPTS</h3>
          <span className="pc-brand-chip">{brand?.toUpperCase()}</span>
        </div>
        <div className="pc-header-stats">
          <span className="pc-stat-chip mentioned">{mentionedCount} mentionnée</span>
          <span className="pc-stat-chip absent">{absentCount} absente</span>
        </div>
      </div>

      {data.best_prompt && data.worst_prompt && (
        <div className="pc-bw-row">
          <div className="pc-bw-card best">
            <span className="pc-bw-label">MEILLEUR PROMPT</span>
            <span className="pc-bw-text">{data.best_prompt}</span>
          </div>
          <div className="pc-bw-card worst">
            <span className="pc-bw-label">PIRE PROMPT</span>
            <span className="pc-bw-text">{data.worst_prompt}</span>
          </div>
        </div>
      )}

      <div className="pc-controls">
        <div className="pc-sort-group">
          <span className="pc-ctrl-label">TRIER PAR</span>
          {[['score', 'Score'], ['mention_rate', 'Mentions'], ['avg_position', 'Position']].map(([val, label]) => (
            <button
              key={val}
              className={`pc-ctrl-btn ${sortBy === val ? 'active' : ''}`}
              onClick={() => setSortBy(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="pc-filter-group">
          <span className="pc-ctrl-label">FILTRER</span>
          {[['all', 'Tous'], ['mentioned', 'Mentionnée'], ['absent', 'Absente']].map(([val, label]) => (
            <button
              key={val}
              className={`pc-ctrl-btn ${filter === val ? 'active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pc-list">
        {prompts.length === 0 && (
          <div className="pc-empty">Aucun prompt ne correspond au filtre sélectionné.</div>
        )}

        {prompts.map((p, i) => (
          <div key={i} className={`pc-row ${p.brand_mentioned ? 'mentioned' : 'absent'}`}>
            <div className="pc-row-rank">
              <span className="pc-rank-num">{i + 1}</span>
              <div className="pc-score-bar-track">
                <div className="pc-score-bar-fill" style={{ width: `${(p.score / maxScore) * 100}%` }} />
              </div>
            </div>

            <div className="pc-row-body">
              <div className="pc-prompt-text">{p.prompt}</div>

              <div className="pc-row-meta">
                <div className="pc-meta-item">
                  <span className="pc-meta-label">MENTION</span>
                  <span className={`pc-meta-val ${p.mention_rate > 50 ? 'good' : p.mention_rate > 0 ? 'mid' : 'bad'}`}>
                    {p.mention_rate}%
                  </span>
                </div>

                <div className="pc-meta-item">
                  <span className="pc-meta-label">POSITION</span>
                  <span className={`pc-meta-val ${p.avg_position && p.avg_position <= 2 ? 'good' : 'mid'}`}>
                    {p.avg_position ? `#${p.avg_position}` : '—'}
                  </span>
                </div>

                <div className="pc-meta-item">
                  <span className="pc-meta-label">TOP MIND</span>
                  <span className="pc-meta-val">{p.top_of_mind}%</span>
                </div>

                <div className="pc-meta-item">
                  <span className="pc-meta-label">SCORE</span>
                  <span className="pc-meta-val score">{p.score}</span>
                </div>

                {p.competitors_mentioned && p.competitors_mentioned.length > 0 && (
                  <div className="pc-comps">
                    {p.competitors_mentioned.map(c => (
                      <span key={c} className="pc-comp-chip">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pc-row-badge">
              {p.brand_mentioned
                ? <span className="pc-badge-ok">✓ #{p.brand_position ?? '?'}</span>
                : <span className="pc-badge-no">—</span>
              }
            </div>
          </div>
        ))}
      </div>

      <div className="pc-footer">
        Analyse sur {data.metadata?.models?.join(', ') || 'qwen3.5'} ·
        {data.metadata?.is_demo ? ' données démo' : ' données réelles'} ·
        {data.total_prompts} prompts
      </div>
    </div>
  );
}

function makeDemoData(brand) {
  const prompts = [
    `Meilleure offre ${brand.toLowerCase()} pas cher ?`,
    `Comparatif ${brand.toLowerCase()} vs concurrents`,
    `Top marques recommandées par les experts`,
    `${brand} fiable ou pas ?`,
    `Alternatives à ${brand.toLowerCase()}`,
    `Avis sur ${brand.toLowerCase()}`,
  ];

  const competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C'];

  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }

  const stats = prompts.map((prompt, i) => {
    const rand         = seededRand(i * 997 + brand.charCodeAt(0) * 31);
    const mention_rate = Math.round(rand() * 90);
    const avg_position = mention_rate > 0 ? parseFloat((1 + rand() * 4).toFixed(1)) : null;
    const top_of_mind  = mention_rate > 0 ? Math.round(rand() * 50) : 0;
    const score        = parseFloat((mention_rate * 0.5 + (avg_position ? 100 / avg_position * 0.3 : 0) + top_of_mind * 0.2).toFixed(1));
    const comps        = competitors.filter(() => rand() > 0.5).slice(0, 2);

    return {
      prompt, mention_rate, avg_position, top_of_mind,
      brand_mentioned: mention_rate > 0,
      brand_position: avg_position ? Math.round(avg_position) : null,
      competitors_mentioned: comps,
      models_count: 1, score
    };
  });

  stats.sort((a, b) => b.score - a.score);

  return {
    brand, prompts: stats,
    best_prompt:  stats[0]?.prompt,
    worst_prompt: stats[stats.length - 1]?.prompt,
    total_prompts: stats.length,
    metadata: { is_demo: true, models: ['qwen3.5'] }
  };
}
