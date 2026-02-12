import React from 'react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Charts.css';

const BRAND_COLORS = {
    Matmut: '#003D7A',
    MAIF: '#3B82F6',
    AXA: '#10B981',
    MACIF: '#8B5CF6'
};

const CHART_THEME = {
    gridColor: 'rgba(148, 163, 184, 0.08)',
    textColor: '#94A3B8'
};

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((item, i) => (
                <p key={i} className="tooltip-value" style={{ color: item.color }}>
                    {item.name}: <strong>{item.value}</strong>
                </p>
            ))}
        </div>
    );
}

export default function TrendChart({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <motion.div
            className="card chart-card chart-card-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
        >
            <div className="card-header">
                <h3 className="card-title">📈 Évolution du Score Global (30 jours)</h3>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} />

                        {/* Matmut Line (Thicker) */}
                        <Line
                            type="monotone"
                            dataKey="Matmut"
                            stroke={BRAND_COLORS.Matmut}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />

                        {/* Competitors Lines */}
                        <Line type="monotone" dataKey="MAIF" stroke={BRAND_COLORS.MAIF} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="AXA" stroke={BRAND_COLORS.AXA} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="MACIF" stroke={BRAND_COLORS.MACIF} strokeWidth={2} dot={false} />

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
