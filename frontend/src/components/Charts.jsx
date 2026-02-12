import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import './Charts.css';

const BRAND_COLORS = {
    Matmut: '#003D7A',
    MAIF: '#3B82F6',
    AXA: '#10B981',
    MACIF: '#8B5CF6',
    Groupama: '#F59E0B',
    GMF: '#EF4444',
    Allianz: '#06B6D4',
    MMA: '#EC4899',
    MACSF: '#84CC16',
    Generali: '#F97316',
    AG2R: '#6366F1',
    APRIL: '#14B8A6'
};

const CHART_THEME = {
    background: 'transparent',
    textColor: '#94A3B8',
    gridColor: 'rgba(148, 163, 184, 0.08)',
};

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((item, i) => (
                <p key={i} className="tooltip-value" style={{ color: item.color || item.fill }}>
                    {item.name}: <strong>{typeof item.value === 'number' ? item.value.toFixed(1) : item.value}%</strong>
                </p>
            ))}
        </div>
    );
}

// ========== Mention Rate Bar Chart ==========
export function MentionChart({ ranking }) {
    if (!ranking?.length) return null;

    const top8 = ranking.slice(0, 8).map(r => ({
        name: r.brand,
        value: r.mention_rate,
        fill: r.brand === 'Matmut' ? '#003D7A' : '#334155'
    }));

    return (
        <motion.div
            className="card chart-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
            <div className="card-header">
                <h3 className="card-title">📊 Taux de Mention</h3>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={top8} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={v => `${v}%`}
                            domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Taux de mention" radius={[6, 6, 0, 0]} barSize={40}>
                            {top8.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

// ========== Share of Voice Doughnut ==========
export function SovChart({ ranking }) {
    if (!ranking?.length) return null;

    const top6 = ranking.slice(0, 6).map(r => ({
        name: r.brand,
        value: parseFloat(r.share_of_voice),
        fill: BRAND_COLORS[r.brand] || '#64748B'
    }));

    const othersValue = ranking.slice(6).reduce((s, r) => s + parseFloat(r.share_of_voice), 0);
    if (othersValue > 0) {
        top6.push({ name: 'Autres', value: parseFloat(othersValue.toFixed(1)), fill: '#334155' });
    }

    return (
        <motion.div
            className="card chart-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
        >
            <div className="card-header">
                <h3 className="card-title">🎯 Share of Voice</h3>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={top6}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={110}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="transparent"
                        >
                            {top6.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span style={{ color: '#94A3B8', fontSize: 11 }}>{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

// ========== Radar Multi-Criteria ==========
export function RadarCompare({ ranking }) {
    if (!ranking?.length) return null;

    // Matmut + top 3 competitors
    const matmut = ranking.find(r => r.brand === 'Matmut');
    const competitors = ranking.filter(r => r.brand !== 'Matmut').slice(0, 3);
    const brands = matmut ? [matmut, ...competitors] : competitors.slice(0, 4);

    const radarData = [
        { subject: 'Mention', ...Object.fromEntries(brands.map(b => [b.brand, b.mention_rate])) },
        { subject: 'Position', ...Object.fromEntries(brands.map(b => [b.brand, Math.max(0, 100 - b.avg_position * 10)])) },
        { subject: 'SoV', ...Object.fromEntries(brands.map(b => [b.brand, b.share_of_voice * 4])) },
        { subject: 'Top Mind', ...Object.fromEntries(brands.map(b => [b.brand, b.top_of_mind * 2])) },
        { subject: 'Score', ...Object.fromEntries(brands.map(b => [b.brand, b.global_score])) },
    ];

    return (
        <motion.div
            className="card chart-card chart-card-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
        >
            <div className="card-header">
                <h3 className="card-title">📈 Comparaison Multi-Critères</h3>
                <span className="card-badge">Top 4</span>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={380}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke={CHART_THEME.gridColor} />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: CHART_THEME.textColor }}
                        />
                        {brands.map((b, i) => (
                            <Radar
                                key={b.brand}
                                name={b.brand}
                                dataKey={b.brand}
                                stroke={BRAND_COLORS[b.brand] || `hsl(${i * 90}, 70%, 60%)`}
                                fill={BRAND_COLORS[b.brand] || `hsl(${i * 90}, 70%, 60%)`}
                                fillOpacity={b.brand === 'Matmut' ? 0.25 : 0.08}
                                strokeWidth={b.brand === 'Matmut' ? 3 : 1.5}
                            />
                        ))}
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span style={{ color: '#94A3B8', fontSize: 11 }}>{value}</span>}
                        />
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

// ========== Category Heatmap ==========
export function CategoryHeatmap({ categoryData }) {
    if (!categoryData) return null;

    const categories = Object.keys(categoryData);
    const brands = ['Matmut', 'MAIF', 'AXA', 'MACIF', 'Groupama', 'GMF', 'Allianz', 'MMA'];

    const categoryLabels = {
        assurance_auto: 'Auto',
        assurance_habitation: 'Habitation',
        mutuelle_sante: 'Santé',
        assurance_pro: 'Pro',
        general: 'Général'
    };

    const getColor = (val) => {
        if (val >= 80) return 'rgba(16, 185, 129, 0.4)';
        if (val >= 60) return 'rgba(59, 130, 246, 0.3)';
        if (val >= 40) return 'rgba(245, 158, 11, 0.25)';
        return 'rgba(239, 68, 68, 0.2)';
    };

    return (
        <motion.div
            className="card chart-card chart-card-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
        >
            <div className="card-header">
                <h3 className="card-title">🗺️ Performance par Catégorie</h3>
            </div>
            <div className="chart-body heatmap-body">
                <table className="heatmap-table">
                    <thead>
                        <tr>
                            <th></th>
                            {categories.map(cat => (
                                <th key={cat}>{categoryLabels[cat] || cat}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {brands.map(brand => (
                            <tr key={brand} className={brand === 'Matmut' ? 'row-matmut' : ''}>
                                <td className="heatmap-brand">{brand}</td>
                                {categories.map(cat => {
                                    const val = categoryData[cat]?.[brand] ?? 0;
                                    return (
                                        <td key={cat}>
                                            <span
                                                className="heatmap-cell"
                                                style={{ background: getColor(val) }}
                                            >
                                                {val}%
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
