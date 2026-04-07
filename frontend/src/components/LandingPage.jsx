import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Compass, LineChart, Radar, Sparkles, Target } from 'lucide-react';
import MetricTape from './MetricTape';
import './LandingPage.css';

const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionP = motion.p;

const tapeItems = [
  { label: 'Presence IA', value: 92.4, decimals: 1, change: 4.8, changeSuffix: ' pts' },
  { label: 'Share of voice', value: 38.6, decimals: 1, suffix: '%', change: 2.4, changeSuffix: ' pts' },
  { label: 'Prompt leader', value: 14, meta: 'comparatif' },
  { label: 'Modeles', value: 4, meta: 'ChatGPT, Claude, Gemini, Qwen' },
  { label: 'Alerte', value: 0, meta: 'aucune derive' }
];

const supportItems = [
  {
    index: '01',
    title: 'Mesure utile',
    text: 'Lisez score, rang, taux de mention et pression concurrente dans la meme surface.'
  },
  {
    index: '02',
    title: 'Preuve par prompt',
    text: 'Retrouvez les requetes qui vous font gagner, stagner ou disparaitre dans les reponses IA.'
  },
  {
    index: '03',
    title: 'Suivi en continu',
    text: 'Gardez un historique vivant par projet, avec alertes et comparaison inter-modeles.'
  }
];

const workflowItems = [
  {
    icon: Compass,
    title: 'Cadrez la marque',
    text: 'Marque, secteur, concurrents et prompts sont prepares dans un onboarding plus court.'
  },
  {
    icon: Radar,
    title: 'Lancez le run',
    text: 'Le moteur execute les prompts, compare les modeles et consolide les signaux utiles.'
  },
  {
    icon: LineChart,
    title: 'Suivez les variations',
    text: 'Le dashboard remonte les changements de score, rang et divergence sans noyer la lecture.'
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }
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
            <span className="landing-brand-meta">Visibility intelligence</span>
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
            Commencer
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <MotionDiv className="landing-eyebrow" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
              <Sparkles size={14} />
              <span>Arctic trading surface</span>
            </MotionDiv>

            <MotionH1 className="landing-title" initial="hidden" animate="visible" variants={fadeUp} custom={0.08}>
              Pilotez votre visibilite dans les reponses IA.
            </MotionH1>

            <MotionP className="landing-subtitle" initial="hidden" animate="visible" variants={fadeUp} custom={0.16}>
              Une lecture nette de votre presence, de votre rang et des changements qui comptent,
              sur ChatGPT, Claude, Gemini et Qwen.
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

            <MotionP className="landing-trust" initial="hidden" animate="visible" variants={fadeUp} custom={0.32}>
              Mesure, comparaison, tendances et alertes sans surcharge visuelle.
            </MotionP>
          </div>

          <MotionDiv
            className="landing-hero-visual"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="landing-screen">
              <div className="landing-screen-image" aria-hidden="true" />

              <div className="landing-screen-top">
                <span>Live workspace</span>
                <span className="landing-screen-chip">4 modeles actifs</span>
              </div>

              <div className="landing-screen-score">
                <div>
                  <span>Score actif</span>
                  <strong>92.4</strong>
                </div>
                <em>+4.8 pts ce mois</em>
              </div>

              <div className="landing-screen-chart" aria-hidden="true">
                <span style={{ height: '28%' }} />
                <span style={{ height: '38%' }} />
                <span style={{ height: '52%' }} />
                <span style={{ height: '61%' }} />
                <span style={{ height: '78%' }} />
                <span style={{ height: '88%' }} className="active" />
                <span style={{ height: '70%' }} />
              </div>

              <div className="landing-screen-footer">
                <div>
                  <span>Rang</span>
                  <strong>#1</strong>
                </div>
                <div>
                  <span>Prompt leader</span>
                  <strong>Comparatif</strong>
                </div>
                <div>
                  <span>Alertes</span>
                  <strong>0 active</strong>
                </div>
              </div>
            </div>
          </MotionDiv>
        </section>

        <MetricTape items={tapeItems} />

        <section id="measure" className="landing-section">
          <div className="landing-section-head">
            <span className="landing-section-tag">Mesure</span>
            <h2>Un premier ecran clair, puis un cockpit qui reste operable.</h2>
            <p>
              La plateforme affiche d abord les changements, puis les preuves et enfin les details.
              L ordre de lecture reste stable, meme quand les donnees bougent.
            </p>
          </div>

          <div className="landing-support-list">
            {supportItems.map((item) => (
              <article key={item.title} className="landing-support-item">
                <span className="landing-support-index">{item.index}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="landing-section landing-flow">
          <div className="landing-section-head compact">
            <span className="landing-section-tag">Workflow</span>
            <h2>Un parcours court, puis une lecture continue.</h2>
          </div>

          <div className="landing-flow-list">
            {workflowItems.map((item) => (
              <article key={item.title} className="landing-flow-item">
                <div className="landing-flow-icon">
                  <item.icon size={18} />
                </div>
                <div className="landing-flow-copy">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <ChevronRight size={18} className="landing-flow-arrow" />
              </article>
            ))}
          </div>
        </section>

        <section id="final-cta" className="landing-final">
          <div className="landing-final-copy">
            <span className="landing-section-tag">Acces</span>
            <h2>Entrez dans votre workspace et reprenez vos projets sans friction.</h2>
            <p>Connexion courte, session restauree et dashboard pret a suivre les variations.</p>
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
