import React, { useState } from 'react';
import { Search, ChevronRight, ChevronLeft, Plus, X, Check, Sparkles, Loader2, Target, Globe, Server, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Onboarding.css';

const SECTORS = [
  'Assurance', 'Banque', 'Santé', 'Tech / SaaS', 'Automobile',
  'Énergie', 'Télécoms', 'Distribution', 'Immobilier',
  'Alimentaire', 'Mode', 'Sport', 'Voyage', 'Éducation'
];

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
  const [errorMessage, setErrorMessage] = useState('');

  const generateWithAI = async () => {
    setIsGenerating(true); setErrorMessage('');
    try {
      const response = await fetch(`${API_URL}/generate-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, sector })
      });
      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        setErrorMessage(data.error || 'Génération IA impossible. Continuez manuellement.');
        return;
      }
      setGenerated(data.config);
      setSelectedProducts(data.config.products.map(p => p.id));
      setCompetitors(data.config.suggested_competitors.slice(0, 4));
      setStep(2);
    } catch (err) {
      setErrorMessage('Connexion au backend impossible. Serveur actif ?');
    } finally {
      setIsGenerating(false);
    }
  };

  const manualFallback = () => {
    setGenerated({
      products: [
        { id: 'p1', name: `${brand} Standard`, description: 'Offre principale', prompts: [`Meilleur ${sector}`, `Comparatif ${sector}`] },
        { id: 'p2', name: `${brand} Premium`, description: 'Offre haut de gamme', prompts: [`Top ${sector}`, `Meilleur ${sector}`] },
      ],
      suggested_competitors: [], sector_fr: sector
    });
    setSelectedProducts(['p1', 'p2']);
    setCompetitors([]); setErrorMessage(''); setStep(2);
  };

  const toggleProduct = (id) => setSelectedProducts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const addCompetitor = () => {
    if (newCompetitor.trim() && !competitors.includes(newCompetitor.trim())) {
      setCompetitors(p => [...p, newCompetitor.trim()]); setNewCompetitor('');
    }
  };
  const removeCompetitor = (name) => setCompetitors(p => p.filter(c => c !== name));
  const handleLaunch = () => onComplete({ brand, sector, products: generated.products.filter(p => selectedProducts.includes(p.id)), competitors, prompts: generated.products.filter(p => selectedProducts.includes(p.id)).flatMap(p => p.prompts) });

  const pageVariants = { initial: { opacity: 0, x: 20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -20 } };

  return (
    <div className="onboarding-wrapper">
      {/* LEFT PANEL: Branding & Graphic */}
      <div className="onboarding-left">
        <div className="obl-content">
          <div className="obl-logo">
            <div className="obl-icon"><Target size={24} strokeWidth={2.5}/></div>
            <span>GEO Monitor</span>
          </div>
          <div className="obl-text">
            <h1>Prenez le contrôle de votre <span>image IA</span></h1>
            <p>Analysez exactement comment ChatGPT, Claude, Gemini et Qwen perçoivent et recommandent votre marque.</p>
          </div>
          
          <div className="obl-graphic">
            {/* Animated decorative nodes */}
            <div className={`node node-1 ${step >= 1 ? 'active' : ''}`}><User size={20}/></div>
            <div className={`node node-2 ${step >= 2 ? 'active' : ''}`}><Server size={20}/></div>
            <div className={`node node-3 ${step >= 3 ? 'active' : ''}`}><Globe size={20}/></div>
            <svg className="obl-lines" viewBox="0 0 200 200">
              <path d="M 50 150 Q 100 50 150 150" fill="none" className={`path ${step >= 2 ? 'active' : ''}`} />
            </svg>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Wizard Form */}
      <div className="onboarding-right">
        <div className="wizard-container">
          
          {/* Progress Tracker */}
          <div className="wizard-progress">
            {[1,2,3].map(num => (
              <div key={num} className={`w-step ${step === num ? 'current' : step > num ? 'done' : ''}`}>
                <div className="w-dot">{step > num ? <Check size={12}/> : num}</div>
                <div className="w-label">{num === 1 ? 'Marque' : num === 2 ? 'Configuration' : 'Lancement'}</div>
              </div>
            ))}
            <div className="w-line"><div className="w-line-fill" style={{width: `${(step-1)*50}%`}}/></div>
          </div>

          <div className="wizard-body">
            <AnimatePresence mode="wait">
              {/* STEP 1 */}
              {step === 1 && (
                <motion.div key="s1" initial="initial" animate="in" exit="out" variants={pageVariants} transition={{duration: 0.3}} className="step-pane">
                  <h2>Votre projet</h2>
                  <p className="step-subtitle">Définissez la marque et le secteur pour initialiser l'IA.</p>

                  <div className="form-group p-top">
                    <label>Nom de la Marque</label>
                    <div className="input-modern">
                      <Search size={18} />
                      <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="EX: ORANGE, ALAN..." onKeyDown={e => e.key === 'Enter' && brand && sector && generateWithAI()}/>
                    </div>
                  </div>

                  <div className="form-group p-top">
                    <label>Secteur d'activité</label>
                    <div className="sector-chips">
                      {SECTORS.map(s => (
                        <button key={s} className={`chip ${sector === s ? 'active' : ''}`} onClick={() => setSector(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="error-banner">
                      <div className="err-text">{errorMessage}</div>
                      <button className="btn-text" onClick={manualFallback}>Mode manuel</button>
                    </div>
                  )}

                  <div className="wizard-actions right">
                    <button className="btn-primary large" onClick={generateWithAI} disabled={!brand.trim() || !sector || isGenerating}>
                      {isGenerating ? <><Loader2 size={18} className="spin" /> Analyse...</> : <><Sparkles size={18} /> Générer via IA</>}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 2 && generated && (
                <motion.div key="s2" initial="initial" animate="in" exit="out" variants={pageVariants} transition={{duration: 0.3}} className="step-pane">
                  <h2>Affinage IA</h2>
                  <p className="step-subtitle">Nous avons pré-configuré ces éléments. Ajustez si nécessaire.</p>

                  <div className="split-form">
                    <div className="form-section">
                      <h3>Produits cibles ({selectedProducts.length})</h3>
                      <div className="item-list">
                        {generated.products.map(p => (
                          <div key={p.id} className={`sel-item ${selectedProducts.includes(p.id) ? 'checked' : ''}`} onClick={() => toggleProduct(p.id)}>
                            <div className="checkbox">{selectedProducts.includes(p.id) && <Check size={12}/>}</div>
                            <div className="text">
                              <h4>{p.name}</h4><span>{p.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Concurrents ({competitors.length}/5)</h3>
                      <div className="comp-list">
                        {competitors.map(c => (
                          <div key={c} className="comp-tag"><span>{c}</span><X size={14} onClick={() => removeCompetitor(c)}/></div>
                        ))}
                      </div>
                      {competitors.length < 5 && (
                        <div className="comp-adder">
                          <input type="text" value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompetitor()} placeholder="Ajouter un concurrent..."/>
                          <button onClick={addCompetitor}><Plus size={16}/></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="wizard-actions space">
                    <button className="btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={18}/> Retour</button>
                    <button className="btn-primary" onClick={() => setStep(3)} disabled={selectedProducts.length === 0 || competitors.length === 0}>Continuer <ChevronRight size={18}/></button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 3 && generated && (
                <motion.div key="s3" initial="initial" animate="in" exit="out" variants={pageVariants} transition={{duration: 0.3}} className="step-pane">
                  <h2>Prêt au lancement</h2>
                  <p className="step-subtitle">L'IA va maintenant interroger les LLMs avec cette configuration.</p>

                  <div className="summary-cards">
                    <div className="sum-card">
                      <div className="s-label">Marque</div>
                      <div className="s-val text-gradient">{brand}</div>
                    </div>
                    <div className="sum-card">
                      <div className="s-label">Prompts générés</div>
                      <div className="s-val text-gradient">{generated.products.filter(p => selectedProducts.includes(p.id)).flatMap(p => p.prompts).length}</div>
                    </div>
                  </div>

                  <div className="env-details">
                    <div className="ed-row"><Globe size={16}/> <span>Modèles ciblés : GPT-4, Claude 3.5, Gemini 1.5, Qwen</span></div>
                    <div className="ed-row"><Server size={16}/> <span>Environnement : Production API</span></div>
                  </div>

                  <div className="wizard-actions space extra-mt">
                    <button className="btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={18}/> Retour</button>
                    <button className="btn-primary glow" onClick={handleLaunch}><Sparkles size={18}/> Lancer l'Analyse GEO</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
