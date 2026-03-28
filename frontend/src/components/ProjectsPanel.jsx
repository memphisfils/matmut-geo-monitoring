import React, { useState, useEffect } from 'react';
import { FolderOpen, Settings, Play, Trash2, Clock, Globe } from 'lucide-react';
import './ProjectsPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ProjectsPanel({ onProjectSelect }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching projects:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="pp-wrapper loading">
        <div className="loader" />
        <p>Chargement des projets...</p>
      </div>
    );
  }

  return (
    <div className="pp-wrapper premium-card">
      <div className="pp-header">
        <div className="pp-title-block">
          <FolderOpen size={24} className="pp-icon" />
          <h2 className="pp-title">Mes Projets (Analyses)</h2>
        </div>
        <p className="pp-subtitle">Gérez vos analyses précédentes et reprenez vos configurations.</p>
      </div>

      {projects.length === 0 ? (
        <div className="pp-empty">
          <div className="pp-empty-icon"><FolderOpen size={48} /></div>
          <p>Aucun projet trouvé.</p>
          <span>Lancez une analyse pour créer un projet automatiquement.</span>
        </div>
      ) : (
        <div className="pp-grid">
          {projects.map((p, idx) => {
            const compList = (() => {
              if (!p.competitors) return [];
              if (Array.isArray(p.competitors)) return p.competitors;
              try { return JSON.parse(p.competitors); } 
              catch(e) { return typeof p.competitors === 'string' ? p.competitors.split(',') : []; }
            })();
            const llmList = (() => {
              if (!p.llms_used) return [];
              if (Array.isArray(p.llms_used)) return p.llms_used;
              try { return JSON.parse(p.llms_used); } 
              catch(e) { return typeof p.llms_used === 'string' ? p.llms_used.split(',') : []; }
            })();

            return (
            <div key={idx} className="pp-card">
              <div className="pp-card-header">
                <span className="pp-brand">{p.brand}</span>
                <span className="pp-sector">{p.sector || 'Général'}</span>
              </div>
              
              <div className="pp-card-body">
                <div className="pp-info-row">
                  <Clock size={14} />
                  <span>Dernière analyse : {new Date(p.last_updated).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="pp-info-row">
                  <Globe size={14} />
                  <span>{compList.length} concurrents</span>
                </div>
                {llmList.length > 0 && (
                  <div className="pp-models">
                    {llmList.map(m => (
                      <span key={m} className="pp-model-badge">{m}</span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pp-card-footer">
                <button className="pp-btn outline">
                  <Settings size={14} />
                  <span>Modifier</span>
                </button>
                <button className="pp-btn primary" onClick={() => onProjectSelect && onProjectSelect(p)}>
                  <Play size={14} />
                  <span>Ouvrir</span>
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
