import React, { useState } from 'react';
import { 
  Bot, Shield, Target, MessageSquare, LineChart, FileText, 
  ChevronRight, Check, Zap, Globe, Sparkles, TrendingUp, AlertCircle, PlayCircle
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage({ onStart }) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const steps = [
    { title: "Saisissez votre marque", desc: "Entrez le nom de votre marque et vos concurrents.", icon: Target },
    { title: "L'IA analyse le web", desc: "Nous interrogeons ChatGPT, Claude, Gemini et Qwen.", icon: Globe },
    { title: "Votre Dashboard", desc: "Découvrez exactement comment les IA parlent de vous.", icon: LineChart }
  ];

  const features = [
    { icon: Shield, title: "Score de Visibilité", desc: "Un score global sur 100 qui synthétise votre présence sur tous les modèles IA." },
    { icon: Bot, title: "Multimodèles Comparés", desc: "Comparez les réponses de ChatGPT, Gemini, Claude et Mistral au même endroit." },
    { icon: MessageSquare, title: "Analyse de Sentiment", desc: "Détectez instantanément si les IA recommandent ou critiquent votre offre." },
    { icon: Target, title: "Share of Voice", desc: "Mesurez la part de voix de votre marque face à vos concurrents directs." },
    { icon: AlertCircle, title: "Alertes Temps Réel", desc: "Soyez notifié quand une IA change sa réponse concernant votre marque." },
    { icon: FileText, title: "Rapports Automatiques", desc: "Générez des rapports PDF prêts pour le Comex en un seul clic." },
  ];

  const faqs = [
    { q: "Quels modèles IA sont analysés ?", a: "Nous interrogeons actuellement GPT-4 (OpenAI), Claude 3 (Anthropic), Gemini 1.5 (Google), et Qwen (Alibaba) pour une vue exhaustive du marché." },
    { q: "Comment le Score de Visibilité est-il calculé ?", a: "Notre algorithme pondère la fréquence de mention, la position dans la liste (Top 1, Top 3) et le score de sentiment pour générer une note sur 100." },
    { q: "Puis-je analyser mes concurrents ?", a: "Absolument. Vous pouvez ajouter jusqu'à 5 concurrents pour comparer vos scores en détail dans notre système de Duel et nos Heatmaps." },
    { q: "Les données sont-elles en temps réel ?", a: "Oui. À chaque analyse, nous envoyons des requêtes fraîches aux LLMs pour capturer exactement ce qu'ils répondent aujourd'hui." }
  ];

  return (
    <div className="landing-wrapper">
      {/* ── Navbar Menu ── */}
      <nav className="lp-nav">
        <div className="lp-logo">
          <div className="lp-logo-icon"><Target size={20} strokeWidth={2.5} /></div>
          <span>GEO Monitor</span>
        </div>
        <div className="lp-nav-links">
          <a href="#problem">Le Problème</a>
          <a href="#how">Comment ça marche</a>
          <a href="#features">Fonctionnalités</a>
          <a href="#pricing">Tarifs</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-login">Connexion</button>
          <button className="lp-btn-primary" onClick={onStart}>Essai Gratuit</button>
        </div>
      </nav>

      {/* ── 1. Hero Section ── */}
      <header className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <Sparkles size={14} />
            <span>La 1ère plateforme de Generative Engine Optimization</span>
          </div>
          <h1>Sachez exactement comment les IA <br/> <span className="text-gradient">perçoivent votre marque</span></h1>
          <p className="lp-hero-subtitle">
            Analysez en temps réel ce que ChatGPT, Gemini, et Claude répondent 
            à vos futurs clients lorsqu'ils cherchent des produits dans votre secteur.
          </p>
          <div className="lp-hero-cta">
            <button className="lp-btn-primary lp-btn-large" onClick={onStart}>
              Analyser ma marque gratuitement <ChevronRight size={18} />
            </button>
            <button className="lp-btn-secondary lp-btn-large">
              <PlayCircle size={18} /> Voir une démo
            </button>
          </div>
          <div className="lp-hero-trust">
            ✦ Analysé conjointement par +3 modèles IA • Rapport complet en 2 minutes
          </div>
        </div>
        
        {/* Abstract Dashboard Mockup Graphic */}
        <div className="lp-hero-mockup">
          <div className="lp-mockup-card m-main">
            <div className="m-header"><div/><div/><div/></div>
            <div className="m-chart"><span style={{height: '40%'}}/><span style={{height: '70%'}}/><span style={{height: '50%'}}/><span style={{height: '90%'}} className="active"/></div>
          </div>
          <div className="lp-mockup-card m-side">
            <div className="m-score">92.4<span>/100</span></div>
            <div className="m-label">Score Global</div>
            <div className="m-delta">+4.2 pts</div>
          </div>
        </div>
        <div className="lp-glow-orb orb-1"></div>
        <div className="lp-glow-orb orb-2"></div>
      </header>

      {/* ── 2. Problem Statement ── */}
      <section id="problem" className="lp-problem">
        <div className="lp-container">
          <h2 className="lp-section-title">En 2026, Google n'est plus le seul juge.</h2>
          <p className="lp-section-desc">Des millions d'utilisateurs demandent chaque jour à l'IA de leur recommander des assurances, des banques, ou des logiciels. <strong>Faites-vous partie de leurs recommandations ?</strong></p>
          
          <div className="lp-stats-grid">
            <div className="lp-stat-card">
              <div className="lp-stat-num">73%</div>
              <div className="lp-stat-text">des consommateurs font confiance aux réponses des IA pour leurs achats.</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-num">1/4</div>
              <div className="lp-stat-text">Seul 1 prospect sur 4 vérifie les sources citées par le LLM.</div>
            </div>
            <div className="lp-stat-card">
              <div className="lp-stat-num">Impact</div>
              <div className="lp-stat-text">Une absence des top mentions IA impacte vos ventes directes de -15%.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section id="how" className="lp-how">
        <div className="lp-container">
          <h2 className="lp-section-title">Comment ça marche ?</h2>
          <div className="lp-steps-container">
            {steps.map((step, i) => (
              <div key={i} className="lp-step">
                <div className="lp-step-icon">
                  <step.icon size={24} />
                  <div className="lp-step-num">{i + 1}</div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
            <div className="lp-step-line"></div>
          </div>
        </div>
      </section>

      {/* ── 4. Features Grid ── */}
      <section id="features" className="lp-features">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2>Tout ce dont vous avez besoin pour le GEO</h2>
            <p>Une suite complète d'outils pour piloter votre stratégie Generative Engine Optimization.</p>
          </div>
          <div className="lp-features-grid">
            {features.map((feat, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feat-icon"><feat.icon size={20} /></div>
                <h4>{feat.title}</h4>
                <p>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Pricing ── */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-container">
          <h2 className="lp-section-title text-center">Des tarifs transparents</h2>
          <div className="lp-billing-toggle">
            <span className={!isAnnual ? 'active' : ''}>Mensuel</span>
            <button className={`lp-toggle-btn ${isAnnual ? 'on' : ''}`} onClick={() => setIsAnnual(!isAnnual)}>
              <div className="lp-toggle-knob"></div>
            </button>
            <span className={isAnnual ? 'active' : ''}>Annuel <span className="lp-discount">-20%</span></span>
          </div>

          <div className="lp-pricing-grid">
            {/* Starter */}
            <div className="lp-price-card">
              <div className="lp-price-header">
                <h3>Starter</h3>
                <div className="lp-price">
                  <span className="lp-currency">€</span>
                  <span className="lp-amount">{isAnnual ? '39' : '49'}</span>
                  <span className="lp-period">/mois</span>
                </div>
                <p>Pour les indép. & startups</p>
              </div>
              <ul className="lp-price-features">
                <li><Check size={16}/> 1 Marque suivie</li>
                <li><Check size={16}/> 3 Modèles IA (GPT-4, Claude, Gemini)</li>
                <li><Check size={16}/> 1 Concurrent inclus</li>
                <li><Check size={16}/> Rapports mensuels</li>
              </ul>
              <button className="lp-btn-secondary lp-price-btn" onClick={onStart}>Démarrer</button>
            </div>

            {/* Pro - Popular */}
            <div className="lp-price-card popular">
              <div className="lp-popular-badge">Le plus populaire</div>
              <div className="lp-price-header">
                <h3>Pro</h3>
                <div className="lp-price">
                  <span className="lp-currency">€</span>
                  <span className="lp-amount">{isAnnual ? '119' : '149'}</span>
                  <span className="lp-period">/mois</span>
                </div>
                <p>Pour les équipes marketing</p>
              </div>
              <ul className="lp-price-features">
                <li><Check size={16}/> 5 Marques suivies</li>
                <li><Check size={16}/> Tous les Modèles (incl. Qwen, Mistral)</li>
                <li><Check size={16}/> 5 Concurrents inclus</li>
                <li><Check size={16}/> Exports PDF / CSV complets</li>
                <li><Check size={16}/> Alertes hebdomadaires</li>
              </ul>
              <button className="lp-btn-primary lp-price-btn" onClick={onStart}>Essai gratuit 14j</button>
            </div>

            {/* Enterprise */}
            <div className="lp-price-card">
              <div className="lp-price-header">
                <h3>Business</h3>
                <div className="lp-price">
                  <span className="lp-currency">€</span>
                  <span className="lp-amount">{isAnnual ? '239' : '299'}</span>
                  <span className="lp-period">/mois</span>
                </div>
                <p>Pour les agences & grands comptes</p>
              </div>
              <ul className="lp-price-features">
                <li><Check size={16}/> 15 Marques suivies</li>
                <li><Check size={16}/> Mots-clés illimités</li>
                <li><Check size={16}/> Intégration API / Slack</li>
                <li><Check size={16}/> Support dédié prioritaire</li>
              </ul>
              <button className="lp-btn-secondary lp-price-btn">Contacter l'équipe</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ ── */}
      <section className="lp-faq">
        <div className="lp-container lp-faq-container">
          <div className="lp-faq-left">
            <h2>Questions fréquentes</h2>
            <p>Tout ce que vous devez savoir sur le GEO et notre plateforme.</p>
          </div>
          <div className="lp-faq-right">
            {faqs.map((faq, i) => (
              <div key={i} className={`lp-faq-item ${activeFaq === i ? 'open' : ''}`} onClick={() => toggleFaq(i)}>
                <div className="lp-faq-q">
                  {faq.q}
                  <ChevronRight size={18} className="lp-faq-icon" />
                </div>
                {activeFaq === i && <div className="lp-faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div className="lp-logo-icon small"><Target size={16} strokeWidth={2.5} /></div>
              <span className="lp-footer-logo">GEO Monitor</span>
              <p>Maitrisez votre image de marque auprès des Intelligences Artificielles.</p>
            </div>
            <div className="lp-footer-links">
              <div className="lp-link-col">
                <h5>Produit</h5>
                <a href="#features">Fonctionnalités</a>
                <a href="#how">Comment ça marche</a>
                <a href="#pricing">Tarifs</a>
                <a href="#">Cas d'usage</a>
              </div>
              <div className="lp-link-col">
                <h5>Ressources</h5>
                <a href="#">Blog</a>
                <a href="#">Le Guide du GEO</a>
                <a href="#">API Documentation</a>
                <a href="#">Centre d'aide</a>
              </div>
              <div className="lp-link-col">
                <h5>Entreprise</h5>
                <a href="#">À propos</a>
                <a href="#">Contact</a>
                <a href="#">Carrières</a>
                <a href="#">Partenaires</a>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>© 2026 GEO Monitor. Tous droits réservés.</p>
            <div className="lp-legal-links">
              <a href="#">Mentions légales</a>
              <a href="#">Confidentialité</a>
              <a href="#">CGV</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
