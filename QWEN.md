## Qwen Added Memories
- Session debugging GEO Dashboard - 20 Mars 2026 :

Problèmes identifiés et fixes appliqués :

1. **WORKER TIMEOUT Render** : Gunicorn timeout 30s tuait les workers pendant analyses LLM (40s+)
   - Fix : render.yaml avec gunicorn + UvicornWorker, --timeout 180, --graceful-timeout 30
   - env : GUNICORN_TIMEOUT=120, OLLAMA_TIMEOUT=40

2. **Frontend affiche données démo après onboarding** : 
   - Cause : frontend appelait /api/metrics AVANT fin complète du streaming SSE
   - Fix : delay 500ms dans loadDashboardData + logging console
   - Timeout par prompt 50s + timeout global (limit × 50s) dans run_analysis_stream

3. **Logging debugging ajouté** :
   - [SAVE] quand results.json écrit
   - [LOAD] quand results.json lu  
   - [METRICS] appel /api/metrics
   - Console logs dans App.jsx pour tracer flux données

4. **Commandes clés** :
   - Render : gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class uvicorn.workers.UvicornWorker --timeout 180 --keep-alive 180 --graceful-timeout 30
   - Local dev : python app.py (Flask dev server)

5. **Fichiers critiques** :
   - backend/app.py : run_analysis_stream(), _save_results(), _load_results(), get_metrics()
   - frontend/src/App.jsx : handleOnboardingComplete(), loadDashboardData()
   - render.yaml : startCommand + env vars
   - backend/.env.render : OLLAMA_TIMEOUT, GUNICORN_TIMEOUT

6. **Architecture** :
   - Flask backend (port 5000) + React/Vite frontend
   - Streaming SSE pour analyse temps réel
   - results.json stocke dernière analyse
   - Ollama Cloud API (qwen3.5) pour génération prompts
- GEO Dashboard - Point de départ prochaine session (20 Mars 2026) :

**Prochaine session commence ICI :**

1. **Supprimer results.json AVANT test :**
   ```
   del C:\__003-travail\matmut-geo-dashboard\project\data\results.json
   ```

2. **Lancer onboarding complet et observer logs backend :**
   - [SAVE] results.json écrit : X prompts, is_demo=False/True, brand=...
   - [METRICS] Appel de /api/metrics
   - [LOAD] results.json lu : X prompts, is_demo=False/True, brand=...

3. **Diagnostiquer selon logs :**
   - Si `is_demo=True` dans SAVE → backend bascule en mode démo (chercher où)
   - Si `brand=Marque` (pas la vraie marque) → frontend lit ancien fichier
   - Si SAVE correct mais dashboard démo → problème frontend (fetchMetrics ou data state)

4. **Timeouts actuels (NE PAS CHANGER) :**
   - OLLAMA_TIMEOUT=40s (suffisant)
   - MAX_TIME_PER_PROMPT=50s (app.py)
   - Timeout global=limit × 50s
   - GUNICORN_TIMEOUT=120s (render.yaml)

5. **Fichiers à inspecter :**
   - backend/app.py : run_analysis_stream() ligne ~384, _save_results() ligne ~107, _load_results() ligne ~100, get_metrics() ligne ~550
   - frontend/src/App.jsx : handleOnboardingComplete() ligne ~40, loadDashboardData() ligne ~78
   - data/results.json : contenu après analyse

6. **Commandes test local :**
   ```bash
   # Backend
   cd backend && python app.py
   
   # Frontend (nouvelle fenêtre)
   cd frontend && npm run dev
   ```

**Rappel :** Tous les prompts sont complétés avec succès (✓ 3000+ chars) — le problème N'EST PAS le timeout, c'est le flux de données entre streaming et dashboard.
- GEO Dashboard Matmut — 4 Sprints complétés (Mars 2026) :

Sprint 1 : Multi-modèles Ollama + Fix biais scores + APScheduler 6h + Table projects
Sprint 2 : Streaming SSE temps réel + Score confiance inter-LLM + AnalysisProgress + LLMBreakdown
Sprint 3 : Comparateur prompts + Alertes Email/Telegram/Slack + Résumé hebdo lundi 09h + 3 onglets UI
Sprint 4 : Export PDF WeasyPrint + Mobile responsive 768px/480px + Touch targets 44px + PWA meta

