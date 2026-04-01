import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  FolderOpen,
  Plus,
  Radar,
  Sparkles
} from 'lucide-react';
import { fetchProjects } from '../services/api';
import PanelState from './PanelState';
import './ProjectsPanel.css';

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return typeof value === 'string' ? value.split(',').map((item) => item.trim()) : [];
  }
}

function freshnessLabel(dateValue) {
  if (!dateValue) return { label: 'Jamais lance', tone: 'stale' };

  const now = Date.now();
  const timestamp = new Date(dateValue).getTime();
  const diffHours = Math.max(0, (now - timestamp) / (1000 * 60 * 60));

  if (diffHours < 24) return { label: 'Fraiche', tone: 'fresh' };
  if (diffHours < 24 * 7) return { label: 'Recente', tone: 'recent' };
  return { label: 'A relancer', tone: 'stale' };
}

function portfolioAction(project) {
  if (!project.last_run) return 'Nouveau projet a lancer';
  if (!project.competitors.length) return 'Ajouter des concurrents pour fiabiliser le benchmark';
  return 'Pret a reprendre';
}

export default function ProjectsPanel({
  onProjectSelect,
  projects: providedProjects,
  loading: providedLoading,
  title = 'Mes marques',
  subtitle = 'Reprenez un projet, relancez un benchmark, ou ouvrez une marque en un clic.',
  emptyTitle = 'Aucun projet trouve.',
  emptyHint = 'Lancez une analyse pour creer un projet automatiquement.',
  onCreateAnalysis
}) {
  const [internalProjects, setInternalProjects] = useState([]);
  const [internalLoading, setInternalLoading] = useState(providedProjects ? false : true);
  const useProvidedProjects = Array.isArray(providedProjects);

  useEffect(() => {
    if (useProvidedProjects) return;

    fetchProjects()
      .then((data) => {
        setInternalProjects(data);
        setInternalLoading(false);
      })
      .catch(() => {
        setInternalLoading(false);
      });
  }, [useProvidedProjects]);

  const projects = useProvidedProjects ? providedProjects : internalProjects;
  const loading = useProvidedProjects ? Boolean(providedLoading) : internalLoading;

  const normalizedProjects = useMemo(() => (
    (projects || []).map((project) => {
      const competitors = parseList(project.competitors);
      const models = parseList(project.models);
      const prompts = parseList(project.prompts);
      return {
        ...project,
        competitors,
        models,
        prompts,
        freshness: freshnessLabel(project.last_run)
      };
    })
  ), [projects]);

  if (loading) {
    return (
      <div className="portfolio-shell loading">
        <div className="loader" />
        <p>Chargement des marques...</p>
      </div>
    );
  }

  if (normalizedProjects.length === 0) {
    return (
      <div className="portfolio-shell">
        <PanelState
          icon={FolderOpen}
          title={emptyTitle}
          description={emptyHint}
          actions={onCreateAnalysis ? (
            <button onClick={onCreateAnalysis}>
              <Plus size={14} />
              <span>Nouvelle analyse</span>
            </button>
          ) : null}
        />
      </div>
    );
  }

  return (
    <div className="portfolio-shell">
      <header className="portfolio-header">
        <div>
          <span className="portfolio-kicker">Portfolio</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        {onCreateAnalysis ? (
          <button className="portfolio-create" onClick={onCreateAnalysis}>
            <Plus size={16} />
            Nouvelle analyse
          </button>
        ) : null}
      </header>

      <div className="portfolio-list">
        {normalizedProjects.map((project, index) => (
          <article key={project.id || index} className="portfolio-row">
            <div className="portfolio-row-main">
              <div className={`portfolio-freshness ${project.freshness.tone}`}>
                <span className="pulse" />
                {project.freshness.label}
              </div>

              <div className="portfolio-brand-block">
                <strong>{project.brand}</strong>
                <span>{project.sector || 'General'} · {project.competitors.length} concurrent{project.competitors.length > 1 ? 's' : ''}</span>
                <small className="portfolio-action-note">{portfolioAction(project)}</small>
              </div>
            </div>

            <div className="portfolio-metrics">
              <div className="portfolio-metric">
                <Clock3 size={15} />
                <span>{project.last_run ? new Date(project.last_run).toLocaleDateString('fr-FR') : 'Jamais'}</span>
              </div>
              <div className="portfolio-metric">
                <Sparkles size={15} />
                <span>{project.prompts.length} prompts</span>
              </div>
              <div className="portfolio-metric">
                <Radar size={15} />
                <span>{project.models.length || 1} modele{(project.models.length || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="portfolio-tags">
              {project.models.slice(0, 3).map((model) => (
                <span key={model} className="portfolio-tag">{model}</span>
              ))}
              {project.models.length > 3 ? (
                <span className="portfolio-tag muted">+{project.models.length - 3}</span>
              ) : null}
            </div>

            <button className="portfolio-open" onClick={() => onProjectSelect && onProjectSelect(project)}>
              <span>Ouvrir</span>
              <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
