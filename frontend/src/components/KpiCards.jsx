import React from 'react';
import { Target, MessageSquare, PieChart, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './KpiCards.css';

export default function KpiCards({ data, brand }) {
  if (!data || !data.metrics || !brand) return null;

  const kpis = data.metrics[brand] || {};

  // Configuration sémantique des KPIs
  const kpiConfig = {
    global_score: {
      label: 'Score Global',
      icon: Target,
      colorClass: 'kpi-blue',
      suffix: '/100',
      delta: '+4.2', // Mocked delta
      deltaType: 'positive'
    },
    mention_count: {
      label: 'Mentions',
      icon: MessageSquare,
      colorClass: 'kpi-green',
      suffix: '',
      delta: '+12%',
      deltaType: 'positive'
    },
    share_of_voice: {
      label: 'Share of Voice',
      icon: PieChart,
      colorClass: 'kpi-cyan',
      suffix: '%',
      delta: '-1.5%',
      deltaType: 'negative'
    },
    avg_position: {
      label: 'Position Moy.',
      icon: Info,
      colorClass: 'kpi-amber',
      suffix: '',
      delta: '=',
      deltaType: 'neutral'
    }
  };

  const getDeltaIcon = (type) => {
    if (type === 'positive') return <TrendingUp size={12} />;
    if (type === 'negative') return <TrendingDown size={12} />;
    return <Minus size={12} />;
  };

  return (
    <div className="kpi-grid">
      {Object.entries(kpiConfig).map(([key, config]) => {
        const value = kpis[key] !== undefined ? kpis[key] : '-';
        return (
          <div key={key} className={`kpi-card premium-card ${config.colorClass}`}>
            <div className="kpi-header">
              <div className="kpi-title">
                <div className="kpi-icon-wrapper">
                  <config.icon size={16} />
                </div>
                <span>{config.label}</span>
              </div>
              <div className={`kpi-delta ${config.deltaType}`}>
                {getDeltaIcon(config.deltaType)}
                <span>{config.delta}</span>
              </div>
            </div>
            
            <div className="kpi-body">
              <div className="kpi-value-block">
                <span className="kpi-val">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                <span className="kpi-suffix">{config.suffix}</span>
              </div>
              <div className="kpi-sparkline">
                {/* Simulated sparkline with simple CSS blocks */}
                <div className="spark-bar" style={{height: '40%'}}></div>
                <div className="spark-bar" style={{height: '60%'}}></div>
                <div className="spark-bar" style={{height: '30%'}}></div>
                <div className="spark-bar" style={{height: '70%'}}></div>
                <div className="spark-bar" style={{height: '50%'}}></div>
                <div className="spark-bar" style={{height: '90%'}}></div>
                <div className="spark-bar" style={{height: '100%', background: 'var(--kpi-main)'}}></div>
              </div>
            </div>
            
            <div className="kpi-footer">
              vs 30 derniers jours
            </div>
          </div>
        );
      })}
    </div>
  );
}
