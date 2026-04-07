"""
Système d'alertes — GEO Monitor Sprint 3
Canaux supportés :
  - Slack   : webhook URL existant (Sprint 1)
  - Email   : smtplib (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL)
  - Telegram: Bot API (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
"""
import os
import json
import urllib.request
import urllib.parse
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


# ── Helpers ──────────────────────────────────────────────────────────────────

def _http_post(url: str, payload: dict, headers: dict = None) -> bool:
    """POST JSON générique via urllib — pas de dépendance requests."""
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', **(headers or {})}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[ALERT] HTTP POST failed ({url[:50]}…): {e}")
        return False


def _fmt_time() -> str:
    return datetime.now().strftime('%H:%M %d/%m/%Y')


# ── Slack ─────────────────────────────────────────────────────────────────────

def send_slack_alert(message: str, webhook_url: str = None) -> bool:
    """Envoie une alerte Slack via webhook URL."""
    webhook_url = webhook_url or os.environ.get('SLACK_WEBHOOK_URL')
    if not webhook_url:
        print(f"[ALERT SLACK] Non configuré. Message : {message[:80]}")
        return False

    ok = _http_post(webhook_url, {
        "text": f"🚨 *GEO Monitor* — {_fmt_time()}\n\n{message}"
    })
    if ok:
        print("[ALERT SLACK] Envoyé ✓")
    return ok


# ── Email ─────────────────────────────────────────────────────────────────────

def send_email_alert(subject: str, body_text: str, body_html: str = None, smtp_config: dict = None) -> bool:
    """
    Envoie un email d'alerte via SMTP.
    Variables .env requises :
        SMTP_HOST     (ex: smtp.gmail.com)
        SMTP_PORT     (ex: 587)
        SMTP_USER     (ex: monadresse@gmail.com)
        SMTP_PASS     (ex: app-password-gmail)
        ALERT_EMAIL   (destinataire — peut être identique à SMTP_USER)
    """
    smtp_config = smtp_config or {}
    host       = smtp_config.get('host') or os.environ.get('SMTP_HOST')
    port       = int(smtp_config.get('port') or os.environ.get('SMTP_PORT', 587))
    user       = smtp_config.get('user') or os.environ.get('SMTP_USER')
    password   = smtp_config.get('password') or os.environ.get('SMTP_PASS')
    recipient  = smtp_config.get('recipient') or os.environ.get('ALERT_EMAIL')

    if not all([host, user, password, recipient]):
        missing = [k for k, v in {'SMTP_HOST': host, 'SMTP_USER': user,
                                   'SMTP_PASS': password, 'ALERT_EMAIL': recipient}.items() if not v]
        print(f"[ALERT EMAIL] Non configuré — manque : {missing}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"[GEO Monitor] {subject}"
        msg['From']    = f"GEO Monitor <{user}>"
        msg['To']      = recipient

        msg.attach(MIMEText(body_text, 'plain', 'utf-8'))

        if body_html:
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))

        context = ssl.create_default_context()

        if port == 465:
            # SSL direct
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as server:
                server.login(user, password)
                server.sendmail(user, recipient, msg.as_string())
        else:
            # STARTTLS (port 587)
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(user, password)
                server.sendmail(user, recipient, msg.as_string())

        print(f"[ALERT EMAIL] Envoyé à {recipient} ✓")
        return True

    except smtplib.SMTPAuthenticationError:
        print("[ALERT EMAIL] ✗ Erreur authentification SMTP — vérifiez SMTP_USER/SMTP_PASS")
        return False
    except smtplib.SMTPException as e:
        print(f"[ALERT EMAIL] ✗ Erreur SMTP : {e}")
        return False
    except Exception as e:
        print(f"[ALERT EMAIL] ✗ Erreur : {e}")
        return False


# ── Telegram ──────────────────────────────────────────────────────────────────

