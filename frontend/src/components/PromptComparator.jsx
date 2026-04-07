import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  ChevronsRight,
  Filter,
  Gauge,
  MessageSquareText,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TimerReset
} from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import MetricTape from './MetricTape';
import './PromptComparator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const REFRESH_INTERVAL_MS = 20000;

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

function getDeltaTone(change) {
  if (typeof change !== 'number' || Number.isNaN(change) || change === 0) return 'neutral';
  return change > 0 ? 'positive' : 'negative';
}

function formatTimestamp(value) {
  if (!value) return 'n/a';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
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
    rationale = 'La marque ne ressort pas sur cette requete. Il faut renforcer la preuve produit et la citation de marque.';
  } else if (goodPosition && prompt.mention_rate >= 60) {
    status = 'win';
    statusLabel = 'Point fort';
    rationale = 'La marque est bien citee et ressort haut dans la reponse du modele.';
  } else if (prompt.avg_position && prompt.avg_position > 2.5) {
    status = 'watch';
    statusLabel = 'Visible mais fragile';
    rationale = 'La marque est citee, mais trop bas pour verrouiller la consideration.';
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
    `Quel est le meilleur generateur d'image pour ${brand.toLowerCase()} ?`,
    `Comparatif ${brand.toLowerCase()} vs Midjourney et Adobe Firefly`,
    `Quelle API d agents choisir face a ${brand.toLowerCase()} ?`,
    `${brand} est-il fiable pour la creation de contenu ?`,
    `Top solutions IA recommandees avec ${brand.toLowerCase()}`,
    `Alternatives a ${brand.toLowerCase()}`
  ];

  return {
    brand,
    prompts: prompts.map((prompt, index) => {
      const mentionRate = index === 5 ? 0 : 100 - index * 8;
      const avgPosition = mentionRate === 0 ? null : 1 + index * 0.25;
      const score = mentionRate === 0 ? 24 : Number((94 - index * 7.5).toFixed(1));
      const currentRank = index + 1;
      const previousRankPosition = index === 0 ? 2 : index === 1 ? 1 : currentRank;
      const rankChange = previousRankPosition - currentRank;
      return {
        prompt,
        mention_rate: mentionRate,
        avg_position: avgPosition,
        top_of_mind: mentionRate === 0 ? 0 : 100 - index * 14,
        brand_mentioned: mentionRate > 0,
        brand_position: avgPosition ? Math.round(avgPosition) : null,
        competitors_mentioned: index === 5 ? ['Midjourney', 'Microsoft Copilot'] : ['Midjourney'],
        models_count: 1,
        score,
        current_rank: currentRank,
        previous_rank_position: previousRankPosition,
        rank_change: rankChange,
        score_change: index === 0 ? 8.4 : index === 1 ? -3.1 : index === 5 ? -9.6 : 1.2,
        mention_change: index === 0 ? 12 : index === 5 ? -20 : 4,
        position_change: index === 0 ? 1 : index === 1 ? -0.5 : null,
        agreement_score: mentionRate === 0 ? 0 : 100,
        position_spread: index === 0 ? 0 : 1,
        best_model: 'qwen3.5',
        prompt_quality_score: 88 - index * 4,
        prompt_quality_label: index === 5 ? 'Faible' : 'Solide',
        prompt_issues: index === 5 ? ['La marque ne ressort pas dans cette formulation.'] : [],
        intent: deriveIntent(prompt),
        per_model: [],
        has_history: index < 3
      };
    }),
    best_prompt: prompts[0],
    worst_prompt: prompts[5],
    total_prompts: prompts.length,
    summary: {
      average_quality_score: 84.7,
      weak_prompt_count: 1,
      improved_prompt_count: 3,
      declined_prompt_count: 2,
      tracked_prompt_count: 3
    },
    metadata: {
      timestamp: new Date().toISOString(),
      previous_timestamp: new Date(Date.now() - 86400000).toISOString(),
      is_demo: true,
      models: ['qwen3.5']
    }
  };
}

