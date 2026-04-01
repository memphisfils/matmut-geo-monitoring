import React, { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import RankingTable from '../RankingTable';
import { MentionChart, RadarCompare } from '../Charts';
import TrendChart from '../TrendChart';
import InsightsPanel from '../InsightsPanel';
import LLMBreakdown from '../LLMBreakdown';
import PromptEnginePanel from '../PromptEnginePanel';
import './DashboardOverviewTab.css';

function getBrandHistory(trendHistory, brand) {
  return (trendHistory || [])
    .map((entry) => ({ date: entry.date, value: entry[brand] }))
    .filter((entry) => typeof entry.value === 'number');
}

function deltaLabel(history, windowSize) {
  if (history.length < windowSize + 1) return 'n/a';
  const latest = history[history.length - 1]?.value;
  const previous = history[history.length - 1 - windowSize]?.value;
  if (typeof latest !== 'number' || typeof previous !== 'number') return 'n/a';
  const delta = latest - previous;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
}

function strongestIntent(prompts) {
  const buckets = {
    comparaison: /(comparatif|vs|alternative|alternatives|compare)/i,
    prix: /(prix|tarif|pas cher|cher|rapport qualite)/i,
    reassurance: /(avis|fiable|confiance|service client|garantie)/i,
    decouverte: /(meilleur|top|quelle|quels|recommande)/i
  };

  const counts = {};
  (prompts || []).forEach((prompt) => {
    const match = Object.entries(buckets).find(([, rule]) => rule.test(prompt || ''));
    const label = match ? match[0] : 'consideration';
    counts[label] = (counts[label] || 0) + 1;
  });

  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] || 'consideration';
}

