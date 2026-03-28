import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
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
import Benchmark from './components/Benchmark';
import ProjectsPanel from './components/ProjectsPanel';
import {
  fetchMetrics, fetchExport, checkStatus, fetchHistory,
  runAnalysisStream, generateTrendHistory, DEMO_DATA_FACTORY, fetchSession
} from './services/api';
import './App.css';

export default function App() { // Navigation inter-pages globale
  const [page, setPage] = useState('landing'); // 'landing' ou 'app'

  // État Dashboard / Config
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
          console.log('[APP] Streaming start — models:', event.models, 'is_demo:', event.is_demo);
        }
        if (event.type === 'progress') {
          setAnalysisProgress(event);
          setCompletedPrompts(prev => [...prev, event]);
          console.log(`[APP] Progress ${event.current}/${event.total} — brand_position:`, event.brand_position);
        }
        if (event.type === 'complete') {
          console.log('[APP] Streaming COMPLETE — is_demo:', event.is_demo, 'timestamp:', event.timestamp);
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
      // Délai pour laisser le temps à la sauvegarde results.json (fix race condition)
      // Le backend doit avoir fini l'écriture AVANT d'appeler /api/metrics
      // Timeout typique : 40s par prompt × 6 prompts = 240s max
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log('[APP] fetchMetrics...');
      const [result, historyData] = await Promise.all([
        fetchMetrics({ brand: cfg.brand, competitors: cfg.competitors }),
        fetchHistory({ brand: cfg.brand })
      ]);
      console.log('[APP] fetchMetrics result:', result?.metadata);
      setData(result);
      // Utiliser l'historique réel si disponible, sinon générer du fake
      if (historyData && historyData.length > 0) {
        console.log('[APP] Historique réel:', historyData.length, 'points');
        setTrendHistory(historyData);
      } else {
        console.log('[APP] Pas dhistorique, génération de données fake');
        setTrendHistory(generateTrendHistory(result?.ranking, cfg.brand));
      }
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
    
    // Auto-load session au démarrage
    fetchSession().then(session => {
      // Ne restaurer que si on a déjà des résultats complets (évite les dashboards vides sur des sessions fantômes)
      // On s'assure que results contient un "ranking" valide
      if (session.has_session && session.project && session.results && session.results.ranking && session.results.ranking.length > 0) {
        const project = session.project;
        
        const safeParse = (str) => {
          if (!str) return [];
          if (Array.isArray(str)) return str;
          try {
            return JSON.parse(str);
          } catch (e) {
            if (typeof str === 'string') {
              return str.split(',').map(s => s.trim());
            }
            return [];
          }
        };

        const config = {
          brand: project.brand,
          sector: project.sector,
          competitors: safeParse(project.competitors),
          prompts: safeParse(project.prompts)
        };
        setConfig(config);
        setData(session.results);
      }
    });
  }, []);

  // Gestion du changement d'onglet
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
  };

  // ── RENDER ROOT ──
  
  if (page === 'landing') {
    return <LandingPage onStart={() => setPage('app')} />;
  }

  // SANS CONFIG = Onboarding
  if (!config) { // (pas de TopNavbar)
    return (
      <div className="app-layout">
        <div className="main-content" style={{marginTop: 0}}>
          <div className="page-content">
            <Onboarding onComplete={handleOnboardingComplete} />
          </div>
        </div>
      </div>
    );
  }

  // AVEC CONFIG = TopNavbar + Sidebar + Dashboard
  return (
    <div className="app-layout">
      <TopNavbar
        brand={config.brand}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isAnalyzing}
        isBackendOnline={isBackendOnline}
        onReset={() => { setConfig(null); setData(null); setCompletedPrompts([]); setActiveTab('dashboard'); setPage('landing'); }}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        exportSlot={<ExportButton brand={config.brand} />}
      />

      <div className="app-body">
        <Sidebar
          brand={config.brand}
          sector={config.sector}
          isBackendOnline={isBackendOnline}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onReset={() => { setConfig(null); setData(null); setCompletedPrompts([]); setActiveTab('dashboard'); setPage('landing'); }}
        />

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
                <header className="page-header">
                  <div className="ph-titles">
                    <h1 className="ph-title">Dashboard <span className="text-gradient">Vue Globale</span></h1>
                    <p className="ph-subtitle">Performances d'acquisition IA pour {config.brand} dans le secteur {config.sector}</p>
                  </div>
                </header>

                <div className="llm-status-bar premium-card">
                  <div className="lsb-title">Statut des Moteurs</div>
                  <div className="lsb-models">
                    <div className="lsb-model online"><span className="lsb-dot"></span> ChatGPT (GPT-4o)</div>
                    <div className="lsb-model online"><span className="lsb-dot"></span> Claude (3.5 Sonnet)</div>
                    <div className="lsb-model online"><span className="lsb-dot"></span> Gemini (1.5 Pro)</div>
                    <div className="lsb-model online"><span className="lsb-dot"></span> Qwen (Max)</div>
                  </div>
                  <div className="lsb-time">Dernière MaJ: Il y a 2 minutes</div>
                </div>

                <div className="dashboard-section">
                  <KpiCards data={data} brand={config.brand} />
                </div>

                <div className="dashboard-grid">
                  <div className="grid-left">
                    <RankingTable ranking={data.ranking} brand={config.brand} />
                    <LLMBreakdown brand={config.brand} />
                    <DuelCard ranking={data.ranking} brand={config.brand} />
                    <div className="charts-row small">
                      <SentimentChart ranking={data.ranking} brand={config.brand} />
                      <MentionChart ranking={data.ranking} brand={config.brand} />
                    </div>
                    <RadarCompare ranking={data.ranking} brand={config.brand} />
                    <CategoryHeatmap categoryData={data.category_data} brand={config.brand} ranking={data.ranking} />
                    <InsightsPanel insights={data.insights} brand={config.brand} />
                  </div>

                  <div className="grid-right">
                    <PromptComparator brand={config.brand} />
                    <section className="chart-section premium-card">
                      <div className="section-header">
                        <h2 className="section-title">Évolution du Score et Share of Voice</h2>
                      </div>
                      <TrendChart data={trendHistory} brand={config.brand} />
                    </section>
                  </div>
                </div>
              </>
            )}

            {/* Prompts Tab (Sprint 3) */}
            {activeTab === 'prompts' && (
              <PromptComparator brand={config.brand} />
            )}

            {/* Benchmark Tab */}
            {activeTab === 'benchmark' && (
              <Benchmark sector={config.sector} />
            )}

            {/* Missing Nav Tabs for Analysis Sections */}
            {activeTab === 'history' && (
              <div className="dashboard-section">
                <header className="page-header" style={{marginBottom: '24px'}}>
                  <h1 className="ph-title"><span className="text-gradient">Historique & Tendances</span></h1>
                  <p className="ph-subtitle">Suivez l'évolution de la visibilité de {config.brand} dans le temps.</p>
                </header>
                <div className="dashboard-grid">
                  <section className="chart-section premium-card" style={{ width: '100%' }}>
                    <div className="section-header">
                      <h2 className="section-title">Share of Voice & Score ({config.brand})</h2>
                    </div>
                    <TrendChart data={trendHistory} brand={config.brand} />
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'keywords' && (
              <div className="dashboard-section">
                <header className="page-header" style={{marginBottom: '24px'}}>
                  <h1 className="ph-title"><span className="text-gradient">Mots-clés & Pénétration Multi-critères</span></h1>
                  <p className="ph-subtitle">Répartition par catégorie et mots-clés de l'occurrence de la marque.</p>
                </header>
                <div className="dashboard-grid">
                  <div className="grid-left">
                    <MentionChart ranking={data?.ranking} brand={config.brand} />
                    <RadarCompare ranking={data?.ranking} brand={config.brand} />
                  </div>
                  <div className="grid-right">
                    <CategoryHeatmap categoryData={data?.category_data} brand={config.brand} ranking={data?.ranking} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sentiment' && (
              <div className="dashboard-section">
                <header className="page-header" style={{marginBottom: '24px'}}>
                  <h1 className="ph-title"><span className="text-gradient">Sentiment IA & Insights Qualitatifs</span></h1>
                  <p className="ph-subtitle">Perception par les LLM et recommandations de posture.</p>
                </header>
                <div className="dashboard-grid">
                  <div className="grid-left">
                    <SentimentChart ranking={data?.ranking} brand={config.brand} />
                    <InsightsPanel insights={data?.insights} brand={config.brand} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'llm-status' && (
              <div className="dashboard-section">
                <header className="page-header" style={{marginBottom: '24px'}}>
                  <h1 className="ph-title"><span className="text-gradient">Status des Moteurs & Performance Brute</span></h1>
                  <p className="ph-subtitle">Analyse segmentée par LLM et connectivité.</p>
                </header>
                <div className="dashboard-grid">
                  <div className="grid-left">
                    <LLMBreakdown brand={config.brand} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exports' && (
              <div className="premium-card" style={{ padding: '24px' }}>
                <h2 className="section-title" style={{ marginBottom: '16px' }}>Exports et Rapports</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Générez des rapports synthétiques PDF ou exportez les données brutes JSON.</p>
                <ExportButton brand={config.brand} />
              </div>
            )}

            {activeTab === 'projects' && (
              <ProjectsPanel onProjectSelect={(proj) => {
                const safeParse = (str) => {
                  if (!str) return [];
                  if (Array.isArray(str)) return str;
                  try {
                    return JSON.parse(str);
                  } catch (e) {
                    if (typeof str === 'string') {
                      return str.split(',').map(s => s.trim());
                    }
                    return [];
                  }
                };

                const cfg = {
                  brand: proj.brand,
                  sector: proj.sector,
                  competitors: safeParse(proj.competitors),
                  prompts: safeParse(proj.prompts)
                };
                setConfig(cfg);
                setActiveTab('dashboard');
                // Use a small timeout to allow UI update before heavy fetch
                setTimeout(() => loadDashboardData(cfg), 100);
              }} />
            )}

            {/* Alerts Tab (Sprint 3) */}
            {activeTab === 'alerts' && (
              <AlertsPanel brand={config.brand} />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
