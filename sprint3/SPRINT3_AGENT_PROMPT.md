# 🤖 Sprint 3 — Plan d'intégration complet
> Plateforme : **OpenCode CLI**
> Objectif : Comparateur de prompts + Alertes Email/Telegram + Résumé hebdo
> Prérequis : Sprint 1 ✅ + Sprint 2 ✅ intégrés et validés

---

## 📁 Carte des fichiers Sprint 3

```
FICHIERS À REMPLACER
backend/
├── alerts.py            ← REMPLACER (ajout Email + Telegram + dispatcher unifié)
├── app.py               ← REMPLACER (4 nouvelles routes + scheduler hebdo)

frontend/src/
├── App.jsx              ← REMPLACER (3 onglets Dashboard / Prompts / Alertes)

FICHIERS NOUVEAUX À CRÉER
frontend/src/components/
├── PromptComparator.jsx ← CRÉER
├── PromptComparator.css ← CRÉER
├── AlertsPanel.jsx      ← CRÉER
└── AlertsPanel.css      ← CRÉER

FICHIER À COMPLÉTER (ajout en bas)
frontend/src/
└── App.css              ← APPEND les styles .app-tabs / .app-tab

FICHIERS NON TOUCHÉS — NE PAS MODIFIER
backend/
├── analyzer.py          ← intact Sprint 2
├── llm_client.py        ← intact Sprint 1
├── database.py          ← intact Sprint 1
└── prompts.py           ← intact
frontend/src/
├── services/api.js      ← intact Sprint 2
├── components/AnalysisProgress.jsx/.css ← intact Sprint 2
├── components/LLMBreakdown.jsx/.css     ← intact Sprint 2
├── components/Charts.jsx, DuelCard.jsx, InsightsPanel.jsx
├── components/KpiCards.jsx, RankingTable.jsx, SentimentChart.jsx
├── components/TrendChart.jsx, TopNavbar.jsx, Onboarding.jsx
├── main.jsx
```

---

## ✅ Checklist de validation Sprint 3

```
[ ] 1.  alerts.py   — send_email_alert() présente (smtplib)
[ ] 2.  alerts.py   — send_telegram_alert() présente (Bot API)
[ ] 3.  alerts.py   — send_alert() dispatcher unifié présent
[ ] 4.  alerts.py   — alert_rank_lost() + alert_weekly_summary() présentes
[ ] 5.  alerts.py   — _weekly_html() + _default_html() templates présents
[ ] 6.  app.py      — route GET  /api/prompts/compare présente
[ ] 7.  app.py      — route POST /api/alerts/test présente
[ ] 8.  app.py      — route GET  /api/alerts/status présente
[ ] 9.  app.py      — route POST /api/alerts/weekly présente
[ ] 10. app.py      — _scheduled_weekly_summary() présente
[ ] 11. app.py      — scheduler hebdo cron lundi 09h présent
[ ] 12. app.py      — _save_and_alert() appelle alert_rank_lost()
[ ] 13. PromptComparator.jsx + .css — fichiers créés
[ ] 14. AlertsPanel.jsx + .css      — fichiers créés
[ ] 15. App.jsx     — import PromptComparator et AlertsPanel
[ ] 16. App.jsx     — state activeTab + 3 onglets (dashboard/prompts/alerts)
[ ] 17. App.css     — styles .app-tabs et .app-tab ajoutés en bas
[ ] 18. python3 -m py_compile backend/alerts.py  — OK
[ ] 19. python3 -m py_compile backend/app.py     — OK
[ ] 20. cd frontend && npm run build             — OK
[ ] 21. Test /api/alerts/status → {slack, email, telegram}
[ ] 22. Test /api/prompts/compare → {prompts, best_prompt, worst_prompt}
[ ] 23. Onglets Dashboard / Prompts / Alertes visibles dans l'UI
```

---

## 🤖 PROMPT AGENT — À coller tel quel dans OpenCode CLI

```
Tu es un développeur fullstack senior Python/Flask/React.
Tu intègres le Sprint 3 du projet GEO Monitor.
Les Sprints 1 et 2 sont déjà en place — ne rien casser.
Suis les instructions dans l'ordre exact. Valide la syntaxe après chaque fichier.

═══════════════════════════════════════════════════════
CONTEXTE SPRINT 3
═══════════════════════════════════════════════════════

Sprint 3 ajoute trois fonctionnalités :

1. ALERTES MULTI-CANAUX
   - Slack existait déjà (Sprint 1)
   - Sprint 3 ajoute : Email (smtplib) + Telegram (Bot API)
   - Dispatcher unifié send_alert() → envoie sur tous les canaux configurés
   - Templates HTML pour les emails (noir/jaune GEO Monitor)

2. COMPARATEUR DE PROMPTS
   - Endpoint GET /api/prompts/compare
   - Calcule pour chaque prompt : mention_rate, avg_position, top_of_mind, score
   - Identifie best_prompt et worst_prompt
   - Composant React PromptComparator avec tri et filtres

3. RÉSUMÉ HEBDOMADAIRE AUTOMATIQUE
   - APScheduler cron : tous les lundis à 09h00
   - Envoie le résumé sur tous les canaux configurés
   - Déclenche aussi via POST /api/alerts/weekly (pour tests)

═══════════════════════════════════════════════════════
ÉTAPE 0 — SAUVEGARDES
═══════════════════════════════════════════════════════

```bash
cp backend/alerts.py backend/alerts.py.bak
cp backend/app.py backend/app.py.bak
cp frontend/src/App.jsx frontend/src/App.jsx.bak
```

═══════════════════════════════════════════════════════
ÉTAPE 1 — backend/alerts.py
═══════════════════════════════════════════════════════

REMPLACE INTÉGRALEMENT le fichier alerts.py.

Le nouveau fichier doit contenir exactement ces fonctions dans cet ordre :

1. Imports : os, json, urllib.request, urllib.parse, smtplib, ssl,
   email.mime.text, email.mime.multipart, datetime

2. _http_post(url, payload, headers=None) → bool
   POST JSON via urllib — pas de dépendance requests

3. _fmt_time() → str
   datetime.now().strftime('%H:%M %d/%m/%Y')

4. send_slack_alert(message: str) → bool
   Lit SLACK_WEBHOOK_URL. Si absent → log + retourne False
   POST {"text": "🚨 GEO Monitor — {time}\n\n{message}"}

5. send_email_alert(subject: str, body_text: str, body_html: str = None) → bool
   Lit : SMTP_HOST, SMTP_PORT (défaut 587), SMTP_USER, SMTP_PASS, ALERT_EMAIL
   Si un manque → log les manquants + retourne False
   Port 465 → SMTP_SSL ; port 587 → STARTTLS
   Objet : f"[GEO Monitor] {subject}"
   Corps : MIMEMultipart alternative (text + html)

6. send_telegram_alert(message: str) → bool
   Lit : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
   Si un manque → log + retourne False
   URL : https://api.telegram.org/bot{token}/sendMessage
   Payload : {"chat_id": chat_id, "text": "...", "parse_mode": "Markdown"}

7. send_alert(message, subject=None, html=None) → dict
   DISPATCHER UNIFIÉ — appelle les 3 canaux
   Retourne {"slack": bool, "email": bool, "telegram": bool}
   email_subject = subject ou message[:60] + '…'
   email_html = html ou _default_html(message)

8. alert_rank_lost(brand, leader, gap, new_rank) → dict
   Message type : "⚠️ *{brand}* a perdu sa 1ère place !\nLeader : *{leader}*..."
   Appelle send_alert()

9. alert_weekly_summary(brand, rank, score, mention_rate, top_competitors) → dict
   Message type : "📊 Résumé hebdo — *{brand}*\n..."
   html = _weekly_html(...)
   Appelle send_alert()

10. _default_html(message, title="Alerte GEO Monitor") → str
    Template HTML email basique — fond #0a0a0a, border #FFD700, texte blanc

11. _weekly_html(brand, rank, score, mention_rate, top_competitors) → str
    Template HTML email tableau avec KPI cards + tableau concurrents
    Style identique : fond noir, accent jaune #FFD700

CODE COMPLET des fonctions critiques :

```python
import os, json, urllib.request, smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def _http_post(url, payload, headers=None):
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', **(headers or {})}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[ALERT] HTTP POST failed: {e}")
        return False

