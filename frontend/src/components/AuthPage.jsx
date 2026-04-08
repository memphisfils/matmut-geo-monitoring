import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
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

        const width = Math.max(240, Math.min(googleButtonRef.current.offsetWidth || 360, 380));

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
          width,
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

      <main className="auth-stage">
        <MotionSection
          className="auth-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-brandline">
            <span className="auth-eyebrow">GEO Arctic</span>
            <span className="auth-brandline-copy">Connexion securisee</span>
          </div>

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
              Session utilisateur
            </span>
            <h2>{mode === 'login' ? 'Entrez dans votre workspace' : 'Ouvrez votre espace GEO'}</h2>
            <p>
              {mode === 'login'
                ? 'Accedez directement a vos projets et a votre dashboard.'
                : 'Creez un compte pour retrouver ensuite vos analyses et vos comparaisons.'}
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
                <div className="auth-input-wrap">
                  <UserRound size={16} />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={handleChange('fullName')}
                    placeholder="Nom et prenom"
                    required={mode === 'signup'}
                  />
                </div>
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
            Formulaire et Google utilisent ensuite la meme session backend.
          </p>
        </MotionSection>
      </main>
    </div>
  );
}
