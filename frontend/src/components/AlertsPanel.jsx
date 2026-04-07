import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareMore,
  Send,
  Siren,
  Slack,
  Sparkles,
  TriangleAlert,
  ShieldAlert
} from 'lucide-react';
import MetricTape from './MetricTape';
import PanelState from './PanelState';
import './AlertsPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CHANNEL_META = {
  slack: {
    label: 'Slack',
    Icon: Slack,
    docs: 'https://api.slack.com/messaging/webhooks',
    envs: ['SLACK_WEBHOOK_URL']
  },
  email: {
    label: 'Email',
    Icon: Mail,
    docs: null,
    envs: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAIL']
  },
  telegram: {
    label: 'Telegram',
    Icon: Send,
    docs: 'https://core.telegram.org/bots#botfather',
    envs: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']
  }
};

export default function AlertsPanel({ brand }) {
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyResult, setWeeklyResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetch(`${API_URL}/alerts/status`, { credentials: 'include' }),
      fetch(`${API_URL}/health`, { credentials: 'include' })
    ])
      .then(async ([statusResponse, healthResponse]) => {
        if (cancelled) return;

        const nextStatus = statusResponse.status === 'fulfilled' && statusResponse.value.ok
          ? await statusResponse.value.json()
          : {
              slack: { configured: false, channel: 'webhook' },
              email: { configured: false, recipient: '-', host: '-' },
              telegram: { configured: false, chat_id: '-' }
            };

        const nextHealth = healthResponse.status === 'fulfilled' && healthResponse.value.ok
          ? await healthResponse.value.json()
          : null;

        setStatus(nextStatus);
        setHealth(nextHealth);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({
          slack: { configured: false, channel: 'webhook' },
          email: { configured: false, recipient: '-', host: '-' },
          telegram: { configured: false, chat_id: '-' }
        });
        setHealth(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const channels = useMemo(() => (
    ['slack', 'email', 'telegram'].map((key) => {
      const data = status?.[key] || {};
      const preference = status?.preferences?.channels?.[key] || {};
      const configured = preference.configured ?? Boolean(data.configured);
      const enabled = Boolean(preference.enabled);
      const source = preference.source || 'default';
      const config = preference.config || {};
      return {
        key,
        ...CHANNEL_META[key],
        configured,
        enabled,
        source,
        detail: key === 'email'
          ? (configured
            ? `${config.recipient || data.recipient || 'destinataire'} via ${config.host || data.host || 'SMTP'}`
            : 'Configuration SMTP manquante')
          : key === 'telegram'
            ? (configured ? `Chat ID ${config.chat_id || data.chat_id || '-'}` : 'Bot ou chat non configure')
            : (configured ? 'Webhook actif' : 'Webhook Slack manquant')
      };
    })
  ), [status]);

  const configuredCount = channels.filter((channel) => channel.configured).length;
  const enabledCount = channels.filter((channel) => channel.enabled).length;
  const scheduler = health?.scheduler || { role: 'disabled', running: false, configured: false };
  const primaryAction = enabledCount === 0
    ? 'Activer au moins un canal projet'
    : scheduler.running
      ? 'Surveiller les alertes actives'
      : 'Relancer le moteur d alertes';

  const alertRules = useMemo(() => {
    const rules = status?.preferences?.rules;
    if (!rules?.length) {
      return [
        {
          key: 'manual',
          title: 'Declenchement manuel',
          body: 'Verification immediate de la chaine complete de notification.',
          tone: 'neutral',
          Icon: Sparkles
        }
      ];
    }

    const iconBySeverity = {
      critical: ShieldAlert,
      high: TriangleAlert,
      medium: BellRing,
      info: Clock3
    };

    return [...rules]
      .sort((a, b) => Number(b.enabled) - Number(a.enabled))
      .slice(0, 6)
      .map((rule) => ({
        key: rule.id,
        title: rule.name,
        body: `${rule.frequency} · ${rule.enabled ? 'active' : 'desactivee'} sur ce projet.`,
        tone: rule.enabled ? (rule.severity === 'critical' ? 'risk' : 'watch') : 'neutral',
        Icon: iconBySeverity[rule.severity] || BellRing
      }));
  }, [status]);

  const alertFeed = useMemo(() => {
    const feed = [
      {
        key: 'scheduler',
        tone: scheduler.running ? 'good' : 'risk',
        Icon: scheduler.running ? CheckCircle2 : TriangleAlert,
        title: scheduler.running ? 'Moteur d alertes actif' : 'Moteur d alertes inactif',
        body: scheduler.running
          ? `Le scheduler tourne en mode ${scheduler.role}.`
          : 'Les alertes programmees ne tourneront pas tant que le scheduler ne sera pas actif.'
      },
      {
        key: 'channels',
        tone: enabledCount > 0 ? 'good' : 'risk',
        Icon: enabledCount > 0 ? MessageSquareMore : Siren,
        title: enabledCount > 0 ? 'Canal projet actif' : 'Aucun canal projet actif',
        body: enabledCount > 0
          ? `${enabledCount} canal(aux) sont actives pour ce projet.`
          : 'Activez au moins un canal dans les preferences du projet pour sortir les alertes.'
      }
    ];

    if (!scheduler.running || enabledCount === 0) {
      feed.push({
        key: 'manual-summary',
        tone: 'watch',
        Icon: Clock3,
        title: 'Resume hebdomadaire',
        body: enabledCount > 0
          ? 'Le resume est pret, mais attend le moteur planifie.'
          : 'Le resume est defini, mais aucun canal ne peut encore le livrer.'
      });
    }

    return feed;
  }, [enabledCount, scheduler.role, scheduler.running]);

  const tapeItems = useMemo(() => ([
    { label: 'Canaux actifs', value: enabledCount, meta: `${configuredCount} configures` },
    { label: 'Regles visibles', value: alertRules.length, meta: 'catalogue actif' },
    { label: 'Scheduler', value: scheduler.running ? 1 : 0, meta: scheduler.running ? scheduler.role : 'inactif' },
    { label: 'Incidents', value: alertFeed.filter((item) => item.tone === 'risk').length, meta: 'a traiter' }
  ]), [alertFeed, alertRules.length, configuredCount, enabledCount, scheduler.role, scheduler.running]);

  const handleTest = async (channel) => {
    setTesting(channel);
    setTestResults((current) => ({ ...current, [channel]: null }));

    try {
      const response = await fetch(`${API_URL}/alerts/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, message: `Test GEO Arctic - ${brand}` })
      });
      const payload = await response.json();
      setTestResults((current) => ({
        ...current,
        [channel]: payload.results?.[channel] !== false ? 'success' : 'failed'
      }));
    } catch {
      setTestResults((current) => ({ ...current, [channel]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

  const handleWeekly = async () => {
    setWeeklyLoading(true);
    setWeeklyResult(null);
    try {
      const response = await fetch(`${API_URL}/alerts/weekly`, {
        method: 'POST',
        credentials: 'include'
      });
      const payload = await response.json();
      setWeeklyResult(payload.status === 'success' ? 'success' : 'failed');
    } catch {
      setWeeklyResult('error');
    } finally {
      setWeeklyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="alerts-shell">
        <PanelState
          icon={BellRing}
          title="Chargement des alertes"
          description="Lecture des canaux, du scheduler et des regles actives."
        />
      </div>
    );
  }

  return (
    <div className="alerts-shell">
      <section className="alerts-header">
        <div className="alerts-heading">
          <span className="alerts-kicker">Alertes</span>
          <h2>Centre de notification pour {brand}</h2>
          <p>
            Cette vue montre ce qui peut vraiment partir hors dashboard: etat moteur, canaux disponibles,
            incidents actifs et regles deja prêtes a notifier.
          </p>
        </div>

        <div className="alerts-hero-actions">
          <div className="alerts-summary-line">
            <span className="alerts-chip">{primaryAction}</span>
            <span className="alerts-chip">{scheduler.running ? `Scheduler ${scheduler.role}` : 'Scheduler hors ligne'}</span>
          </div>
          <div className="alerts-key-metrics">
            <div>
              <span>Canaux</span>
              <strong>{enabledCount}/3</strong>
            </div>
            <div>
              <span>Regles</span>
              <strong>{alertRules.length}</strong>
            </div>
            <div>
              <span>Incidents</span>
              <strong>{alertFeed.filter((item) => item.tone === 'risk').length}</strong>
            </div>
          </div>
        </div>
      </section>

      <MetricTape items={tapeItems} compact />

      <section className="alerts-highlights">
        {alertFeed.map((item) => (
          <article key={item.key} className={`alert-highlight ${item.tone}`}>
            <div className={`alert-highlight-icon ${item.tone}`}>
              <item.Icon size={18} />
            </div>
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="alerts-workspace">
        <section className="alerts-main">
          <div className="alerts-section-head">
            <div>
              <span className="alerts-section-kicker">Canaux</span>
              <h3>Sorties disponibles</h3>
            </div>
            <span className="alerts-section-meta">
              {enabledCount > 0 ? 'Au moins un canal projet peut notifier' : 'Aucun canal projet ne peut notifier'}
            </span>
          </div>

          <div className="channel-list">
            {channels.map((channel) => {
              const result = testResults[channel.key];
              const Icon = channel.Icon;

              return (
                <article key={channel.key} className={`channel-item ${channel.configured ? 'configured' : 'muted'}`}>
                  <div className="channel-item-main">
                    <div className={`channel-icon ${channel.configured ? 'configured' : 'muted'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="channel-copy">
                      <div className="channel-title-row">
                        <strong>{channel.label}</strong>
                        <span className={`channel-state ${channel.configured ? 'configured' : 'muted'}`}>
                          {channel.enabled ? 'Actif' : channel.configured ? 'Pret mais inactif' : 'A configurer'}
                        </span>
                      </div>
                      <p>{channel.detail}{channel.source !== 'default' ? ` · source ${channel.source}` : ''}</p>
                    </div>
                  </div>

                  <div className="channel-actions">
                    <button
                      type="button"
                      className="channel-test-button"
                      disabled={!channel.configured || testing === channel.key}
                      onClick={() => handleTest(channel.key)}
                    >
                      {testing === channel.key ? 'Envoi...' : 'Tester'}
                    </button>
                    {result ? (
                      <span className={`result-pill ${result}`}>
                        {result === 'success' ? 'Envoye' : 'Echec'}
                      </span>
                    ) : null}
                  </div>

                  {!channel.configured && (
                    <div className="channel-meta">
                      <div className="env-chip-row">
                        {channel.envs.map((envName) => (
                          <code key={envName}>{envName}</code>
                        ))}
                      </div>
                      {channel.docs ? (
                        <a href={channel.docs} target="_blank" rel="noopener noreferrer">
                          Documentation
                        </a>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="alerts-rail">
          <div className="alerts-panel">
            <div className="alerts-section-head">
              <div>
                <span className="alerts-section-kicker">Regles</span>
                <h3>Catalogue actif</h3>
              </div>
            </div>

            <div className="rule-list">
              {alertRules.map((rule) => (
                <article key={rule.key} className={`rule-item ${rule.tone}`}>
                  <div className={`rule-icon ${rule.tone}`}>
                    <rule.Icon size={16} />
                  </div>
                  <div>
                    <strong>{rule.title}</strong>
                    <p>{rule.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="alerts-panel emphasis">
            <div className="alerts-section-head">
              <div>
                <span className="alerts-section-kicker">Action manuelle</span>
                <h3>Declencher maintenant</h3>
              </div>
            </div>
            <p className="manual-action-copy">
              Utilisez ce bouton pour verifier la chaine complete de notification sans attendre la prochaine execution planifiee.
            </p>
            <button
              type="button"
              className="weekly-action-button"
              disabled={weeklyLoading || enabledCount === 0}
              onClick={handleWeekly}
            >
              {weeklyLoading ? 'Envoi du resume...' : 'Envoyer le resume maintenant'}
            </button>
            {weeklyResult ? (
              <span className={`result-pill ${weeklyResult}`}>
                {weeklyResult === 'success' ? 'Resume envoye' : 'Erreur de declenchement'}
              </span>
            ) : null}
          </div>

          <div className="alerts-footer-note">
            Alertes visibles pour {brand} · {enabledCount}/3 canaux actifs ·
            {scheduler.running ? ` moteur ${scheduler.role}` : ' moteur hors ligne'}
          </div>
        </aside>
      </div>
    </div>
  );
}
