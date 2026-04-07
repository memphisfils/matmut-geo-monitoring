import React, { useMemo } from 'react';
import { Compass, Layers3, Radar, SearchCheck, ShieldCheck } from 'lucide-react';
import { MentionChart, CategoryHeatmap } from '../Charts';
import MetricTape from '../MetricTape';
import './AnalysisTabs.css';

const INTENT_RULES = [
  { key: 'comparison', label: 'Comparaison', tone: 'good', test: (text) => /vs|compar|meilleur|top|alternat|face a|contre/.test(text) },
  { key: 'reassurance', label: 'Reassurance', tone: 'watch', test: (text) => /avis|fiable|secur|garant|risque|confiance|qualite/.test(text) },
  { key: 'price', label: 'Prix', tone: 'risk', test: (text) => /prix|tarif|cout|budget|cher|moins cher|abonnement/.test(text) },
  { key: 'discovery', label: 'Decouverte', tone: 'watch', test: () => true }
];

function classifyPrompt(prompt) {
  const lower = prompt.toLowerCase();
  return INTENT_RULES.find((rule) => rule.test(lower)) || INTENT_RULES[INTENT_RULES.length - 1];
}

export default function KeywordsTab({ config, data }) {
  const prompts = config.prompts ?? [];
  const ranking = data?.ranking ?? [];
  const target = ranking.find((item) => item.brand === config.brand) || ranking[0];
  const leader = ranking[0];

  const promptGroups = useMemo(() => {
    const grouped = (config.prompts ?? []).map((prompt, index) => {
      const intent = classifyPrompt(prompt);
      return {
        id: `${intent.key}-${index}`,
        prompt,
        intent
      };
    });

    const counts = grouped.reduce((acc, item) => {
      acc[item.intent.key] = (acc[item.intent.key] || 0) + 1;
      return acc;
    }, {});

    return {
      grouped,
      counts
    };
  }, [config.prompts]);

  const categoryHighlights = useMemo(() => {
    const categoryData = data?.category_data || {};
    return Object.entries(categoryData)
      .map(([category, brands]) => ({
        category,
        value: brands?.[config.brand] ?? 0,
        leader: Object.entries(brands || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0] || config.brand
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 4);
  }, [config.brand, data?.category_data]);

  const tapeItems = [
    { label: 'Prompts source', value: prompts.length, meta: 'dans le run' },
    { label: 'Intentions', value: Object.keys(promptGroups.counts).length || 0, meta: 'clusters actifs' },
    { label: 'Mention marque', value: target?.mention_rate || 0, suffix: '%', meta: config.brand },
    {
      label: 'Ecart leader',
      value: leader && target ? Math.max(0, (leader.global_score || 0) - (target.global_score || 0)) : 0,
      decimals: 1,
      meta: leader?.brand || 'n/a'
    }
  ];

  return (
    <div className="analysis-shell">
      <section className="analysis-header">
        <div className="analysis-heading">
          <span className="analysis-kicker">Intentions</span>
          <h2>Lecture des intentions et de la couverture pour {config.brand}</h2>
          <p>
            Cette vue doit relier les requetes source du projet, leur nature et la penetration
            concurrentielle. On quitte le simple mot-cle pour revenir a une lecture orientee usage.
          </p>
          <div className="analysis-summary-line">
            <span className="analysis-chip">{prompts.length} prompt(s) source</span>
            <span className="analysis-chip">{target?.mention_rate || 0}% de mention</span>
          </div>
        </div>

        <div className="analysis-hero-panel">
          <div className="analysis-hero-grid">
            <div>
              <span>Leader courant</span>
              <strong>{leader?.brand || config.brand}</strong>
            </div>
            <div>
              <span>Marque cible</span>
              <strong>{config.brand}</strong>
            </div>
            <div>
              <span>Categories utiles</span>
              <strong>{categoryHighlights.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <div className="analysis-layout">
        <div className="analysis-main">
          <MentionChart ranking={ranking} brand={config.brand} />
          <CategoryHeatmap categoryData={data?.category_data} brand={config.brand} ranking={ranking} />
        </div>

        <aside className="analysis-rail">
          <section className="analysis-panel emphasis">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Intentions source</span>
                <h3>Ce qui alimente le projet</h3>
              </div>
            </div>

            <div className="analysis-prompt-list">
              {promptGroups.grouped.slice(0, 6).map((item) => (
                <article key={item.id} className={`analysis-prompt-item ${item.intent.tone}`}>
                  <div className="analysis-prompt-topline">
                    <span className={`analysis-intent-pill ${item.intent.tone}`}>{item.intent.label}</span>
                    <span className="analysis-inline-pill">{item.prompt.length} car.</span>
                  </div>
                  <strong>{item.prompt}</strong>
                </article>
              ))}
              {!promptGroups.grouped.length && (
                <article className="analysis-prompt-item watch">
                  <div className="analysis-prompt-topline">
                    <span className="analysis-intent-pill watch">Manual</span>
                  </div>
                  <strong>Aucun prompt source visible</strong>
                  <p>Le projet n expose pas encore ses requetes sources dans cette configuration.</p>
                </article>
              )}
            </div>
          </section>

          <section className="analysis-panel">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Lecture rapide</span>
                <h3>Comment lire cette vue</h3>
              </div>
            </div>
            <div className="analysis-note-list">
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Compass size={18} /></div>
                <div>
                  <strong>Intentions dominantes</strong>
                  <p>Les prompts de comparaison et de reassurance doivent rester visibles, car ils portent la decision.</p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Layers3 size={18} /></div>
                <div>
                  <strong>Couverture categorie</strong>
                  <p>Une forte mention generale ne suffit pas si la marque recule sur les categories qui comptent vraiment.</p>
                </div>
              </div>
              <div className="analysis-note-item">
                <div className="analysis-note-icon"><Radar size={18} /></div>
                <div>
                  <strong>Pression concurrentielle</strong>
                  <p>Si le leader change selon la categorie, la strategie doit etre plus fine que le score global.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="analysis-panel">
            <div className="analysis-panel-head">
              <div>
                <span className="analysis-panel-kicker">Top categories</span>
                <h3>Ou la marque repond deja</h3>
              </div>
            </div>
            <div className="analysis-category-list">
              {categoryHighlights.map((item) => (
                <div key={item.category} className="analysis-category-item">
                  <div className="analysis-category-topline">
                    <div className="analysis-category-copy">
                      <span className="analysis-category-label">{item.category}</span>
                      <strong>{item.value}%</strong>
                    </div>
                    <span className="analysis-inline-pill">leader {item.leader}</span>
                  </div>
                  <div className="analysis-progress">
                    <div className="analysis-progress-fill" style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }} />
                  </div>
                </div>
              ))}
              {!categoryHighlights.length && (
                <div className="analysis-category-item">
                  <div className="analysis-category-copy">
                    <span className="analysis-category-label"><SearchCheck size={14} /> categories</span>
                    <strong>n/a</strong>
                    <p>Aucune categorie exploitable sur ce run.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="analysis-panel">
            <div className="analysis-note-item">
              <div className="analysis-note-icon"><ShieldCheck size={18} /></div>
              <div>
                <strong>Bon usage produit</strong>
                <p>Cette page doit servir a comprendre quels types de questions protegent ou exposent la marque, pas a empiler des graphes abstraits.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
