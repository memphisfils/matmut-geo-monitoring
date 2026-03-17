import React from 'react';
import './Charts.css';

export default function InsightsPanel({ insights, brand }) {
    if (!insights) return null;

    return (
        <div className="chart-container chart-full">
            <div className="chart-header">
                <h3>INSIGHTS : {brand.toUpperCase()}</h3>
                {insights.rank && (
                    <span className="chart-badge">RANG #{insights.rank}</span>
                )}
            </div>
            <div className="chart-body">
                <div className="insights-grid">
                    <div className="insight-col">
                        <h4>POINTS FORTS</h4>
                        <ul>
                            {insights.strengths && insights.strengths.length > 0 ? (
                                insights.strengths.map((item, i) => (
                                    <li key={i} className="text-green">+ {item}</li>
                                ))
                            ) : (
                                <li className="text-muted">Aucun</li>
                            )}
                        </ul>
                    </div>
                    <div className="insight-col">
                        <h4>POINTS FAIBLES</h4>
                        <ul>
                            {insights.weaknesses && insights.weaknesses.length > 0 ? (
                                insights.weaknesses.map((item, i) => (
                                    <li key={i} className="text-red">- {item}</li>
                                ))
                            ) : (
                                <li className="text-muted">Aucun</li>
                            )}
                        </ul>
                    </div>
                    <div className="insight-col">
                        <h4>RECOMMANDATIONS</h4>
                        <ul>
                            {insights.recommendations && insights.recommendations.length > 0 ? (
                                insights.recommendations.map((item, i) => (
                                    <li key={i} className="text-yellow">&gt; {item}</li>
                                ))
                            ) : (
                                <li className="text-muted">Aucune</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
