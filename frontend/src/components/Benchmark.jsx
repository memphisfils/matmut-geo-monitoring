import React, { useState } from 'react';
import { Crosshair, Plus, X, Loader2, Sparkles, Trophy, TrendingUp, Target } from 'lucide-react';
import { createBenchmark, runBenchmarkStream, fetchMetrics } from '../services/api';
import './Benchmark.css';

const POPULAR_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Nike', 'Adidas', 'Tesla', 'Amazon', 'Google',
  'Microsoft', 'Sony', 'LG', 'Huawei', 'OnePlus', 'Oppo', 'Vivo', 'ASUS',
  'Dior', 'Chanel', 'Louis Vuitton', 'Hermès', 'Zara', 'H&M', 'Uniqlo',
  'Coca-Cola', 'Pepsi', 'Nestlé', 'Danone', 'LVMH', 'Kering'
];

export default function Benchmark({ onComplete }) {
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
    } catch (err) {
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
        prompts: generated.seo_prompts,
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
          // Charger les résultats après un délai
          setTimeout(() => loadResults(), 2000);
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
              <span>Populaires:</span>
              {POPULAR_BRANDS.slice(0, 8).map(b => (
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
                <span className="config-prompts">{generated.seo_prompts?.length || 0} prompts</span>
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

              {generated.seo_prompts && (
                <div className="prompts-preview">
                  <span className="prompts-label">Prompts:</span>
                  <ul>
                    {generated.seo_prompts.slice(0, 3).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                    {generated.seo_prompts.length > 3 && (
                      <li className="more">+{generated.seo_prompts.length - 3} autres...</li>
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
            <div className="benchmark-empty">
              <Crosshair size={48} />
              <p>Sélectionnez des marques et lancez le benchmark pour voir les résultats comparatifs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
