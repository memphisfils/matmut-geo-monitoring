import React, { useState, useEffect } from 'react';
import './AlertsPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Panneau d'alertes — Sprint 3
 * Affiche l'état de configuration de chaque canal et permet de tester les alertes.
 */
export default function AlertsPanel({ brand }) {
  const [status, setStatus]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [testing, setTesting]       = useState(null);
  const [testResults, setTestResults] = useState({});
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyResult, setWeeklyResult]   = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/alerts/status`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => {
        setStatus({
          slack:    { configured: false, channel: 'webhook' },
          email:    { configured: false, recipient: '—', host: '—' },
          telegram: { configured: false, chat_id: '—' }
        });
        setLoading(false);
      });
  }, []);

  const handleTest = async (channel) => {
    setTesting(channel);
    setTestResults(prev => ({ ...prev, [channel]: null }));
    try {
      const r = await fetch(`${API_URL}/alerts/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, message: `🧪 Test GEO Monitor — ${brand}` })
      });
      const d = await r.json();
      setTestResults(prev => ({
        ...prev,
        [channel]: d.results?.[channel] !== false ? 'success' : 'failed'
      }));
    } catch {
      setTestResults(prev => ({ ...prev, [channel]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

  const handleWeekly = async () => {
    setWeeklyLoading(true);
    setWeeklyResult(null);
    try {
      const r = await fetch(`${API_URL}/alerts/weekly`, { method: 'POST' });
      const d = await r.json();
      setWeeklyResult(d.status === 'success' ? 'success' : 'failed');
    } catch {
      setWeeklyResult('error');
    } finally {
      setWeeklyLoading(false);
    }
  };

  if (loading) return (
    <div className="ap2-wrapper">
      <div className="ap2-loading">CHARGEMENT…</div>
    </div>
  );

  const channels = [
    {
      key:    'slack',
      label:  'SLACK',
      icon:   '💬',
      detail: status?.slack?.configured ? 'Webhook configuré' : 'SLACK_WEBHOOK_URL manquant',
      envs:   ['SLACK_WEBHOOK_URL'],
      doc:    'https://api.slack.com/messaging/webhooks'
    },
    {
      key:   'email',
      label: 'EMAIL',
      icon:  '✉️',
      detail: status?.email?.configured
        ? `→ ${status.email.recipient} via ${status.email.host}`
        : 'SMTP_HOST / SMTP_USER / SMTP_PASS / ALERT_EMAIL manquants',
      envs:  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAIL'],
      doc:   null
    },
    {
      key:   'telegram',
      label: 'TELEGRAM',
      icon:  '📱',
      detail: status?.telegram?.configured
        ? `Chat ID : ${status.telegram.chat_id}`
        : 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID manquants',
      envs:  ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
      doc:   'https://core.telegram.org/bots#botfather'
    }
  ];

  const configuredCount = channels.filter(c => status?.[c.key]?.configured).length;

  return (
    <div className="ap2-wrapper">
      <div className="ap2-header">
        <div className="ap2-title-row">
          <h3 className="ap2-title">ALERTES & NOTIFICATIONS</h3>
          <span className={`ap2-config-badge ${configuredCount > 0 ? 'ok' : 'none'}`}>
            {configuredCount}/{channels.length} configurés
          </span>
        </div>
        <div className="ap2-scheduler-note">
          Résumé hebdo automatique : tous les lundis 09h00
        </div>
      </div>

      <div className="ap2-channels">
        {channels.map(ch => {
          const configured = status?.[ch.key]?.configured;
          const result     = testResults[ch.key];
          const isTesting  = testing === ch.key;

          return (
            <div key={ch.key} className={`ap2-channel ${configured ? 'configured' : 'unconfigured'}`}>
              <div className="ap2-channel-header">
                <span className="ap2-channel-icon">{ch.icon}</span>
                <span className="ap2-channel-label">{ch.label}</span>
                <span className={`ap2-status-dot ${configured ? 'on' : 'off'}`}>
                  {configured ? '● ACTIF' : '○ INACTIF'}
                </span>
              </div>

              <div className="ap2-channel-detail">{ch.detail}</div>

              {!configured && (
                <div className="ap2-envs">
                  {ch.envs.map(env => (
                    <code key={env} className="ap2-env-chip">{env}</code>
                  ))}
                  {ch.doc && (
                    <a href={ch.doc} target="_blank" rel="noopener noreferrer"
                       className="ap2-doc-link">
                      docs →
                    </a>
                  )}
                </div>
              )}

              <div className="ap2-channel-footer">
                <button
                  className={`ap2-test-btn ${!configured ? 'disabled' : ''}`}
                  onClick={() => configured && handleTest(ch.key)}
                  disabled={!configured || isTesting}
                >
                  {isTesting ? 'Envoi…' : 'Tester'}
                </button>

                {result && (
                  <span className={`ap2-result ${result}`}>
                    {result === 'success' ? '✓ Envoyé' : '✗ Échec'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ap2-weekly-section">
        <div className="ap2-weekly-info">
          <span className="ap2-weekly-label">RÉSUMÉ HEBDOMADAIRE</span>
          <span className="ap2-weekly-desc">
            Envoie maintenant le résumé hebdo sur tous les canaux configurés
          </span>
        </div>
        <div className="ap2-weekly-actions">
          <button
            className={`ap2-weekly-btn ${configuredCount === 0 ? 'disabled' : ''}`}
            onClick={handleWeekly}
            disabled={weeklyLoading || configuredCount === 0}
          >
            {weeklyLoading ? 'Envoi…' : 'Envoyer le résumé'}
          </button>
          {weeklyResult && (
            <span className={`ap2-result ${weeklyResult}`}>
              {weeklyResult === 'success' ? '✓ Résumé envoyé' : '✗ Erreur'}
            </span>
          )}
        </div>
      </div>

      <div className="ap2-footer">
        <div className="ap2-trigger">
          <span className="ap2-trigger-icon">⚡</span>
          <span className="ap2-trigger-text">
            Alerte de rang — déclenchée si {brand} perd la 1ère place
          </span>
        </div>
        <div className="ap2-trigger">
          <span className="ap2-trigger-icon">📅</span>
          <span className="ap2-trigger-text">
            Résumé automatique — chaque lundi 09h00 sur tous les canaux actifs
          </span>
        </div>
      </div>
    </div>
  );
}
