import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import './DuelCard.css';

const METRICS = [
    { key: 'global_score', label: 'Score Global', suffix: '/100' },
    { key: 'mention_rate', label: 'Visibilité', suffix: '%' },
    { key: 'share_of_voice', label: 'Part de Voix', suffix: '%' },
    { key: 'sentiment_score', label: 'Sentiment', suffix: '' },
];

export default function DuelCard({ ranking }) {
    const [opponent, setOpponent] = useState(null);

    // Find Matmut
    const matmut = ranking?.find(r => r.brand === 'Matmut');

    // Set default opponent (leader if not Matmut, or 2nd if Matmut is leader)
    useEffect(() => {
        if (ranking && ranking.length > 1 && !opponent) {
            const leader = ranking[0];
            if (leader.brand !== 'Matmut') {
                setOpponent(leader);
            } else {
                setOpponent(ranking[1]);
            }
        }
    }, [ranking, opponent]);

    if (!matmut || !opponent) return null;

    const competitors = ranking.filter(r => r.brand !== 'Matmut');

    // Prepare Radar Data
    const radarData = [
        { subject: 'Visibilité', A: matmut.mention_rate, B: opponent.mention_rate, fullMark: 100 },
        { subject: 'Score', A: matmut.global_score, B: opponent.global_score, fullMark: 100 },
        { subject: 'SoV', A: matmut.share_of_voice, B: opponent.share_of_voice, fullMark: 100 },
        { subject: 'Top of Mind', A: matmut.top_of_mind, B: opponent.top_of_mind, fullMark: 100 },
        { subject: 'Sentiment', A: Math.max(0, matmut.sentiment_score || 0), B: Math.max(0, opponent.sentiment_score || 0), fullMark: 100 },
    ];

    const getWinner = (key) => {
        const v1 = matmut[key] || 0;
        const v2 = opponent[key] || 0;
        if (v1 > v2) return 'matmut';
        if (v2 > v1) return 'opponent';
        return 'draw';
    };

    return (
        <motion.div
            className="card duel-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="card-header duel-header">
                <div className="duel-title">
                    <Swords size={24} className="duel-icon" />
                    <h3>Head-to-Head Duel</h3>
                </div>

                <div className="duel-controls">
                    <span>VS</span>
                    <select
                        value={opponent.brand}
                        onChange={(e) => setOpponent(ranking.find(r => r.brand === e.target.value))}
                        className="opponent-select"
                    >
                        {competitors.map(c => (
                            <option key={c.brand} value={c.brand}>{c.brand}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="duel-body">
                {/* Matmut Column */}
                <div className="duel-col matmut-col">
                    <div className="brand-header">
                        <h2>Matmut</h2>
                        <span className="rank-badge">#{matmut.rank}</span>
                    </div>
                    <div className="metrics-list">
                        {METRICS.map(m => {
                            const winner = getWinner(m.key);
                            return (
                                <div key={m.key} className={`metric-row ${winner === 'matmut' ? 'win' : ''}`}>
                                    <span className="metric-label">{m.label}</span>
                                    <span className="metric-value">
                                        {matmut[m.key]}{m.suffix}
                                        {winner === 'matmut' && <Trophy size={14} className="trophy-icon" />}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Radar Chart Center */}
                <div className="duel-chart">
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart outerRadius={90} data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name="Matmut"
                                dataKey="A"
                                stroke="#003D7A"
                                fill="#003D7A"
                                fillOpacity={0.4}
                            />
                            <Radar
                                name={opponent.brand}
                                dataKey="B"
                                stroke="#ef4444"
                                fill="#ef4444"
                                fillOpacity={0.4}
                            />
                            <Legend />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Opponent Column */}
                <div className="duel-col opponent-col">
                    <div className="brand-header">
                        <h2>{opponent.brand}</h2>
                        <span className="rank-badge opponent-rank">#{opponent.rank}</span>
                    </div>
                    <div className="metrics-list">
                        {METRICS.map(m => {
                            const winner = getWinner(m.key);
                            return (
                                <div key={m.key} className={`metric-row ${winner === 'opponent' ? 'win' : ''}`}>
                                    <span className="metric-value">
                                        {opponent[m.key]}{m.suffix}
                                        {winner === 'opponent' && <Trophy size={14} className="trophy-icon" />}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