def _fmt_time():
    return datetime.now().strftime('%H:%M %d/%m/%Y')

def send_slack_alert(message):
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    if not webhook_url:
        print(f"[ALERT SLACK] Non configuré. Message : {message[:80]}")
        return False
    ok = _http_post(webhook_url, {"text": f"🚨 *GEO Monitor* — {_fmt_time()}\n\n{message}"})
    if ok: print("[ALERT SLACK] Envoyé ✓")
    return ok

def send_email_alert(subject, body_text, body_html=None):
    host      = os.environ.get('SMTP_HOST')
    port      = int(os.environ.get('SMTP_PORT', 587))
    user      = os.environ.get('SMTP_USER')
    password  = os.environ.get('SMTP_PASS')
    recipient = os.environ.get('ALERT_EMAIL')
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
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as server:
                server.login(user, password)
                server.sendmail(user, recipient, msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo(); server.starttls(context=context)
                server.login(user, password)
                server.sendmail(user, recipient, msg.as_string())
        print(f"[ALERT EMAIL] Envoyé à {recipient} ✓")
        return True
    except smtplib.SMTPAuthenticationError:
        print("[ALERT EMAIL] ✗ Erreur auth SMTP"); return False
    except Exception as e:
        print(f"[ALERT EMAIL] ✗ {e}"); return False

def send_telegram_alert(message):
    token   = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        missing = [k for k, v in {'TELEGRAM_BOT_TOKEN': token, 'TELEGRAM_CHAT_ID': chat_id}.items() if not v]
        print(f"[ALERT TELEGRAM] Non configuré — manque : {missing}")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    ok  = _http_post(url, {"chat_id": chat_id,
                            "text": f"🚨 GEO Monitor — {_fmt_time()}\n\n{message}",
                            "parse_mode": "Markdown"})
    if ok: print("[ALERT TELEGRAM] Envoyé ✓")
    else:  print("[ALERT TELEGRAM] ✗ Échec")
    return ok

def send_alert(message, subject=None, html=None):
    email_subject = subject or (message[:60] + ('…' if len(message) > 60 else ''))
    email_html    = html or _default_html(message)
    results = {
        'slack':    send_slack_alert(message),
        'email':    send_email_alert(email_subject, message, email_html),
        'telegram': send_telegram_alert(message)
    }
    sent = [k for k, v in results.items() if v]
    print(f"[ALERT] Canaux actifs : {sent or ['aucun']}")
    return results

def alert_rank_lost(brand, leader, gap, new_rank):
    msg  = (f"⚠️ *{brand}* a perdu sa 1ère place !\n"
            f"Leader actuel : *{leader}* (écart : -{gap:.1f} pts)\n"
            f"Nouveau rang {brand} : #{new_rank}")
    html = _default_html(msg, title=f"{brand} — Perte de rang")
    return send_alert(msg, subject=f"[GEO] {brand} n'est plus #1", html=html)

def alert_weekly_summary(brand, rank, score, mention_rate, top_competitors):
    comps = ', '.join([f"{c['brand']} ({c['global_score']:.1f})" for c in top_competitors[:3]])
    msg   = (f"📊 Résumé hebdo — *{brand}*\n"
             f"Rang : #{rank} | Score : {score:.1f}/100 | Mentions : {mention_rate:.0f}%\n"
             f"Top concurrents : {comps}")
    html  = _weekly_html(brand, rank, score, mention_rate, top_competitors)
    return send_alert(msg, subject=f"[GEO] Résumé hebdo — {brand}", html=html)
```

Pour _default_html et _weekly_html : templates HTML avec fond #0a0a0a,
border 2px solid #FFD700, police Arial, texte blanc.
_weekly_html inclut 3 KPI cards (rang, score, mentions) + tableau concurrents.

Validation :
```bash
python3 -m py_compile backend/alerts.py && echo "✅ alerts.py"
python3 -c "
import sys; sys.path.insert(0,'backend')
from alerts import send_alert, alert_rank_lost, alert_weekly_summary, _weekly_html

r = send_alert('Test sans config')
assert r == {'slack': False, 'email': False, 'telegram': False}
print('✅ send_alert (no config)')

html = _weekly_html('Nike', 1, 72.5, 85.0, [{'brand':'Adidas','rank':2,'global_score':61.3}])
assert '<html' in html and 'Nike' in html
print('✅ _weekly_html HTML valide')

r2 = alert_rank_lost('Nike', 'Adidas', 5.2, 2)
assert isinstance(r2, dict) and set(r2.keys()) == {'slack','email','telegram'}
print('✅ alert_rank_lost structure OK')
print('✅ alerts.py — tous les tests OK')
"
```

═══════════════════════════════════════════════════════
ÉTAPE 2 — backend/app.py
═══════════════════════════════════════════════════════

REMPLACE INTÉGRALEMENT le fichier app.py.

Conserve TOUTES les routes des Sprints 1 et 2 :
  GET  /              POST /api/run-analysis
  GET  /api/status    POST /api/run-analysis/stream
  GET  /api/projects  GET  /api/metrics
  POST /api/generate-config
  GET  /api/metrics/by-model
  GET  /api/history
  GET  /api/export

AJOUTE ces éléments :

A) Import alerts complet :
```python
from alerts import send_alert, alert_rank_lost, alert_weekly_summary, send_slack_alert
```

B) Modifier _save_and_alert() pour utiliser alert_rank_lost() :
```python
def _save_and_alert(results, brand):
    _save_results(results)
    save_analysis(results)
    try:
        all_analyses = [d['analysis'] for r in results['responses']
                        for d in r['llm_analyses'].values()]
        all_brands   = [brand] + results.get('competitors', [])
        az      = BrandAnalyzer(brands=all_brands)
        metrics = az.calculate_metrics(all_analyses)
        ranking = az.generate_ranking(metrics)
        if ranking and ranking[0]['brand'] != brand:
            leader   = ranking[0]
            gap      = leader['global_score'] - metrics.get(brand, {}).get('global_score', 0)
            new_rank = next((r['rank'] for r in ranking if r['brand'] == brand), None)
            alert_rank_lost(brand, leader['brand'], gap, new_rank or 0)   # ← SPRINT 3
    except Exception as e:
        print(f"[ALERT] {e}")
```

C) Nouvelle fonction _scheduled_weekly_summary() :
```python
def _scheduled_weekly_summary():
    results = _load_results()
    if not results:
        return
    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors
    az          = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics = az.calculate_metrics(all_analyses)
    ranking = az.generate_ranking(metrics)
    brand_data = metrics.get(brand, {})
    brand_rank = next((r['rank'] for r in ranking if r['brand'] == brand), None)
    top_competitors = [r for r in ranking if r['brand'] != brand][:5]
    alert_weekly_summary(
        brand=brand, rank=brand_rank or 0,
        score=brand_data.get('global_score', 0),
        mention_rate=brand_data.get('mention_rate', 0),
        top_competitors=top_competitors
    )
```

D) Modifier _start_scheduler() pour ajouter le job hebdo :
```python
def _start_scheduler():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(_scheduled_analysis, 'interval', hours=6, id='auto_analysis')
        # NOUVEAU Sprint 3 : résumé hebdo lundi 09h
        scheduler.add_job(_scheduled_weekly_summary, 'cron',
                          day_of_week='mon', hour=9, minute=0, id='weekly_summary')
        scheduler.start()
        print("[SCHEDULER] Actif — analyse 6h + résumé hebdo lundi 09h")
        return scheduler
    except ImportError:
        print("[SCHEDULER] apscheduler non installé")
        return None
    except Exception as e:
        print(f"[SCHEDULER] Erreur : {e}")
        return None
```

E) NOUVELLE route GET /api/prompts/compare :
```python
@app.route('/api/prompts/compare', methods=['GET'])
def compare_prompts():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée — lancez une analyse'}), 404

    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])

    prompt_stats = []

    for response in results['responses']:
        prompt = response.get('prompt', '')
        if not prompt:
            continue

        analyses_for_prompt = [d['analysis'] for d in response['llm_analyses'].values()]
        total_models = len(analyses_for_prompt)
        if total_models == 0:
            continue

        # Mention rate = % de modèles qui mentionnent la marque
        mentions    = sum(1 for a in analyses_for_prompt if brand in a.get('brands_mentioned', []))
        mention_pct = round(mentions / total_models * 100, 1)

        # Position moyenne quand mentionnée
        positions = [a['positions'].get(brand) for a in analyses_for_prompt
                     if a['positions'].get(brand) is not None]
        avg_pos   = round(sum(positions) / len(positions), 2) if positions else None

        # Top of mind = % de fois cité en premier
        first_counts = sum(1 for a in analyses_for_prompt if a.get('first_brand') == brand)
        top_of_mind  = round(first_counts / total_models * 100, 1)

        # Concurrents mentionnés dans ce prompt
        comp_mentions = {}
        for a in analyses_for_prompt:
            for b in a.get('brands_mentioned', []):
                if b != brand:
                    comp_mentions[b] = comp_mentions.get(b, 0) + 1
        comps_list = [b for b, _ in sorted(comp_mentions.items(), key=lambda x: -x[1])[:3]]

        # Score composite
        score = (mention_pct * 0.5 +
                 (100 / avg_pos if avg_pos and avg_pos > 0 else 0) * 0.3 +
                 top_of_mind * 0.2)

        prompt_stats.append({
            'prompt':                prompt,
            'mention_rate':          mention_pct,
            'avg_position':          avg_pos,
            'top_of_mind':           top_of_mind,
            'brand_mentioned':       mentions > 0,
            'brand_position':        positions[0] if positions else None,
            'competitors_mentioned': comps_list,
            'models_count':          total_models,
            'score':                 round(score, 1)
        })

    prompt_stats.sort(key=lambda x: -x['score'])
    return jsonify({
        'brand':         brand,
        'prompts':       prompt_stats,
        'best_prompt':   prompt_stats[0]['prompt']  if prompt_stats else None,
        'worst_prompt':  prompt_stats[-1]['prompt'] if prompt_stats else None,
        'total_prompts': len(prompt_stats),
        'metadata': {
            'timestamp': results['timestamp'],
            'is_demo':   results.get('is_demo', False),
            'models':    results.get('llms_used', ['qwen3.5'])
        }
    })
