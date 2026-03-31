import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Charts.css';

const CHART_THEME = {
    gridColor: '#E1E8F0',
    textColor: '#94A3B8',
    brandColor: '#00CED1',
    competitorColors: ['rgba(0,119,204,0.4)', 'rgba(239,68,68,0.3)', '#64748B', '#CBD5E1']
};

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((item, i) => (
                <p key={i} className="tooltip-value" style={{ color: item.color }}>
                    {item.name}: <strong>{item.value?.toFixed(1)}</strong>
                </p>
            ))}
        </div>
    );
}

export default function TrendChart({ data, brand }) {
    if (!data || data.length === 0) return null;

    // Get dynamic competitors from data
    const dataKeys = Object.keys(data[0]).filter(k => k !== 'date' && k !== 'timestamp');
    const competitors = dataKeys.filter(k => k !== brand).slice(0, 4);
    return (
        <div className="chart-container chart-full">
            <div className="chart-header">
                <h3>ÉVOLUTION DU SCORE (30 JOURS)</h3>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                            padding={{ left: 10, right: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            iconType="circle" 
                            iconSize={10} 
                            formatter={(value) => <span style={{ color: value === brand ? CHART_THEME.brandColor : '#888', fontSize: 11, fontWeight: value === brand ? 'bold' : 'normal' }}>{value}</span>} 
                        />

                        {/* Target Brand Line */}
                        <Line
                            type="monotone"
                            dataKey={brand}
                            stroke={CHART_THEME.brandColor}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: CHART_THEME.brandColor }}
                            activeDot={{ r: 6 }}
                        />

                        {/* Competitors Lines */}
                        {competitors.map((comp, i) => (
                            <Line
                                key={comp}
                                type="monotone"
                                dataKey={comp}
                                stroke={CHART_THEME.competitorColors[i % CHART_THEME.competitorColors.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                            />
                        ))}

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
