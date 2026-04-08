import React from 'react';
import './PanelState.css';

export default function PanelState({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  actions = null,
  compact = false
}) {
  return (
    <div className={`panel-state ${tone} ${compact ? 'compact' : ''}`}>
      {Icon && (
        <div className="panel-state-icon">
          <Icon size={compact ? 20 : 26} />
        </div>
      )}
      <div className="panel-state-copy">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="panel-state-actions">{actions}</div>}
    </div>
  );
}
