import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import './Charts.css';

const BRAND_COLORS = {
    Matmut: '#003D7A',
    MAIF: '#3B82F6',
    AXA: '#10B981',
    MACIF: '#8B5CF6'
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const score = payload[0].value;
        let sentiment = "Neutre";
        if (score > 20) sentiment = "Positif 😃";
        if (score < -20) sentiment = "Négatif 😠";

        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{payload[0].payload.brand}</p>
                <p className="tooltip-value" style={{ color: payload[0].color }}>
                    Score: {score} ({sentiment})
                </p>
            </div>
        );
    }
    return null;
};

export default function SentimentChart({ ranking }) {
    if (!ranking || ranking.length === 0) return null;

    // Prepare data: filter top 5 brands
    const data = ranking.slice(0, 5).map(item => ({
        brand: item.brand,
        sentiment: item.sentiment_score || 0, // Fallback if 0
        fill: BRAND_COLORS[item.brand] || '#94A3B8'
    }));

    return (
        <motion.div
            className="card chart-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
        >
            <div className="card-header">
                <h3 className="card-title">🧠 Analyse de Sentiment (IA)</h3>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barSize={20}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" domain={[-100, 100]} hide />
                        <YAxis type="category" dataKey="brand" tick={{ fill: '#e2e8f0' }} width={70} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine x={0} stroke="#64748b" />
                        <Bar dataKey="sentiment" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: '-10px' }}>
                    <span>😠 Négatif</span>
                    <span style={{ margin: '0 20px' }}>Neutre</span>
                    <span>Positif 😃</span>
                </div>
            </div>
        </motion.div>
    );
}