```

F) NOUVELLE route GET /api/alerts/status :
```python
@app.route('/api/alerts/status', methods=['GET'])
def alerts_status():
    return jsonify({
        'slack':    {'configured': bool(os.environ.get('SLACK_WEBHOOK_URL')), 'channel': 'webhook'},
        'email':    {'configured': all([os.environ.get(k) for k in ['SMTP_HOST','SMTP_USER','SMTP_PASS','ALERT_EMAIL']]),
                     'recipient': os.environ.get('ALERT_EMAIL', '—'),
                     'host':      os.environ.get('SMTP_HOST', '—')},
        'telegram': {'configured': all([os.environ.get('TELEGRAM_BOT_TOKEN'), os.environ.get('TELEGRAM_CHAT_ID')]),
                     'chat_id':   os.environ.get('TELEGRAM_CHAT_ID', '—')}
    })
```

G) NOUVELLE route POST /api/alerts/test :
```python
@app.route('/api/alerts/test', methods=['POST'])
def test_alert():
    data    = request.get_json() or {}
    channel = data.get('channel', 'all')
    message = data.get('message', '🧪 Ceci est un test GEO Monitor.')
    results = {}
    from alerts import send_slack_alert as _slack, send_email_alert as _email, send_telegram_alert as _tg
    if channel in ('all', 'slack'):    results['slack']    = _slack(message)
    if channel in ('all', 'email'):    results['email']    = _email("Test GEO Monitor", message)
    if channel in ('all', 'telegram'): results['telegram'] = _tg(message)
    success = any(results.values())
    return jsonify({'status': 'success' if success else 'failed', 'results': results,
                    'message': 'Au moins un canal a répondu' if success else 'Aucun canal configuré'})
