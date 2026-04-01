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
  TriangleAlert
} from 'lucide-react';
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
      return {
        key,
        ...CHANNEL_META[key],
        configured: Boolean(data.configured),
        detail: key === 'email'
          ? (data.configured ? `${data.recipient} via ${data.host}` : 'Configuration SMTP manquante')
          : key === 'telegram'
            ? (data.configured ? `Chat ID ${data.chat_id}` : 'Bot ou chat non configure')
            : (data.configured ? 'Webhook actif' : 'Webhook Slack manquant')
      };
    })
  ), [status]);

  const configuredCount = channels.filter((channel) => channel.configured).length;
  const scheduler = health?.scheduler || { role: 'disabled', running: false, configured: false };
  const primaryAction = configuredCount === 0
    ? 'Configurer un canal de sortie'
    : scheduler.running
      ? 'Surveiller la perte de rang'
      : 'Relancer le moteur d alertes';

  const alertFeed = useMemo(() => {
    const feed = [];

    feed.push({
      key: 'scheduler',
      tone: scheduler.running ? 'good' : 'risk',
      Icon: scheduler.running ? CheckCircle2 : TriangleAlert,
      title: scheduler.running ? 'Moteur d alertes actif' : 'Moteur d alertes inactif',
      body: scheduler.running
        ? `Le scheduler tourne en mode ${scheduler.role}.`
        : 'Les alertes programmees ne tourneront pas tant que le scheduler ne sera pas actif.'
    });

    feed.push({
      key: 'rank-loss',
      tone: configuredCount > 0 ? 'watch' : 'risk',
      Icon: BellRing,
      title: `Regle de perte de rang pour ${brand}`,
      body: configuredCount > 0
        ? `Une notification peut partir si ${brand} perd sa premiere place.`
        : `La regle existe, mais aucun canal actif ne peut notifier la perte de rang de ${brand}.`
    });

    feed.push({
      key: 'weekly',
      tone: configuredCount > 0 ? 'good' : 'watch',
      Icon: Clock3,
      title: 'Resume hebdomadaire',
      body: configuredCount > 0
        ? 'Envoi chaque lundi a 09h00 sur tous les canaux actifs.'
        : 'Pret cote produit, mais aucun canal n est disponible pour livrer le resume.'
    });

    if (configuredCount === 0) {
      feed.push({
        key: 'setup',
        tone: 'risk',
        Icon: Siren,
        title: 'Configuration incomplete',
        body: 'Activez au moins un canal pour sortir les alertes du dashboard et du mode local.'
      });
    }

    return feed;
  }, [brand, configuredCount, scheduler.role, scheduler.running]);

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
      <section className="alerts-hero">
        <div className="alerts-hero-copy">
          <span className="alerts-kicker">Alertes</span>
          <h2>Feed operationnel pour {brand}</h2>
          <p>Cette vue priorise ce qui sort du dashboard: moteur actif ou non, canaux disponibles, et regles qui peuvent vraiment notifier.</p>
          <div className="alerts-chip-row">
            <span className="alerts-chip">{configuredCount}/3 canaux actifs</span>
            <span className="alerts-chip">{scheduler.running ? 'Scheduler en ligne' : 'Scheduler hors ligne'}</span>
            <span className="alerts-chip">{primaryAction}</span>
          </div>
        </div>

        <div className="alerts-hero-stats">
          <article className="alerts-stat-card live">
            <Sparkles size={18} />
            <div>
              <span>Canaux actifs</span>
              <strong>{configuredCount}/3</strong>
            </div>
          </article>
          <article className={`alerts-stat-card ${scheduler.running ? 'good' : 'risk'}`}>
            <Clock3 size={18} />
            <div>
              <span>Scheduler</span>
              <strong>{scheduler.running ? 'Actif' : 'Inactif'}</strong>
            </div>
          </article>
          <article className="alerts-stat-card">
            <MessageSquareMore size={18} />
            <div>
              <span>Regles visibles</span>
              <strong>{alertFeed.length}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="alerts-summary-band">
        <article className="alerts-summary-card accent">
          <span>Action prioritaire</span>
          <strong>{primaryAction}</strong>
          <p>
            {configuredCount === 0
              ? 'Sans canal configure, les alertes restent visibles ici mais ne sortent pas du dashboard.'
              : scheduler.running
                ? `La chaine est exploitable pour ${brand}. Le prochain gain vient du reglage fin des regles.`
                : 'Les regles sont pretes, mais aucune execution planifiee ne partira tant que le scheduler reste inactif.'}
          </p>
        </article>
        <article className="alerts-summary-card">
          <span>Canal le plus proche du pret</span>
          <strong>{channels.find((channel) => channel.configured)?.label || 'Aucun canal actif'}</strong>
          <p>{channels.find((channel) => channel.configured)?.detail || 'Activez Slack, Email ou Telegram pour tester la sortie reelle.'}</p>
        </article>
        <article className={`alerts-summary-card ${scheduler.running ? 'good' : 'risk'}`}>
          <span>Etat moteur</span>
          <strong>{scheduler.running ? `Mode ${scheduler.role}` : 'Moteur non lance'}</strong>
          <p>{scheduler.running ? 'Les regles et le digest hebdomadaire peuvent tourner automatiquement.' : 'Le dashboard reste consultable, mais sans declenchement automatise.'}</p>
        </article>
      </section>

      <section className="alerts-feed">
        {alertFeed.map((item) => (
          <article key={item.key} className={`feed-item ${item.tone}`}>
            <div className={`feed-item-icon ${item.tone}`}>
              <item.Icon size={18} />
            </div>
            <div className="feed-item-copy">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="alerts-grid">
        <div className="alerts-panel">
          <div className="panel-topline">
            <strong>Canaux</strong>
            <span>{configuredCount > 0 ? 'Au moins un canal peut notifier' : 'Aucun canal ne peut notifier'}</span>
          </div>

          <div className="channel-stack">
            {channels.map((channel) => {
              const result = testResults[channel.key];
              const Icon = channel.Icon;

              return (
                <article key={channel.key} className={`channel-row ${channel.configured ? 'configured' : 'muted'}`}>
                  <div className="channel-row-main">
                    <div className={`channel-icon ${channel.configured ? 'configured' : 'muted'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <strong>{channel.label}</strong>
                      <p>{channel.detail}</p>
                    </div>
                  </div>

                  <div className="channel-row-actions">
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
        </div>

        <div className="alerts-panel">
          <div className="panel-topline">
            <strong>Regles et actions</strong>
            <span>Ce que la plateforme peut deja emettre aujourd hui</span>
          </div>

          <div className="rule-stack">
            <article className="rule-card">
              <div className="rule-card-head">
                <BellRing size={16} />
                <strong>Perte de premiere place</strong>
              </div>
              <p>Notification prevue si {brand} perd la tete du classement sur une analyse comparee.</p>
            </article>

            <article className="rule-card">
              <div className="rule-card-head">
                <Clock3 size={16} />
                <strong>Resume hebdomadaire</strong>
              </div>
              <p>Lecture synthese chaque lundi a 09h00 sur tous les canaux actifs.</p>
            </article>

            <article className="rule-card emphasis">
              <div className="rule-card-head">
                <Sparkles size={16} />
                <strong>Declenchement manuel</strong>
              </div>
              <p>Utile pour verifier la chaine complete de notification sans attendre la prochaine fenetre planifiee.</p>
              <button
                type="button"
                className="weekly-action-button"
                disabled={weeklyLoading || configuredCount === 0}
                onClick={handleWeekly}
              >
                {weeklyLoading ? 'Envoi du resume...' : 'Envoyer le resume maintenant'}
              </button>
              {weeklyResult ? (
                <span className={`result-pill ${weeklyResult}`}>
                  {weeklyResult === 'success' ? 'Resume envoye' : 'Erreur de declenchement'}
                </span>
              ) : null}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
