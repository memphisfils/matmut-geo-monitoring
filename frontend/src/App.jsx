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
import { fetchMetrics, fetchExport, checkStatus, fetchHistory, runAnalysis, generateTrendHistory } from './services/api';
import './App.css';

export default function App() {
  // État de l'onboarding — si null, on affiche l'écran de config
  const [config, setConfig] = useState(null);

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [trendHistory, setTrendHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [error, setError] = useState(null);

  // Lance l'analyse une fois la config validée
  const handleOnboardingComplete = useCallback(async (cfg) => {
    setConfig(cfg);
    setIsLoading(true);
    setError(null);

    try {
      // Lance une analyse avec la config (brand + prompts + competitors)
      await runAnalysis({
        brand: cfg.brand,
        competitors: cfg.competitors,
        prompts: cfg.prompts,
        products: cfg.products,
        demo: false
      });

      const [result, historyData] = await Promise.all([
        fetchMetrics({ brand: cfg.brand, competitors: cfg.competitors }),
        fetchHistory(cfg.brand)
      ]);
      setData(result || null);
      setHistory(historyData || []);

      // Génère l'historique pour le TrendChart basé sur le ranking actuel
      const trendData = generateTrendHistory(result?.ranking, cfg.brand);
      setTrendHistory(trendData || []);
    } catch (err) {
      console.warn('Backend not available, loading demo data', err);
      const { DEMO_DATA_FACTORY } = await import('./services/api');
      const demoResult = DEMO_DATA_FACTORY(cfg.brand, cfg.competitors);
      setData(demoResult);
      setHistory([]);
      setTrendHistory(generateTrendHistory(demoResult.ranking, cfg.brand));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    setError(null);
    try {
      const [result, historyData] = await Promise.all([
        fetchMetrics({ brand: config.brand, competitors: config.competitors }),
        fetchHistory(config.brand)
      ]);
      setData(result);
      setHistory(historyData);
      
      // Génère l'historique pour le TrendChart
      const trendData = generateTrendHistory(result.ranking, config.brand);
      setTrendHistory(trendData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const handleExport = useCallback(async () => {
    try {
      const report = await fetchExport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geo-report-${config?.brand || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [config]);

  useEffect(() => {
    checkStatus().then(res => setIsBackendOnline(res?.status === 'ok'));
  }, []);

  // Affiche l'onboarding si pas encore configuré
  if (!config) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-layout">
      <TopNavbar
        brand={config.brand}
        onRefresh={loadData}
        onExport={handleExport}
        isLoading={isLoading}
        isBackendOnline={isBackendOnline}
        onReset={() => { setConfig(null); setData(null); }}
      />

      <div className="main-content">
        <div className="page-content">
          {isLoading && !data && (
            <div className="loading-state">
              <div className="loader" />
              <p>Analyse de {config.brand} en cours...</p>
            </div>
          )}

          {error && !data && (
            <div className="error-state">
              <p>❌ {error}</p>
            </div>
          )}

          {data && data.ranking && (
            <>
              {/* Section 1: KPI + Trend Chart + Duel */}
              <div className="dashboard-section">
                <KpiCards data={data} brand={config.brand} />
                <TrendChart data={trendHistory} brand={config.brand} />
                <DuelCard ranking={data.ranking} brand={config.brand} />
              </div>

              {/* Section 2: Ranking Table */}
              <div id="ranking">
                <RankingTable ranking={data.ranking} brand={config.brand} />
              </div>

              {/* Section 3: Charts Row */}
              <div className="charts-row">
                <SentimentChart ranking={data.ranking} brand={config.brand} />
                <MentionChart ranking={data.ranking} brand={config.brand} />
                <SovChart ranking={data.ranking} brand={config.brand} />
              </div>

              {/* Section 4: Insights */}
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
