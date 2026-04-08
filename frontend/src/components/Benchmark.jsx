import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Crosshair,
  Loader2,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WandSparkles,
  X
} from 'lucide-react';
import { createBenchmark, fetchMetrics, runBenchmarkStream } from '../services/api';
import AnimatedNumber from './AnimatedNumber';
import MetricTape from './MetricTape';
import PanelState from './PanelState';
import './Benchmark.css';

const SECTOR_BRANDS = {
  Automobile: ['Tesla', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Porsche', 'Renault', 'Peugeot', 'Citroen', 'Toyota', 'Honda', 'Ford'],
  Assurance: ['AXA', 'Allianz', 'MAIF', 'MMA', 'GMF', 'Generali', 'Groupama', 'Covea', 'Macif'],
  Banque: ['BNP Paribas', 'Societe Generale', 'Credit Agricole', 'Boursorama', 'LCL', 'Natixis', 'Fortuneo'],
  Mode: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance', 'Asics', 'Reebok', 'Fila'],
  Tech: ['Apple', 'Samsung', 'Xiaomi', 'OnePlus', 'Oppo', 'Sony', 'Google', 'Microsoft'],
  Luxury: ['Louis Vuitton', 'Hermes', 'Chanel', 'Dior', 'Gucci', 'Prada', 'Balenciaga', 'Burberry'],
  Alimentation: ['Coca-Cola', 'Pepsi', 'Nestle', 'Danone', 'Unilever', 'Kellogg', 'Mars', 'Ferrero'],
  Retail: ['Amazon', 'Cdiscount', 'Fnac', 'Darty', 'Carrefour', 'Auchan', 'Leclerc', 'Intermarche']
};

function unwrapBenchmarkConfig(payload) {
  return payload?.benchmark || payload || null;
}

function normalizeList(values = []) {
  const seen = new Set();
  return values
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildProjectBenchmark(config, sector) {
  const brands = normalizeList([config?.brand, ...(config?.competitors || [])]).slice(0, 6);
  const prompts = normalizeList(config?.prompts || []);
  const models = normalizeList(config?.models || []);
  const products = Array.isArray(config?.products) ? config.products : [];

  return {
    key: [brands.join('|'), prompts.join('|'), models.join('|'), config?.sector || sector || ''].join('::'),
    source: 'project',
    sourceLabel: 'Projet actif',
    sector: config?.sector || sector || 'Multi-secteur',
    brands,
    prompts,
    products,
    models
  };
}

function getBrandResult(ranking = [], brand) {
  if (!brand) return null;
  return ranking.find((item) => String(item.brand || '').toLowerCase() === String(brand).toLowerCase()) || null;
}

function getDeltaTone(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function formatDateTime(value) {
  if (!value) return 'Aucun run';

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildFallbackBenchmarkConfig(projectBenchmark, brands) {
  return {
    ...projectBenchmark,
    source: 'manual',
    sourceLabel: 'Benchmark manuel',
    brands: normalizeList(brands).slice(0, 6)
  };
}

export default function Benchmark({ config, data, sector, onComplete }) {
  const projectBenchmark = useMemo(
    () => buildProjectBenchmark(config, sector),
    [config, sector]
  );

  const [customBenchmarkConfig, setCustomBenchmarkConfig] = useState(null);
  const [customResults, setCustomResults] = useState(null);
  const [draftBrands, setDraftBrands] = useState(projectBenchmark.brands);
  const [draftInputValue, setDraftInputValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [completedPrompts, setCompletedPrompts] = useState([]);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    setCustomBenchmarkConfig(null);
    setCustomResults(null);
    setDraftBrands(projectBenchmark.brands);
    setDraftInputValue('');
    setIsModalOpen(false);
    setIsGenerating(false);
    setIsRunning(false);
    setProgress(null);
    setCompletedPrompts([]);
    setError('');
    setModalError('');
  }, [projectBenchmark.brands, projectBenchmark.key]);

  const benchmarkConfig = customBenchmarkConfig || projectBenchmark;
  const brands = benchmarkConfig.brands || [];
  const displayResults = customBenchmarkConfig ? customResults : data;
  const ranking = displayResults?.ranking || [];
  const mainBrand = config?.brand || brands[0];
  const mainBrandResult = getBrandResult(ranking, mainBrand);
  const leader = ranking[0] || null;
  const challenger = ranking[1] || null;
  const lastRunAt = displayResults?.metadata?.timestamp || displayResults?.timestamp;
  const promptCount = benchmarkConfig.prompts?.length || 0;
  const modelCount = benchmarkConfig.models?.length || displayResults?.metadata?.llms_used?.length || 0;
  const readyToRun = brands.length >= 2 && promptCount > 0;
  const usingProjectBenchmark = !customBenchmarkConfig;

  const suggestedBrands = useMemo(() => {
    if (benchmarkConfig.sector && SECTOR_BRANDS[benchmarkConfig.sector]) {
      return SECTOR_BRANDS[benchmarkConfig.sector];
    }
    return Object.values(SECTOR_BRANDS).flat().slice(0, 12);
  }, [benchmarkConfig.sector]);

  const primaryGap = useMemo(() => {
    if (!mainBrandResult || !leader) return null;
    if (leader.brand === mainBrandResult.brand) {
      return challenger ? mainBrandResult.global_score - challenger.global_score : 0;
    }
    return mainBrandResult.global_score - leader.global_score;
  }, [challenger, leader, mainBrandResult]);

  const metricItems = useMemo(() => {
    const items = [
      {
        label: 'Marques',
        value: brands.length,
        meta: benchmarkConfig.sourceLabel
      },
      {
        label: 'Prompts',
        value: promptCount,
        meta: readyToRun ? 'pack actif' : 'a cadrer'
      },
      {
        label: 'Modeles',
        value: modelCount,
        meta: modelCount > 0 ? 'charges' : 'n/a'
      }
    ];

    if (mainBrandResult) {
      items.push({
        label: `${mainBrand} score`,
        value: mainBrandResult.global_score,
        decimals: 1,
        change: primaryGap,
        changeSuffix: ' pts',
        changeDecimals: 1
      });
    }

    if (leader) {
      items.push({
        label: 'Leader mention',
        value: leader.mention_rate,
        suffix: '%',
        meta: leader.brand
      });
    }

    return items;
  }, [benchmarkConfig.sourceLabel, brands.length, leader, mainBrand, mainBrandResult, modelCount, primaryGap, promptCount, readyToRun]);

  const handleOpenModal = () => {
    setDraftBrands(brands);
    setDraftInputValue('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDraftBrands(brands);
    setDraftInputValue('');
    setModalError('');
  };

  const addDraftBrand = (brand) => {
    const next = String(brand || '').trim();
    if (!next || draftBrands.length >= 6) return;
    if (draftBrands.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    setDraftBrands((current) => [...current, next]);
    setDraftInputValue('');
  };

  const removeDraftBrand = (brand) => {
    setDraftBrands((current) => current.filter((item) => item !== brand));
  };

  const handleDraftKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addDraftBrand(draftInputValue);
    }
  };

  const handleGenerateAlternative = async () => {
    if (draftBrands.length < 2) {
      setModalError('Selectionnez au moins 2 marques.');
      return;
    }

    setIsGenerating(true);
    setModalError('');
    setError('');

    const fallbackConfig = buildFallbackBenchmarkConfig(projectBenchmark, draftBrands);

    try {
      const payload = await createBenchmark(draftBrands);
      if (payload.status === 'error') {
        setCustomBenchmarkConfig(fallbackConfig);
        setCustomResults(null);
        setError(`${payload.error || 'Generation indisponible.'} Benchmark prepare avec le pack de prompts du projet.`);
      } else {
        const generatedConfig = unwrapBenchmarkConfig(payload) || {};
        setCustomBenchmarkConfig({
          ...fallbackConfig,
          sector: generatedConfig.sector || fallbackConfig.sector,
          brands: normalizeList(generatedConfig.brands || draftBrands).slice(0, 6),
          products: Array.isArray(generatedConfig.products) ? generatedConfig.products : fallbackConfig.products,
          prompts: normalizeList(generatedConfig.prompts || fallbackConfig.prompts),
          sourceLabel: 'Benchmark genere'
        });
        setCustomResults(null);
      }
      handleCloseModal();
    } catch {
      setCustomBenchmarkConfig(fallbackConfig);
      setCustomResults(null);
      setError('Impossible de generer un benchmark enrichi. Le benchmark manuel reste disponible avec le pack du projet.');
      handleCloseModal();
    } finally {
      setIsGenerating(false);
    }
  };

  const loadBenchmarkResults = async () => {
    try {
      const nextResults = await fetchMetrics({ benchmark: true });
      if (nextResults?.ranking) {
        setCustomResults(nextResults);
        return;
      }
      throw new Error('Resultats benchmark indisponibles');
    } catch (err) {
      setError(err.message || 'Impossible de charger les resultats benchmark.');
    }
  };

  const handleRunBenchmark = async () => {
    if (!readyToRun) {
      setError('Le benchmark a besoin d au moins 2 marques et d un pack de prompts.');
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setCompletedPrompts([]);
    setError('');

    try {
      for await (const event of runBenchmarkStream({
        name: benchmarkConfig.sector || sector || 'Benchmark',
        brands,
        prompts: benchmarkConfig.prompts || [],
        demo: false
      })) {
        if (event.type === 'start') {
          setProgress({ phase: 'start', ...event });
        }
        if (event.type === 'progress') {
          setProgress({ phase: 'progress', ...event });
          setCompletedPrompts((current) => [...current, event]);
        }
        if (event.type === 'complete') {
          setProgress({ phase: 'complete', ...event });
          setIsRunning(false);
          await loadBenchmarkResults();
        }
        if (event.type === 'error') {
          setError(event.message || 'Erreur benchmark');
          setIsRunning(false);
        }
      }
    } catch (err) {
      setError(err.message || 'Erreur benchmark');
      setIsRunning(false);
    }
  };

  const handleRestoreProjectBenchmark = () => {
    setCustomBenchmarkConfig(null);
    setCustomResults(null);
    setProgress(null);
    setCompletedPrompts([]);
    setError('');
  };

  const emptyArena = (
    <PanelState
      icon={readyToRun ? CheckCircle2 : Crosshair}
      title={readyToRun ? 'Benchmark pret a lancer' : 'Benchmark a cadrer'}
      description={readyToRun
        ? 'Le terrain de comparaison est pret. Lancez le run pour produire le classement et les ecarts de score.'
        : 'Le projet actif ne fournit pas encore assez de marques ou de prompts pour un benchmark utile.'}
      actions={readyToRun ? (
        <button type="button" onClick={handleRunBenchmark} disabled={isRunning}>
          Lancer le benchmark
        </button>
      ) : (
        <button type="button" onClick={handleOpenModal}>
          Configurer un benchmark
        </button>
      )}
    />
  );

  return (
    <div className="benchmark-wrapper">
      <section className="benchmark-header">
        <div className="benchmark-heading">
          <span className="benchmark-kicker">Benchmark actif</span>
          <h1>
            {brands.length >= 2
              ? `${brands[0]} contre ${brands.slice(1, 3).join(' / ')}`
              : 'Configurer un terrain de comparaison'}
          </h1>
          <p>
            Le benchmark reprend d abord le projet actif. Si vous voulez une autre arene de comparaison,
            ouvrez la fenetre de configuration au lieu de repartir d une page vide.
          </p>
        </div>

        <div className="benchmark-actions">
          <button type="button" className="btn-secondary" onClick={handleOpenModal}>
            <WandSparkles size={16} />
            Autre benchmark
          </button>
          {!usingProjectBenchmark && (
            <button type="button" className="btn-ghost" onClick={handleRestoreProjectBenchmark}>
              <Target size={16} />
              Revenir au projet
            </button>
          )}
          <button type="button" className="btn-primary" onClick={handleRunBenchmark} disabled={isRunning || !readyToRun}>
            {isRunning ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {isRunning ? 'Analyse en cours...' : displayResults?.ranking?.length ? 'Relancer le benchmark' : 'Lancer le benchmark'}
          </button>
        </div>
      </section>

      <MetricTape items={metricItems} compact />

      <div className="benchmark-main-grid">
        <section className="benchmark-arena">
          <div className="benchmark-section-head">
            <div>
              <span className="benchmark-section-kicker">Arena</span>
              <h2>Classement comparatif</h2>
            </div>
            <div className="benchmark-section-meta">
              <span className="benchmark-badge">{benchmarkConfig.sourceLabel}</span>
              <span className="benchmark-badge subtle">{formatDateTime(lastRunAt)}</span>
            </div>
          </div>

          {ranking.length > 0 ? (
            <>
              <div className="benchmark-duel">
                <article className="benchmark-duel-brand is-leader">
                  <span className="benchmark-duel-label">Leader actuel</span>
                  <strong>{leader?.brand}</strong>
                  <span>
                    <AnimatedNumber value={leader?.global_score} decimals={1} /> pts
                  </span>
                </article>

                <div className="benchmark-duel-center">
                  <ArrowRightLeft size={18} />
                  <span>Confrontation active</span>
                </div>

                <article className="benchmark-duel-brand">
                  <span className="benchmark-duel-label">Challenger</span>
                  <strong>{challenger?.brand || 'Aucun'}</strong>
                  <span>
                    <AnimatedNumber value={challenger?.global_score} decimals={1} /> pts
                  </span>
                </article>
              </div>

              <div className="benchmark-standings">
                <div className="benchmark-standings-head">
                  <span>Rang</span>
                  <span>Marque</span>
                  <span>Score</span>
                  <span>Mention</span>
                  <span>Share of voice</span>
                  <span>Ecart leader</span>
                </div>

                {ranking.map((item, index) => {
                  const gapToLeader = leader ? item.global_score - leader.global_score : 0;
                  const tone = getDeltaTone(gapToLeader);

                  return (
                    <div
                      key={item.brand}
                      className={`benchmark-standing-row ${item.brand === mainBrand ? 'is-main' : ''}`}
                    >
                      <span className="standing-rank">#{index + 1}</span>
                      <div className="standing-brand">
                        <span className="standing-brand-name">{item.brand}</span>
                        {item.brand === mainBrand && <span className="standing-brand-tag">Projet</span>}
                      </div>
                      <span className="standing-score">
                        <AnimatedNumber value={item.global_score} decimals={1} />
                      </span>
                      <span className="standing-metric">
                        <AnimatedNumber value={item.mention_rate} decimals={0} suffix="%" />
                      </span>
                      <span className="standing-metric">
                        <AnimatedNumber value={item.share_of_voice} decimals={0} suffix="%" />
                      </span>
                      <span className={`standing-delta ${tone}`}>
                        {gapToLeader === 0 ? 'Leader' : (
                          <>
                            {gapToLeader > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <AnimatedNumber value={Math.abs(gapToLeader)} decimals={1} suffix=" pts" />
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="benchmark-footer-actions">
                {onComplete && (
                  <button type="button" className="btn-secondary" onClick={() => onComplete(displayResults)}>
                    Voir les details
                  </button>
                )}
              </div>
            </>
          ) : (
            emptyArena
          )}
        </section>

        <aside className="benchmark-rail">
          <section className="benchmark-setup">
            <div className="benchmark-section-head">
              <div>
                <span className="benchmark-section-kicker">Configuration</span>
                <h2>Terrain compare</h2>
              </div>
              <span className={`benchmark-status ${readyToRun ? 'ready' : 'pending'}`}>
                {displayResults?.ranking?.length ? 'Resultats charges' : readyToRun ? 'Pret a lancer' : 'A completer'}
              </span>
            </div>

            <div className="benchmark-lineup">
              {brands.length > 0 ? brands.map((brand) => (
                <span key={brand} className={`benchmark-lineup-chip ${brand === mainBrand ? 'is-main' : ''}`}>
                  {brand}
                </span>
              )) : <span className="benchmark-lineup-empty">Aucune marque configuree</span>}
            </div>

            <div className="benchmark-summary-grid">
              <div className="benchmark-summary-item">
                <span>Prompts</span>
                <strong>{promptCount}</strong>
                <small>{promptCount > 0 ? 'pack disponible' : 'aucun pack'}</small>
              </div>
              <div className="benchmark-summary-item">
                <span>Modeles</span>
                <strong>{modelCount}</strong>
                <small>{modelCount > 0 ? 'lecture active' : 'non renseigne'}</small>
              </div>
              <div className="benchmark-summary-item">
                <span>Leader</span>
                <strong>{leader?.brand || '--'}</strong>
                <small>{leader ? `${leader.mention_rate?.toFixed(0)}% de mention` : 'en attente de run'}</small>
              </div>
              <div className="benchmark-summary-item">
                <span>Ecart projet</span>
                <strong className={getDeltaTone(primaryGap)}>
                  {typeof primaryGap === 'number'
                    ? `${primaryGap > 0 ? '+' : ''}${primaryGap.toFixed(1)} pts`
                    : '--'}
                </strong>
                <small>{mainBrand || 'Marque principale'}</small>
              </div>
            </div>

            <div className="benchmark-prompts">
              <div className="benchmark-prompts-head">
                <h3>Prompts utilises</h3>
                <span>{promptCount}</span>
              </div>
              {promptCount > 0 ? (
                <ul>
                  {benchmarkConfig.prompts.slice(0, 4).map((prompt, index) => (
                    <li key={`${prompt}-${index}`}>{prompt}</li>
                  ))}
                  {promptCount > 4 && <li className="more">+{promptCount - 4} autres prompts</li>}
                </ul>
              ) : (
                <p>Aucun prompt disponible dans ce benchmark.</p>
              )}
            </div>
          </section>

          {isRunning && progress && (
            <section className="benchmark-live">
              <div className="benchmark-section-head">
                <div>
                  <span className="benchmark-section-kicker">Live</span>
                  <h2>Run benchmark</h2>
                </div>
                <span className="benchmark-status live">En cours</span>
              </div>

              <div className="benchmark-progress-line">
                <div
                  className="benchmark-progress-fill"
                  style={{
                    width: progress.total ? `${Math.min(100, (progress.current / progress.total) * 100)}%` : '8%'
                  }}
                />
              </div>

              <div className="benchmark-live-stats">
                <div>
                  <span>Phase</span>
                  <strong>
                    {progress.phase === 'progress'
                      ? `Prompt ${progress.current}/${progress.total}`
                      : 'Initialisation'}
                  </strong>
                </div>
                <div>
                  <span>Prompt actuel</span>
                  <strong>{progress.prompt || 'Preparation du benchmark'}</strong>
                </div>
              </div>

              {completedPrompts.length > 0 && (
                <div className="benchmark-live-log">
                  {completedPrompts.slice(-4).map((item, index) => (
                    <div key={`${item.prompt}-${index}`} className="benchmark-live-item">
                      <span className="benchmark-live-index">{completedPrompts.length - Math.min(4, completedPrompts.length) + index + 1}</span>
                      <span className="benchmark-live-text">{item.prompt}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {error && <div className="benchmark-error">{error}</div>}
        </aside>
      </div>

      {isModalOpen && (
        <div className="benchmark-modal-backdrop" onClick={handleCloseModal}>
          <div className="benchmark-modal" onClick={(event) => event.stopPropagation()}>
            <div className="benchmark-modal-head">
              <div>
                <span className="benchmark-section-kicker">Autre benchmark</span>
                <h2>Configurer une autre arene</h2>
              </div>
              <button type="button" className="benchmark-modal-close" onClick={handleCloseModal} aria-label="Fermer">
                <X size={16} />
              </button>
            </div>

            <p className="benchmark-modal-copy">
              Saisissez 2 a 6 marques. Le projet actif reste la reference, mais vous pouvez preparer un autre benchmark
              sans casser la lecture actuelle.
            </p>

            <div className="benchmark-modal-lineup">
              {draftBrands.map((brand) => (
                <span key={brand} className="benchmark-lineup-chip is-editing">
                  {brand}
                  <button type="button" onClick={() => removeDraftBrand(brand)} aria-label={`Supprimer ${brand}`}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div className="benchmark-modal-input">
              <input
                type="text"
                value={draftInputValue}
                onChange={(event) => setDraftInputValue(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder={draftBrands.length >= 6 ? 'Maximum 6 marques' : 'Ajouter une marque'}
                disabled={draftBrands.length >= 6}
              />
              <button type="button" onClick={() => addDraftBrand(draftInputValue)} disabled={draftBrands.length >= 6}>
                <Plus size={16} />
              </button>
            </div>

            <div className="benchmark-modal-suggestions">
              {suggestedBrands.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  className="benchmark-suggestion"
                  onClick={() => addDraftBrand(brand)}
                  disabled={draftBrands.some((item) => item.toLowerCase() === brand.toLowerCase()) || draftBrands.length >= 6}
                >
                  {brand}
                </button>
              ))}
            </div>

            {modalError && <div className="benchmark-error">{modalError}</div>}

            <div className="benchmark-modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setDraftBrands(projectBenchmark.brands)}>
                Charger le projet
              </button>
              <button type="button" className="btn-primary" onClick={handleGenerateAlternative} disabled={isGenerating}>
                {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Preparation...' : 'Appliquer ce benchmark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
