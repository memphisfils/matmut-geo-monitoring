import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import RankingTable from './components/RankingTable';
import { MentionChart, SovChart, RadarCompare, CategoryHeatmap } from './components/Charts';
import TrendChart from './components/TrendChart';
import SentimentChart from './components/SentimentChart';
import DuelCard from './components/DuelCard';
import InsightsPanel from './components/InsightsPanel';
import { fetchMetrics, fetchExport, checkStatus, fetchHistory } from './services/api';
import './App.css';

export default function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState(null); // Full status object
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [result, historyData] = await Promise.all([
        fetchMetrics(),
        fetchHistory()
      ]);
      setData(result);
      setHistory(historyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const report = await fetchExport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matmut-geo-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Check backend status
    checkStatus().then(res => setBackendStatus(res || { status: 'offline' }));
  }, [loadData]);

  const isBackendOnline = backendStatus?.status === 'ok';

  return (
    <div className="app-layout">
      <Sidebar isBackendOnline={isBackendOnline} />

      <div className="main-content" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <Header
          onRefresh={loadData}
          onExport={handleExport}
          isLoading={isLoading}
          metadata={data?.metadata}
          backendStatus={backendStatus}
        />

        <div className="page-content">
          {isLoading && !data && (
            <div className="loading-state">
              <div className="loader" />
              <p>Chargement des données...</p>
            </div>
          )}

          {error && !data && (
            <div className="error-state">
              <p>❌ {error}</p>
            </div>
          )}

          {data && (
            <>
              <div id="dashboard">
                <KpiCards data={data} />
                <TrendChart data={history} />
                <DuelCard ranking={data.ranking} />
              </div>

              <div id="ranking">
                <RankingTable ranking={data.ranking} />
              </div>

              <div className="charts-row">
                <SentimentChart ranking={data.ranking} />
                <MentionChart ranking={data.ranking} />
                <SovChart ranking={data.ranking} />
              </div>

              <div id="insights">
                <RadarCompare ranking={data.ranking} />
                <CategoryHeatmap categoryData={data.category_data} />
                <InsightsPanel insights={data.insights} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
