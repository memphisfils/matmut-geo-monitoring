import React from 'react';
import AnimatedNumber from './AnimatedNumber';
import './Charts.css';

function getSentimentTone(score) {
  if (score > 20) return 'positive';
  if (score < -20) return 'negative';
  return 'neutral';
}

function getSentimentLabel(score) {
  if (score > 20) return 'POSITIF';
  if (score < -20) return 'NEGATIF';
  return 'NEUTRE';
}

export default function SentimentChart({ ranking, brand }) {
  if (!ranking || ranking.length === 0) return null;

  const target = ranking.find((item) => item.brand === brand);
  if (!target) return null;

  const score = target.sentiment_score || 0;
  const tone = getSentimentTone(score);
  const gaugeWidth = Math.min(Math.max(score + 50, 0), 100);

  return (
    <div className="chart-container chart-full">
      <div className="chart-header">
        <div className="chart-header-copy">
          <h3>Sentiment IA</h3>
          <span>Lecture du ton des reponses autour de {brand}</span>
        </div>
        <span className={`chart-badge sentiment-badge ${tone}`}>{getSentimentLabel(score)}</span>
      </div>
      <div className="chart-body sentiment-body enhanced">
        <div className="sentiment-score">
          <span className="score-value">
            <AnimatedNumber value={score} decimals={0} />
          </span>
          <span className={`score-label ${tone}`}>{getSentimentLabel(score)}</span>
          <p className="sentiment-caption">
            Le signal mesure le ton dominant, pas la simple presence de la marque.
          </p>
        </div>

        <div className="sentiment-meter">
          <div className="sentiment-scale">
            <span>Negatif</span>
            <span>Neutre</span>
            <span>Positif</span>
          </div>
          <div className="sentiment-bar">
            <div
              className={`sentiment-fill ${tone}`}
              style={{ width: `${gaugeWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
