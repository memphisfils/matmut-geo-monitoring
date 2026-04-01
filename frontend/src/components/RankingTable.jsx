import React from 'react';
import './RankingTable.css';

function formatMetric(value, digits = 1) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
    return value.toFixed(digits);
}

export default function RankingTable({ ranking, brand }) {
    if (!ranking || ranking.length === 0) return null;

    return (
        <div className="ranking-container">
            <div className="ranking-header">
                <h2>Classement global</h2>
                <span className="ranking-count">{ranking.length} marques</span>
            </div>
            <div className="table-wrapper">
                <table className="ranking-table">
                    <thead>
                        <tr>
                            <th>Rang</th>
                            <th>Marque</th>
                            <th>Score</th>
                            <th>Mention</th>
                            <th>Pos. moy.</th>
                            <th>SoV</th>
                            <th>Top mind</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranking.map((item) => {
                            const isTarget = item.brand === brand;
                            return (
                                <tr key={item.brand} className={isTarget ? 'row-target' : ''}>
                                    <td className="rank-cell">
                                        {item.rank}
                                    </td>
                                    <td className="brand-cell">
                                        <span className={`brand-name ${isTarget ? 'brand-highlight' : ''}`}>
                                            {item.brand}
                                        </span>
                                    </td>
                                    <td className="score-cell">
                                        {formatMetric(item.global_score)}
                                    </td>
                                    <td>
                                        <div className="bar-container">
                                            <div className="bar-track">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: `${item.mention_rate || 0}%`,
                                                        backgroundColor: isTarget ? 'var(--accent-secondary)' : 'var(--text-secondary)'
                                                    }}
                                                />
                                            </div>
                                            <span className="bar-value">{formatMetric(item.mention_rate, 0)}%</span>
                                        </div>
                                    </td>
                                    <td>{formatMetric(item.avg_position)}</td>
                                    <td>{formatMetric(item.share_of_voice, 0)}%</td>
                                    <td>{formatMetric(item.top_of_mind, 0)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