Stack : Flask/Python backend, React/Vite frontend, Recharts, Ollama Cloud API
Déploiement : Render (backend) + Vercel (frontend)
Repo : github.com/memphisfils/matmut-geo-monitoring

Fonctionnalités clés :
- Analyse visibilité marque dans LLMs (ChatGPT, Claude, Gemini, Ollama)
- Ranking compétitif avec scores (mention_rate, avg_position, top_of_mind, share_of_voice)
- Streaming analyse prompt-par-prompt en temps réel
- Export PDF/HTML/JSON professionnel
- Alertes multi-canaux (Slack webhook, SMTP email, Telegram bot)
- Dashboard responsive mobile-first avec 3 onglets (Dashboard/Prompts/Alertes)
- Multi-projet en base de données (table projects + analysis_history)
- Scheduler automatique (analyse 6h + résumé hebdo lundi 09h)

Variables .env critiques :
- OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL=qwen3.5, OLLAMA_TIMEOUT=40
- SLACK_WEBHOOK_URL (alertes Slack)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL (alertes Email)
- TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (alertes Telegram)
- VITE_API_URL (frontend Vercel → backend Render)

Endpoints API principaux :
- GET /api/status — État des LLMs
- POST /api/generate-config — Génère config IA (produits + concurrents)
- POST /api/run-analysis/stream — Streaming SSE analyse
- GET /api/metrics — Récupère métriques calculées
- GET /api/history — Historique 30 jours
- GET /api/export/pdf — Export PDF (WeasyPrint)
- GET /api/export — Export JSON
- GET /api/projects — Liste tous les projets
- GET /api/health — Health check

Fichiers clés :
- backend/app.py (972 lignes) — API Flask, streaming, scheduler
- backend/analyzer.py — NLP extraction, scoring
- backend/llm_client.py — Client Ollama Cloud
- backend/alerts.py — Slack, Email, Telegram
- backend/database.py — SQLite/PostgreSQL
- backend/pdf_report.py — Génération PDF
- frontend/src/App.jsx (257 lignes) — Composant principal, 3 onglets
- frontend/src/components/ (22 composants) — Onboarding, KpiCards, Charts, etc.
- frontend/src/services/api.js — Couche API, timeout 300s

Session debugging 20 Mars 2026 — 7 bugs résolus :
1. Worker Timeout Render → Gunicorn + UvicornWorker timeout 180s
2. Frontend données démo → délai 5000ms + retry logic /api/metrics
3. Timeout SSE frontend → 60s → 300s pour 6 prompts
4. Race condition results.json → retry 5 tentatives × 2s
5. load_dotenv() manquant → ajouté dans app.py
6. Base de données schéma → history.db recréé avec top_of_mind
7. CSS @import mal placé → déplacé avant règles CSS

Logging debugging ajouté :
- [STREAM] Reçu : brand=XXX, prompts=X, demo=X
- [STREAM] Prompt X/6 début — elapsed: XX.Xs
- [STREAM] Prompt X/6 — Appel LLM en cours...
- [STREAM] → qwen3.5: ✓ XXXX chars, brands=[...]
- [STREAM] Prompt X/6 — ✓ VALIDÉ (brands: [...])
- [STREAM] Prompt X/6 — ✗ ÉCHEC LLM: erreur (failures=X/3)
- [STREAM] Prompt X/6 — ↻ FALLBACK DÉMO (brands: [...])
- [STREAM] Prompt X/6 terminé — duration: XX.Xs
- [SAVE] results.json écrit : X prompts, is_demo=X
- [STREAM] ✓ Sauvegarde terminée — X prompts, is_demo=X
- [METRICS] Appel de /api/metrics
- [LOAD] results.json lu : X prompts, is_demo=X, brand=XXX
- [METRICS] results.json trouvé après X tentative(s)

Commandes de test :
- Backend : cd backend && venv\Scripts\activate && python app.py
- Frontend : cd frontend && npm run dev
- Test API : curl http://localhost:5000/api/status
- Supprimer results.json : del data\results.json (avant démo propre)

Performances :
- 6 prompts (réel) : 90-120s
- 6 prompts (avec cache) : <5s
- Timeout max par prompt : 40s
- Timeout global : 300s (5 minutes)
- Export PDF : 2-5s
- Requête metrics : <100ms