def send_telegram_alert(message: str, telegram_config: dict = None) -> bool:
    """
    Envoie un message Telegram via Bot API.
    Variables .env requises :
        TELEGRAM_BOT_TOKEN  (ex: 7012345678:AAFxxx...)
        TELEGRAM_CHAT_ID    (ex: -1001234567890 ou 123456789)

    Pour obtenir le chat_id :
        1. Créez un bot via @BotFather → récupérez le token
        2. Envoyez un message au bot
        3. Appelez https://api.telegram.org/bot{TOKEN}/getUpdates
        4. Copiez le "chat":{"id":...} dans TELEGRAM_CHAT_ID
    """
    telegram_config = telegram_config or {}
    token   = telegram_config.get('bot_token') or os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = telegram_config.get('chat_id') or os.environ.get('TELEGRAM_CHAT_ID')

    if not token or not chat_id:
        missing = []
        if not token:   missing.append('TELEGRAM_BOT_TOKEN')
        if not chat_id: missing.append('TELEGRAM_CHAT_ID')
        print(f"[ALERT TELEGRAM] Non configuré — manque : {missing}")
        return False

    url     = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id":    chat_id,
        "text":       f"🚨 GEO Monitor — {_fmt_time()}\n\n{message}",
        "parse_mode": "Markdown"
    }

    ok = _http_post(url, payload)
    if ok:
        print("[ALERT TELEGRAM] Envoyé ✓")
    else:
        print("[ALERT TELEGRAM] ✗ Échec envoi")
    return ok


# ── Dispatcher unifié ─────────────────────────────────────────────────────────

def send_alert(message: str, subject: str = None, html: str = None,
               channel_settings: dict = None, enabled_channels=None) -> dict:
    """
    Envoie l'alerte sur tous les canaux configurés.
    Retourne un dict avec le statut de chaque canal.

    Args:
        message : texte brut (Slack, Telegram, email plaintext)
        subject : objet email (facultatif, message tronqué par défaut)
        html    : corps HTML de l'email (facultatif)
    """
    results = {}
    channel_settings = channel_settings or {}

    email_subject = subject or message[:60] + ('…' if len(message) > 60 else '')
    email_html    = html or _default_html(message)

    if enabled_channels is None:
        if channel_settings:
            enabled_channels = [
                channel for channel, settings in channel_settings.items()
                if settings.get('enabled')
            ]
        else:
            enabled_channels = ['slack', 'email', 'telegram']

    enabled_channels = set(enabled_channels)

    if 'slack' in enabled_channels:
        results['slack'] = send_slack_alert(
            message,
            webhook_url=(channel_settings.get('slack') or {}).get('config', {}).get('webhook_url')
        )
    if 'email' in enabled_channels:
        results['email'] = send_email_alert(
            email_subject,
            message,
            email_html,
            smtp_config=(channel_settings.get('email') or {}).get('config', {})
        )
    if 'telegram' in enabled_channels:
        results['telegram'] = send_telegram_alert(
            message,
            telegram_config=(channel_settings.get('telegram') or {}).get('config', {})
        )

    sent = [k for k, v in results.items() if v]
    print(f"[ALERT] Canaux actifs : {sent or ['aucun']}")
    return results


# ── Templates d'alertes typiques ─────────────────────────────────────────────

def alert_rank_lost(brand: str, leader: str, gap: float, new_rank: int,
                    channel_settings: dict = None, enabled_channels=None) -> dict:
    """Alerte : la marque a perdu sa première place."""
    msg = (
        f"⚠️ *{brand}* a perdu sa 1ère place !\n"
        f"Leader actuel : *{leader}* (écart : -{gap:.1f} pts)\n"
        f"Nouveau rang {brand} : #{new_rank}"
    )
    html = _default_html(msg, title=f"{brand} — Perte de rang")
    return send_alert(
        msg,
        subject=f"[GEO] {brand} n'est plus #1",
        html=html,
        channel_settings=channel_settings,
        enabled_channels=enabled_channels
    )


