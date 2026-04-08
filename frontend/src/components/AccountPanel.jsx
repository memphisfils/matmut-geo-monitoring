import React from 'react';
import { BellRing, FolderOpen, LogOut, MonitorSmartphone, ShieldCheck, Sparkles } from 'lucide-react';
import './AccountPanel.css';

function getInitials(user) {
  const source = user?.name || user?.email || '?';
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatProvider(provider) {
  if (provider === 'google') return 'Google';
  if (provider === 'hybrid') return 'Email + Google';
  return 'Email';
}

function ToggleRow({ title, hint, checked, onChange }) {
  return (
    <label className="account-toggle">
      <div>
        <strong>{title}</strong>
        <p>{hint}</p>
      </div>
      <button
        type="button"
        className={`account-switch ${checked ? 'on' : 'off'}`}
        onClick={onChange}
        aria-pressed={checked}
      >
        <span />
      </button>
    </label>
  );
}

export default function AccountPanel({
  user,
  projects,
  isBackendOnline,
  preferences,
  onPreferenceChange,
  onOpenProjects,
  onCreateAnalysis,
  onLogout
}) {
  const backendLabel = isBackendOnline ? 'API connectee' : 'Mode demo';

  return (
    <div className="account-panel">
      <section className="account-hero">
        <div className="account-identity">
          <div className="account-avatar">{getInitials(user)}</div>
          <div>
            <span className="account-kicker">Compte</span>
            <h1>{user?.name || 'Utilisateur GEO'}</h1>
            <p>{user?.email}</p>
            <div className="account-hero-chips">
              <span className="account-chip subtle">{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
              <span className="account-chip subtle">{formatProvider(user?.auth_provider)}</span>
              <span className={`account-chip subtle ${isBackendOnline ? 'live' : 'demo'}`}>{backendLabel}</span>
            </div>
          </div>
        </div>

        <div className="account-badges">
          <span className="account-chip">
            <ShieldCheck size={14} />
            <span>{formatProvider(user?.auth_provider)}</span>
          </span>
          <span className={`account-chip ${isBackendOnline ? 'live' : 'demo'}`}>
            <MonitorSmartphone size={14} />
            <span>{isBackendOnline ? 'API connectee' : 'Mode demo'}</span>
          </span>
        </div>
      </section>

      <section className="account-grid">
        <div className="account-card">
          <div className="account-card-head">
            <h2>Session et acces</h2>
            <span>Etat courant</span>
          </div>
          <div className="account-highlight-strip">
            <div className="account-highlight">
              <span>Lecture rapide</span>
              <strong>{projects.length > 0 ? 'Espace pret a reprendre' : 'Compte encore vide'}</strong>
            </div>
            <div className="account-highlight">
              <span>Priorite</span>
              <strong>{projects.length > 0 ? 'Suivre l evolution des projets existants' : 'Lancer une premiere analyse'}</strong>
            </div>
          </div>
          <div className="account-stat-list">
            <div className="account-stat">
              <span>Projets disponibles</span>
              <strong>{projects.length}</strong>
            </div>
            <div className="account-stat">
              <span>Derniere connexion</span>
              <strong>
                {user?.last_login_at
                  ? new Date(user.last_login_at).toLocaleDateString('fr-FR')
                  : 'Aujourd hui'}
              </strong>
            </div>
            <div className="account-stat">
              <span>Compte cree</span>
              <strong>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </strong>
            </div>
          </div>
        </div>

        <div className="account-card">
          <div className="account-card-head">
            <h2>Preferences locales</h2>
            <span>Appliquees immediatement</span>
          </div>
          <div className="account-toggle-list">
            <ToggleRow
              title="Ouvrir automatiquement le dernier projet"
              hint="Si aucune session active n est restauree, ouvrez directement le projet le plus recent."
              checked={preferences.autoOpenLatestProject}
              onChange={() => onPreferenceChange('autoOpenLatestProject')}
            />
            <ToggleRow
              title="Interface a mouvements reduits"
              hint="Reduit certaines animations pour une navigation plus sobre."
              checked={preferences.reduceMotion}
              onChange={() => onPreferenceChange('reduceMotion')}
            />
            <ToggleRow
              title="Afficher les indications contextuelles"
              hint="Conserve les textes courts d aide dans l accueil connecte et les panneaux de reprise."
              checked={preferences.showHints}
              onChange={() => onPreferenceChange('showHints')}
            />
          </div>
        </div>
      </section>

      <section className="account-actions-row">
        <button className="account-action-card" onClick={onOpenProjects}>
          <FolderOpen size={18} />
          <div>
            <strong>Voir mes projets</strong>
            <p>Reprendre un suivi existant ou verifier son historique.</p>
          </div>
        </button>

        <button className="account-action-card" onClick={onCreateAnalysis}>
          <Sparkles size={18} />
          <div>
            <strong>Lancer une nouvelle analyse</strong>
            <p>Creer un nouveau projet sans quitter votre espace compte.</p>
          </div>
        </button>

        <button className="account-action-card danger" onClick={onLogout}>
          <LogOut size={18} />
          <div>
            <strong>Se deconnecter</strong>
            <p>Fermer la session de ce navigateur et revenir a la page publique.</p>
          </div>
        </button>
      </section>

      <section className="account-footer-note">
        <BellRing size={16} />
        <span>
          Les preferences de cette page sont locales a ce navigateur. L identite et les projets
          restent, eux, portes par votre compte.
        </span>
      </section>
    </div>
  );
}