```

H) NOUVELLE route POST /api/alerts/weekly :
```python
@app.route('/api/alerts/weekly', methods=['POST'])
def trigger_weekly():
    try:
        _scheduled_weekly_summary()
        return jsonify({'status': 'success', 'message': 'Résumé hebdo envoyé'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
```

Validation :
```bash
python3 -m py_compile backend/app.py && echo "✅ app.py"
# Vérifier les 4 nouvelles routes
grep "/api/prompts/compare"  backend/app.py && echo "✅ compare_prompts"
grep "/api/alerts/status"    backend/app.py && echo "✅ alerts_status"
grep "/api/alerts/test"      backend/app.py && echo "✅ test_alert"
grep "/api/alerts/weekly"    backend/app.py && echo "✅ trigger_weekly"
# Vérifier le scheduler hebdo
grep "weekly_summary"        backend/app.py && echo "✅ scheduler hebdo"
grep "day_of_week='mon'"     backend/app.py && echo "✅ cron lundi"
grep "threaded=True"         backend/app.py && echo "✅ threaded=True"
```

═══════════════════════════════════════════════════════
ÉTAPE 3 — CRÉER frontend/src/components/PromptComparator.css
═══════════════════════════════════════════════════════

Crée le fichier avec ce contenu exact :

```css
.pc-wrapper { background:var(--bg-secondary); border:var(--border-thick) solid var(--border-color); margin-bottom:20px; }
.pc-header { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:var(--border-thick) solid var(--border-color); background:var(--bg-tertiary); flex-wrap:wrap; gap:8px; }
.pc-title-block { display:flex; align-items:center; gap:10px; }
.pc-title { font-family:var(--font-display); font-size:12px; color:var(--text-primary); margin:0; text-transform:uppercase; letter-spacing:1px; }
.pc-brand-chip { font-family:var(--font-mono); font-size:10px; font-weight:700; padding:2px 10px; background:rgba(255,215,0,0.1); color:var(--accent-yellow); border:1px solid var(--accent-yellow); }
.pc-header-stats { display:flex; gap:8px; }
.pc-stat-chip { font-family:var(--font-mono); font-size:10px; padding:3px 10px; font-weight:600; }
.pc-stat-chip.mentioned { background:rgba(0,204,68,0.1); color:var(--accent-green); border:1px solid var(--accent-green); }
.pc-stat-chip.absent { background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid var(--border-color); }
.pc-bw-row { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--border-color); border-bottom:var(--border-thick) solid var(--border-color); }
.pc-bw-card { display:flex; flex-direction:column; gap:6px; padding:14px 20px; background:var(--bg-secondary); }
.pc-bw-card.best { border-left:3px solid var(--accent-green); }
.pc-bw-card.worst { border-left:3px solid var(--border-color); }
.pc-bw-label { font-family:var(--font-mono); font-size:9px; letter-spacing:1.5px; color:var(--text-muted); }
.pc-bw-card.best .pc-bw-label { color:var(--accent-green); }
.pc-bw-text { font-family:var(--font-mono); font-size:12px; color:var(--text-secondary); line-height:1.4; }
.pc-controls { display:flex; gap:24px; padding:12px 20px; border-bottom:1px solid var(--border-color); background:var(--bg-tertiary); flex-wrap:wrap; align-items:center; }
.pc-sort-group, .pc-filter-group { display:flex; align-items:center; gap:6px; }
.pc-ctrl-label { font-family:var(--font-mono); font-size:9px; letter-spacing:1px; color:var(--text-muted); margin-right:2px; }
.pc-ctrl-btn { font-family:var(--font-mono); font-size:10px; padding:4px 10px; background:transparent; border:1px solid var(--border-color); color:var(--text-muted); cursor:pointer; transition:all 0.15s; }
.pc-ctrl-btn:hover { border-color:var(--text-muted); color:var(--text-secondary); }
.pc-ctrl-btn.active { background:var(--accent-yellow); border-color:var(--accent-yellow); color:#000; font-weight:700; }
.pc-list { display:flex; flex-direction:column; }
.pc-row { display:flex; align-items:stretch; border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.12s; }
.pc-row:hover { background:var(--bg-tertiary); }
.pc-row.mentioned { border-left:3px solid var(--accent-green); }
.pc-row.absent { border-left:3px solid transparent; }
.pc-row-rank { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:12px 14px; min-width:54px; border-right:1px solid rgba(255,255,255,0.04); }
.pc-rank-num { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); font-weight:600; }
.pc-score-bar-track { width:28px; height:3px; background:rgba(255,255,255,0.08); }
.pc-score-bar-fill { height:100%; background:var(--accent-yellow); transition:width 0.4s ease; }
.pc-row-body { flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:8px; }
.pc-prompt-text { font-family:var(--font-mono); font-size:12px; color:var(--text-secondary); line-height:1.4; }
.pc-row-meta { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.pc-meta-item { display:flex; flex-direction:column; gap:2px; }
.pc-meta-label { font-family:var(--font-mono); font-size:8px; letter-spacing:1px; color:var(--text-muted); }
.pc-meta-val { font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--text-muted); }
.pc-meta-val.good { color:var(--accent-green); }
.pc-meta-val.mid { color:var(--accent-yellow); }
.pc-meta-val.score { color:var(--text-primary); }
.pc-comps { display:flex; gap:4px; flex-wrap:wrap; }
.pc-comp-chip { font-family:var(--font-mono); font-size:9px; padding:2px 6px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-muted); }
.pc-row-badge { display:flex; align-items:center; justify-content:center; padding:0 16px; min-width:60px; border-left:1px solid rgba(255,255,255,0.04); }
.pc-badge-ok { font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--accent-green); }
.pc-badge-no { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
.pc-empty { padding:32px; text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--text-muted); }
.pc-loading { padding:48px; text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--text-muted); letter-spacing:2px; }
.pc-footer { padding:10px 20px; font-family:var(--font-mono); font-size:10px; color:var(--text-muted); border-top:1px solid var(--border-color); }
@media (max-width:600px) { .pc-bw-row { grid-template-columns:1fr; } .pc-controls { gap:12px; } }
```

═══════════════════════════════════════════════════════
ÉTAPE 4 — CRÉER frontend/src/components/PromptComparator.jsx
═══════════════════════════════════════════════════════

```jsx
import React, { useState, useEffect } from 'react';
import './PromptComparator.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PromptComparator({ brand }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('score');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    fetch(`${API_URL}/prompts/compare`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(makeDemoData(brand)); setLoading(false); });
  }, [brand]);

  if (loading) return <div className="pc-wrapper"><div className="pc-loading">CHARGEMENT…</div></div>;
  if (!data)   return null;

  const prompts = (data.prompts || [])
    .filter(p => filter === 'all' ? true : filter === 'mentioned' ? p.brand_mentioned : !p.brand_mentioned)
    .sort((a, b) => {
      if (sortBy === 'mention_rate') return b.mention_rate - a.mention_rate;
      if (sortBy === 'avg_position') { if (!a.avg_position) return 1; if (!b.avg_position) return -1; return a.avg_position - b.avg_position; }
      return b.score - a.score;
    });

  const maxScore       = Math.max(...prompts.map(p => p.score), 1);
  const mentionedCount = (data.prompts || []).filter(p => p.brand_mentioned).length;
  const absentCount    = (data.prompts || []).length - mentionedCount;

  return (
    <div className="pc-wrapper">
      <div className="pc-header">
        <div className="pc-title-block">
          <h3 className="pc-title">COMPARATEUR DE PROMPTS</h3>
          <span className="pc-brand-chip">{brand?.toUpperCase()}</span>
        </div>
        <div className="pc-header-stats">
          <span className="pc-stat-chip mentioned">{mentionedCount} mentionnée</span>
          <span className="pc-stat-chip absent">{absentCount} absente</span>
        </div>
      </div>

      {data.best_prompt && data.worst_prompt && (
        <div className="pc-bw-row">
          <div className="pc-bw-card best">
            <span className="pc-bw-label">MEILLEUR PROMPT</span>
            <span className="pc-bw-text">{data.best_prompt}</span>
          </div>
          <div className="pc-bw-card worst">
            <span className="pc-bw-label">PIRE PROMPT</span>
            <span className="pc-bw-text">{data.worst_prompt}</span>
          </div>
        </div>
      )}

      <div className="pc-controls">
        <div className="pc-sort-group">
          <span className="pc-ctrl-label">TRIER PAR</span>
          {[['score','Score'],['mention_rate','Mentions'],['avg_position','Position']].map(([v,l]) => (
            <button key={v} className={`pc-ctrl-btn ${sortBy===v?'active':''}`} onClick={() => setSortBy(v)}>{l}</button>
          ))}
        </div>
        <div className="pc-filter-group">
          <span className="pc-ctrl-label">FILTRER</span>
          {[['all','Tous'],['mentioned','Mentionnée'],['absent','Absente']].map(([v,l]) => (
            <button key={v} className={`pc-ctrl-btn ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="pc-list">
        {prompts.length === 0 && <div className="pc-empty">Aucun résultat pour ce filtre.</div>}
        {prompts.map((p, i) => (
          <div key={i} className={`pc-row ${p.brand_mentioned ? 'mentioned' : 'absent'}`}>
            <div className="pc-row-rank">
              <span className="pc-rank-num">{i+1}</span>
              <div className="pc-score-bar-track">
                <div className="pc-score-bar-fill" style={{ width: `${(p.score/maxScore)*100}%` }} />
              </div>
            </div>
            <div className="pc-row-body">
              <div className="pc-prompt-text">{p.prompt}</div>
              <div className="pc-row-meta">
                <div className="pc-meta-item">
                  <span className="pc-meta-label">MENTION</span>
                  <span className={`pc-meta-val ${p.mention_rate>50?'good':p.mention_rate>0?'mid':''}`}>{p.mention_rate}%</span>
                </div>
                <div className="pc-meta-item">
                  <span className="pc-meta-label">POSITION</span>
                  <span className={`pc-meta-val ${p.avg_position&&p.avg_position<=2?'good':'mid'}`}>{p.avg_position?`#${p.avg_position}`:'—'}</span>
                </div>
                <div className="pc-meta-item">
                  <span className="pc-meta-label">TOP MIND</span>
                  <span className="pc-meta-val">{p.top_of_mind}%</span>
                </div>
                <div className="pc-meta-item">
                  <span className="pc-meta-label">SCORE</span>
                  <span className="pc-meta-val score">{p.score}</span>
                </div>
                {p.competitors_mentioned?.length > 0 && (
                  <div className="pc-comps">
                    {p.competitors_mentioned.map(c => <span key={c} className="pc-comp-chip">{c}</span>)}
                  </div>
                )}
              </div>
            </div>
            <div className="pc-row-badge">
              {p.brand_mentioned
                ? <span className="pc-badge-ok">✓ #{p.brand_position??'?'}</span>
                : <span className="pc-badge-no">—</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="pc-footer">
        {data.metadata?.models?.join(', ') || 'qwen3.5'} · {data.metadata?.is_demo ? 'démo' : 'réel'} · {data.total_prompts} prompts
      </div>
    </div>
  );
}

function makeDemoData(brand) {
  const promptsList = [`Meilleure offre ${brand} ?`, `Comparatif ${brand} vs concurrents`,
    `Top marques recommandées`, `${brand} fiable ?`, `Alternatives à ${brand}`, `Avis ${brand}`];
  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }
  const stats = promptsList.map((prompt, i) => {
    const rand = seededRand(i * 997 + brand.charCodeAt(0) * 31);
    const mention_rate = Math.round(rand() * 90);
    const avg_position = mention_rate > 0 ? parseFloat((1 + rand() * 4).toFixed(1)) : null;
    const top_of_mind  = mention_rate > 0 ? Math.round(rand() * 50) : 0;
    const score = parseFloat((mention_rate * 0.5 + (avg_position ? 100/avg_position*0.3 : 0) + top_of_mind * 0.2).toFixed(1));
    return { prompt, mention_rate, avg_position, top_of_mind,
             brand_mentioned: mention_rate > 0, brand_position: avg_position ? Math.round(avg_position) : null,
             competitors_mentioned: ['Concurrent A', 'Concurrent B'].filter(() => rand() > 0.5), models_count: 1, score };
  });
  stats.sort((a, b) => b.score - a.score);
  return { brand, prompts: stats, best_prompt: stats[0]?.prompt, worst_prompt: stats[stats.length-1]?.prompt,
           total_prompts: stats.length, metadata: { is_demo: true, models: ['qwen3.5'] } };
}
```

═══════════════════════════════════════════════════════
ÉTAPE 5 — CRÉER frontend/src/components/AlertsPanel.css
═══════════════════════════════════════════════════════

```css
.ap2-wrapper { background:var(--bg-secondary); border:var(--border-thick) solid var(--border-color); margin-bottom:20px; }
.ap2-header { padding:14px 20px; border-bottom:var(--border-thick) solid var(--border-color); background:var(--bg-tertiary); }
.ap2-title-row { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
.ap2-title { font-family:var(--font-display); font-size:12px; color:var(--text-primary); margin:0; text-transform:uppercase; letter-spacing:1px; }
.ap2-config-badge { font-family:var(--font-mono); font-size:10px; font-weight:700; padding:2px 8px; }
.ap2-config-badge.ok { background:rgba(0,204,68,0.1); color:var(--accent-green); border:1px solid var(--accent-green); }
.ap2-config-badge.none { background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid var(--border-color); }
.ap2-scheduler-note { font-family:var(--font-mono); font-size:10px; color:var(--text-muted); }
.ap2-channels { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border-color); border-bottom:var(--border-thick) solid var(--border-color); }
.ap2-channel { background:var(--bg-secondary); padding:18px 20px; display:flex; flex-direction:column; gap:10px; }
.ap2-channel.configured { border-top:2px solid var(--accent-green); }
.ap2-channel.unconfigured { border-top:2px solid var(--border-color); }
.ap2-channel-header { display:flex; align-items:center; gap:8px; }
.ap2-channel-icon { font-size:14px; }
.ap2-channel-label { font-family:var(--font-display); font-size:13px; color:var(--text-primary); flex:1; }
.ap2-status-dot { font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:0.5px; }
.ap2-status-dot.on { color:var(--accent-green); }
.ap2-status-dot.off { color:var(--text-muted); }
.ap2-channel-detail { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); line-height:1.4; min-height:32px; }
.ap2-envs { display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
.ap2-env-chip { font-family:var(--font-mono); font-size:9px; padding:2px 6px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--accent-yellow); }
.ap2-doc-link { font-family:var(--font-mono); font-size:9px; color:var(--text-muted); text-decoration:none; border-bottom:1px solid var(--border-color); }
.ap2-doc-link:hover { color:var(--text-secondary); }
.ap2-channel-footer { display:flex; align-items:center; gap:10px; margin-top:auto; }
.ap2-test-btn { font-family:var(--font-mono); font-size:11px; padding:6px 14px; background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-secondary); cursor:pointer; transition:all 0.15s; }
.ap2-test-btn:hover:not(.disabled) { background:var(--accent-yellow); border-color:var(--accent-yellow); color:#000; font-weight:700; }
.ap2-test-btn.disabled { opacity:0.35; cursor:not-allowed; }
.ap2-result { font-family:var(--font-mono); font-size:11px; font-weight:700; }
.ap2-result.success { color:var(--accent-green); }
.ap2-result.failed, .ap2-result.error { color:#ff4444; }
.ap2-weekly-section { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border-color); background:var(--bg-tertiary); gap:16px; flex-wrap:wrap; }
.ap2-weekly-info { display:flex; flex-direction:column; gap:4px; }
.ap2-weekly-label { font-family:var(--font-mono); font-size:10px; letter-spacing:1px; color:var(--text-muted); }
.ap2-weekly-desc { font-family:var(--font-mono); font-size:12px; color:var(--text-secondary); }
.ap2-weekly-actions { display:flex; align-items:center; gap:12px; }
.ap2-weekly-btn { font-family:var(--font-mono); font-size:11px; padding:8px 20px; background:var(--bg-secondary); border:1px solid var(--accent-yellow); color:var(--accent-yellow); cursor:pointer; transition:all 0.15s; font-weight:600; }
.ap2-weekly-btn:hover:not(.disabled) { background:var(--accent-yellow); color:#000; }
.ap2-weekly-btn.disabled { opacity:0.35; cursor:not-allowed; border-color:var(--border-color); color:var(--text-muted); }
.ap2-footer { padding:12px 20px; display:flex; flex-direction:column; gap:6px; }
.ap2-trigger { display:flex; align-items:center; gap:8px; }
.ap2-trigger-icon { font-size:12px; width:18px; text-align:center; flex-shrink:0; }
.ap2-trigger-text { font-family:var(--font-mono); font-size:11px; color:var(--text-muted); }
.ap2-loading { padding:48px; text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--text-muted); letter-spacing:2px; }
@media (max-width:768px) { .ap2-channels { grid-template-columns:1fr; } .ap2-weekly-section { flex-direction:column; align-items:flex-start; } }
```

═══════════════════════════════════════════════════════
ÉTAPE 6 — CRÉER frontend/src/components/AlertsPanel.jsx
═══════════════════════════════════════════════════════

Composant complet fourni dans les livrables Sprint 3 (AlertsPanel.jsx).

Structure clé :
- useEffect → fetch /api/alerts/status → setStatus
- Si fetch échoue → status par défaut (tout à false)
- 3 canaux affichés : slack, email, telegram
- Chaque canal : badge ACTIF/INACTIF + variables .env requises si inactif
- Bouton "Tester" → POST /api/alerts/test avec {channel, message}
- Section résumé hebdo → POST /api/alerts/weekly

Validation :
```bash
test -f frontend/src/components/AlertsPanel.jsx && echo "✅ AlertsPanel.jsx"
test -f frontend/src/components/AlertsPanel.css  && echo "✅ AlertsPanel.css"
```

═══════════════════════════════════════════════════════
ÉTAPE 7 — frontend/src/App.jsx
═══════════════════════════════════════════════════════

REMPLACE INTÉGRALEMENT le fichier App.jsx.

CHANGEMENTS par rapport à App.jsx Sprint 2 :

1. Nouveaux imports :
```jsx
import PromptComparator from './components/PromptComparator';
import AlertsPanel from './components/AlertsPanel';
```

2. Nouvel état :
```jsx
const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard'|'prompts'|'alerts'
```

3. Dans le JSX, après TopNavbar et AVANT main-content — ajouter les onglets :
```jsx
<div className="app-tabs">
  {[
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'prompts',   label: 'Prompts'   },
    { key: 'alerts',    label: 'Alertes'   },
  ].map(tab => (
    <button key={tab.key}
      className={`app-tab ${activeTab === tab.key ? 'active' : ''}`}
      onClick={() => setActiveTab(tab.key)}>
      {tab.label}
    </button>
  ))}
</div>
```

4. Dans main-content — conditionner le rendu par onglet :
```jsx
{activeTab === 'dashboard' && data && data.ranking && (
  <>
    {/* CONTENU DASHBOARD SPRINT 2 — identique */}
    <KpiCards ... />
    <TrendChart ... />
    <DuelCard ... />
    <RankingTable ... />
    <LLMBreakdown ... />
    {/* charts, insights, etc. */}
  </>
)}

{activeTab === 'prompts' && (
  <PromptComparator brand={config.brand} />
)}

{activeTab === 'alerts' && (
  <AlertsPanel brand={config.brand} />
)}
```

5. Dans handleReset → ajouter `setActiveTab('dashboard')` :
```jsx
onReset={() => { setConfig(null); setData(null); setCompletedPrompts([]); setActiveTab('dashboard'); }}
```

Validation :
```bash
grep "PromptComparator" frontend/src/App.jsx && echo "✅ PromptComparator importé"
grep "AlertsPanel"      frontend/src/App.jsx && echo "✅ AlertsPanel importé"
grep "activeTab"        frontend/src/App.jsx && echo "✅ activeTab state présent"
grep "app-tabs"         frontend/src/App.jsx && echo "✅ onglets présents"
```

═══════════════════════════════════════════════════════
ÉTAPE 8 — APPEND frontend/src/App.css (ne pas écraser)
═══════════════════════════════════════════════════════

AJOUTER à la FIN du fichier App.css existant (ne pas remplacer) :

```css
/* ── Sprint 3 — Onglets de navigation ── */
.app-tabs {
  display: flex;
  padding: 0 24px;
  background: var(--bg-tertiary);
  border-bottom: var(--border-thick) solid var(--border-color);
  overflow-x: auto;
  scrollbar-width: none;
}
.app-tabs::-webkit-scrollbar { display: none; }
.app-tab {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 14px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  position: relative;
  bottom: -2px;
}
.app-tab:hover { color: var(--text-secondary); }
.app-tab.active { color: var(--accent-yellow); border-bottom-color: var(--accent-yellow); }
```

Commande pour append (ne pas écraser) :
```bash
cat >> frontend/src/App.css << 'ENDCSS'

/* ── Sprint 3 — Onglets de navigation ── */
.app-tabs { display:flex; padding:0 24px; background:var(--bg-tertiary); border-bottom:var(--border-thick) solid var(--border-color); overflow-x:auto; scrollbar-width:none; }
.app-tabs::-webkit-scrollbar { display:none; }
.app-tab { font-family:var(--font-mono); font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; padding:14px 20px; background:transparent; border:none; border-bottom:3px solid transparent; color:var(--text-muted); cursor:pointer; transition:all 0.15s; white-space:nowrap; position:relative; bottom:-2px; }
.app-tab:hover { color:var(--text-secondary); }
.app-tab.active { color:var(--accent-yellow); border-bottom-color:var(--accent-yellow); }
ENDCSS
echo "✅ App.css — onglets ajoutés"
```

═══════════════════════════════════════════════════════
ÉTAPE 9 — VALIDATION FINALE COMPLÈTE SPRINT 3
═══════════════════════════════════════════════════════

```bash
# 1. Syntaxe Python
python3 -m py_compile backend/alerts.py && echo "✅ alerts.py"
python3 -m py_compile backend/app.py    && echo "✅ app.py"

# 2. Tests fonctionnels alerts.py
python3 -c "
import sys; sys.path.insert(0,'backend')
from alerts import send_alert, alert_rank_lost, alert_weekly_summary, _weekly_html

# Test sans config → tout False
r = send_alert('Test')
assert r == {'slack': False, 'email': False, 'telegram': False}, f'Attendu all False, got {r}'
print('✅ send_alert (no config) → all False')

# Test _weekly_html
html = _weekly_html('Nike', 1, 72.5, 85.0, [{'brand':'Adidas','rank':2,'global_score':61.3}])
assert '<html' in html and 'Nike' in html and 'Adidas' in html and '#FFD700' in html
print('✅ _weekly_html HTML valide + styles présents')

# Test alert_rank_lost structure
r2 = alert_rank_lost('Nike', 'Adidas', 5.2, 2)
assert isinstance(r2, dict) and set(r2.keys()) == {'slack','email','telegram'}
print('✅ alert_rank_lost structure OK')

# Test alert_weekly_summary structure
r3 = alert_weekly_summary('Nike', 1, 72.5, 85.0, [{'brand':'Adidas','rank':2,'global_score':61.3}])
assert isinstance(r3, dict)
print('✅ alert_weekly_summary structure OK')
print()
print('✅ alerts.py — tous les tests passés')
"

# 3. Vérifier les 4 nouvelles routes app.py
grep "/api/prompts/compare" backend/app.py && echo "✅ compare_prompts"
grep "/api/alerts/status"   backend/app.py && echo "✅ alerts_status"
grep "/api/alerts/test"     backend/app.py && echo "✅ test_alert"
grep "/api/alerts/weekly"   backend/app.py && echo "✅ trigger_weekly"

# 4. Vérifier le scheduler hebdo
grep "day_of_week='mon'" backend/app.py && echo "✅ cron lundi présent"
grep "weekly_summary"    backend/app.py && echo "✅ _scheduled_weekly_summary présent"

# 5. Vérifier les nouveaux composants frontend
test -f frontend/src/components/PromptComparator.jsx && echo "✅ PromptComparator.jsx"
test -f frontend/src/components/PromptComparator.css && echo "✅ PromptComparator.css"
test -f frontend/src/components/AlertsPanel.jsx      && echo "✅ AlertsPanel.jsx"
test -f frontend/src/components/AlertsPanel.css      && echo "✅ AlertsPanel.css"

# 6. Vérifier App.jsx Sprint 3
grep "PromptComparator" frontend/src/App.jsx && echo "✅ PromptComparator dans App.jsx"
grep "AlertsPanel"      frontend/src/App.jsx && echo "✅ AlertsPanel dans App.jsx"
grep "activeTab"        frontend/src/App.jsx && echo "✅ activeTab dans App.jsx"

# 7. Vérifier App.css onglets
grep "app-tabs" frontend/src/App.css && echo "✅ .app-tabs dans App.css"
grep "app-tab"  frontend/src/App.css && echo "✅ .app-tab dans App.css"

# 8. Build frontend
cd frontend && npm run build 2>&1 | tail -5 && echo "✅ Build OK"

# 9. Tests API (backend doit tourner)
# curl http://localhost:5000/api/alerts/status | python3 -m json.tool
# → Doit retourner {slack:{configured:false}, email:{...}, telegram:{...}}
#
# curl http://localhost:5000/api/prompts/compare | python3 -m json.tool
# → Doit retourner {brand, prompts:[], best_prompt, worst_prompt}
# (Si pas encore de données : {"error":"Aucune donnée"} — lancer d'abord une analyse)
#
# curl -X POST http://localhost:5000/api/alerts/test \
#   -H "Content-Type: application/json" \
#   -d '{"channel":"slack","message":"Test Sprint 3"}'
# → {status:"failed", results:{slack:false}} si SLACK_WEBHOOK_URL absent
```

═══════════════════════════════════════════════════════
CONTRAINTES ABSOLUES
═══════════════════════════════════════════════════════

1. NE PAS TOUCHER : analyzer.py, llm_client.py, database.py, prompts.py,
   api.js, AnalysisProgress, LLMBreakdown, et tous les autres composants
   existants (Charts, DuelCard, KpiCards, RankingTable, etc.)

2. App.css → APPEND UNIQUEMENT (cat >>) — ne jamais écraser le fichier

3. Le dispatcher send_alert() doit toujours retourner un dict avec les 3 clés
   {slack, email, telegram} même si les canaux sont absents → retourne False

4. send_email_alert() utilise smtplib natif Python — PAS de dépendance
   requests ou autre — aucun nouveau pip install nécessaire pour alerts.py

5. TELEGRAM_CHAT_ID peut être négatif (groupes : -1001234...) ou positif
   (utilisateurs : 1234567) — ne pas valider le format, l'envoyer tel quel

6. Le scheduler hebdo utilise 'cron' pas 'interval' — distinction importante
   interval=hebdo serait toutes les semaines depuis le lancement,
   cron=lundi 09h est un horaire fixe calendaire
```

---

## 🔄 Rollback si problème

```bash
# Backend
cp backend/alerts.py.bak backend/alerts.py
cp backend/app.py.bak backend/app.py

# Frontend
cp frontend/src/App.jsx.bak frontend/src/App.jsx
rm -f frontend/src/components/PromptComparator.jsx
rm -f frontend/src/components/PromptComparator.css
rm -f frontend/src/components/AlertsPanel.jsx
rm -f frontend/src/components/AlertsPanel.css
# Pour App.css — supprimer les lignes ajoutées manuellement à la fin
```

---

## 🔧 Configuration .env Sprint 3

Variables à ajouter dans `backend/.env` et dans les settings Render/Vercel :

```bash
# ── Email (Gmail recommandé) ──────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ton.adresse@gmail.com
SMTP_PASS=abcd-efgh-ijkl-mnop   # App Password Gmail (pas le mdp compte)
ALERT_EMAIL=destinataire@gmail.com

# ── Telegram ──────────────────────────────────────────
TELEGRAM_BOT_TOKEN=7012345678:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789    # ou -1001234567890 pour groupe

# ── Slack (existait déjà Sprint 1) ───────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

**Gmail App Password** (si compte Google avec 2FA) :
1. Google → Compte → Sécurité → Validation en 2 étapes activée
2. Sécurité → Mots de passe des applications → Créer
3. Copier le mdp 16 caractères dans `SMTP_PASS`

**Telegram Bot** :
1. Parler à `@BotFather` sur Telegram → `/newbot` → récupérer le token
2. Envoyer un message au bot
3. `curl https://api.telegram.org/bot{TOKEN}/getUpdates` → copier `chat.id`

---

## 📦 Résumé Sprint 3

| Fichier | Type | Impact |
|---|---|---|
| `backend/alerts.py` | REMPLACER | Email (smtplib) + Telegram + dispatcher send_alert() |
| `backend/app.py` | REMPLACER | 4 nouvelles routes + scheduler hebdo lundi 09h |
| `PromptComparator.jsx/.css` | CRÉER | Analyse prompt par prompt — tri + filtres |
| `AlertsPanel.jsx/.css` | CRÉER | Dashboard alertes — test boutons + résumé hebdo |
| `App.jsx` | REMPLACER | 3 onglets Dashboard / Prompts / Alertes |
| `App.css` | APPEND | Styles .app-tabs + .app-tab (ajout en bas) |

## ⚡ Ce que l'utilisateur voit après Sprint 3

**Onglet Dashboard** → identique Sprint 2 (KPI, ranking, LLMBreakdown, charts)

**Onglet Prompts** → tableau de tous les prompts classés par score :
- Vert = la marque est mentionnée, avec sa position
- Gris = la marque est absente
- Best prompt en haut avec bordure verte
- Tri par score / mention rate / position
- Filtre mentionnée / absente

**Onglet Alertes** → 3 cartes (Slack, Email, Telegram) :
- Badge ACTIF (vert) si la variable .env est configurée
- Badge INACTIF (gris) + liste des variables manquantes si non configuré
- Bouton "Tester" → envoie un vrai message de test
- Bouton "Envoyer le résumé" → déclenche le résumé hebdo maintenant
- Footer : description des 2 déclencheurs automatiques