function DeltaBadge({ label, change, suffix = '', decimals = 0, hideWhenEmpty = false }) {
  if (typeof change !== 'number') {
    return hideWhenEmpty ? null : (
      <span className="delta-badge neutral">
        <span className="delta-badge-label">{label}</span>
        <span className="delta-badge-meta">Base initiale</span>
      </span>
    );
  }

  const tone = getDeltaTone(change);
  const Icon = tone === 'positive' ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`delta-badge ${tone}`}>
      <span className="delta-badge-label">{label}</span>
      {tone === 'neutral' ? null : <Icon size={14} />}
      <AnimatedNumber value={change} decimals={decimals} signed suffix={suffix} className="delta-badge-value" />
    </span>
  );
}

export default function PromptComparator({ brand, projectId }) {
  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState('current_rank');
  const [mentionFilter, setMentionFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFlash, setRefreshFlash] = useState(false);

  useEffect(() => {
    if (!brand) return undefined;

    let cancelled = false;
    let flashTimeout = null;

    const load = async (background = false) => {
      if (background) setIsRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (brand) params.set('brand', brand);
        if (projectId) params.set('project_id', projectId);
        const response = await fetch(`${API_URL}/prompts/compare?${params.toString()}`, {
          credentials: 'include'
        });
        const payload = response.ok ? await response.json() : makeDemoData(brand);

        if (!cancelled) {
          setData({ ...payload, _brand: brand });
          setRefreshFlash(true);
          window.clearTimeout(flashTimeout);
          flashTimeout = window.setTimeout(() => setRefreshFlash(false), 1100);
        }
      } catch {
        if (!cancelled) {
          setData({ ...makeDemoData(brand), _brand: brand });
          setRefreshFlash(true);
          window.clearTimeout(flashTimeout);
          flashTimeout = window.setTimeout(() => setRefreshFlash(false), 1100);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    };

    load(false);
    const intervalId = window.setInterval(() => load(true), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(flashTimeout);
    };
  }, [brand, projectId]);

  const enrichedPrompts = useMemo(() => (
    (data?.prompts || []).map((prompt, index) => ({
      ...buildPromptSummary(prompt),
      id: `${prompt.prompt}-${index}`
    }))
  ), [data]);

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
      if (sortBy === 'score') return right.score - left.score;
      return (left.current_rank || 999) - (right.current_rank || 999);
    });

    return next;
  }, [enrichedPrompts, intentFilter, mentionFilter, sortBy]);

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
      weakPromptCount: data?.summary?.weak_prompt_count ?? 0,
      improvedPromptCount: data?.summary?.improved_prompt_count ?? 0,
      declinedPromptCount: data?.summary?.declined_prompt_count ?? 0,
      trackedPromptCount: data?.summary?.tracked_prompt_count ?? 0
    };
  }, [data, enrichedPrompts]);

  const bestPrompt = enrichedPrompts.find((item) => item.status === 'win') || enrichedPrompts[0] || null;
  const weakestPrompt = [...enrichedPrompts].reverse().find((item) => item.status === 'risk') || [...enrichedPrompts].reverse().find(Boolean) || null;

  const tapeItems = useMemo(() => {
    const items = [
      { label: 'Prompts en hausse', value: summary.improvedPromptCount, meta: 'vs run precedent' },
      { label: 'Prompts en baisse', value: summary.declinedPromptCount, meta: 'a surveiller' },
      { label: 'Prompts suivis', value: summary.trackedPromptCount, meta: data?.metadata?.previous_timestamp ? 'avec historique' : 'base initiale' },
      { label: 'Qualite moyenne', value: summary.averageQuality, decimals: 1, meta: 'pack prompts' }
    ];

    if (selectedPrompt) {
      items.push({
        label: 'Score prompt',
        value: selectedPrompt.score,
        decimals: 1,
        change: selectedPrompt.score_change,
        changeSuffix: ' pts',
        changeDecimals: 1
      });
    }

    return items;
  }, [data, selectedPrompt, summary]);

  if (!brand || !data || data._brand !== brand) {
    return (
      <div className="proof-shell">
        <div className="proof-loading">Chargement du mode requetes...</div>
      </div>
    );
  }

  return (
    <div className="proof-shell">
      <section className="proof-header">
        <div className="proof-heading">
          <span className="proof-eyebrow">Mode requetes</span>
          <h2>Suivi prompt par prompt pour {brand}</h2>
          <p>
            Chaque requete expose son rang, sa variation et sa qualite. La liste principale reste dense et continue,
            et le panneau de droite sert seulement d inspecteur pour le prompt selectionne.
          </p>
        </div>

        <div className={`proof-live-panel ${refreshFlash ? 'flash' : ''}`}>
          <div className="proof-live-head">
            <span className="proof-live-status">
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
              {isRefreshing ? 'Actualisation...' : 'Donnees live'}
            </span>
            <span className="proof-live-meta">
              <TimerReset size={14} />
              Maj {formatTimestamp(data.metadata?.timestamp)}
            </span>
          </div>

          {selectedPrompt ? (
            <>
              <div className="proof-live-rankline">
                <div className="proof-live-copy">
                  <span className="proof-live-label">Prompt actif</span>
                  <strong>{selectedPrompt.prompt}</strong>
                </div>
                <div className="proof-live-rank">
                  <span>Rang</span>
                  <strong>#{selectedPrompt.current_rank || '--'}</strong>
                  <DeltaBadge label="delta" change={selectedPrompt.rank_change} hideWhenEmpty={false} />
                </div>
              </div>

              <div className="proof-live-grid">
                <div className="proof-live-metric">
                  <span>Score</span>
                  <strong><AnimatedNumber value={selectedPrompt.score} decimals={1} /></strong>
                  <DeltaBadge label="evolution" change={selectedPrompt.score_change} suffix=" pts" decimals={1} hideWhenEmpty />
                </div>
                <div className="proof-live-metric">
                  <span>Mention</span>
                  <strong><AnimatedNumber value={selectedPrompt.mention_rate} decimals={0} suffix="%" /></strong>
                  <DeltaBadge label="evolution" change={selectedPrompt.mention_change} suffix=" pts" decimals={1} hideWhenEmpty />
                </div>
                <div className="proof-live-metric">
                  <span>Position</span>
                  <strong>{selectedPrompt.avg_position ? `#${selectedPrompt.avg_position}` : 'Absente'}</strong>
                  <DeltaBadge label="evolution" change={selectedPrompt.position_change} suffix=" pos" decimals={1} hideWhenEmpty />
                </div>
              </div>
            </>
          ) : (
            <p>Aucun prompt actif.</p>
          )}
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <section className="proof-toolbar">
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
            ['current_rank', 'Rang'],
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
      </section>

      <section className="proof-summary">
        <article className="summary-card accent">
          <span>Lecture prioritaire</span>
          <strong>{selectedPrompt?.statusLabel || 'Selectionnez un prompt'}</strong>
          <p>{selectedPrompt?.rationale || 'Choisissez une requete pour lire son poids decisionnel et sa variation.'}</p>
        </article>
        <article className="summary-card">
          <span>Meilleur prompt</span>
          <strong>{bestPrompt?.intent.label || 'n/a'}</strong>
          <p>{bestPrompt?.prompt || 'Aucun prompt fort pour le moment.'}</p>
        </article>
        <article className="summary-card risk">
          <span>Prompt fragile</span>
          <strong>{weakestPrompt?.statusLabel || 'n/a'}</strong>
          <p>{weakestPrompt?.prompt || 'Aucun signal faible a afficher.'}</p>
        </article>
      </section>

      <div className="proof-workspace">
        <section className="proof-list-panel">
          <div className="proof-list-head">
            <div>
              <span className="proof-list-kicker">Requetes classees</span>
              <h3>{filteredPrompts.length} prompts affiches</h3>
            </div>
            <span className="proof-list-meta">
              {summary.trackedPromptCount > 0
                ? `${summary.trackedPromptCount} prompts avec historique`
                : 'Base initiale'}
            </span>
          </div>

          <div className="proof-list">
            {filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className={`proof-row ${effectiveSelectedPromptId === prompt.id ? 'active' : ''} ${prompt.status} ${refreshFlash && effectiveSelectedPromptId === prompt.id ? 'flash' : ''}`}
                onClick={() => setSelectedPromptId(prompt.id)}
              >
                <div className="proof-row-rank">
                  <strong className="proof-row-rank-number">#{prompt.current_rank || '--'}</strong>
                  <DeltaBadge label="rang" change={prompt.rank_change} hideWhenEmpty />
                </div>

                <div className="proof-row-main">
                  <div className="proof-row-topline">
                    <span className={`status-pill ${prompt.status}`}>{prompt.statusLabel}</span>
                    <span className="intent-pill">{prompt.intent.label}</span>
                  </div>
                  <strong>{prompt.prompt}</strong>
                  <span>{prompt.proofLine}</span>
                </div>

                <div className="proof-row-metrics">
                  <div className="proof-row-metric">
                    <span>Score</span>
                    <strong><AnimatedNumber value={prompt.score} decimals={1} /></strong>
                    <DeltaBadge label="score" change={prompt.score_change} suffix=" pts" decimals={1} hideWhenEmpty />
                  </div>
                  <div className="proof-row-metric">
                    <span>Mention</span>
                    <strong><AnimatedNumber value={prompt.mention_rate} decimals={0} suffix="%" /></strong>
                    <DeltaBadge label="mention" change={prompt.mention_change} suffix=" pts" decimals={1} hideWhenEmpty />
                  </div>
                  <div className="proof-row-metric">
                    <span>Position</span>
                    <strong>{prompt.avg_position ? `#${prompt.avg_position}` : 'Absente'}</strong>
                    <DeltaBadge label="position" change={prompt.position_change} suffix=" pos" decimals={1} hideWhenEmpty />
                  </div>
                </div>
              </button>
            ))}

            {filteredPrompts.length === 0 && (
              <div className="proof-empty">Aucun prompt ne correspond au filtre actif.</div>
            )}
          </div>
        </section>

        <aside className="proof-inspector">
          <div className="rail-card">
            <div className="focus-section-head">
              <MessageSquareText size={16} />
              <strong>Lecture operable</strong>
            </div>
            {selectedPrompt ? (
              <>
                <h3 className="inspector-title">{selectedPrompt.prompt}</h3>
                <p>{selectedPrompt.rationale}</p>
                <div className="inspector-metrics">
                  <div>
                    <span>Score</span>
                    <strong><AnimatedNumber value={selectedPrompt.score} decimals={1} /></strong>
                  </div>
                  <div>
                    <span>Mention</span>
                    <strong><AnimatedNumber value={selectedPrompt.mention_rate} decimals={0} suffix="%" /></strong>
                  </div>
                  <div>
                    <span>Position</span>
                    <strong>{selectedPrompt.avg_position ? `#${selectedPrompt.avg_position}` : 'Absente'}</strong>
                  </div>
                  <div>
                    <span>Accord</span>
                    <strong>{selectedPrompt.agreement_score ?? 'n/a'}%</strong>
                  </div>
                </div>
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
                    <Gauge size={14} />
                    Pression {selectedPrompt.competitivePressure}
                  </span>
                </div>

                {selectedPrompt.prompt_issues?.length ? (
                  <ul className="rail-list">
                    {selectedPrompt.prompt_issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
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
              <ShieldAlert size={16} />
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
                <span>Prompts cites</span>
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
            base {data.metadata?.previous_timestamp ? `comparee au ${formatTimestamp(data.metadata.previous_timestamp)}` : 'initiale'}
          </div>
        </aside>
      </div>
    </div>
  );
}
