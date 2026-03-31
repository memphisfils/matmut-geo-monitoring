import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BellRing,
  Bot,
  ChevronRight,
  Compass,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target
} from 'lucide-react';
import './LandingPage.css';

const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionP = motion.p;

const metricItems = [
  {
    title: 'Presence IA',
    text: 'Mesurez si votre marque apparait reellement dans les reponses des grands modeles.'
  },
  {
    title: 'Rang concurrentiel',
    text: 'Suivez votre position face aux autres marques sur les memes requetes.'
  },
  {
    title: 'Prompts decisifs',
    text: 'Identifiez les questions qui vous font gagner ou perdre en visibilite.'
  }
];

const workflowItems = [
  {
    icon: Compass,
    title: 'Connectez votre espace',
    text: 'Retrouvez vos projets, vos analyses et votre historique dans un seul cockpit.'
  },
  {
    icon: Target,
    title: 'Choisissez vos marques',
    text: 'Suivez votre marque principale, vos concurrents et vos benchmarks actifs.'
  },
  {
    icon: LineChart,
    title: 'Suivez l evolution',
    text: 'Surveillez les tendances, les ecarts et les changements de perception dans le temps.'
  }
];

const proofItems = [
  {
    icon: Bot,
    label: 'Modeles suivis',
    value: 'ChatGPT, Claude, Gemini, Qwen'
  },
  {
    icon: ShieldCheck,
    label: 'Lecture utile',
    value: 'Score, rang, ecart, requetes, alertes'
  },
  {
    icon: BellRing,
    label: 'Actionnable',
    value: 'Pilotage par marque, projet et benchmark'
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }
  })
};

export default function LandingPage({ onStart, onLogin, onDemo }) {
  return (
    <div className="landing-shell">
      <div className="landing-aurora landing-aurora-a" />
      <div className="landing-aurora landing-aurora-b" />

      <header className="landing-nav">
        <div className="landing-brand">
          <div className="landing-brand-mark">
            <Target size={18} strokeWidth={2.4} />
          </div>
          <div>
            <span className="landing-brand-name">GEO Arctic</span>
            <span className="landing-brand-meta">Visibility Intelligence</span>
          </div>
        </div>

        <nav className="landing-links">
          <a href="#measure">Mesure</a>
          <a href="#workflow">Workflow</a>
          <a href="#final-cta">Acces</a>
        </nav>

        <div className="landing-actions">
          <button className="landing-button ghost" onClick={onLogin}>
            Connexion
          </button>
          <button className="landing-button primary" onClick={onStart}>
            Commencer l analyse
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <MotionDiv className="landing-eyebrow" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Sparkles size={14} />
              <span>Arctic Professional Interface</span>
            </MotionDiv>

            <MotionH1 className="landing-title" initial="hidden" animate="visible" variants={fadeUp} custom={0.08}>
              Pilotez votre visibilite dans les reponses IA.
            </MotionH1>

            <MotionP className="landing-subtitle" initial="hidden" animate="visible" variants={fadeUp} custom={0.16}>
              Suivez votre presence, votre rang et vos ecarts face aux autres marques sur ChatGPT,
              Claude, Gemini et Qwen.
            </MotionP>

            <MotionDiv className="landing-cta-row" initial="hidden" animate="visible" variants={fadeUp} custom={0.24}>
              <button className="landing-button primary large" onClick={onStart}>
                Commencer l analyse
                <ArrowRight size={18} />
              </button>
              <button className="landing-button secondary large" onClick={onDemo}>
                Voir une demo
              </button>
            </MotionDiv>

            <MotionDiv className="landing-trust" initial="hidden" animate="visible" variants={fadeUp} custom={0.32}>
              <span>Mesure, comparaison, tendances et alertes sur vos marques.</span>
            </MotionDiv>
          </div>

          <MotionDiv
            className="landing-hero-visual"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="landing-hero-image" aria-hidden="true">
              <div className="landing-hero-image-copy">
                <span>Signal froid, lecture nette</span>
                <strong>Un premier ecran plus editorial, puis une surface produit plus utile.</strong>
              </div>
            </div>

            <div className="hero-panel hero-panel-main">
              <div className="hero-panel-top">
                <span className="hero-panel-label">Vue d ensemble</span>
                <span className="hero-panel-chip">Live</span>
              </div>

              <div className="hero-score-line">
                <div>
                  <p className="hero-kpi-label">Score global</p>
                  <div className="hero-kpi-value">92.4</div>
                </div>
                <div className="hero-score-delta">+4.8 ce mois</div>
              </div>

              <div className="hero-chart">
                <span style={{ height: '28%' }} />
                <span style={{ height: '42%' }} />
                <span style={{ height: '54%' }} />
                <span style={{ height: '73%' }} />
                <span style={{ height: '88%' }} className="active" />
                <span style={{ height: '64%' }} />
              </div>

              <div className="hero-grid">
                <article>
                  <span>Marque</span>
                  <strong>#1 en presence</strong>
                </article>
                <article>
                  <span>Prompt leader</span>
                  <strong>Comparatif secteur</strong>
                </article>
                <article>
                  <span>Tendance 30j</span>
                  <strong>Hausse stable</strong>
                </article>
                <article>
                  <span>Alerte active</span>
                  <strong>Aucune derive</strong>
                </article>
              </div>
            </div>

            <div className="hero-panel hero-panel-side">
              <span className="hero-panel-label">Cockpit GEO</span>
              <ul>
                <li>Prompts critiques detectes</li>
                <li>Ecarts concurrents visibles</li>
                <li>Historique par projet</li>
              </ul>
            </div>
          </MotionDiv>
        </section>

        <section className="landing-proof">
          {proofItems.map((item) => (
            <article key={item.label} className="landing-proof-item">
              <item.icon size={18} />
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </article>
          ))}
        </section>

        <section id="measure" className="landing-section landing-measure">
          <div className="landing-section-head">
            <span className="landing-section-tag">Ce que vous suivez vraiment</span>
            <h2>Un cockpit simple pour lire ce que les IA disent de votre marche.</h2>
            <p>
              La plateforme ne se limite pas a un score. Elle vous montre ou vous etes cites,
              comment vous evoluez et sur quelles requetes votre position change.
            </p>
          </div>

          <div className="landing-measure-grid">
            {metricItems.map((item) => (
              <article key={item.title} className="landing-measure-item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="landing-section landing-workflow">
          <div className="landing-section-head compact">
            <span className="landing-section-tag">Workflow</span>
            <h2>Un parcours court, puis une lecture operative.</h2>
          </div>

          <div className="landing-workflow-list">
            {workflowItems.map((item, index) => (
              <article key={item.title} className="landing-workflow-item">
                <div className="landing-workflow-index">0{index + 1}</div>
                <div className="landing-workflow-icon">
                  <item.icon size={20} />
                </div>
                <div className="landing-workflow-copy">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <ChevronRight size={18} className="landing-workflow-arrow" />
              </article>
            ))}
          </div>
        </section>

        <section id="final-cta" className="landing-final">
          <div className="landing-final-copy">
            <span className="landing-section-tag">Passez a votre cockpit GEO</span>
            <h2>Accedez a vos projets, votre historique et vos comparaisons en un seul espace.</h2>
            <p>
              Commencez par vous connecter. Le tableau de bord utilisateur et la session persistante
              prennent ensuite le relais.
            </p>
          </div>

          <div className="landing-final-actions">
            <button className="landing-button primary large" onClick={onLogin}>
              Se connecter
            </button>
            <button className="landing-button secondary large" onClick={onStart}>
              Creer un compte
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
