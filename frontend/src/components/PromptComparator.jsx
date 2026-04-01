import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  ChevronsRight,
  Crosshair,
  Eye,
  Filter,
  MessageSquareText,
  Radar,
  ShieldAlert,
  Sparkles,
  Target
} from 'lucide-react';
import './PromptComparator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const INTENT_RULES = [
  { key: 'comparaison', label: 'Comparaison', match: /(comparatif|vs|alternative|alternatives|compare)/i },
  { key: 'prix', label: 'Prix', match: /(prix|tarif|pas cher|cher|rapport qualite)/i },
  { key: 'reassurance', label: 'Reassurance', match: /(avis|fiable|confiance|service client|garantie)/i },
  { key: 'decouverte', label: 'Decouverte', match: /(meilleur|top|quelle|quels|recommande)/i }
];

function deriveIntent(prompt) {
  const rule = INTENT_RULES.find((item) => item.match.test(prompt || ''));
  return rule || { key: 'consideration', label: 'Consideration' };
}

function buildPromptSummary(prompt) {
  const intent = prompt.intent || deriveIntent(prompt.prompt);
  const competitivePressure = (prompt.competitors_mentioned || []).length;
  const goodPosition = prompt.avg_position && prompt.avg_position <= 2;
  const missedPrompt = !prompt.brand_mentioned;
  const promptQualityScore = prompt.prompt_quality_score ?? 0;
  const promptQualityLabel = prompt.prompt_quality_label || 'n/a';

  let status = 'watch';
  let statusLabel = 'A surveiller';
  let rationale = `Prompt ${promptQualityLabel.toLowerCase()} (${promptQualityScore}/100), utile mais non decisif pour l instant.`;

  if (missedPrompt) {
    status = 'risk';
    statusLabel = 'Marque absente';
    rationale = 'La marque ne ressort pas sur cette requete. Priorite contenu et preuves de marque.';
  } else if (goodPosition && prompt.mention_rate >= 60) {
    status = 'win';
    statusLabel = 'Point fort';
    rationale = 'La marque est bien citee et ressort tot dans la reponse modele.';
  } else if (prompt.avg_position && prompt.avg_position > 2.5) {
    status = 'watch';
    statusLabel = 'Visible mais fragile';
    rationale = 'La marque est citee, mais pas assez haut pour verrouiller la consideration.';
  }

  return {
    ...prompt,
    intent,
    status,
    statusLabel,
    rationale,
    competitivePressure,
    promptQualityScore,
    promptQualityLabel,
    proofLine: missedPrompt
      ? 'Aucune citation detectee sur les modeles actifs.'
      : `${prompt.mention_rate}% des modeles citent la marque, position moyenne ${prompt.avg_position || 'n/a'}.`
  };
}

function makeDemoData(brand) {
  const prompts = [
    `Meilleure offre ${brand.toLowerCase()} pas cher ?`,
    `Comparatif ${brand.toLowerCase()} vs concurrents`,
    'Top marques recommandees par les experts',
    `${brand} fiable ou pas ?`,
    `Alternatives a ${brand.toLowerCase()}`,
    `Avis sur ${brand.toLowerCase()}`
  ];
  const competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C'];

  function seededRand(seed) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) & 0xffffffff;
      return (state >>> 0) / 0xffffffff;
    };
  }

  const stats = prompts.map((prompt, index) => {
    const rand = seededRand(index * 997 + brand.charCodeAt(0) * 31);
    const mentionRate = Math.round(rand() * 90);
    const avgPosition = mentionRate > 0 ? parseFloat((1 + rand() * 4).toFixed(1)) : null;
    const topOfMind = mentionRate > 0 ? Math.round(rand() * 50) : 0;
    const score = parseFloat((mentionRate * 0.5 + (avgPosition ? 100 / avgPosition * 0.3 : 0) + topOfMind * 0.2).toFixed(1));
    const comps = competitors.filter(() => rand() > 0.5).slice(0, 2);

    return {
      prompt,
      mention_rate: mentionRate,
      avg_position: avgPosition,
      top_of_mind: topOfMind,
      brand_mentioned: mentionRate > 0,
      brand_position: avgPosition ? Math.round(avgPosition) : null,
      competitors_mentioned: comps,
      models_count: 1,
      score
    };
  });

  stats.sort((left, right) => right.score - left.score);

  return {
    brand,
    prompts: stats,
    best_prompt: stats[0]?.prompt,
    worst_prompt: stats[stats.length - 1]?.prompt,
    total_prompts: stats.length,
    metadata: { is_demo: true, models: ['qwen3.5'] }
  };
}

