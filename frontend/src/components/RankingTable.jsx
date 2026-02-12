import React from 'react';
import { motion } from 'framer-motion';
import './RankingTable.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingTable({ ranking }) {
    if (!ranking || ranking.length === 0) return null;

    return (
        <motion.div
            className="card ranking-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
        >
            <div className="card-header">
                <h2 className="card-title">🏆 Classement Global</h2>
                <span className="card-badge">{ranking.length} marques</span>
            </div>
            <div className="table-scroll">
                <table className="ranking-table">
                    <thead>
                        <tr>
                            <th>Rang</th>
                            <th>Marque</th>
                            <th>Score</th>
                            <th>Mention %</th>
                            <th>Pos. Moy.</th>
                            <th>Share of Voice</th>
                            <th>Top of Mind</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranking.map((item, idx) => {
                            const isMatmut = item.brand === 'Matmut';
                            return (
                                <motion.tr
                                    key={item.brand}
                                    className={isMatmut ? 'row-matmut' : ''}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + idx * 0.05 }}
                                >
                                    <td className="rank-cell">
                                        <span className="rank-medal">
                                            {idx < 3 ? MEDALS[idx] : ''} {item.rank}
                                        </span>
                                    </td>
                                    <td className="brand-cell">
                                        <span className={`brand-name ${isMatmut ? 'brand-highlight' : ''}`}>
                                            {item.brand}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="score-badge">
                                            {item.global_score.toFixed(1)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="metric-bar-wrapper">
                                            <span>{item.mention_rate}%</span>
                                            <div className="metric-bar">
                                                <div
                                                    className="metric-bar-inner"
                                                    style={{
                                                        width: `${item.mention_rate}%`,
                                                        background: isMatmut ? 'var(--accent-blue)' : 'var(--text-muted)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>{item.avg_position.toFixed(2)}</td>
                                    <td>{item.share_of_voice}%</td>
                                    <td>{item.top_of_mind}%</td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
