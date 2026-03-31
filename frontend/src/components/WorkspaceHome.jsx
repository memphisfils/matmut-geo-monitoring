import React from 'react';
import { ArrowRight, FolderOpen, Plus, Sparkles } from 'lucide-react';
import ProjectsPanel from './ProjectsPanel';
import './WorkspaceHome.css';

function formatRecent(projects) {
  if (!projects.length) return 'Aucun projet encore actif.';
  const latest = projects[0];
  if (!latest.last_run) return `Dernier projet cree: ${latest.brand}`;
  return `Derniere analyse: ${latest.brand} le ${new Date(latest.last_run).toLocaleDateString('fr-FR')}`;
}

export default function WorkspaceHome({
  user,
  projects,
  loading,
  showHints = true,
  onCreateAnalysis,
  onProjectSelect
}) {
  const latestProject = projects[0] || null;

  return (
    <div className="workspace-home">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <span className="workspace-kicker">Espace utilisateur</span>
          <h1 className="workspace-title">
            Reprenez vos suivis GEO sans repasser par l&apos;onboarding.
          </h1>
          <p className="workspace-subtitle">
            Vos projets, votre historique et votre progression restent attaches a votre session.
            Ouvrez un suivi existant ou lancez une nouvelle analyse.
          </p>

          <div className="workspace-actions">
            <button className="workspace-primary" onClick={onCreateAnalysis}>
              <Plus size={16} />
              <span>Nouvelle analyse</span>
            </button>
            {latestProject && (
              <button
                className="workspace-secondary"
                onClick={() => onProjectSelect(latestProject)}
              >
                <FolderOpen size={16} />
                <span>Ouvrir {latestProject.brand}</span>
              </button>
            )}
          </div>
        </div>

        <div className="workspace-summary">
          <div className="workspace-stat">
            <span className="workspace-stat-label">Projets suivis</span>
            <strong>{loading ? '...' : projects.length}</strong>
          </div>
          <div className="workspace-stat">
            <span className="workspace-stat-label">Etat de reprise</span>
            <strong>{latestProject ? 'Pret' : 'A initialiser'}</strong>
          </div>
          <div className="workspace-note">
            <Sparkles size={16} />
            <span>{loading ? 'Chargement de vos projets...' : formatRecent(projects)}</span>
          </div>
        </div>
      </section>

      {showHints && (
        <section className="workspace-strip">
          <div>
            <h2>Ce que vous pouvez faire maintenant</h2>
            <p>
              Reprendre une marque suivie, comparer son evolution ou ouvrir une nouvelle analyse
              sans melanger les donnees d&apos;un autre projet.
            </p>
          </div>
          <button className="workspace-inline-link" onClick={onCreateAnalysis}>
            <span>Configurer une nouvelle marque</span>
            <ArrowRight size={16} />
          </button>
        </section>
      )}

      <ProjectsPanel
        projects={projects}
        loading={loading}
        onProjectSelect={onProjectSelect}
        onCreateAnalysis={onCreateAnalysis}
        title={`Projets de ${user?.name || 'votre compte'}`}
        subtitle="Chaque projet ouvre son propre dashboard, son historique et ses exports."
        emptyTitle="Aucun projet disponible."
        emptyHint="Commencez par une premiere analyse pour alimenter votre cockpit."
      />
    </div>
  );
}
