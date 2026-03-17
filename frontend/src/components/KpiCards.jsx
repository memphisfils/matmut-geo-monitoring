import React from 'react';
import { Trophy, Target, MessageCircle, ArrowUpRight } from 'lucide-react';
import './KpiCards.css';

export default function KpiCards({ data, brand }) {
    const CARDS = [
        {
            id: 'rank',
            label: 'RANG',
            icon: Trophy,
            color: 'yellow',
            format: (v) => `#${v}`,
            getValue: (data) => {
                const m = data.ranking?.find(r => r.brand === brand);
                return m?.rank ?? '—';
            }
        },
        {
            id: 'score',
            label: 'SCORE GLOBAL',
            icon: Target,
            color: 'yellow',
            format: (v) => typeof v === 'number' ? v.toFixed(1) : v,
            suffix: '/100',
            getValue: (data) => {
                const m = data.ranking?.find(r => r.brand === brand);
                return m?.global_score ?? '—';
            }
        },
        {
            id: 'mention',
            label: 'TAUX MENTION',
            icon: MessageCircle,
            color: 'white',
            format: (v) => typeof v === 'number' ? `${v}%` : v,
            getValue: (data) => {
                const m = data.ranking?.find(r => r.brand === brand);
                return m?.mention_rate ?? '—';
            }
        },
        {
            id: 'position',
            label: 'POSITION MOYENNE',
            icon: ArrowUpRight,
            color: 'white',
            format: (v) => typeof v === 'number' ? v.toFixed(1) : v,
            getValue: (data) => {
                const m = data.ranking?.find(r => r.brand === brand);
                return m?.avg_position ?? '—';
            }
        }
    ];

    return (
        <div className="kpi-grid">
            {CARDS.map((card) => {
                const value = card.getValue(data);
                const Icon = card.icon;

                return (
                    <div
                        key={card.id}
                        className={`kpi-card kpi-${card.color}`}
                    >
                        <div className="kpi-header">
                            <span className="kpi-label">{card.label}</span>
                            <Icon size={16} className="kpi-icon" />
                        </div>
                        <div className="kpi-value">
                            {card.format(value)}
                            {card.suffix && <span className="kpi-suffix">{card.suffix}</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
