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

  const leadingIntents = Object.entries(intentMap).sort((left, right) => right[1] - left[1]).slice(0, 4);

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
          <p>{products.length} offre{products.length > 1 ? 's' : ''} source{products.length > 1 ? 's' : ''}</p>
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
            <strong>Intentions</strong>
          </div>
          <div className="engine-stat">{Object.keys(intentMap).length || 1}</div>
          <p>{leadingIntents.length > 0 ? leadingIntents.map(([label]) => label).join(', ') : 'A classifier'}</p>
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
            <strong>Clusters de prompts</strong>
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
          <div className="engine-note">
            <Sparkles size={14} />
            <span>Exposez ce bloc pour expliquer pourquoi le score change, pas seulement combien il change.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
