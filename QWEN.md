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
