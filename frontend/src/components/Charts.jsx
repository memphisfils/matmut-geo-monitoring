import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import './Charts.css';

const CHART_THEME = {
  textColor: '#6f8798',
  gridColor: '#dde7ef',
  brandColor: '#00CED1',
  compareColors: ['#00CED1', '#74879a', '#a1b0be', '#d1dbe4']
};

function formatMaybePercent(value) {
  if (typeof value !== 'number') return value;
  return value > 100 ? value.toFixed(1) : `${value.toFixed(1)}%`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((item, index) => (
        <p key={index} className="tooltip-value" style={{ color: item.color || item.fill }}>
          {item.name}: <strong>{formatMaybePercent(item.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export function MentionChart({ ranking, brand }) {
  if (!ranking?.length) return null;

  const topBrands = ranking.slice(0, 5).map((item) => ({
    name: item.brand,
    value: item.mention_rate,
    fill: item.brand === brand ? CHART_THEME.brandColor : '#d9e2e9'
  }));
  const target = topBrands.find((item) => item.name === brand) || topBrands[0];
  const leader = topBrands[0];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-header-copy">
          <h3>Taux de mention</h3>
          <span>{brand} face aux cinq premieres marques</span>
        </div>
        <span className="chart-badge">
          {leader?.name === brand ? 'Leader mention' : `${leader?.name} en tete`}
        </span>
      </div>
      <div className="chart-body">
        <div className="chart-inline-stats">
          <div className="chart-inline-stat">
            <span>{brand}</span>
            <strong>{target?.value ?? 0}%</strong>
          </div>
          <div className="chart-inline-stat">
            <span>Ecart leader</span>
            <strong>{leader ? Math.max(0, (leader.value || 0) - (target?.value || 0)).toFixed(0) : 0} pts</strong>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={270}>
          <BarChart
            data={topBrands}
            layout="vertical"
            margin={{ top: 6, right: 12, left: 0, bottom: 0 }}
            barCategoryGap={18}
          >
            <CartesianGrid horizontal={false} strokeDasharray="2 8" stroke={CHART_THEME.gridColor} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: CHART_THEME.textColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={92}
              tick={{ fontSize: 11, fill: '#385667', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Mention" radius={[0, 8, 8, 0]} barSize={14} isAnimationActive animationDuration={850}>
              {topBrands.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SovChart({ ranking, brand }) {
  if (!ranking?.length) return null;

  const top6 = ranking.slice(0, 6).map((item) => ({
    name: item.brand,
    value: parseFloat(item.share_of_voice),
    fill: item.brand === brand ? CHART_THEME.brandColor : '#dddddd'
  }));

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Share of voice</h3>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={top6}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="#111111"
              strokeWidth={2}
            >
              {top6.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ color: '#666666', fontSize: 10 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RadarCompare({ ranking, brand }) {
  if (!ranking?.length) return null;

  const targetBrand = ranking.find((item) => item.brand === brand);
  const competitors = ranking.filter((item) => item.brand !== brand).slice(0, 3);
  const brands = targetBrand ? [targetBrand, ...competitors] : competitors.slice(0, 4);

  const comparisonData = [
    { subject: 'Mention', ...Object.fromEntries(brands.map((item) => [item.brand, item.mention_rate])) },
    { subject: 'Position', ...Object.fromEntries(brands.map((item) => [item.brand, Math.max(0, 100 - item.avg_position * 10)])) },
    { subject: 'SoV', ...Object.fromEntries(brands.map((item) => [item.brand, item.share_of_voice * 4])) },
    { subject: 'Top mind', ...Object.fromEntries(brands.map((item) => [item.brand, item.top_of_mind * 2])) },
    { subject: 'Score', ...Object.fromEntries(brands.map((item) => [item.brand, item.global_score])) }
  ];

  return (
    <div className="chart-container chart-full">
      <div className="chart-header">
        <div className="chart-header-copy">
          <h3>Comparaison multi-criteres</h3>
          <span>{brands.length} marques sur une meme base 0-100</span>
        </div>
        <span className="chart-badge">Top 4</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={330}>
          <BarChart
            data={comparisonData}
            layout="vertical"
            margin={{ top: 12, right: 10, left: 2, bottom: 0 }}
            barGap={4}
            barCategoryGap={18}
          >
            <CartesianGrid horizontal={false} strokeDasharray="2 8" stroke={CHART_THEME.gridColor} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: CHART_THEME.textColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="subject"
              width={74}
              tick={{ fontSize: 11, fill: '#385667', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: value === brand ? CHART_THEME.brandColor : '#6f8798', fontSize: 10, fontWeight: value === brand ? 700 : 600 }}>
                  {value}
                </span>
              )}
            />
            {brands.map((item, index) => (
              <Bar
                key={item.brand}
                dataKey={item.brand}
                name={item.brand}
                fill={CHART_THEME.compareColors[index] || '#d1dbe4'}
                radius={[0, 6, 6, 0]}
                barSize={10}
                isAnimationActive
                animationDuration={700 + index * 120}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryHeatmap({ categoryData, brand, ranking }) {
  if (!categoryData) return null;

  const categories = Object.keys(categoryData);
  const brandsList = ranking ? ranking.map((item) => item.brand).slice(0, 6) : [brand];

  const categoryLabels = {
    assurance_auto: 'Auto',
    assurance_habitation: 'Habitation',
    mutuelle_sante: 'Sante',
    assurance_pro: 'Pro',
    general: 'General',
    automobile: 'Auto',
    banque: 'Banque',
    telecoms: 'Telecoms',
    energie: 'Energie',
    sante: 'Sante'
  };

  const getColor = (value) => {
    if (value >= 80) return 'var(--accent-secondary)';
    if (value >= 60) return 'var(--accent-primary)';
    if (value >= 40) return '#94c5e8';
    return '#d4e9f7';
  };

  return (
    <div className="chart-container chart-full">
      <div className="chart-header">
        <h3>Performance par categorie</h3>
      </div>
      <div className="chart-body heatmap-body">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th />
              {categories.map((category) => (
                <th key={category}>{categoryLabels[category] || category}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brandsList.map((item) => (
              <tr key={item} className={item === brand ? 'row-target' : ''}>
                <td className="heatmap-brand">{item}</td>
                {categories.map((category) => {
                  const value = categoryData[category]?.[item] ?? 0;
                  return (
                    <td key={category}>
                      <span
                        className="heatmap-cell"
                        style={{ backgroundColor: getColor(value), color: item === brand ? '#000' : '#fff' }}
                      >
                        {value}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