def alert_weekly_summary(brand: str, rank: int, score: float,
                         mention_rate: float, top_competitors: list,
                         channel_settings: dict = None, enabled_channels=None) -> dict:
    """Résumé hebdomadaire automatique."""
    comps = ', '.join([f"{c['brand']} ({c['global_score']:.1f})" for c in top_competitors[:3]])
    msg = (
        f"📊 Résumé hebdo — *{brand}*\n"
        f"Rang : #{rank} | Score : {score:.1f}/100 | Mentions : {mention_rate:.0f}%\n"
        f"Top concurrents : {comps}"
    )
    html = _weekly_html(brand, rank, score, mention_rate, top_competitors)
    return send_alert(
        msg,
        subject=f"[GEO] Résumé hebdo — {brand}",
        html=html,
        channel_settings=channel_settings,
        enabled_channels=enabled_channels
    )


# ── Templates HTML ────────────────────────────────────────────────────────────

def _default_html(message: str, title: str = "Alerte GEO Monitor") -> str:
    safe = message.replace('\n', '<br>').replace('*', '')
    return f"""
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>{title}</title></head>
<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:32px;">
  <div style="max-width:560px;margin:auto;background:#111;border:2px solid #FFD700;padding:32px;">
    <div style="font-size:22px;font-weight:700;color:#FFD700;margin-bottom:16px;
                letter-spacing:2px;">GEO MONITOR</div>
    <div style="font-size:14px;line-height:1.7;color:#e0e0e0;">{safe}</div>
    <div style="margin-top:24px;font-size:11px;color:#666;">{_fmt_time()}</div>
  </div>
</body>
</html>"""


def _weekly_html(brand: str, rank: int, score: float,
                 mention_rate: float, top_competitors: list) -> str:
    rows = ''.join([
        f'<tr><td style="padding:8px;border-bottom:1px solid #222;">'
        f'{c["brand"]}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #222;text-align:right;">'
        f'#{c["rank"]}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #222;text-align:right;color:#FFD700;">'
        f'{c["global_score"]:.1f}</td></tr>'
        for c in top_competitors[:5]
    ])

    return f"""
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Résumé hebdo {brand}</title></head>
<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:32px;">
  <div style="max-width:560px;margin:auto;background:#111;border:2px solid #FFD700;padding:32px;">
    <div style="font-size:22px;font-weight:700;color:#FFD700;letter-spacing:2px;">
      GEO MONITOR
    </div>
    <div style="font-size:13px;color:#aaa;margin:4px 0 24px;letter-spacing:1px;">
      RÉSUMÉ HEBDOMADAIRE
    </div>

    <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;">{brand}</div>

    <div style="display:flex;gap:24px;margin:20px 0;flex-wrap:wrap;">
      <div style="background:#1a1a1a;border:1px solid #333;padding:16px 24px;min-width:100px;">
        <div style="font-size:28px;font-weight:700;color:#FFD700;">#{rank}</div>
        <div style="font-size:11px;color:#888;letter-spacing:1px;margin-top:4px;">RANG</div>
      </div>
      <div style="background:#1a1a1a;border:1px solid #333;padding:16px 24px;min-width:100px;">
        <div style="font-size:28px;font-weight:700;color:#fff;">{score:.1f}</div>
        <div style="font-size:11px;color:#888;letter-spacing:1px;margin-top:4px;">SCORE / 100</div>
      </div>
      <div style="background:#1a1a1a;border:1px solid #333;padding:16px 24px;min-width:100px;">
        <div style="font-size:28px;font-weight:700;color:#fff;">{mention_rate:.0f}%</div>
        <div style="font-size:11px;color:#888;letter-spacing:1px;margin-top:4px;">MENTIONS</div>
      </div>
    </div>

    <div style="font-size:12px;color:#888;letter-spacing:1px;margin-bottom:8px;">
      TOP CONCURRENTS
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#ccc;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #333;color:#888;">MARQUE</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #333;color:#888;">RANG</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #333;color:#888;">SCORE</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>

    <div style="margin-top:24px;font-size:11px;color:#555;">
      Généré le {_fmt_time()} par GEO Monitor
    </div>
  </div>
</body>
</html>"""
