import React, { useState, useEffect, useCallback } from 'react';
import Onboarding from './components/Onboarding';
import TopNavbar from './components/TopNavbar';
import KpiCards from './components/KpiCards';
import RankingTable from './components/RankingTable';
import { MentionChart, SovChart, RadarCompare, CategoryHeatmap } from './components/Charts';
import TrendChart from './components/TrendChart';
import SentimentChart from './components/SentimentChart';
import DuelCard from './components/DuelCard';
import InsightsPanel from './components/InsightsPanel';
import AnalysisProgress from './components/AnalysisProgress';
import LLMBreakdown from './components/LLMBreakdown';
import {
  fetchMetrics, fetchExport, checkStatus, fetchHistory,
  runAnalysisStream, generateTrendHistory, DEMO_DATA_FACTORY
} from './services/api';
import './App.css';

export default function App() {
  const [config, setConfig]           = useState(null);
  const [data, setData]               = useState(null);
  const [trendHistory, setTrendHistory] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [error, setError]             = useState(null);

  // ── État analyse en temps réel (Sprint 2) ───────────────────────────────
  const [isAnalyzing, setIsAnalyzing]         = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [completedPrompts, setCompletedPrompts] = useState([]);
  const [analysisModels, setAnalysisModels]    = useState([]);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isDemo, setIsDemo]                   = useState(false);

  // ── Onboarding → lancement analyse streaming ────────────────────────────

  const handleOnboardingComplete = useCallback(async (cfg) => {
    setConfig(cfg);
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
    setCompletedPrompts([]);
    setAnalysisProgress(null);
    setError(null);

    try {
      for await (const event of runAnalysisStream({
        brand:       cfg.brand,
        competitors: cfg.competitors,
        prompts:     cfg.prompts,
        products:    cfg.products,
        sector:      cfg.sector,
        demo:        false
      })) {
        if (event.type === 'start') {
          setAnalysisModels(event.models || []);
          setIsDemo(event.is_demo || false);
        }

        if (event.type === 'progress') {
          setAnalysisProgress(event);
          setCompletedPrompts(prev => [...prev, event]);
        }

        if (event.type === 'complete') {
          setIsAnalysisComplete(true);
          setIsAnalyzing(false);

          // Charger les métriques finales
          await loadDashboardData(cfg);
        }

        if (event.type === 'error') {
          throw new Error(event.message || 'Erreur analyse');
        }
      }
    } catch (err) {
      console.warn('[APP] Streaming fallback —', err.message);
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      await loadDashboardData(cfg);
    }
  }, []);

  // ── Chargement des données dashboard ────────────────────────────────────

  const loadDashboardData = useCallback(async (cfg) => {
    try {
      const [result, historyData] = await Promise.all([
        fetchMetrics({ brand: cfg.brand, competitors: cfg.competitors }),
        fetchHistory()
      ]);
      setData(result);
      setTrendHistory(generateTrendHistory(result?.ranking, cfg.brand));
    } catch (err) {
      const demo = DEMO_DATA_FACTORY(cfg.brand, cfg.competitors);
      setData(demo);
      setTrendHistory(generateTrendHistory(demo.ranking, cfg.brand));
    }
  }, []);

  // ── Refresh manuel ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (!config) return;
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
    setCompletedPrompts([]);
    setAnalysisProgress(null);

    try {
      for await (const event of runAnalysisStream({
        brand:       config.brand,
        competitors: config.competitors,
        prompts:     config.prompts,
        sector:      config.sector,
        demo:        false
      })) {
        if (event.type === 'start')    setAnalysisModels(event.models || []);
        if (event.type === 'progress') {
          setAnalysisProgress(event);
          setCompletedPrompts(prev => [...prev, event]);
        }
        if (event.type === 'complete') {
          setIsAnalysisComplete(true);
          setIsAnalyzing(false);
          await loadDashboardData(config);
        }
      }
    } catch (err) {
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      await loadDashboardData(config);
    }
  }, [config, loadDashboardData]);

  const handleExport = useCallback(async () => {
    try {
      const report = await fetchExport();
      const blob   = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href = url;
      a.download = `geo-${config?.brand || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [config]);

  useEffect(() => {
    checkStatus().then(res => setIsBackendOnline(res?.status === 'ok'));
  }, []);

  // ── Onboarding ───────────────────────────────────────────────────────────

  if (!config) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const showProgress = isAnalyzing || (isAnalysisComplete && completedPrompts.length > 0 && !data);

  return (
    <div className="app-layout">
      <TopNavbar
        brand={config.brand}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isAnalyzing}
        isBackendOnline={isBackendOnline}
        onReset={() => { setConfig(null); setData(null); setCompletedPrompts([]); }}
      />

      <div className="main-content">
        <div className="page-content">

          {/* ── Progression temps réel (Sprint 2) ── */}
          {(isAnalyzing || (completedPrompts.length > 0 && !data)) && (
            <AnalysisProgress
              brand={config.brand}
              progress={analysisProgress}
              models={analysisModels}
              isComplete={isAnalysisComplete}
              isDemo={isDemo}
              completedPrompts={completedPrompts}
            />
          )}

          {/* ── Loading texte (si pas encore de progress events) ── */}
          {isAnalyzing && !analysisProgress && (
            <div className="loading-state">
              <div className="loader" />
              <p>Connexion à {analysisModels[0] || 'qwen3.5'}…</p>
            </div>
          )}

          {error && !data && (
            <div className="error-state"><p>❌ {error}</p></div>
          )}

          {data && data.ranking && (
            <>
              {/* Section 1 : KPI + Trend + Duel */}
              <div className="dashboard-section">
                <KpiCards data={data} brand={config.brand} />
                <TrendChart data={trendHistory} brand={config.brand} />
                <DuelCard ranking={data.ranking} brand={config.brand} />
              </div>

              {/* Section 2 : Ranking */}
              <div id="ranking">
                <RankingTable ranking={data.ranking} brand={config.brand} />
              </div>

              {/* Section 3 : LLM Breakdown (Sprint 2) */}
              <LLMBreakdown brand={config.brand} />

              {/* Section 4 : Charts */}
              <div className="charts-row">
                <SentimentChart ranking={data.ranking} brand={config.brand} />
                <MentionChart ranking={data.ranking} brand={config.brand} />
                <SovChart ranking={data.ranking} brand={config.brand} />
              </div>

              {/* Section 5 : Insights */}
              <div id="insights">
                <RadarCompare ranking={data.ranking} brand={config.brand} />
                <CategoryHeatmap categoryData={data.category_data} brand={config.brand} ranking={data.ranking} />
                <InsightsPanel insights={data.insights} brand={config.brand} />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
