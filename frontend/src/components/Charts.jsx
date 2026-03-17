import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import './Charts.css';

const BRAND_COLORS = {
    Matmut: '#FFD700', // Yellow for target
    MAIF: '#a0a0a0',
    AXA: '#a0a0a0',
    MACIF: '#a0a0a0',
    Groupama: '#a0a0a0',
    GMF: '#a0a0a0',
    Allianz: '#a0a0a0',
    MMA: '#a0a0a0',
    MACSF: '#a0a0a0',
    Generali: '#a0a0a0',
    AG2R: '#a0a0a0',
    APRIL: '#a0a0a0'
};

const CHART_THEME = {
    background: 'transparent',
    textColor: '#666666',
    gridColor: '#333333',
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
export function MentionChart({ ranking, brand }) {
    if (!ranking?.length) return null;

    const top8 = ranking.slice(0, 8).map(r => ({
        name: r.brand,
        value: r.mention_rate,
        fill: r.brand === brand ? '#FFD700' : '#333333'
    }));

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>TAUX DE MENTION</h3>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={top8} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: CHART_THEME.textColor }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={v => `${v}%`}
                            domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Taux" barSize={30}>
                            {top8.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ========== Share of Voice Doughnut ==========
export function SovChart({ ranking, brand }) {
    if (!ranking?.length) return null;

    const top6 = ranking.slice(0, 6).map(r => ({
        name: r.brand,
        value: parseFloat(r.share_of_voice),
        fill: r.brand === brand ? '#FFD700' : '#444444'
    }));

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>SHARE OF VOICE</h3>
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
                            {top6.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
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

// ========== Radar Multi-Criteria ==========
export function RadarCompare({ ranking, brand }) {
    if (!ranking?.length) return null;

    const targetBrand = ranking.find(r => r.brand === brand);
    const competitors = ranking.filter(r => r.brand !== brand).slice(0, 3);
    const brands = targetBrand ? [targetBrand, ...competitors] : competitors.slice(0, 4);

    const radarData = [
        { subject: 'Mention', ...Object.fromEntries(brands.map(b => [b.brand, b.mention_rate])) },
        { subject: 'Position', ...Object.fromEntries(brands.map(b => [b.brand, Math.max(0, 100 - b.avg_position * 10)])) },
        { subject: 'SoV', ...Object.fromEntries(brands.map(b => [b.brand, b.share_of_voice * 4])) },
        { subject: 'Top Mind', ...Object.fromEntries(brands.map(b => [b.brand, b.top_of_mind * 2])) },
        { subject: 'Score', ...Object.fromEntries(brands.map(b => [b.brand, b.global_score])) },
    ];

    return (
        <div className="chart-container chart-full">
            <div className="chart-header">
                <h3>COMPARAISON MULTI-CRITÈRES</h3>
                <span className="chart-badge">TOP 4</span>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke={CHART_THEME.gridColor} />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fontSize: 10, fill: CHART_THEME.textColor }}
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
                                stroke={b.brand === brand ? '#FFD700' : '#666666'}
                                fill={b.brand === brand ? '#FFD700' : '#666666'}
                                fillOpacity={b.brand === brand ? 0.3 : 0.1}
                                strokeWidth={b.brand === brand ? 2 : 1}
                            />
                        ))}
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span style={{ color: '#666666', fontSize: 10 }}>{value}</span>}
                        />
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ========== Category Heatmap ==========
export function CategoryHeatmap({ categoryData, brand, ranking }) {
    if (!categoryData) return null;

    const categories = Object.keys(categoryData);
    
    // Get real brands from ranking data
    const brandsList = ranking ? ranking.map(r => r.brand).slice(0, 6) : [brand];

    const categoryLabels = {
        assurance_auto: 'Auto',
        assurance_habitation: 'Habitation',
        mutuelle_sante: 'Santé',
        assurance_pro: 'Pro',
        general: 'Général',
        automobile: 'Auto',
        banque: 'Banque',
        telecoms: 'Télécoms',
        energie: 'Énergie',
        sante: 'Santé'
    };

    const getColor = (val) => {
        if (val >= 80) return 'var(--accent-yellow)';
        if (val >= 60) return '#666666';
        if (val >= 40) return '#444444';
        return '#222222';
    };

    return (
        <div className="chart-container chart-full">
            <div className="chart-header">
                <h3>PERFORMANCE PAR CATÉGORIE</h3>
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
                        {brandsList.map(b => (
                            <tr key={b} className={b === brand ? 'row-target' : ''}>
                                <td className="heatmap-brand">{b}</td>
                                {categories.map(cat => {
                                    const val = categoryData[cat]?.[b] ?? 0;
                                    return (
                                        <td key={cat}>
                                            <span
                                                className="heatmap-cell"
                                                style={{ backgroundColor: getColor(val), color: b === brand ? '#000' : '#fff' }}
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
        </div>
    );
}