export default function PromptComparator({ brand, projectId }) {
  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [mentionFilter, setMentionFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [selectedPromptId, setSelectedPromptId] = useState(null);

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (brand) params.set('brand', brand);
        if (projectId) params.set('project_id', projectId);
        const response = await fetch(`${API_URL}/prompts/compare?${params.toString()}`, {
          credentials: 'include'
        });
        const payload = response.ok ? await response.json() : makeDemoData(brand);
        if (!cancelled) setData({ ...payload, _brand: brand });
      } catch {
        if (!cancelled) setData({ ...makeDemoData(brand), _brand: brand });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [brand, projectId]);

  const enrichedPrompts = useMemo(() => {
    return (data?.prompts || []).map((prompt, index) => ({
      ...buildPromptSummary(prompt),
      id: `${prompt.prompt}-${index}`
    }));
  }, [data]);

  const filteredPrompts = useMemo(() => {
    const next = [...enrichedPrompts]
      .filter((prompt) => {
        if (mentionFilter === 'mentioned') return prompt.brand_mentioned;
        if (mentionFilter === 'absent') return !prompt.brand_mentioned;
        return true;
      })
      .filter((prompt) => {
        if (intentFilter === 'all') return true;
        return prompt.intent.key === intentFilter;
      });

    next.sort((left, right) => {
      if (sortBy === 'mention_rate') return right.mention_rate - left.mention_rate;
      if (sortBy === 'avg_position') {
        if (!left.avg_position) return 1;
        if (!right.avg_position) return -1;
        return left.avg_position - right.avg_position;
      }
      return right.score - left.score;
    });

    return next;
  }, [enrichedPrompts, mentionFilter, intentFilter, sortBy]);

  const effectiveSelectedPromptId = (
    selectedPromptId && filteredPrompts.some((item) => item.id === selectedPromptId)
      ? selectedPromptId
      : filteredPrompts[0]?.id || null
  );

  const selectedPrompt = filteredPrompts.find((item) => item.id === effectiveSelectedPromptId) || null;

  const summary = useMemo(() => {
    const prompts = enrichedPrompts;
    const mentionedCount = prompts.filter((prompt) => prompt.brand_mentioned).length;
    const absentCount = prompts.length - mentionedCount;
    const strongCount = prompts.filter((prompt) => prompt.status === 'win').length;
    return {
      mentionedCount,
      absentCount,
      strongCount,
      averageQuality: data?.summary?.average_quality_score ?? 0,
      weakPromptCount: data?.summary?.weak_prompt_count ?? 0
    };
  }, [data, enrichedPrompts]);
  const bestPrompt = filteredPrompts[0] || null;
  const worstPrompt = [...filteredPrompts].reverse().find(Boolean) || null;

  if (!brand || !data || data._brand !== brand) {
    return (
      <div className="proof-shell">
        <div className="proof-loading">Chargement du mode preuve...</div>
      </div>
    );
  }

  return (
    <div className="proof-shell">
      <header className="proof-topbar">
        <div className="proof-title-block">
          <span className="proof-eyebrow">Mode preuve</span>
          <h2>Lecture prompt par prompt pour {brand}</h2>
          <p>Vous voyez les requetes qui font citer la marque, celles qui la font disparaitre, et la pression concurrente associee.</p>
        </div>

        <div className="proof-stat-row">
          <div className="proof-stat-card">
            <BadgeCheck size={18} />
            <div>
              <span>Prompts solides</span>
              <strong>{summary.strongCount}</strong>
            </div>
          </div>
          <div className="proof-stat-card">
            <Eye size={18} />
            <div>
              <span>Prompts visibles</span>
              <strong>{summary.mentionedCount}</strong>
            </div>
          </div>
          <div className="proof-stat-card risk">
            <ShieldAlert size={18} />
            <div>
              <span>Prompts manques</span>
              <strong>{summary.absentCount}</strong>
            </div>
          </div>
          <div className="proof-stat-card">
            <Sparkles size={18} />
            <div>
              <span>Qualite moyenne</span>
              <strong>{summary.averageQuality || 'n/a'}</strong>
            </div>
          </div>
        </div>
      </header>

      <div className="proof-controls">
        <div className="control-group">
          <span><Filter size={14} /> Statut</span>
          {[
            ['all', 'Tous'],
            ['mentioned', 'Marque citee'],
            ['absent', 'Marque absente']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mentionFilter === value ? 'active' : ''}
              onClick={() => setMentionFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="control-group">
          <span><Target size={14} /> Intent</span>
          {[
            ['all', 'Tous'],
            ['comparaison', 'Comparaison'],
            ['decouverte', 'Decouverte'],
            ['reassurance', 'Reassurance'],
            ['prix', 'Prix']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={intentFilter === value ? 'active' : ''}
              onClick={() => setIntentFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="control-group">
          <span><Radar size={14} /> Tri</span>
          {[
            ['score', 'Score'],
            ['mention_rate', 'Mentions'],
            ['avg_position', 'Position']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={sortBy === value ? 'active' : ''}
              onClick={() => setSortBy(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="proof-summary-band">
        <article className="summary-band-card accent">
          <span>Lecture prioritaire</span>
          <strong>{selectedPrompt?.statusLabel || 'Selectionnez un prompt'}</strong>
          <p>{selectedPrompt?.rationale || 'Choisissez une requete pour lire son poids decisionnel et la pression associee.'}</p>
        </article>
        <article className="summary-band-card">
          <span>Meilleur prompt</span>
          <strong>{bestPrompt?.intent.label || 'n/a'}</strong>
          <p>{bestPrompt?.prompt || 'Aucun prompt classe pour le moment.'}</p>
        </article>
        <article className="summary-band-card risk">
          <span>Prompt le plus faible</span>
          <strong>{worstPrompt?.statusLabel || 'n/a'}</strong>
          <p>{worstPrompt?.prompt || 'Aucun signal faible a afficher.'}</p>
        </article>
      </section>

      <div className="proof-workspace">
        <aside className="proof-list">
          {filteredPrompts.map((prompt, index) => (
            <button
              key={prompt.id}
              type="button"
              className={`proof-list-item ${effectiveSelectedPromptId === prompt.id ? 'active' : ''} ${prompt.status}`}
              onClick={() => setSelectedPromptId(prompt.id)}
            >
              <div className="proof-list-rank">{index + 1}</div>
              <div className="proof-list-copy">
                <div className="proof-list-topline">
                  <span className={`status-pill ${prompt.status}`}>{prompt.statusLabel}</span>
                  <span className="intent-pill">{prompt.intent.label}</span>
                </div>
                <strong>{prompt.prompt}</strong>
                <span>{prompt.proofLine}</span>
              </div>
            </button>
          ))}

          {filteredPrompts.length === 0 && (
            <div className="proof-empty">
              Aucun prompt ne correspond au filtre actif.
            </div>
          )}
        </aside>

        <section className="proof-focus">
          {selectedPrompt ? (
            <>
              <div className="focus-card headline">
                <div className="focus-card-top">
                  <span className={`status-pill ${selectedPrompt.status}`}>{selectedPrompt.statusLabel}</span>
                  <span className="intent-pill">{selectedPrompt.intent.label}</span>
                </div>
                <h3>{selectedPrompt.prompt}</h3>
                <p>{selectedPrompt.rationale}</p>
              </div>

              <div className="focus-grid">
                <article className="focus-card metric">
                  <span>Presence inter-modeles</span>
                  <strong>{selectedPrompt.mention_rate}%</strong>
                </article>
                <article className="focus-card metric">
                  <span>Position moyenne</span>
                  <strong>{selectedPrompt.avg_position ? `#${selectedPrompt.avg_position}` : 'Absente'}</strong>
                </article>
                <article className="focus-card metric">
                  <span>Top of mind</span>
                  <strong>{selectedPrompt.top_of_mind}%</strong>
                </article>
                <article className="focus-card metric">
                  <span>Pression concurrente</span>
                  <strong>{selectedPrompt.competitivePressure}</strong>
                </article>
              </div>

              <div className="focus-card">
                <div className="focus-section-head">
                  <MessageSquareText size={16} />
                  <strong>Ce que voit l IA</strong>
                </div>
                <p className="focus-paragraph">{selectedPrompt.proofLine}</p>
                <div className="focus-inline-list">
                  <span className="mini-chip">
                    <Sparkles size={14} />
                    Qualite {selectedPrompt.promptQualityScore}/100
                  </span>
                  <span className="mini-chip">
                    <Bot size={14} />
                    {selectedPrompt.models_count} modele{selectedPrompt.models_count > 1 ? 's' : ''}
                  </span>
                  <span className="mini-chip">
                    <ShieldAlert size={14} />
                    Accord {selectedPrompt.agreement_score ?? 'n/a'}%
                  </span>
                  <span className="mini-chip">
                    <Crosshair size={14} />
                    Score {selectedPrompt.score}
                  </span>
                  {selectedPrompt.brand_position ? (
                    <span className="mini-chip success">
                      <Target size={14} />
                      Position initiale #{selectedPrompt.brand_position}
                    </span>
                  ) : (
                    <span className="mini-chip risk">
                      <AlertTriangle size={14} />
                      Aucune premiere citation
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="focus-card">
              <p>Aucun prompt selectionne.</p>
            </div>
          )}
        </section>

        <aside className="proof-rail">
          <div className="rail-card">
            <div className="focus-section-head">
              <Sparkles size={16} />
              <strong>Lecture operable</strong>
            </div>
            {selectedPrompt ? (
              <>
                <p>{selectedPrompt.rationale}</p>
                {selectedPrompt.prompt_issues?.length ? (
                  <ul className="rail-list">
                    {selectedPrompt.prompt_issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                <ul className="rail-list">
                  <li>
                    {selectedPrompt.brand_mentioned
                      ? 'Conserver ce prompt dans le noyau de suivi.'
                      : 'Creer une preuve de marque ou un contenu cible sur cette intention.'}
                  </li>
                  <li>
                    {selectedPrompt.competitivePressure > 1
                      ? 'Les concurrents ressortent ensemble sur cette requete. Priorite benchmark.'
                      : 'La pression concurrente reste moderee sur cette requete.'}
                  </li>
                  <li>
                    {selectedPrompt.intent.key === 'comparaison'
                      ? 'Traiter cette requete comme prompt strategique de consideration.'
                      : 'Verifier si cette intention merite un cluster dedie.'}
                  </li>
                </ul>
              </>
            ) : (
              <p>Selectionnez un prompt pour lire sa valeur decisionnelle.</p>
            )}
          </div>

          <div className="rail-card">
            <div className="focus-section-head">
              <ChevronsRight size={16} />
              <strong>Concurrents cites</strong>
            </div>
            {selectedPrompt?.competitors_mentioned?.length ? (
              <div className="competitor-stack">
                {selectedPrompt.competitors_mentioned.map((competitor) => (
                  <span key={competitor} className="competitor-pill">{competitor}</span>
                ))}
              </div>
            ) : (
              <p>Aucun concurrent dominant detecte sur ce prompt.</p>
            )}
          </div>

          <div className="rail-card">
            <div className="focus-section-head">
              <Bot size={16} />
              <strong>Cadre du run</strong>
            </div>
              <div className="rail-metric-list">
                <div>
                  <span>Total prompts</span>
                  <strong>{data.total_prompts}</strong>
                </div>
              <div>
                <span>Modeles</span>
                <strong>{data.metadata?.models?.length || 1}</strong>
              </div>
                <div>
                  <span>Marque citee</span>
                  <strong>{summary.mentionedCount}</strong>
                </div>
                <div>
                  <span>Prompts fragiles</span>
                  <strong>{summary.weakPromptCount}</strong>
                </div>
              </div>
          </div>

          <div className="rail-footer">
            Analyse sur {data.metadata?.models?.join(', ') || 'qwen3.5'} ·
            {data.metadata?.is_demo ? ' donnees demo' : ' donnees reelles'} ·
            {data.total_prompts} prompts
          </div>
        </aside>
      </div>
    </div>
  );
}
