import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  WandSparkles,
  X
} from 'lucide-react';
import { createBenchmark, fetchMetrics, runBenchmarkStream } from '../services/api';
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

export default function Benchmark({ sector, onComplete }) {
  const [brands, setBrands] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [completedPrompts, setCompletedPrompts] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const benchmarkConfig = unwrapBenchmarkConfig(generated);

  const suggestedBrands = useMemo(() => {
    if (sector && SECTOR_BRANDS[sector]) return SECTOR_BRANDS[sector];
    return Object.values(SECTOR_BRANDS).flat().slice(0, 12);
  }, [sector]);

  const addBrand = (brand) => {
    const trimmed = brand.trim();
    if (!trimmed || brands.includes(trimmed) || brands.length >= 6) return;
    setBrands((current) => [...current, trimmed]);
    setInputValue('');
  };

  const removeBrand = (brand) => {
    setBrands((current) => current.filter((item) => item !== brand));
    if (generated) setGenerated(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBrand(inputValue);
    }
  };

  const handleGenerate = async () => {
    if (brands.length < 2) {
      setError('Selectionnez au moins 2 marques.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGenerated(null);
    setResults(null);

    try {
      const payload = await createBenchmark(brands);
      if (payload.status === 'error') {
        setError(payload.error || 'Generation benchmark impossible.');
      } else {
        setGenerated(payload);
      }
    } catch {
      setError('Erreur de connexion pendant la generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadResults = async () => {
    try {
      const data = await fetchMetrics({});
      if (data?.ranking) {
        setResults(data);
      }
    } catch {
      setError('Impossible de charger les resultats benchmark.');
    }
  };

  const handleRunBenchmark = async () => {
    if (!benchmarkConfig) return;

    setIsRunning(true);
    setProgress(null);
    setCompletedPrompts([]);
    setResults(null);
    setError('');

    try {
      for await (const event of runBenchmarkStream({
        name: benchmarkConfig.sector || sector || 'Benchmark',
        brands,
        prompts: benchmarkConfig.prompts || [],
        demo: false
      })) {
        if (event.type === 'start') setProgress({ phase: 'start', ...event });
        if (event.type === 'progress') {
          setProgress({ phase: 'progress', ...event });
          setCompletedPrompts((current) => [...current, event]);
        }
        if (event.type === 'complete') {
          setProgress({ phase: 'complete', ...event });
          setIsRunning(false);
          await loadResults();
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

  return (
    <div className="benchmark-wrapper">
      <section className="benchmark-hero">
        <div className="benchmark-hero-copy">
          <span className="benchmark-kicker">Benchmarks</span>
          <h1>Comparer plusieurs marques sur un meme terrain de reponses.</h1>
          <p>
            Construisez un benchmark lisible, relisez le perimetre genere, puis lancez un run
            comparatif qui fait ressortir les ecarts de citation, de score et de rang.
          </p>
        </div>

        <div className="benchmark-hero-stats">
          <article className="benchmark-stat-card">
            <Target size={18} />
            <div>
              <span>Marques</span>
              <strong>{brands.length}/6</strong>
            </div>
          </article>
          <article className={`benchmark-stat-card ${benchmarkConfig ? 'ready' : ''}`}>
            <Sparkles size={18} />
            <div>
              <span>Configuration</span>
              <strong>{benchmarkConfig ? 'Prete' : 'A generer'}</strong>
            </div>
          </article>
          <article className={`benchmark-stat-card ${isRunning ? 'live' : ''}`}>
            <TrendingUp size={18} />
            <div>
              <span>Execution</span>
              <strong>{isRunning ? 'En cours' : results ? 'Terminee' : 'En attente'}</strong>
            </div>
          </article>
        </div>
      </section>

      <div className="benchmark-layout">
        <div className="benchmark-panel">
          <section className="panel-section">
            <div className="panel-title-row">
              <h2><Target size={14} /> Marques comparees</h2>
              <span className="panel-chip">{sector || 'Multi-secteur'}</span>
            </div>
            <p className="panel-desc">
              Selectionnez 2 a 6 marques pour construire un benchmark comparatif stable.
            </p>

            <div className="brand-chips">
              {brands.map((brand) => (
                <div key={brand} className="brand-chip">
                  <span>{brand}</span>
                  <X size={12} onClick={() => removeBrand(brand)} />
                </div>
              ))}
            </div>

            <div className="brand-input-row">
              <input
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={brands.length >= 6 ? 'Maximum 6 marques' : 'Ajouter une marque'}
                disabled={brands.length >= 6}
              />
              <button type="button" onClick={() => addBrand(inputValue)} disabled={brands.length >= 6}>
                <Plus size={16} />
              </button>
            </div>

            <div className="popular-brands">
              <span>{sector ? `Suggestions ${sector}` : 'Suggestions rapides'}</span>
              <div className="popular-brand-list">
                {suggestedBrands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    className="popular-chip"
                    onClick={() => addBrand(brand)}
                    disabled={brands.includes(brand) || brands.length >= 6}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {brands.length >= 2 && (
            <section className="panel-section">
              <button className="btn-generate" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Generation...' : 'Generer le benchmark'}
              </button>
            </section>
          )}

          {error && <div className="benchmark-error">{error}</div>}

          {benchmarkConfig && (
            <section className="panel-section generated-config">
              <div className="panel-title-row">
                <h2><CheckCircle2 size={14} /> Configuration generee</h2>
                <span className="panel-chip success">Prete</span>
              </div>

              <div className="config-info">
                <span>{benchmarkConfig.sector || sector || 'Benchmark'}</span>
                <span>{benchmarkConfig.products?.length || 0} produits</span>
                <span>{benchmarkConfig.prompts?.length || 0} prompts</span>
              </div>

              {!!benchmarkConfig.products?.length && (
                <div className="products-list">
                  {benchmarkConfig.products.map((product) => (
                    <div key={product.id} className="product-item">
                      <span className="product-name">{product.name}</span>
                      <span className="product-desc">{product.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {!!benchmarkConfig.prompts?.length && (
                <div className="prompts-preview">
                  <span className="prompts-label">Prompts pilotes</span>
                  <ul>
                    {benchmarkConfig.prompts.slice(0, 3).map((prompt, index) => (
                      <li key={`${prompt}-${index}`}>{prompt}</li>
                    ))}
                    {benchmarkConfig.prompts.length > 3 && (
                      <li className="more">+{benchmarkConfig.prompts.length - 3} autres</li>
                    )}
                  </ul>
                </div>
              )}

              <button className="btn-launch" onClick={handleRunBenchmark} disabled={isRunning}>
                {isRunning ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {isRunning ? 'Analyse...' : 'Lancer le benchmark'}
              </button>
            </section>
          )}
        </div>

        <div className="benchmark-results">
          {isRunning && progress && (
            <section className="progress-panel">
              <div className="panel-title-row">
                <h2><TrendingUp size={14} /> Analyse en cours</h2>
                <span className="panel-chip live">Live</span>
              </div>

              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-label">Phase</span>
                  <span className="stat-value">
                    {progress.phase === 'progress' ? `Prompt ${progress.current}/${progress.total}` : 'Initialisation'}
                  </span>
                </div>

                {progress.phase === 'progress' && (
                  <>
                    <div className="stat">
                      <span className="stat-label">Prompt actuel</span>
                      <span className="stat-value prompt-text">{progress.prompt}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </div>

              {completedPrompts.length > 0 && (
                <div className="completed-list">
                  <span className="completed-label">Prompts deja traites</span>
                  {completedPrompts.map((item, index) => (
                    <div key={`${item.prompt}-${index}`} className="completed-item">
                      <span className="cp-num">{index + 1}</span>
                      <span className="cp-prompt">{item.prompt}</span>
                      {item.brands_mentioned && (
                        <span className="cp-brands">{item.brands_mentioned.length} marques</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {results?.ranking && (
            <section className="results-panel">
              <div className="results-header">
                <Trophy size={18} />
                <h2>Classement benchmark</h2>
              </div>

              <div className="ranking-list">
                {results.ranking.map((item, index) => (
                  <div key={item.brand} className={`rank-item rank-${index + 1}`}>
                    <div className="rank-badge">
                      {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : `#${index + 1}`}
                    </div>
                    <div className="rank-brand">{item.brand}</div>
                    <div className="rank-score">{item.global_score?.toFixed(1)}</div>
                    <div className="rank-metrics">
                      <span>{item.mention_rate?.toFixed(0)}%</span>
                      <span>#{item.avg_position?.toFixed(1)}</span>
                      <span>{item.share_of_voice?.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="results-actions">
                <button className="btn-secondary" type="button" onClick={() => { setGenerated(null); setResults(null); }}>
                  Nouveau benchmark
                </button>
                {onComplete && (
                  <button className="btn-primary" type="button" onClick={() => onComplete(results)}>
                    Voir details
                  </button>
                )}
              </div>
            </section>
          )}

          {!isRunning && !results && (
            <PanelState
              icon={benchmarkConfig ? CheckCircle2 : Crosshair}
              title={benchmarkConfig ? 'Configuration benchmark prete' : 'Benchmark non lance'}
              description={
                benchmarkConfig
                  ? 'Le benchmark est configure. Lancez maintenant le run pour produire un classement comparatif.'
                  : 'Selectionnez entre 2 et 6 marques pour preparer un benchmark comparatif et suivre les ecarts de visibilite.'
              }
              actions={benchmarkConfig ? (
                <button onClick={handleRunBenchmark} disabled={isRunning}>
                  Lancer le benchmark
                </button>
              ) : null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
