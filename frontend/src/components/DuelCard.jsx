import React, { useMemo, useState } from 'react';
import './Charts.css'; // Utilisation des styles communs

const METRICS = [
    { key: 'global_score', label: 'SCORE', suffix: '' },
    { key: 'mention_rate', label: 'MENTION %', suffix: '%' },
    { key: 'share_of_voice', label: 'SOV %', suffix: '%' },
    { key: 'avg_position', label: 'POS. MOY', suffix: '' },
];

export default function DuelCard({ ranking, brand }) {
    const [opponent, setOpponent] = useState(null);

    const targetBrand = ranking?.find(r => r.brand === brand);
    const effectiveOpponent = useMemo(() => {
        if (opponent) {
            return ranking?.find(r => r.brand === opponent.brand) || opponent;
        }
        if (!ranking || ranking.length <= 1) return null;
        const leader = ranking[0];
        return leader.brand !== brand ? leader : ranking[1];
    }, [ranking, opponent, brand]);

    if (!targetBrand || !effectiveOpponent) return null;

    const competitors = ranking.filter(r => r.brand !== brand);

    const getWinner = (key) => {
        const v1 = targetBrand[key] || 0;
        const v2 = effectiveOpponent[key] || 0;
        if (key === 'avg_position') return v1 < v2 ? 'target' : 'opponent'; // Lower is better
        return v1 > v2 ? 'target' : 'opponent';
    };

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>DUEL : {brand.toUpperCase()} VS</h3>
                <select
                    value={effectiveOpponent.brand}
                    onChange={(e) => setOpponent(ranking.find(r => r.brand === e.target.value))}
                    className="duel-select"
                >
                    {competitors.map(c => (
                        <option key={c.brand} value={c.brand}>{c.brand}</option>
                    ))}
                </select>
            </div>
            <div className="chart-body">
                <table className="duel-table">
                    <thead>
                        <tr>
                            <th className="text-left">{brand}</th>
                            <th className="text-center">METRIQUE</th>
                            <th className="text-right">{effectiveOpponent.brand}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {METRICS.map(m => {
                            const winner = getWinner(m.key);
                            return (
                                <tr key={m.key}>
                                    <td className={winner === 'target' ? 'winner' : ''}>
                                        {targetBrand[m.key]?.toFixed(1)}{m.suffix}
                                    </td>
                                    <td className="text-center text-muted">{m.label}</td>
                                    <td className={winner === 'opponent' ? 'winner' : ''}>
                                        {effectiveOpponent[m.key]?.toFixed(1)}{m.suffix}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
