import React, { useMemo } from 'react';
import {
  Bot,
  Boxes,
  BrainCircuit,
  Layers3,
  Sparkles,
  Split,
  Target
} from 'lucide-react';
import './PromptEnginePanel.css';

const INTENT_RULES = [
  { key: 'comparaison', label: 'Comparaison', match: /(comparatif|vs|alternative|alternatives|compare)/i },
  { key: 'prix', label: 'Prix', match: /(prix|tarif|pas cher|cher|rapport qualite)/i },
  { key: 'reassurance', label: 'Reassurance', match: /(avis|fiable|confiance|service client|garantie)/i },
  { key: 'decouverte', label: 'Decouverte', match: /(meilleur|top|quelle|quels|recommande)/i }
];

function deriveIntent(prompt) {
  const rule = INTENT_RULES.find((item) => item.match.test(prompt || ''));
  return rule || { key: 'consideration', label: 'Consideration' };
}

function uniquePrompts(prompts) {
  const seen = new Set();
  return (prompts || []).filter((prompt) => {
    const normalized = (prompt || '').trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export default function PromptEnginePanel({ config, compact = false }) {
  const prompts = useMemo(() => uniquePrompts(config?.prompts || []), [config?.prompts]);
  const promptAudit = config?.prompt_audit || null;
  const intentMap = useMemo(() => {
    const counts = {};
    prompts.forEach((prompt) => {
      const intent = deriveIntent(prompt);
      counts[intent.label] = (counts[intent.label] || 0) + 1;
    });
    return counts;
  }, [prompts]);

  const products = config?.products || [];
  const competitors = config?.competitors || [];
  const models = config?.models || [];
  const setupMode = config?.setup_mode === 'manual' ? 'Manuel' : 'Assiste';
  const leadingIntents = promptAudit?.top_intents?.length
    ? promptAudit.top_intents.map((item) => [item.label, item.count])
    : Object.entries(intentMap).sort((left, right) => right[1] - left[1]).slice(0, 4);
  const averageQuality = promptAudit?.average_quality_score ?? 0;
  const weakPromptCount = promptAudit?.weak_prompt_count ?? 0;
  const coverageAverage = promptAudit?.coverage_average ?? 0;
  const qualityLabel = averageQuality >= 75 ? 'Fort' : averageQuality >= 55 ? 'Correct' : 'Fragile';
  const generationSource = config?.generation_notes?.source === 'llm' ? 'IA' : 'Manuel';
  const repairedPromptCount = config?.generation_notes?.repaired_prompts_count || config?.generation_notes?.repaired_before_launch || 0;

  return (
    <section className={`prompt-engine ${compact ? 'compact' : ''}`}>
      <div className="prompt-engine-head">
        <div>
          <span className="prompt-engine-kicker">Moteur de prompts</span>
          <h3>Ce qui part vraiment dans l analyse</h3>
        </div>
        <span className="prompt-engine-mode">{setupMode}</span>
      </div>

      <div className="prompt-engine-grid">
        <article className="engine-card">
          <div className="engine-card-head">
            <Target size={16} />
            <strong>Perimetre</strong>
          </div>
          <div className="engine-stat">{config?.brand || 'Marque'}</div>
          <p>{config?.sector || 'Secteur non defini'} · {competitors.length} concurrent{competitors.length > 1 ? 's' : ''}</p>
        </article>

        <article className="engine-card">
          <div className="engine-card-head">
            <Layers3 size={16} />
            <strong>Prompts</strong>
          </div>
          <div className="engine-stat">{prompts.length}</div>
          <p>{products.length} offre{products.length > 1 ? 's' : ''} source{products.length > 1 ? 's' : ''} · source {generationSource}</p>
        </article>

        <article className="engine-card">
          <div className="engine-card-head">
            <Bot size={16} />
            <strong>Modeles</strong>
          </div>
          <div className="engine-stat">{models.length || 1}</div>
          <p>{models.length ? models.join(', ') : 'Modeles backend actifs'}</p>
        </article>

        <article className="engine-card">
          <div className="engine-card-head">
            <Split size={16} />
            <strong>Qualite</strong>
          </div>
          <div className="engine-stat">{averageQuality || Object.keys(intentMap).length || 1}</div>
          <p>{promptAudit ? `${qualityLabel} · ${weakPromptCount} prompt${weakPromptCount > 1 ? 's' : ''} fragile${weakPromptCount > 1 ? 's' : ''}` : 'Audit en attente'}</p>
        </article>
      </div>

      <div className="engine-bottom">
        <div className="engine-bottom-panel">
          <div className="engine-card-head">
            <BrainCircuit size={16} />
            <strong>Pipeline</strong>
          </div>
          <ul className="engine-pipeline">
            <li>Systeme: secteur, marque et benchmark actif</li>
            <li>Generation: prompts regroupes par offres et intentions</li>
            <li>Execution: run sur modeles actifs et session projet</li>
            <li>Interpretation: mention, position, sentiment, divergence</li>
          </ul>
        </div>

        <div className="engine-bottom-panel">
          <div className="engine-card-head">
            <Boxes size={16} />
            <strong>Clusters et couverture</strong>
          </div>
          <div className="intent-chip-row">
            {leadingIntents.length > 0 ? (
              leadingIntents.map(([label, count]) => (
                <span key={label} className="intent-chip">{label} · {count}</span>
              ))
            ) : (
              <span className="intent-chip muted">Aucun cluster disponible</span>
            )}
          </div>
          <div className="engine-coverage-row">
            <span className="intent-chip muted">Couverture benchmark · {coverageAverage}%</span>
            {promptAudit ? <span className="intent-chip muted">Score moyen · {averageQuality}</span> : null}
            {repairedPromptCount > 0 ? <span className="intent-chip muted">Prompts durcis · {repairedPromptCount}</span> : null}
          </div>
          <div className="engine-note">
            <Sparkles size={14} />
            <span>Le moteur expose maintenant la qualite moyenne, les prompts fragiles et la couverture concurrentielle du run.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
