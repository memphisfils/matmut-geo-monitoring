import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, MessageCircle, ArrowUpRight } from 'lucide-react';
import './KpiCards.css';

const CARDS = [
    {
        id: 'rank',
        label: 'Rang Matmut',
        icon: Trophy,
        color: 'blue',
        format: (v) => `#${v}`,
        getValue: (data) => {
            const m = data.ranking?.find(r => r.brand === 'Matmut');
            return m?.rank ?? '—';
        }
    },
    {
        id: 'score',
        label: 'Score Global',
        icon: Target,
        color: 'green',
        format: (v) => typeof v === 'number' ? v.toFixed(1) : v,
        suffix: '/100',
        getValue: (data) => {
            const m = data.ranking?.find(r => r.brand === 'Matmut');
            return m?.global_score ?? '—';
        }
    },
    {
        id: 'mention',
        label: 'Taux de Mention',
        icon: MessageCircle,
        color: 'purple',
        format: (v) => typeof v === 'number' ? `${v}%` : v,
        getValue: (data) => {
            const m = data.ranking?.find(r => r.brand === 'Matmut');
            return m?.mention_rate ?? '—';
        }
    },
    {
        id: 'position',
        label: 'Position Moyenne',
        icon: ArrowUpRight,
        color: 'orange',
        format: (v) => typeof v === 'number' ? v.toFixed(1) : v,
        getValue: (data) => {
            const m = data.ranking?.find(r => r.brand === 'Matmut');
            return m?.avg_position ?? '—';
        }
    }
];

export default function KpiCards({ data }) {
    return (
        <div className="kpi-grid">
            {CARDS.map((card, i) => {
                const value = card.getValue(data);
                const Icon = card.icon;

                return (
                    <motion.div
                        key={card.id}
                        className={`kpi-card kpi-${card.color}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                        <div className="kpi-header">
                            <span className="kpi-label">{card.label}</span>
                            <div className={`kpi-icon kpi-icon-${card.color}`}>
                                <Icon size={18} />
                            </div>
                        </div>
                        <div className="kpi-value">
                            {card.format(value)}
                            {card.suffix && <span className="kpi-suffix">{card.suffix}</span>}
                        </div>
                        <div className="kpi-bar">
                            <motion.div
                                className={`kpi-bar-fill kpi-bar-${card.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(typeof value === 'number' ? value : 50, 100)}%` }}
                                transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
