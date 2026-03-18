import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import './AnalysisProgress.css';

/**
 * Affiche la progression en temps réel de l'analyse SSE.
 *
 * Props:
 *   brand        : string
 *   progress     : { current, total, prompt, brands_found, brand_mentioned, brand_position }
 *   models       : string[]
 *   isComplete   : boolean
 *   isDemo       : boolean
 *   completedPrompts : array of progress events (historique)
 */
export default function AnalysisProgress({
  brand,
  progress,
  models = [],
  isComplete = false,
  isDemo = false,
  completedPrompts = []
}) {
  const pct = progress?.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="ap-wrapper">

      {/* Header */}
      <div className="ap-header">
        <div className="ap-title-row">
          {isComplete
            ? <CheckCircle size={18} className="ap-icon-done" />
            : <Loader2 size={18} className="ap-icon-spin" />
          }
          <span className="ap-title">
            {isComplete ? 'Analyse terminée' : `Analyse de ${brand} en cours…`}
          </span>
          {isDemo && <span className="ap-badge-demo">DÉMO</span>}
        </div>

        <div className="ap-models">
          {models.map(m => (
            <span key={m} className="ap-model-chip">{m}</span>
          ))}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="ap-bar-wrapper">
        <div className="ap-bar-track">
          <div
            className={`ap-bar-fill ${isComplete ? 'complete' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="ap-bar-label">
          {progress?.current ?? 0} / {progress?.total ?? '?'} prompts
        </span>
      </div>

      {/* Prompt en cours */}
      {progress && !isComplete && (
        <div className="ap-current">
          <span className="ap-current-label">PROMPT EN COURS</span>
          <span className="ap-current-text">{progress.prompt}</span>
        </div>
      )}

      {/* Historique des prompts traités */}
      {completedPrompts.length > 0 && (
        <div className="ap-log">
          {completedPrompts.map((p, i) => (
            <div key={i} className={`ap-log-row ${p.brand_mentioned ? 'mentioned' : ''}`}>
              <span className="ap-log-num">{p.current}</span>
              <span className="ap-log-prompt">{p.prompt}</span>
              <div className="ap-log-right">
                {p.brand_mentioned
                  ? <span className="ap-log-pos">#{p.brand_position ?? '?'}</span>
                  : <span className="ap-log-absent">—</span>
                }
                {p.brand_mentioned
                  ? <CheckCircle size={12} className="ap-log-check" />
                  : <XCircle size={12} className="ap-log-x" />
                }
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
