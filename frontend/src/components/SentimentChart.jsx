import React from 'react';
import './Charts.css';

export default function SentimentChart({ ranking, brand }) {
    if (!ranking || ranking.length === 0) return null;

    const target = ranking.find(r => r.brand === brand);
    if (!target) return null;

    const score = target.sentiment_score || 0;
    let sentimentLabel = "NEUTRE";
    let sentimentClass = "";

    if (score > 20) { sentimentLabel = "POSITIF"; sentimentClass = "positive"; }
    if (score < -20) { sentimentLabel = "NÉGATIF"; sentimentClass = "negative"; }

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>SENTIMENT IA</h3>
            </div>
            <div className="chart-body sentiment-body">
                <div className="sentiment-score">
                    <span className="score-value">{score.toFixed(0)}</span>
                    <span className={`score-label ${sentimentClass}`}>{sentimentLabel}</span>
                </div>
                <div className="sentiment-bar">
                    <div 
                        className="sentiment-fill" 
                        style={{ 
                            width: `${Math.min(Math.max(score + 50, 0), 100)}%`,
                            backgroundColor: score > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
