import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  Sparkles,
  Target,
  Wand2,
  X
} from 'lucide-react';
import './Onboarding.css';

const SECTORS = [
  'Assurance', 'Banque', 'Sante', 'Tech / SaaS', 'Automobile',
  'Energie', 'Telecoms', 'Distribution', 'Immobilier',
  'Alimentaire', 'Mode', 'Sport', 'Voyage', 'Education', 'Autres'
];

const MODELS = ['ChatGPT', 'Claude', 'Gemini', 'Qwen'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function fallbackConfig(brand, sector) {
  return {
    products: [
      {
        id: 'core',
        name: `Comparatif coeur de marche`,
        description: `Terrain de comparaison principal pour ${sector.toLowerCase()}.`,
        prompts: [
          `Quelles marques dominent le secteur ${sector.toLowerCase()} aujourd hui ?`,
          `Comparatif ${sector.toLowerCase()} : ${brand} vs concurrents du marche`,
          `Quelles alternatives a ${brand} sont les plus credibles en ${sector.toLowerCase()} ?`,
          `Meilleur choix ${sector.toLowerCase()} selon le rapport qualite prix : quelles marques citer ?`
        ]
      },
      {
        id: 'premium',
        name: `Usages experts et premium`,
        description: 'Lecture des cas d usage exigeants et premium.',
        prompts: [
          `Top acteurs premium ${sector.toLowerCase()} : quelles marques sont recommandees ?`,
          `Comparatif qualite de service ${sector.toLowerCase()} : ${brand} face aux autres marques`,
          `Quels acteurs ${sector.toLowerCase()} inspirent le plus confiance pour un besoin exigeant ?`
        ]
      }
    ],
    suggested_competitors: [],
    sector_fr: sector
  };
}

function uniquePrompts(products, selectedProducts) {
  const seen = new Set();
  const prompts = [];

  products
    .filter((product) => selectedProducts.includes(product.id))
    .forEach((product) => {
      (product.prompts || []).forEach((prompt) => {
        const normalized = prompt.trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        prompts.push(normalized);
      });
    });

  return prompts;
}

function normalizePromptLine(value) {
  return (value || '').trim().replace(/\s+/g, ' ');
}

function auditPromptLine(prompt, brand, sector, competitors = []) {
  const normalized = normalizePromptLine(prompt);
  const lower = normalized.toLowerCase();
  const hasBrand = brand ? lower.includes(brand.toLowerCase()) : false;
  const hasSector = sector ? lower.includes(sector.toLowerCase()) : false;
  const hasComparison = /(comparatif|compare|vs|alternative|alternatives| ou )/i.test(normalized);
  const hasQueryTerm = /(quel|quelle|quels|meilleur|top|avis|comparatif|pourquoi|comment)/i.test(normalized);
  const competitorHits = competitors.filter((item) => item && lower.includes(item.toLowerCase()));
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;

  let score = 32;
  if (hasBrand) score += 20;
  if (hasComparison) score += 18;
  if (competitorHits.length > 0) score += Math.min(18, competitorHits.length * 8);
  if (hasSector) score += 8;
  if (hasQueryTerm) score += 8;
  if (wordCount >= 6 && wordCount <= 18) score += 10;
  if (wordCount < 6) score -= 14;
  if (wordCount > 18) score -= 8;

  return {
    normalized,
    score: Math.max(0, Math.min(100, score)),
    hasBrand,
    hasSector,
    hasComparison,
    hasQueryTerm,
    competitorHits
  };
}

function repairPromptLine(prompt, brand, sector, competitors = []) {
  const audit = auditPromptLine(prompt, brand, sector, competitors);
  if (audit.score >= 55) return audit.normalized;

  let next = audit.normalized.replace(/[?!.\s]+$/, '');
  const competitor = audit.competitorHits[0] || competitors[0] || '';

  if (!audit.hasBrand && brand) next = `${next} : ${brand}`;
  if (!audit.hasSector && sector) next = `${next} en ${sector.toLowerCase()}`;
  if (!audit.hasComparison && competitor && brand) next = `Comparatif ${next} vs ${competitor}`;
  else if (!audit.hasComparison) next = `Comparatif ${next}`;
  if (!audit.hasQueryTerm) next = `Quelles marques ressortent : ${next}`;

  return normalizePromptLine(`${next} ?`);
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState('');
  const [sector, setSector] = useState('');
  const [customSector, setCustomSector] = useState('');
  const [generated, setGenerated] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [promptItems, setPromptItems] = useState([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState(MODELS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const effectiveSector = sector === 'Autres' ? customSector.trim() : sector;
  const sectorReady = Boolean(effectiveSector);

  const selectedPromptCount = useMemo(() => {
    if (!generated?.products) return 0;
    return uniquePrompts(generated.products, selectedProducts).length;
  }, [generated, selectedProducts]);

  const promptList = useMemo(() => {
    const cleaned = (promptItems || []).map(normalizePromptLine).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
    return uniquePrompts(generated?.products || [], selectedProducts);
  }, [generated, promptItems, selectedProducts]);
  const launchReadyPrompts = useMemo(() => {
    return promptList.map((prompt) => repairPromptLine(prompt, brand, effectiveSector, competitors));
  }, [promptList, brand, effectiveSector, competitors]);
  const repairedPromptCount = useMemo(() => (
    promptList.filter((prompt, index) => normalizePromptLine(prompt) !== launchReadyPrompts[index]).length
  ), [promptList, launchReadyPrompts]);

  const selectedProductRecords = useMemo(() => {
    return (generated?.products || []).filter((product) => selectedProducts.includes(product.id));
  }, [generated, selectedProducts]);

  const applyGeneratedConfig = (config) => {
    const nextProducts = config.products || [];
    const defaultProducts = nextProducts.map((product) => product.id);
    const defaultPrompts = uniquePrompts(nextProducts, defaultProducts);

    setGenerated(config);
    setSelectedProducts(defaultProducts);
    setCompetitors((config.suggested_competitors || []).slice(0, 5));
    setPromptItems(defaultPrompts);
    setNewPrompt('');
    setStep(2);
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/generate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, sector: effectiveSector })
      });
      const payload = await response.json();

      if (!response.ok || payload.status === 'error') {
        throw new Error(payload.error || 'Generation IA impossible.');
      }

      applyGeneratedConfig(payload.config);
    } catch (error) {
      setErrorMessage(error.message || 'Generation IA impossible.');
    } finally {
      setIsGenerating(false);
    }
  };

  const continueManually = () => {
    setErrorMessage('');
    applyGeneratedConfig(fallbackConfig(brand, effectiveSector));
  };

  const toggleProduct = (productId) => {
    setSelectedProducts((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  };

  const addCompetitor = () => {
    const value = newCompetitor.trim();
    if (!value || competitors.includes(value) || competitors.length >= 5) return;
    setCompetitors((current) => [...current, value]);
    setNewCompetitor('');
  };

  const removeCompetitor = (value) => {
    setCompetitors((current) => current.filter((item) => item !== value));
  };

  const toggleModel = (value) => {
    setSelectedModels((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
  };

  const updatePromptItem = (index, value) => {
    setPromptItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? value : item
    )));
  };

  const removePromptItem = (index) => {
    setPromptItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addPromptItem = () => {
    const value = normalizePromptLine(newPrompt);
    if (!value) return;
    setPromptItems((current) => (
      current.some((item) => normalizePromptLine(item) === value)
        ? current
        : [...current, value]
    ));
    setNewPrompt('');
  };

  const handleLaunch = () => {
    onComplete({
      brand,
      sector: effectiveSector,
      products: selectedProductRecords,
      competitors,
      prompts: launchReadyPrompts,
      models: selectedModels,
      setup_mode: generated?.suggested_competitors?.length ? 'assisted' : 'manual',
      prompt_audit: generated?.prompt_audit || null,
      generation_notes: {
        ...(generated?.generation_notes || {}),
        repaired_before_launch: repairedPromptCount
      }
    });
  };

  const progressWidth = `${((step - 1) / 2) * 100}%`;

  return (
    <div className="onboarding-shell onboarding-shell-compact">
      <section className="onboarding-main onboarding-main-standalone">
          <div className="onboarding-progress">
            <div className="onboarding-header-strip">
              <div className="onboarding-brand">
                <div className="onboarding-brand-mark">
                  <Target size={18} strokeWidth={2.5} />
              </div>
                  <div>
                    <span className="onboarding-brand-name">GEO Arctic</span>
                    <span className="onboarding-brand-meta">Configuration projet</span>
                  </div>
                </div>
          </div>

          <div className="onboarding-progress-track">
            <div className="onboarding-progress-fill" style={{ width: progressWidth }} />
          </div>
          <div className="onboarding-progress-steps">
            {['Contexte', 'Marche', 'Prompts'].map((label, index) => {
              const value = index + 1;
              const state = step === value ? 'current' : step > value ? 'done' : 'idle';
              return (
                <div key={label} className={`progress-step ${state}`}>
                  <div className="progress-step-dot">{step > value ? <Check size={12} /> : value}</div>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="onboarding-panel">
          {step === 1 && (
            <div className="step-panel">
                <div className="step-header">
                  <span className="step-tag">Etape 1</span>
                  <h2>Posez le contexte du projet.</h2>
                  <p>La qualite du benchmark depend d abord du bon perimetre marque et secteur.</p>
                </div>

                <div className="step-grid single">
                  <label className="field-group">
                    <span>Marque suivie</span>
                    <input
                      type="text"
                      value={brand}
                      onChange={(event) => setBrand(event.target.value)}
                      placeholder="Ex: Matmut, Orange, Alan"
                    />
                  </label>

                  <div className="field-group">
                    <span>Secteur principal</span>
                    <div className="sector-grid">
                      {SECTORS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`sector-pill ${sector === item ? 'active' : ''}`}
                          onClick={() => setSector(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    {sector === 'Autres' && (
                      <div className="sector-custom-field">
                        <input
                          type="text"
                          value={customSector}
                          onChange={(event) => setCustomSector(event.target.value)}
                          placeholder="Precisez le secteur analyse"
                        />
                        <small>Utilisez un secteur libre si votre marche n apparait pas dans la selection rapide.</small>
                      </div>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <div className="step-alert">
                    <span>{errorMessage}</span>
                    <button type="button" className="inline-link" onClick={continueManually}>
                      Continuer en manuel
                    </button>
                  </div>
                )}

                <div className="step-actions">
                  <button
                    type="button"
                    className="onboarding-btn-primary"
                    onClick={generateWithAI}
                    disabled={!brand.trim() || !sectorReady || isGenerating}
                  >
                    {isGenerating ? <Loader2 size={18} className="spin" /> : <Wand2 size={18} />}
                    {isGenerating ? 'Generation...' : 'Generer la configuration'}
                  </button>
                  <button
                    type="button"
                    className="onboarding-btn-secondary"
                    onClick={continueManually}
                    disabled={!brand.trim() || !sectorReady || isGenerating}
                  >
                    Continuer en manuel
                  </button>
                </div>
            </div>
          )}

          {step === 2 && generated && (
            <div className="step-panel">
                <div className="step-header">
                  <span className="step-tag">Etape 2</span>
                  <h2>Selectionnez les offres et le benchmark.</h2>
                  <p>Gardez uniquement les produits et concurrents utiles pour le premier run.</p>
                </div>

                <div className="step-grid dual">
                  <div className="selection-panel">
                    <div className="panel-head">
                      <strong>Produits suivis</strong>
                      <span>{selectedProducts.length} selectionnes</span>
                    </div>

                    <div className="product-list">
                      {generated.products?.map((product) => {
                        const active = selectedProducts.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            className={`product-choice ${active ? 'active' : ''}`}
                            onClick={() => toggleProduct(product.id)}
                          >
                            <div className="product-choice-mark">
                              {active ? <Check size={14} /> : null}
                            </div>
                            <div className="product-choice-copy">
                              <strong>{product.name}</strong>
                              <span>{product.description}</span>
                            </div>
                            <small>{product.prompts?.length || 0} prompts</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="selection-panel">
                    <div className="panel-head">
                      <strong>Concurrents</strong>
                      <span>{competitors.length}/5</span>
                    </div>

                    <div className="competitor-list">
                      {competitors.length === 0 && (
                        <div className="empty-inline">
                          Aucun concurrent pour l instant. Vous pouvez lancer un run solo, mais le benchmark sera limite.
                        </div>
                      )}

                      {competitors.map((competitor) => (
                        <div key={competitor} className="competitor-chip">
                          <span>{competitor}</span>
                          <button type="button" onClick={() => removeCompetitor(competitor)}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="competitor-adder">
                      <input
                        type="text"
                        value={newCompetitor}
                        onChange={(event) => setNewCompetitor(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && addCompetitor()}
                        placeholder="Ajouter un concurrent"
                      />
                      <button type="button" onClick={addCompetitor} disabled={competitors.length >= 5}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="step-summary-strip">
                  <span>{selectedProductRecords.length} offres actives</span>
                  <span>{selectedPromptCount} prompts prepares</span>
                  <span>{competitors.length || 0} concurrents compares</span>
                </div>

                <div className="step-actions split">
                  <button type="button" className="onboarding-btn-secondary" onClick={() => setStep(1)}>
                    <ChevronLeft size={18} />
                    Retour
                  </button>
                  <button
                    type="button"
                    className="onboarding-btn-primary"
                    onClick={() => {
                      setPromptItems(uniquePrompts(generated.products || [], selectedProducts));
                      setStep(3);
                    }}
                    disabled={selectedProducts.length === 0}
                  >
                    Continuer
                    <ArrowRight size={18} />
                  </button>
                </div>
            </div>
          )}

          {step === 3 && generated && (
            <div className="step-panel">
                <div className="step-header">
                  <span className="step-tag">Etape 3</span>
                  <h2>Validez le pack de prompts du run.</h2>
                  <p>Supprimez, ajustez ou ajoutez des prompts avant lancement. Cette liste est le vrai coeur du benchmark.</p>
                </div>

                <div className="step-grid prompts">
                  <div className="selection-panel">
                    <div className="panel-head">
                      <strong>Prompts generes</strong>
                      <span>{promptList.length} actifs</span>
                    </div>

                    <div className="prompt-list-editor">
                      {promptItems.map((prompt, index) => {
                        const repaired = repairPromptLine(prompt, brand, effectiveSector, competitors);
                        const changed = normalizePromptLine(prompt) !== repaired;
                        return (
                          <div key={`${index}-${prompt.slice(0, 24)}`} className="prompt-list-row">
                            <div className="prompt-list-index">{index + 1}</div>
                            <div className="prompt-list-copy">
                              <input
                                type="text"
                                value={prompt}
                                onChange={(event) => updatePromptItem(index, event.target.value)}
                                placeholder="Saisir un prompt"
                              />
                              <div className="prompt-row-meta">
                                <span>{changed ? 'Ajustement neutre au lancement' : 'Pret pour le run'}</span>
                                {changed ? <code>{repaired}</code> : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="prompt-row-remove"
                              onClick={() => removePromptItem(index)}
                              aria-label={`Supprimer le prompt ${index + 1}`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="prompt-add-row">
                      <input
                        type="text"
                        value={newPrompt}
                        onChange={(event) => setNewPrompt(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && addPromptItem()}
                        placeholder="Ajouter un prompt specifique"
                      />
                      <button type="button" className="prompt-add-button" onClick={addPromptItem}>
                        <Plus size={16} />
                        Ajouter
                      </button>
                    </div>

                    <div className="prompt-helper">
                      La plateforme doit comparer un terrain commun. Evitez les formulations trop centrees sur une seule marque.
                    </div>
                    {repairedPromptCount > 0 && (
                      <div className="prompt-helper emphasis">
                        {repairedPromptCount} prompt{repairedPromptCount > 1 ? 's seront' : ' sera'} reajuste{repairedPromptCount > 1 ? 's' : ''} au lancement pour garder une formulation comparative et non promotionnelle.
                      </div>
                    )}
                  </div>

                  <div className="selection-panel">
                    <div className="panel-head">
                      <strong>Modeles visibles</strong>
                      <span>{selectedModels.length} selectionnes</span>
                    </div>

                    <div className="model-grid">
                      {MODELS.map((model) => (
                        <button
                          key={model}
                          type="button"
                          className={`model-pill ${selectedModels.includes(model) ? 'active' : ''}`}
                          onClick={() => toggleModel(model)}
                        >
                          {model}
                        </button>
                      ))}
                    </div>

                    <div className="launch-summary">
                      <div>
                        <span>Marque</span>
                        <strong>{brand}</strong>
                      </div>
                      <div>
                        <span>Secteur</span>
                        <strong>{effectiveSector}</strong>
                      </div>
                      <div>
                        <span>Benchmark</span>
                        <strong>{competitors.length > 0 ? `${competitors.length} concurrents` : 'Run solo'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="step-actions split">
                  <button type="button" className="onboarding-btn-secondary" onClick={() => setStep(2)}>
                    <ChevronLeft size={18} />
                    Retour
                  </button>
                  <button
                    type="button"
                    className="onboarding-btn-primary"
                    onClick={handleLaunch}
                    disabled={promptList.length === 0 || selectedModels.length === 0}
                  >
                    <Sparkles size={18} />
                    Lancer l analyse GEO
                  </button>
                </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
