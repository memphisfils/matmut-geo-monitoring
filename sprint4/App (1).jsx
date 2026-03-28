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
import PromptComparator from './components/PromptComparator';
import AlertsPanel from './components/AlertsPanel';
import ExportButton from './components/ExportButton';           // SPRINT 4
import {
  fetchMetrics, fetchExport, checkStatus, fetchHistory,
  runAnalysisStream, generateTrendHistory, DEMO_DATA_FACTORY
} from './services/api';
import './App.css';

export default function App() {
  const [config, setConfig]               = useState(null);
  const [data, setData]                   = useState(null);
  const [trendHistory, setTrendHistory]   = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [error, setError]                 = useState(null);

  // Streaming (Sprint 2)
  const [isAnalyzing, setIsAnalyzing]               = useState(false);
  const [analysisProgress, setAnalysisProgress]     = useState(null);
  const [completedPrompts, setCompletedPrompts]     = useState([]);
  const [analysisModels, setAnalysisModels]         = useState([]);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isDemo, setIsDemo]                         = useState(false);

  // Onglets (Sprint 3)
  const [activeTab, setActiveTab] = useState('dashboard');

  // ── Onboarding ────────────────────────────────────────────────────────────

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
          await loadDashboardData(cfg);
        }
        if (event.type === 'error') throw new Error(event.message || 'Erreur analyse');
      }
    } catch (err) {
      console.warn('[APP] Fallback —', err.message);
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      await loadDashboardData(cfg);
    }
  }, []);

  // ── Données dashboard ─────────────────────────────────────────────────────

  const loadDashboardData = useCallback(async (cfg) => {
    try {
      const result = await fetchMetrics({ brand: cfg.brand, competitors: cfg.competitors });
      setData(result);
      setTrendHistory(generateTrendHistory(result?.ranking, cfg.brand));
    } catch {
      const demo = DEMO_DATA_FACTORY(cfg.brand, cfg.competitors);
      setData(demo);
      setTrendHistory(generateTrendHistory(demo.ranking, cfg.brand));
    }
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────

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
    } catch {
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      await loadDashboardData(config);
    }
  }, [config, loadDashboardData]);

  useEffect(() => {
    checkStatus().then(res => setIsBackendOnline(res?.status === 'ok'));
  }, []);

  // ── Onboarding ────────────────────────────────────────────────────────────

  if (!config) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-layout">
      <TopNavbar
        brand={config.brand}
        onRefresh={handleRefresh}
        isLoading={isAnalyzing}
        isBackendOnline={isBackendOnline}
        onReset={() => {
          setConfig(null); setData(null);
          setCompletedPrompts([]); setActiveTab('dashboard');
        }}
        /* Sprint 4 — Export dans la navbar */
        exportSlot={<ExportButton brand={config.brand} />}
      />

      {/* Onglets (Sprint 3) */}
      <div className="app-tabs">
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'prompts',   label: 'Prompts'   },
          { key: 'alerts',    label: 'Alertes'   },
        ].map(tab => (
          <button key={tab.key}
            className={`app-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="main-content">
        <div className="page-content">

          {/* Progression SSE */}
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

          {isAnalyzing && !analysisProgress && (
            <div className="loading-state">
              <div className="loader" />
              <p>Connexion à {analysisModels[0] || 'qwen3.5'}…</p>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && data && data.ranking && (
            <>
              <div className="dashboard-section">
                <KpiCards data={data} brand={config.brand} />
                <TrendChart data={trendHistory} brand={config.brand} />
                <DuelCard ranking={data.ranking} brand={config.brand} />
              </div>

              <div id="ranking">
                <RankingTable ranking={data.ranking} brand={config.brand} />
              </div>

              <LLMBreakdown brand={config.brand} />

              <div className="charts-row">
                <SentimentChart ranking={data.ranking} brand={config.brand} />
                <MentionChart ranking={data.ranking} brand={config.brand} />
                <SovChart ranking={data.ranking} brand={config.brand} />
              </div>

              <div id="insights">
                <RadarCompare ranking={data.ranking} brand={config.brand} />
                <CategoryHeatmap categoryData={data.category_data}
                                 brand={config.brand} ranking={data.ranking} />
                <InsightsPanel insights={data.insights} brand={config.brand} />
              </div>
            </>
          )}

          {/* ── PROMPTS ── */}
          {activeTab === 'prompts' && (
            <PromptComparator brand={config.brand} />
          )}

          {/* ── ALERTES ── */}
          {activeTab === 'alerts' && (
            <AlertsPanel brand={config.brand} />
          )}

        </div>
      </div>
    </div>
  );
}
