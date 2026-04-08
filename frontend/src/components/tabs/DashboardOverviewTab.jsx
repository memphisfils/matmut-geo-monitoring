import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
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
import AnimatedNumber from '../AnimatedNumber';
import MetricTape from '../MetricTape';
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

function parseDelta(value) {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function deltaTone(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function riskTone(value) {
  if (value === 'high' || value === 'warning') return 'negative';
  if (value === 'medium' || value === 'watch') return 'warning';
  return 'neutral';
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
  const delta7dValue = parseDelta(delta7d);
  const delta30dValue = parseDelta(delta30d);
  const intentLeader = strongestIntent(config.prompts);
  const activeModels = data?.metadata?.models || data?.metadata?.models_used || config.models || [];
  const promptCount = config.prompts?.length || 0;
  const freshness = data?.metadata?.timestamp
    ? new Date(data.metadata.timestamp).toLocaleString('fr-FR')
    : 'n/a';
  const riskSignals = data?.risk_signals || [];
  const biasMonitor = data?.bias_monitor || null;
  const promptAuditSummary = data?.prompt_audit_summary || config?.prompt_audit || null;
  const pressureGap = leader && currentMetrics.global_score
    ? Math.abs((leader.global_score || 0) - currentMetrics.global_score).toFixed(1)
    : 'n/a';
  const primaryWeakness = data?.insights?.weaknesses?.[0]
    || (riskSignals[0] ? riskSignals[0].detail : 'Aucune faiblesse critique detectee sur ce snapshot.');
  const nextAction = riskSignals[0]?.action
    || data?.insights?.recommendations?.[0]
    || (currentRank === 1
      ? 'Consolider les prompts a forte presence avant le prochain run.'
      : 'Renforcer les prompts ou la marque reste citee mais pas dominante.');
  const mainRisk = riskSignals[0] || null;
  const benchmarkWatch = biasMonitor?.summary
    || 'Aucune alerte de neutralite remontee pour le benchmark.';
  const benchmarkStatus = biasMonitor?.status || 'ok';

  const metricTiles = [
    {
      label: 'Score actuel',
      value: currentMetrics.global_score ?? 0,
      decimals: 1,
      Icon: TrendingUp,
      delta: delta7dValue,
      deltaSuffix: ' pts',
      context: delta7dValue == null ? 'Base initiale en attente' : 'vs 7 jours'
    },
    {
      label: 'Rang actuel',
      value: currentRank ?? 'n/a',
      prefix: currentRank ? '#' : '',
      Icon: Radar,
      context: runnerUp ? `Concurrent direct ${runnerUp.brand}` : 'Benchmark a enrichir'
    },
    {
      label: 'Mention',
      value: currentMetrics.mention_rate ?? 0,
      decimals: 0,
      suffix: '%',
      Icon: Activity,
      context: leader?.brand === config.brand ? 'Marque en tete sur le snapshot' : 'Visibilite en surveillance'
    },
    {
      label: 'Share of voice',
      value: currentMetrics.share_of_voice ?? 0,
      decimals: 1,
      suffix: '%',
      Icon: BrainCircuit,
      delta: delta30dValue,
      deltaSuffix: ' pts',
      context: delta30dValue == null ? 'Historique insuffisant' : 'vs 30 jours'
    }
  ];

  const liveTapeItems = [
    {
      label: 'Score',
      value: currentMetrics.global_score || 0,
      decimals: 1,
      change: delta7dValue,
      changeSuffix: ' pts'
    },
    {
      label: 'Share of voice',
      value: currentMetrics.share_of_voice || 0,
      decimals: 1,
      suffix: '%',
      change: delta30dValue,
      changeSuffix: ' pts'
    },
    {
      label: 'Mention',
      value: currentMetrics.mention_rate || 0,
      decimals: 0,
      suffix: '%',
      meta: runnerUp ? `vs ${runnerUp.brand}` : 'single brand'
    },
    {
      label: 'Prompts',
      value: promptCount,
      meta: intentLeader
    },
    {
      label: 'Modeles',
      value: activeModels.length || 1,
      meta: activeModels.join(', ') || 'live'
    }
  ];

  return (
    <div className="overview-shell">
      <header className="overview-hero">
        <div className="overview-copy">
          <span className="overview-kicker">Vue d ensemble</span>
          <h1>{config.brand} en lecture decisionnelle</h1>
          <p>
            La vue priorise d abord ce qui fragilise la lecture: risques du benchmark,
            points faibles de la marque, pression concurrente et fiabilite du moteur.
          </p>
          <div className="overview-chip-row">
            <span className="overview-chip">{config.sector || 'General'}</span>
            <span className="overview-chip">{promptCount} prompts actifs</span>
            <span className="overview-chip">{activeModels.length || 1} modele{(activeModels.length || 1) > 1 ? 's' : ''}</span>
            <span className="overview-chip">{freshness === 'n/a' ? 'Fraicheur indisponible' : `Maj ${freshness}`}</span>
            {promptAuditSummary ? (
              <span className="overview-chip">{promptAuditSummary.weak_prompt_count || 0} prompts fragiles</span>
            ) : null}
          </div>

          <div className="overview-metric-row">
            {metricTiles.map((tile) => (
              <article key={tile.label} className="overview-metric">
                <div className="overview-metric-head">
                  <tile.Icon size={16} />
                  <span>{tile.label}</span>
                </div>
                <strong className="overview-metric-value">
                  {typeof tile.value === 'number' ? (
                    <AnimatedNumber
                      value={tile.value}
                      decimals={tile.decimals || 0}
                      prefix={tile.prefix || ''}
                      suffix={tile.suffix || ''}
                    />
                  ) : (
                    `${tile.prefix || ''}${tile.value}`
                  )}
                </strong>
                <div className="overview-metric-foot">
                  {typeof tile.delta === 'number' ? (
                    <span className={`overview-delta ${deltaTone(tile.delta)}`}>
                      <AnimatedNumber
                        value={tile.delta}
                        decimals={1}
                        signed
                        suffix={tile.deltaSuffix || ''}
                      />
                    </span>
                  ) : null}
                  <span className="overview-metric-context">{tile.context}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="overview-summary">
          <article className="summary-panel main">
            <span className="summary-label">Risque principal</span>
            <strong>{mainRisk?.title || 'Aucun risque critique'}</strong>
            <p>
              {mainRisk?.detail || 'Le snapshot reste exploitable sans signal bloquant majeur.'}
            </p>
          </article>

          <article className="summary-panel">
            <span className="summary-label">Biais benchmark</span>
            <strong>{biasMonitor ? `${biasMonitor.score}/100` : 'n/a'}</strong>
            <p>{benchmarkWatch}</p>
          </article>

          <article className="summary-panel">
            <span className="summary-label">Point faible prioritaire</span>
            <strong>{primaryWeakness}</strong>
            <p>{runnerUp ? `Pression immediate: ${runnerUp.brand} - ecart ${pressureGap} points.` : 'Pression concurrente encore peu lisible.'}</p>
          </article>

          <article className="summary-panel">
            <span className="summary-label">A faire</span>
            <strong>{nextAction}</strong>
            <p>{intentLeader} - {promptCount} prompts actifs</p>
          </article>
        </div>
      </header>

      <MetricTape items={liveTapeItems} compact />

      <section className="overview-risk-strip">
        <div className="overview-risk-strip-head">
          <div className="overview-brief-head">
            <AlertTriangle size={16} />
            <strong>Risques prioritaires</strong>
          </div>
          <span className={`overview-state-pill ${riskTone(benchmarkStatus)}`}>
            {benchmarkStatus === 'warning' ? 'Biais a verifier' : benchmarkStatus === 'watch' ? 'Lecture a surveiller' : 'Lecture stable'}
          </span>
        </div>

        <div className="overview-risk-grid">
          {riskSignals.length > 0 ? riskSignals.slice(0, 3).map((risk) => (
            <article key={risk.id} className={`overview-risk-card ${riskTone(risk.level)}`}>
              <div className="overview-risk-title-row">
                <strong>{risk.title}</strong>
                <span className={`overview-state-pill ${riskTone(risk.level)}`}>{risk.level}</span>
              </div>
              <p>{risk.detail}</p>
              <span className="overview-risk-action">{risk.action}</span>
            </article>
          )) : (
            <article className="overview-risk-card neutral">
              <div className="overview-risk-title-row">
                <strong>Aucun risque critique remonte</strong>
                <span className="overview-state-pill neutral">stable</span>
              </div>
              <p>Le benchmark ne montre pas de fragilite bloquante sur ce snapshot.</p>
              <span className="overview-risk-action">Continuer a enrichir l historique et confirmer la lecture sur plusieurs runs.</span>
            </article>
          )}
        </div>
      </section>

      <section className="overview-brief">
        <article className="overview-brief-item">
          <div className="overview-brief-head">
            <ShieldCheck size={16} />
            <strong>Faiblesse immediate</strong>
          </div>
          <p>{primaryWeakness}</p>
        </article>

        <article className="overview-brief-item">
          <div className="overview-brief-head">
            <ArrowUpRight size={16} />
            <strong>Pression concurrente</strong>
          </div>
          <p>
            {runnerUp
              ? `${runnerUp.brand} est le concurrent immediat a surveiller dans ce projet. Ecart actuel ${pressureGap}.`
              : 'Le projet manque de benchmark concurrent exploitable.'}
          </p>
        </article>

        <article className="overview-brief-item">
          <div className="overview-brief-head">
            <BellRing size={16} />
            <strong>Action produit</strong>
          </div>
          <p>{data?.insights?.recommendations?.[1] || nextAction}</p>
        </article>

        <article className="overview-brief-item accent">
          <div className="overview-brief-head">
            <Sparkles size={16} />
            <strong>Fiabilite moteur</strong>
          </div>
          <p>
            {biasMonitor
              ? `${biasMonitor.model_count} modele(s) actifs - ${biasMonitor.neutral_prompt_ratio}% de prompts neutres - ${biasMonitor.coverage_average}% de couverture concurrentielle.`
              : 'Le projet affiche son volume de prompts, ses clusters d intention et ses modeles au meme niveau que les KPI.'}
          </p>
        </article>
      </section>

      <div className="overview-main-grid">
        <div className="overview-main-left">
          <TrendChart data={trendHistory} brand={config.brand} />

          <RankingTable ranking={ranking} brand={config.brand} />

          <RadarCompare ranking={ranking} brand={config.brand} />
        </div>

        <div className="overview-main-right">
          <MentionChart ranking={ranking} brand={config.brand} />
          <InsightsPanel insights={data.insights} brand={config.brand} />
          <LLMBreakdown brand={config.brand} projectId={config.projectId} />
        </div>
      </div>

      <PromptEnginePanel config={config} compact />
    </div>
  );
}
