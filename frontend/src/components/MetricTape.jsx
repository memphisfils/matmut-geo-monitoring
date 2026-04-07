import React from 'react';
import { ArrowDownRight, ArrowUpRight, Dot } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import './MetricTape.css';

function deltaTone(change) {
  if (typeof change !== 'number' || Number.isNaN(change)) return 'neutral';
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

export default function MetricTape({ items = [], compact = false }) {
  if (!items.length) return null;

  const loopItems = [...items, ...items];

  return (
    <div className={`metric-tape ${compact ? 'compact' : ''}`}>
      <div className="metric-tape-track">
        {loopItems.map((item, index) => {
          const tone = deltaTone(item.change);
          const DeltaIcon = tone === 'up' ? ArrowUpRight : ArrowDownRight;

          return (
            <div className="metric-tape-item" key={`${item.label}-${index}`}>
              <div className={`metric-tape-pulse ${tone}`}>
                <Dot size={16} />
              </div>
              <span className="metric-tape-label">{item.label}</span>
              <AnimatedNumber
                value={item.value}
                decimals={item.decimals || 0}
                prefix={item.prefix || ''}
                suffix={item.suffix || ''}
                className="metric-tape-value"
              />
              {typeof item.change === 'number' ? (
                <span className={`metric-tape-change ${tone}`}>
                  <DeltaIcon size={14} />
                  <AnimatedNumber
                    value={Math.abs(item.change)}
                    decimals={item.changeDecimals ?? 1}
                    prefix={item.changePrefix || ''}
                    suffix={item.changeSuffix || ''}
                    className="metric-tape-change-value"
                  />
                </span>
              ) : (
                <span className="metric-tape-meta">{item.meta || 'live'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
