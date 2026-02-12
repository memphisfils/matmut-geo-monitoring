import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import './InsightsPanel.css';

export default function InsightsPanel({ insights }) {
    if (!insights) return null;

    const sections = [
        {
            title: 'Points Forts',
            icon: CheckCircle,
            items: insights.strengths || [],
            color: 'green',
            emptyText: 'Aucun point fort identifié'
        },
        {
            title: "Points d'Amélioration",
            icon: AlertTriangle,
            items: insights.weaknesses || [],
            color: 'orange',
            emptyText: 'Aucune faiblesse identifiée'
        },
        {
            title: 'Recommandations',
            icon: Lightbulb,
            items: insights.recommendations || [],
            color: 'blue',
            emptyText: 'Aucune recommandation'
        }
    ];

    return (
        <motion.div
            className="card insights-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
        >
            <div className="card-header">
                <h3 className="card-title">💡 Insights Matmut</h3>
                {insights.rank && (
                    <span className="card-badge">Rang #{insights.rank}</span>
                )}
            </div>
            <div className="insights-content">
                {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div key={section.title} className={`insight-section insight-${section.color}`}>
                            <div className="insight-header">
                                <Icon size={16} />
                                <h4>{section.title}</h4>
                            </div>
                            <ul className="insight-list">
                                {section.items.length > 0 ? (
                                    section.items.map((item, idx) => (
                                        <motion.li
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1 + idx * 0.1 }}
                                        >
                                            <span className={`insight-bullet insight-bullet-${section.color}`}>•</span>
                                            {item}
                                        </motion.li>
                                    ))
                                ) : (
                                    <li className="insight-empty">{section.emptyText}</li>
                                )}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
