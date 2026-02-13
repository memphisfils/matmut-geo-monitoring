import React, { useState } from 'react';
import { Server, CheckCircle2, XCircle, AlertTriangle, Cpu } from 'lucide-react';
import './SystemStatus.css';

export default function SystemStatus({ status, isDemoData }) {
    const [isOpen, setIsOpen] = useState(false);

    // Status global du système
    const isSystemReady = status?.system_ready;
    const llmStatus = status?.llm_status || {};

    // Compter les LLMs actifs
    const activeLLMs = Object.values(llmStatus).filter(v => v === true).length;
    const totalLLMs = Object.keys(llmStatus).length;

    return (
        <div className="system-status-container"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* Badge Principal */}
            <div className={`status-badge-main ${isSystemReady ? 'ready' : 'not-ready'}`}>
                {isSystemReady ? <Cpu size={16} /> : <AlertTriangle size={16} />}
                <span>
                    {isSystemReady ? `Système Actif (${activeLLMs}/${totalLLMs} IA)` : 'Système Incomplet'}
                </span>
            </div>

            {/* Badge Données Démo (séparé) */}
            {isDemoData && (
                <div className="demo-data-badge">
                    <span>DONNÉES DÉMO</span>
                </div>
            )}

            {/* Dropdown Détails */}
            {isOpen && (
                <div className="status-dropdown">
                    <div className="dropdown-header">
                        <h3>État du Système</h3>
                        <span className="status-timestamp">
                            {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : '--:--'}
                        </span>
                    </div>

                    <div className="status-list">
                        <div className="status-item">
                            <span className="label">API Backend</span>
                            <span className="value success"><CheckCircle2 size={14} /> En Ligne</span>
                        </div>

                        <div className="divider" />

                        <div className="section-label">Connectivité IA</div>

                        {['chatgpt', 'deepseek', 'claude', 'gemini'].map(model => {
                            const isActive = llmStatus[model];
                            return (
                                <div key={model} className="status-item">
                                    <span className="label capitalize">{model}</span>
                                    {isActive ? (
                                        <span className="value success"><CheckCircle2 size={14} /> Connecté</span>
                                    ) : (
                                        <span className="value error"><XCircle size={14} /> Déconnecté</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
