import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import RankingTable from './components/RankingTable';
import { MentionChart, SovChart, RadarCompare, CategoryHeatmap } from './components/Charts';
import InsightsPanel from './components/InsightsPanel';
import { fetchMetrics, fetchExport, checkStatus } from './services/api';
import './App.css';

export default function App() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMetrics();
      setData(result);
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
    checkStatus().then(res => setIsBackendOnline(res.status === 'ok'));
  }, [loadData]);

  return (
    <div className="app-layout">
      <Sidebar isBackendOnline={isBackendOnline} />

      <div className="main-content" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <Header
          onRefresh={loadData}
          onExport={handleExport}
          isLoading={isLoading}
          metadata={data?.metadata}
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
              <KpiCards data={data} />
              <RankingTable ranking={data.ranking} />

              <div className="charts-row">
                <MentionChart ranking={data.ranking} />
                <SovChart ranking={data.ranking} />
              </div>

              <RadarCompare ranking={data.ranking} />
              <CategoryHeatmap categoryData={data.category_data} />
              <InsightsPanel insights={data.insights} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
