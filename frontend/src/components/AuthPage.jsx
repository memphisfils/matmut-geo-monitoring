import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import './AuthPage.css';

const MotionSection = motion.section;
let googleIdentityScriptPromise = null;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-identity="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google script load failed')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client?hl=fr';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Google script load failed'));
      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
}

const valueItems = [
  {
    title: 'Session persistante',
    text: 'Retrouvez directement votre dashboard, vos projets et vos analyses recentes.'
  },
  {
    title: 'Connexion centralisee',
    text: 'Formulaire classique pour le produit, Google pour un acces rapide.'
  },
  {
    title: 'Suivi multi-marques',
    text: 'Comparez votre marque, vos concurrents et l evolution des reponses IA.'
  }
];

export default function AuthPage({
  onBack,
  onContinue,
  onGoogle,
  googleClientId = '',
  isSubmitting = false,
  errorMessage = ''
}) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const googleButtonRef = useRef(null);

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onContinue?.({
      mode,
      fullName: form.fullName,
      email: form.email,
      password: form.password
    });
  };

  useEffect(() => {
    let cancelled = false;

    if (!googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    loadGoogleIdentityScript()
      .then((google) => {
        if (cancelled || !google?.accounts?.id || !googleButtonRef.current) return;

        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response?.credential) {
              onGoogle?.(response.credential);
            }
          }
        });

        googleButtonRef.current.innerHTML = '';
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 360,
          locale: 'fr'
        });

      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [googleClientId, onGoogle]);

  return (
    <div className="auth-shell">
      <div className="auth-aurora auth-aurora-a" />
      <div className="auth-aurora auth-aurora-b" />

      <button className="auth-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Retour
      </button>

      <main className="auth-layout">
        <MotionSection
          className="auth-story"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-story-header">
            <span className="auth-eyebrow">GEO Arctic</span>
            <h1>Accedez a votre cockpit GEO, vos projets et votre historique d analyse.</h1>
            <p>
              La connexion devient le point d entree du produit: session utilisateur,
              projets deja suivis et lecture immediate des evolutions.
            </p>
          </div>

          <div className="auth-story-visual" aria-hidden="true">
            <div className="auth-story-visual-copy">
              <span>Compte restaure</span>
              <strong>Login court, reprise immediate du workspace.</strong>
            </div>
          </div>

          <div className="auth-story-rail">
            <div className="auth-story-card auth-story-card-primary">
              <span className="auth-story-label">Vue d ensemble</span>
              <strong>Dashboard restaure a la connexion</strong>
              <p>Un utilisateur deja authentifie arrive directement sur son espace de pilotage.</p>
            </div>

            <div className="auth-story-card auth-story-card-secondary">
              <div className="auth-story-badge">
                <ShieldCheck size={16} />
                Session securisee
              </div>
              <div className="auth-story-metrics">
                <div>
                  <span>Projets suivis</span>
                  <strong>12</strong>
                </div>
                <div>
                  <span>Alertes ouvertes</span>
                  <strong>3</strong>
                </div>
                <div>
                  <span>Derniere evolution</span>
                  <strong>+4.8</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-values">
            {valueItems.map((item) => (
              <article key={item.title} className="auth-value-item">
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </MotionSection>

        <MotionSection
          className="auth-panel"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.72, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Connexion
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
            >
              Creer un compte
            </button>
          </div>

          <div className="auth-panel-head">
            <span className="auth-form-tag">
              <LockKeyhole size={14} />
              Espace securise
            </span>
            <h2>{mode === 'login' ? 'Se connecter' : 'Creer votre compte'}</h2>
            <p>
              {mode === 'login'
                ? 'Accedez a vos projets, vos benchmarks et votre progression recente.'
                : 'Preparez votre session utilisateur pour retrouver automatiquement vos analyses.'}
            </p>
          </div>

          <div className="auth-google-area">
            <div ref={googleButtonRef} className="auth-google-render" />
            {!googleClientId ? (
              <p className="auth-google-note">Ajoutez `VITE_GOOGLE_CLIENT_ID` pour activer Google.</p>
            ) : null}
          </div>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Nom complet
                <input
                  type="text"
                  value={form.fullName}
                  onChange={handleChange('fullName')}
                  placeholder="Nom et prenom"
                />
              </label>
            )}

            <label>
              Adresse email
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="vous@entreprise.com"
                  required
                />
              </div>
            </label>

            <label>
              Mot de passe
              <div className="auth-input-wrap">
                <LockKeyhole size={16} />
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Votre mot de passe"
                  required
                />
              </div>
            </label>

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : mode === 'login' ? 'Se connecter' : 'Creer mon compte'}
              <ArrowRight size={17} />
            </button>
          </form>

          {errorMessage ? (
            <p className="auth-error">{errorMessage}</p>
          ) : null}

          <p className="auth-footnote">
            Google et le formulaire partageront ensuite la meme session backend cote utilisateur.
          </p>
        </MotionSection>
      </main>
    </div>
  );
}
