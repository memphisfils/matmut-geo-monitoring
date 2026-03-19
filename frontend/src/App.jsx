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
import ExportButton from './components/ExportButton';
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

  // Sprint 2 — Analyse en temps réel
  const [isAnalyzing, setIsAnalyzing]         = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [completedPrompts, setCompletedPrompts] = useState([]);
  const [analysisModels, setAnalysisModels]    = useState([]);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isDemo, setIsDemo]                   = useState(false);

  // Sprint 3 — Onglets
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleOnboardingComplete = useCallback(async (cfg) => {
    setConfig(cfg);
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
    setCompletedPrompts([]);
    setAnalysisProgress(null);
    setError(null);

    try {
      for await (const event of runAnalysisStream({
        brand: cfg.brand, competitors: cfg.competitors, prompts: cfg.prompts,
        products: cfg.products, sector: cfg.sector, demo: false
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

  const loadDashboardData = useCallback(async (cfg) => {
    console.log('[APP] loadDashboardData avec config:', cfg);
    try {
      // Petit délai pour laisser le temps à la sauvegarde results.json
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[APP] fetchMetrics...');
      const [result, historyData] = await Promise.all([
        fetchMetrics({ brand: cfg.brand, competitors: cfg.competitors }),
        fetchHistory()
      ]);
      console.log('[APP] fetchMetrics result:', result?.metadata);
      setData(result);
      setTrendHistory(generateTrendHistory(result?.ranking, cfg.brand));
    } catch (err) {
      console.error('[APP] loadDashboardData error:', err);
      const demo = DEMO_DATA_FACTORY(cfg.brand, cfg.competitors);
      setData(demo);
      setTrendHistory(generateTrendHistory(demo.ranking, cfg.brand));
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!config) return;
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
    setCompletedPrompts([]);
    setAnalysisProgress(null);

    try {
      for await (const event of runAnalysisStream({
        brand: config.brand, competitors: config.competitors,
        prompts: config.prompts, sector: config.sector, demo: false
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
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
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

  if (!config) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-layout">
      <TopNavbar
        brand={config.brand}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isAnalyzing}
        isBackendOnline={isBackendOnline}
        onReset={() => { setConfig(null); setData(null); setCompletedPrompts([]); setActiveTab('dashboard'); }}
        exportSlot={<ExportButton brand={config.brand} />}
      />

      {/* Onglets Sprint 3 */}
      <div className="app-tabs">
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'prompts',   label: 'Prompts' },
          { key: 'alerts',    label: 'Alertes' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`app-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="main-content">
        <div className="page-content">

          {/* Progression temps réel (Sprint 2) */}
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

          {error && !data && (
            <div className="error-state"><p>❌ {error}</p></div>
          )}

          {/* Dashboard Tab */}
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
                <CategoryHeatmap categoryData={data.category_data} brand={config.brand} ranking={data.ranking} />
                <InsightsPanel insights={data.insights} brand={config.brand} />
              </div>
            </>
          )}

          {/* Prompts Tab (Sprint 3) */}
          {activeTab === 'prompts' && (
            <PromptComparator brand={config.brand} />
          )}

          {/* Alerts Tab (Sprint 3) */}
          {activeTab === 'alerts' && (
            <AlertsPanel brand={config.brand} />
          )}

        </div>
      </div>
    </div>
  );
}
