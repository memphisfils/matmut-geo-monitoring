import React, { useState } from 'react';
import { Crosshair, Plus, X, Loader2, Sparkles, Trophy, TrendingUp, Target, WandSparkles } from 'lucide-react';
import { createBenchmark, runBenchmarkStream, fetchMetrics } from '../services/api';
import PanelState from './PanelState';
import './Benchmark.css';

const SECTOR_BRANDS = {
  'Automobile': ['Tesla', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Porsche', 'Renault', 'Peugeot', 'Citroën', 'Toyota', 'Honda', 'Ford'],
  'Assurance': ['AXA', 'Allianz', 'MAIF', 'MMA', 'GMF', 'Generali', 'Groupama', 'BNP Paribas', 'Covéa', 'Macif'],
  'Banque': ['BNP Paribas', 'Société Générale', 'Crédit Agricole', 'Bourse', 'LCL', 'Natixis', 'AXA', 'Allianz'],
  'Mode': ['Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance', 'Asics', 'Reebok', 'Fila', 'Champion'],
  'Tech': ['Apple', 'Samsung', 'Xiaomi', 'OnePlus', 'Oppo', 'Vivo', 'ASUS', 'Sony', 'LG', 'Huawei', 'Google', 'Microsoft'],
  'Luxury': ['Louis Vuitton', 'Hermès', 'Chanel', 'Dior', 'Gucci', 'Prada', 'Balenciaga', 'Versace', 'Burberry'],
  'Alimentation': ['Coca-Cola', 'Pepsi', 'Nestlé', 'Danone', 'Unilever', 'Kellogg', 'Mars', 'Ferrero'],
  'Retail': ['Amazon', 'Cdiscount', 'Fnac', 'Darty', 'Carrefour', 'Auchan', ' Leclerc', 'Intermarché'],
};

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

  const addBrand = (brand) => {
    const trimmed = brand.trim();
    if (trimmed && !brands.includes(trimmed) && brands.length < 6) {
      setBrands([...brands, trimmed]);
      setInputValue('');
    }
  };

  const removeBrand = (brand) => {
    setBrands(brands.filter(b => b !== brand));
    if (generated) setGenerated(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBrand(inputValue);
    }
  };

  const handleGenerate = async () => {
    if (brands.length < 2) {
      setError('Sélectionnez au moins 2 marques');
      return;
    }
    setError('');
    setIsGenerating(true);
    setGenerated(null);
    setResults(null);
    try {
      const data = await createBenchmark(brands);
      if (data.status === 'error') {
        setError(data.error || 'Erreur génération');
      } else {
        setGenerated(data);
      }
    } catch {
      setError('Erreur connexion backend');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunBenchmark = async () => {
    if (!generated) return;
    setIsRunning(true);
    setProgress(null);
    setCompletedPrompts([]);
    setResults(null);
    setError('');
    try {
      for await (const event of runBenchmarkStream({
        name: generated.sector,
        brands,
        prompts: generated.prompts,
        demo: false
      })) {
        if (event.type === 'start') {
          setProgress({ phase: 'start', ...event });
        }
        if (event.type === 'progress') {
          setProgress({ phase: 'progress', ...event });
          setCompletedPrompts(prev => [...prev, event]);
        }
        if (event.type === 'complete') {
          setProgress({ phase: 'complete', ...event });
          setIsRunning(false);
          loadResults();
        }
        if (event.type === 'error') {
          setError(event.message || 'Erreur analyse');
          setIsRunning(false);
        }
      }
    } catch (err) {
      setError(err.message || 'Erreur streaming');
      setIsRunning(false);
    }
  };

  const loadResults = async () => {
    try {
      const data = await fetchMetrics({});
      if (data.ranking) {
        setResults(data);
      }
    } catch {
      setError('Impossible de charger les résultats');
    }
  };

  return (
    <div className="benchmark-wrapper">
      <div className="benchmark-header">
        <Crosshair size={20} />
        <h1>BENCHMARK MULTI-MARQUES</h1>
      </div>

      <div className="benchmark-layout">
        {/* Panneau gauche - Configuration */}
        <div className="benchmark-panel">
          <div className="panel-section">
            <h2><Target size={14} /> MARQUES</h2>
            <p className="panel-desc">Sélectionnez 2 à 6 marques pour un benchmark comparatif.</p>

            <div className="brand-chips">
              {brands.map(b => (
                <div key={b} className="brand-chip">
                  <span>{b}</span>
                  <X size={12} onClick={() => removeBrand(b)} />
                </div>
              ))}
            </div>

            <div className="brand-input-row">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={brands.length >= 6 ? 'Maximum 6 marques' : 'Ajouter une marque...'}
                disabled={brands.length >= 6}
              />
              <button onClick={() => addBrand(inputValue)} disabled={brands.length >= 6}>
                <Plus size={16} />
              </button>
            </div>

            <div className="popular-brands">
              <span>{sector ? `Suggestions (${sector}):` : 'Marques populaires:'}</span>
              {(sector && SECTOR_BRANDS[sector] ? SECTOR_BRANDS[sector] : Object.values(SECTOR_BRANDS).flat().slice(0, 12)).map(b => (
                <button
                  key={b}
                  className="popular-chip"
                  onClick={() => addBrand(b)}
                  disabled={brands.includes(b) || brands.length >= 6}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {brands.length >= 2 && (
            <div className="panel-section">
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={isGenerating || brands.length < 2}
              >
                {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'GENERATION...' : 'GENERER BENCHMARK'}
              </button>
            </div>
          )}

          {error && <div className="benchmark-error">{error}</div>}

          {/* Configuration générée */}
          {generated && (
            <div className="panel-section generated-config">
              <h2><Sparkles size={14} /> CONFIGURATION</h2>
              <div className="config-info">
                <span className="config-sector">{generated.sector}</span>
                <span className="config-products">{generated.products?.length || 0} produits</span>
                <span className="config-prompts">{generated.prompts?.length || 0} prompts</span>
              </div>

              {generated.products && (
                <div className="products-list">
                  {generated.products.map(p => (
                    <div key={p.id} className="product-item">
                      <span className="product-name">{p.name}</span>
                      <span className="product-desc">{p.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {generated.prompts && (
                <div className="prompts-preview">
                  <span className="prompts-label">Prompts:</span>
                  <ul>
                    {generated.prompts.slice(0, 3).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                    {generated.prompts.length > 3 && (
                      <li className="more">+{generated.prompts.length - 3} autres...</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                className="btn-launch"
                onClick={handleRunBenchmark}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {isRunning ? 'ANALYSE...' : 'LANCER BENCHMARK'}
              </button>
            </div>
          )}
        </div>

        {/* Panneau droit - Progression et Résultats */}
        <div className="benchmark-results">
          {isRunning && progress && (
            <div className="progress-panel">
              <h2><TrendingUp size={14} /> ANALYSE EN COURS</h2>
              <div className="progress-stats">
                <div className="stat">
                  <span className="stat-label">Phase</span>
                  <span className="stat-value">{progress.phase === 'progress' ? `Prompt ${progress.current}/${progress.total}` : 'Initialisation'}</span>
                </div>
                {progress.phase === 'progress' && (
                  <>
                    <div className="stat">
                      <span className="stat-label">Prompt actuel</span>
                      <span className="stat-value prompt-text">{progress.prompt?.substring(0, 50)}...</span>
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
                  <span className="completed-label">Prompts complétés:</span>
                  {completedPrompts.map((cp, i) => (
                    <div key={i} className="completed-item">
                      <span className="cp-num">{i + 1}</span>
                      <span className="cp-prompt">{cp.prompt?.substring(0, 60)}...</span>
                      {cp.brands_mentioned && (
                        <span className="cp-brands">{cp.brands_mentioned.length} marques</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Résultats */}
          {results && results.ranking && (
            <div className="results-panel">
              <div className="results-header">
                <Trophy size={18} />
                <h2>CLASSEMENT BENCHMARK</h2>
              </div>
              <div className="ranking-list">
                {results.ranking.map((item, idx) => (
                  <div key={item.brand} className={`rank-item rank-${idx + 1}`}>
                    <div className="rank-badge">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div className="rank-brand">{item.brand.toUpperCase()}</div>
                    <div className="rank-score">{item.global_score?.toFixed(1)}</div>
                    <div className="rank-metrics">
                      <span title="Taux de mention">{item.mention_rate?.toFixed(0)}%</span>
                      <span title="Position moyenne">#{item.avg_position?.toFixed(1)}</span>
                      <span title="Share of Voice">{item.share_of_voice?.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="results-actions">
                <button className="btn-secondary" onClick={() => { setGenerated(null); setResults(null); }}>
                  NOUVEAU BENCHMARK
                </button>
                {onComplete && (
                  <button className="btn-primary" onClick={() => onComplete(results)}>
                    VOIR DETAILS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* État initial */}
          {!isRunning && !results && (
            <PanelState
              icon={generated ? WandSparkles : Crosshair}
              title={generated ? 'Configuration benchmark prete' : 'Aucun benchmark lance'}
              description={generated
                ? 'La configuration est generee. Lancez maintenant le benchmark pour produire un classement comparatif.'
                : 'Selectionnez entre 2 et 6 marques pour preparer un benchmark comparatif et suivre les ecarts de visibilite.'
              }
              actions={generated ? (
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
