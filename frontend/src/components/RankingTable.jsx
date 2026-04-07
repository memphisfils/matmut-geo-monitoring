import React from 'react';
import { Activity } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import './RankingTable.css';

export default function RankingTable({ ranking, brand }) {
    if (!ranking || ranking.length === 0) return null;

    return (
        <div className="ranking-container">
            <div className="ranking-header">
                <h2>Classement global</h2>
                <div className="ranking-header-meta">
                    <span className="ranking-count">{ranking.length} marques</span>
                    <span className="ranking-live">
                        <Activity size={12} />
                        Live
                    </span>
                </div>
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
                                        <span className={`rank-pill ${isTarget ? 'target' : ''}`}>
                                            {item.rank}
                                        </span>
                                    </td>
                                    <td className="brand-cell">
                                        <div className="brand-cell-inner">
                                            <span className={`brand-dot ${isTarget ? 'target' : ''}`} />
                                            <span className={`brand-name ${isTarget ? 'brand-highlight' : ''}`}>
                                                {item.brand}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="score-cell">
                                        <AnimatedNumber value={item.global_score} decimals={1} />
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
                                            <span className="bar-value">
                                                <AnimatedNumber value={item.mention_rate} decimals={0} suffix="%" />
                                            </span>
                                        </div>
                                    </td>
                                    <td><AnimatedNumber value={item.avg_position} decimals={1} /></td>
                                    <td><AnimatedNumber value={item.share_of_voice} decimals={0} suffix="%" /></td>
                                    <td><AnimatedNumber value={item.top_of_mind} decimals={0} suffix="%" /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
