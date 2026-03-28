import React from 'react';
import './RankingTable.css';

export default function RankingTable({ ranking, brand }) {
    if (!ranking || ranking.length === 0) return null;

    return (
        <div className="ranking-container">
            <div className="ranking-header">
                <h2>CLASSEMENT GLOBAL</h2>
                <span className="ranking-count">{ranking.length} MARQUES</span>
            </div>
            <div className="table-wrapper">
                <table className="ranking-table">
                    <thead>
                        <tr>
                            <th>RANG</th>
                            <th>MARQUE</th>
                            <th>SCORE</th>
                            <th>MENTION %</th>
                            <th>POS. MOY.</th>
                            <th>SOV %</th>
                            <th>TOP MIND %</th>
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
                                            {item.brand.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="score-cell">
                                        {item.global_score.toFixed(1)}
                                    </td>
                                    <td>
                                        <div className="bar-container">
                                            <div className="bar-track">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: `${item.mention_rate}%`,
                                                        backgroundColor: isTarget ? 'var(--accent-secondary)' : 'var(--text-secondary)'
                                                    }}
                                                />
                                            </div>
                                            <span className="bar-value">{item.mention_rate}%</span>
                                        </div>
                                    </td>
                                    <td>{item.avg_position.toFixed(1)}</td>
                                    <td>{item.share_of_voice.toFixed(0)}</td>
                                    <td>{item.top_of_mind.toFixed(0)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