export default function DashboardOverviewTab({ config, data, trendHistory }) {
  const currentMetrics = data?.metrics?.[config.brand] || {};
  const ranking = data?.ranking || [];
  const currentRank = ranking.find((item) => item.brand === config.brand)?.rank || null;
  const leader = ranking[0];
  const runnerUp = ranking.find((item) => item.brand !== config.brand) || null;
  const brandHistory = useMemo(() => getBrandHistory(trendHistory, config.brand), [trendHistory, config.brand]);
  const delta7d = deltaLabel(brandHistory, Math.min(7, Math.max(1, brandHistory.length - 1)));
  const delta30d = deltaLabel(brandHistory, Math.min(30, Math.max(1, brandHistory.length - 1)));
  const intentLeader = strongestIntent(config.prompts);
  const activeModels = data?.metadata?.models || config.models || [];
  const promptCount = config.prompts?.length || 0;
  const freshness = data?.metadata?.timestamp
    ? new Date(data.metadata.timestamp).toLocaleString('fr-FR')
    : 'n/a';
  const pressureGap = leader && currentMetrics.global_score
    ? Math.abs((leader.score || 0) - currentMetrics.global_score).toFixed(1)
    : 'n/a';
  const nextAction = data?.insights?.recommendations?.[0]
    || (currentRank === 1
      ? 'Consolider les prompts a forte presence avant le prochain run.'
      : 'Renforcer les prompts ou la marque reste citee mais pas dominante.');

  const overviewCards = [
    {
      label: 'Score actuel',
      value: currentMetrics.global_score?.toFixed(1) || '0.0',
      detail: `Variation 7j ${delta7d}`,
      Icon: TrendingUp,
      tone: 'live'
    },
    {
      label: 'Rang actuel',
      value: currentRank ? `#${currentRank}` : 'n/a',
      detail: runnerUp ? `Concurrent direct ${runnerUp.brand}` : 'Aucun concurrent direct',
      Icon: Radar,
      tone: 'neutral'
    },
    {
      label: 'Share of voice',
      value: `${currentMetrics.share_of_voice?.toFixed(1) || '0.0'}%`,
      detail: `Variation 30j ${delta30d}`,
      Icon: Activity,
      tone: 'good'
    },
    {
      label: 'Prompts coeur',
      value: `${config.prompts?.length || 0}`,
      detail: `Intent leader ${intentLeader}`,
      Icon: BrainCircuit,
      tone: 'accent'
    }
  ];

  return (
    <div className="overview-shell">
      <header className="overview-hero">
        <div className="overview-copy">
          <span className="overview-kicker">Vue d ensemble</span>
          <h1>{config.brand} en lecture decisionnelle</h1>
          <p>
            La vue priorise ce qui bouge maintenant: score, rang, pression concurrente,
            fraicheur des donnees et composition reelle du moteur d analyse.
          </p>
          <div className="overview-chip-row">
            <span className="overview-chip">{config.sector || 'General'}</span>
            <span className="overview-chip">{promptCount} prompts actifs</span>
            <span className="overview-chip">{activeModels.length || 1} modele{(activeModels.length || 1) > 1 ? 's' : ''}</span>
            <span className="overview-chip">{freshness === 'n/a' ? 'Fraicheur indisponible' : `Maj ${freshness}`}</span>
          </div>
        </div>

        <div className="overview-summary">
          <article className="summary-panel main">
            <span className="summary-label">Etat du projet</span>
            <strong>{leader?.brand === config.brand ? 'Leader actuel' : 'Sous pression'}</strong>
            <p>
              {leader?.brand === config.brand
                ? `${config.brand} garde la tete du classement sur ce snapshot.`
                : `${leader?.brand || 'Un concurrent'} mene actuellement le classement.`}
            </p>
          </article>

          <article className="summary-panel">
            <span className="summary-label">Derniere analyse</span>
            <strong>{freshness}</strong>
            <p>{activeModels.join(', ') || 'Modeles actifs backend'}</p>
          </article>

          <article className="summary-panel">
            <span className="summary-label">A faire</span>
            <strong>{runnerUp ? `Surveiller ${runnerUp.brand}` : 'Relancer le benchmark'}</strong>
            <p>{nextAction}</p>
          </article>
        </div>
      </header>

      <section className="overview-card-grid">
        {overviewCards.map((card) => (
          <article key={card.label} className={`overview-card ${card.tone}`}>
            <div className="overview-card-head">
              <card.Icon size={18} />
              <span>{card.label}</span>
            </div>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="overview-strategy-grid">
        <article className="strategy-card">
          <div className="strategy-head">
            <ShieldCheck size={16} />
            <strong>Signal principal</strong>
          </div>
          <p>
            {currentRank === 1
              ? `${config.brand} reste citee en premier sur une partie significative des reponses.`
              : `${config.brand} est visible, mais n occupe pas encore la premiere place.`}
          </p>
        </article>

        <article className="strategy-card">
          <div className="strategy-head">
            <ArrowUpRight size={16} />
            <strong>Pression concurrente</strong>
          </div>
          <p>
            {runnerUp
              ? `${runnerUp.brand} est le concurrent immediat a surveiller dans ce projet. Ecart actuel ${pressureGap}.`
              : 'Le projet manque de benchmark concurrent exploitable.'}
          </p>
        </article>

        <article className="strategy-card">
          <div className="strategy-head">
            <BellRing size={16} />
            <strong>Prochaine action</strong>
          </div>
          <p>{data?.insights?.recommendations?.[1] || nextAction}</p>
        </article>

        <article className="strategy-card accent">
          <div className="strategy-head">
            <Sparkles size={16} />
            <strong>Moteur visible</strong>
          </div>
          <p>Le projet affiche maintenant son volume de prompts, ses clusters d intention et ses modeles au meme niveau que les KPI.</p>
        </article>
      </section>

      <PromptEnginePanel config={config} />

      <div className="overview-main-grid">
        <div className="overview-main-left">
          <RankingTable ranking={ranking} brand={config.brand} />

          <div className="overview-chart-row">
            <section className="overview-panel">
              <div className="overview-panel-head">
                <h2>Evolution du score</h2>
                <span>7j / 30j / 90j</span>
              </div>
              <TrendChart data={trendHistory} brand={config.brand} />
            </section>

            <section className="overview-panel">
              <div className="overview-panel-head">
                <h2>Taux de mention</h2>
                <span>Top marques</span>
              </div>
              <MentionChart ranking={ranking} brand={config.brand} />
            </section>
          </div>

          <section className="overview-panel">
            <div className="overview-panel-head">
              <h2>Comparaison multi-criteres</h2>
              <span>Lecture concurrentielle</span>
            </div>
            <RadarCompare ranking={ranking} brand={config.brand} />
          </section>
        </div>

        <div className="overview-main-right">
          <LLMBreakdown brand={config.brand} projectId={config.projectId} />
          <InsightsPanel insights={data.insights} brand={config.brand} />
        </div>
      </div>
    </div>
  );
}
