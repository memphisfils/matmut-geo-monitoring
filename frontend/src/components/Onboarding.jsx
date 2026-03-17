import React, { useState } from 'react';
import { Search, ChevronRight, Plus, X, Check, Sparkles, Loader2, Target } from 'lucide-react';
import './Onboarding.css';

const SECTORS = [
  'Assurance', 'Banque', 'Santé', 'Énergie', 'Télécoms',
  'Automobile', 'Distribution', 'Immobilier', 'Tech / SaaS', 'Autre'
];

// URL API dynamique
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState('');
  const [sector, setSector] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [newCompetitor, setNewCompetitor] = useState('');

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      // Appel à notre backend qui utilise Ollama Cloud
      const response = await fetch(`${API_URL}/generate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand,
          sector: sector
        })
      });

      if (!response.ok) throw new Error('API call failed');
      const data = await response.json();
      const parsed = data.config;
      setGenerated(parsed);
      setSelectedProducts(parsed.products.map(p => p.id));
      setCompetitors(parsed.suggested_competitors.slice(0, 4));
      setStep(2);
    } catch (err) {
      console.error(err);
      // Fallback en cas d'erreur
      const demo = getDemoData(brand, sector);
      setGenerated(demo);
      setSelectedProducts(demo.products.map(p => p.id));
      setCompetitors(demo.suggested_competitors.slice(0, 4));
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const getDemoData = (brand, sector) => ({
    products: [
      { id: 'p1', name: `${brand} Base`, description: 'Offre Essentielle', prompts: [`Meilleur ${sector} pas cher`, `Comparatif ${sector} basique`] },
      { id: 'p2', name: `${brand} Max`, description: 'Offre Premium', prompts: [`Top ${sector} haut de gamme`, `Meilleure assurance ${sector}`] },
      { id: 'p3', name: `${brand} Pro`, description: 'Offre Pro', prompts: [`${sector} pour entreprise`, `Comparatif pro ${sector}`] },
    ],
    suggested_competitors: ['CONCURRENT A', 'CONCURRENT B', 'CONCURRENT C', 'CONCURRENT D', 'CONCURRENT E'],
    sector_fr: sector
  });

  const toggleProduct = (id) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !competitors.includes(newCompetitor.trim())) {
      setCompetitors(prev => [...prev, newCompetitor.trim()]);
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (name) => {
    setCompetitors(prev => prev.filter(c => c !== name));
  };

  const handleLaunch = () => {
    const selectedProds = generated.products.filter(p => selectedProducts.includes(p.id));
    const allPrompts = selectedProds.flatMap(p => p.prompts);
    onComplete({ brand, sector, products: selectedProds, competitors, prompts: allPrompts });
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-header">
        <Target size={24} className="header-icon" />
        <h1>GEO MONITOR</h1>
      </div>

      <div className="onboarding-container">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>01</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>02</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>03</div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="step-content">
            <h2>NOUVEAU PROJET</h2>
            <p className="subtitle">Définissez la marque et le secteur à analyser.</p>
            
            <div className="form-group">
              <label>MARQUE</label>
              <div className="input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="EX: ORANGE, BNP..."
                  onKeyDown={e => e.key === 'Enter' && brand && sector && generateWithAI()}
                />
              </div>
            </div>

            <div className="form-group">
              <label>SECTEUR</label>
              <div className="sector-grid">
                {SECTORS.map(s => (
                  <button
                    key={s}
                    className={`sector-chip ${sector === s ? 'active' : ''}`}
                    onClick={() => setSector(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={generateWithAI}
              disabled={!brand.trim() || !sector || isGenerating}
            >
              {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {isGenerating ? 'GENERATION...' : 'ANALYSER AVEC IA'}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && generated && (
          <div className="step-content">
            <h2>CONFIGURATION</h2>
            
            <div className="config-grid">
              <div className="config-section">
                <h3>PRODUITS</h3>
                <div className="product-list">
                  {generated.products.map(p => (
                    <div
                      key={p.id}
                      className={`product-item ${selectedProducts.includes(p.id) ? 'selected' : ''}`}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <div className="checkbox">
                        {selectedProducts.includes(p.id) && <Check size={12} />}
                      </div>
                      <div>
                        <div className="product-name">{p.name}</div>
                        <div className="product-desc">{p.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="config-section">
                <h3>CONCURRENTS</h3>
                <div className="competitors-list">
                  {competitors.map(c => (
                    <div key={c} className="competitor-tag">
                      <span>{c}</span>
                      <X size={12} onClick={() => removeCompetitor(c)} />
                    </div>
                  ))}
                </div>
                <div className="add-competitor">
                  <input
                    type="text"
                    value={newCompetitor}
                    onChange={e => setNewCompetitor(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCompetitor()}
                    placeholder="AJOUTER..."
                  />
                  <button onClick={addCompetitor}><Plus size={16} /></button>
                </div>
              </div>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>RETOUR</button>
              <button className="btn-primary" onClick={() => setStep(3)}>
                CONFIRMER <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && generated && (
          <div className="step-content">
            <h2>RÉSUMÉ</h2>
            
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">MARQUE</span>
                <span className="value">{brand}</span>
              </div>
              <div className="summary-item">
                <span className="label">PRODUITS</span>
                <span className="value">{selectedProducts.length}</span>
              </div>
              <div className="summary-item">
                <span className="label">CONCURRENTS</span>
                <span className="value">{competitors.length}</span>
              </div>
              <div className="summary-item">
                <span className="label">PROMPTS</span>
                <span className="value">
                  {generated.products.filter(p => selectedProducts.includes(p.id)).flatMap(p => p.prompts).length}
                </span>
              </div>
            </div>

            <div className="llms-info">
              <span>LLMS: OLLAMA CLOUD (NEMOTRON-3-SUPER)</span>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>RETOUR</button>
              <button className="btn-primary btn-launch" onClick={handleLaunch}>
                LANCER L'ANALYSE <Sparkles size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
