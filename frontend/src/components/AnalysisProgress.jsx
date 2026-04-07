import React from 'react';
import { CheckCircle, Loader2, Sparkles, Target, XCircle } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import './AnalysisProgress.css';

export default function AnalysisProgress({
  brand,
  progress,
  models = [],
  isComplete = false,
  isDemo = false,
  completedPrompts = [],
  promptTarget = 0
}) {
  const totalPrompts = progress?.total || promptTarget || completedPrompts.length || 0;
  const currentPrompt = progress?.current || completedPrompts.length || 0;
  const pct = totalPrompts > 0 ? Math.round((currentPrompt / totalPrompts) * 100) : 0;
  const mentionCount = completedPrompts.filter((item) => item.brand_mentioned).length;
  const currentText = progress?.prompt || 'Preparation du run, connexion au moteur et chargement des prompts.';

  return (
    <section className="ap-shell">
      <div className="ap-hero">
        <div className="ap-hero-copy">
          <span className="ap-kicker">{isComplete ? 'Run termine' : 'Analyse GEO en cours'}</span>
          <h2>{brand}</h2>
          <p>
            {isComplete
              ? 'Le run est termine. Les resultats consolides sont prets dans le dashboard.'
              : 'Le moteur evalue les prompts, compare les modeles et construit le classement actif.'}
          </p>
        </div>

        <div className="ap-state">
          <div className={`ap-state-icon ${isComplete ? 'done' : 'live'}`}>
            {isComplete ? <CheckCircle size={20} /> : <Loader2 size={20} className="ap-icon-spin" />}
          </div>
          <div>
            <strong>{isComplete ? 'Analyse finalisee' : 'Moteur en execution'}</strong>
            <span>{isDemo ? 'Mode demo' : 'Mode live'}</span>
          </div>
        </div>
      </div>

      <div className="ap-stats">
        <div className="ap-stat-card">
          <span>Prompts</span>
          <strong>
            <AnimatedNumber value={currentPrompt} decimals={0} /> / {totalPrompts || '?'}
          </strong>
        </div>
        <div className="ap-stat-card">
          <span>Modeles</span>
          <strong><AnimatedNumber value={models.length || 1} decimals={0} /></strong>
        </div>
        <div className="ap-stat-card">
          <span>Mentions detectees</span>
          <strong><AnimatedNumber value={mentionCount} decimals={0} /></strong>
        </div>
      </div>

      <div className="ap-bar-block">
        <div className="ap-bar-head">
          <span>Progression du run</span>
          <strong><AnimatedNumber value={pct} decimals={0} suffix="%" /></strong>
        </div>
        <div className="ap-bar-track">
          <div className={`ap-bar-fill ${isComplete ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="ap-worksurface">
        <div className="ap-current">
          <div className="ap-current-head">
            <span className="ap-current-label">Prompt en cours</span>
            {!isComplete && (
              <span className="ap-live-chip">
                <Sparkles size={12} />
                <span>Live</span>
              </span>
            )}
          </div>
          <p className="ap-current-text">{currentText}</p>

          {models.length > 0 && (
            <div className="ap-models">
              {models.map((model) => (
                <span key={model} className="ap-model-chip">{model}</span>
              ))}
            </div>
          )}
        </div>

        <div className="ap-log-panel">
          <div className="ap-log-head">
            <span>Prompts deja traites</span>
            <strong>{completedPrompts.length}</strong>
          </div>

          {completedPrompts.length === 0 ? (
            <div className="ap-empty">
              <Target size={16} />
              <span>Le journal s'alimente des que le premier prompt est traite.</span>
            </div>
          ) : (
            <div className="ap-log">
              {completedPrompts.map((item, index) => (
                <div key={`${item.current}-${index}`} className={`ap-log-row ${item.brand_mentioned ? 'mentioned' : 'missed'}`}>
                  <span className="ap-log-num">{item.current}</span>
                  <span className="ap-log-prompt">{item.prompt}</span>
                  <div className="ap-log-right">
                    {item.brand_mentioned ? (
                      <>
                        <span className="ap-log-pos">#{item.brand_position ?? '?'}</span>
                        <CheckCircle size={12} className="ap-log-check" />
                      </>
                    ) : (
                      <>
                        <span className="ap-log-absent">Absente</span>
                        <XCircle size={12} className="ap-log-x" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
