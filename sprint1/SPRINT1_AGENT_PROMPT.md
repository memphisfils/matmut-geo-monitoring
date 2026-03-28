# 🤖 Sprint 1 — Plan d'intégration complet
> Plateforme : **OpenCode CLI** (ou tout agent IA agentic)  
> Objectif : Intégrer Sprint 1 + Fix biais dans le projet existant  
> Durée estimée : 1 session agent

---

## 📁 Carte des fichiers

```
FICHIERS À REMPLACER (backend)
backend/
├── app.py              ← REMPLACER
├── llm_client.py       ← REMPLACER
├── database.py         ← REMPLACER
├── requirements.txt    ← REMPLACER
└── .env.example        ← REMPLACER

FICHIER À MODIFIER (backend)
backend/
└── (aucune modification partielle — tout est dans les remplacements)

FICHIERS À REMPLACER (frontend)
frontend/src/services/
└── api.js              ← REMPLACER (fix biais frontend)

FICHIERS NON TOUCHÉS — NE PAS MODIFIER
backend/
├── analyzer.py         ← intact
├── prompts.py          ← intact
└── alerts.py           ← intact
frontend/src/
├── App.jsx             ← intact
├── components/         ← intact (tous les composants)
└── index.css           ← intact
```

---

## ✅ Checklist de validation

Après chaque étape, l'agent vérifie :

```
[ ] 1. backend/llm_client.py  — classe LLMClient avec self.models (liste)
[ ] 2. backend/database.py    — tables projects + analysis_history
[ ] 3. backend/app.py         — generate_demo_data() neutre + APScheduler + /api/projects
[ ] 4. backend/requirements.txt — apscheduler>=3.10.0 présent
[ ] 5. backend/.env.example   — OLLAMA_MODELS=qwen3.5 présent
[ ] 6. frontend/src/services/api.js — DEMO_DATA_FACTORY avec seededRand()
[ ] 7. python3 -m py_compile backend/app.py — aucune erreur
[ ] 8. python3 -m py_compile backend/llm_client.py — aucune erreur
[ ] 9. python3 -m py_compile backend/database.py — aucune erreur
[ ] 10. cd frontend && npm run build — aucune erreur
```

---

## 🤖 PROMPT AGENT — À coller tel quel dans OpenCode CLI

```
Tu es un développeur fullstack senior spécialisé Python/Flask/React.
Tu dois intégrer le Sprint 1 du projet GEO Monitor dans le code existant.
Suis les instructions EXACTEMENT, dans l'ordre indiqué.
Après chaque fichier modifié, vérifie la syntaxe avant de passer au suivant.

═══════════════════════════════════════════════════════
CONTEXTE DU PROJET
═══════════════════════════════════════════════════════

Structure du projet :
project/
├── backend/
│   ├── app.py          ← point d'entrée Flask
│   ├── analyzer.py     ← NE PAS TOUCHER
│   ├── llm_client.py   ← à remplacer
│   ├── database.py     ← à remplacer
│   ├── alerts.py       ← NE PAS TOUCHER
│   ├── prompts.py      ← NE PAS TOUCHER
│   └── requirements.txt
└── frontend/
    └── src/
        └── services/
            └── api.js  ← à remplacer

═══════════════════════════════════════════════════════
ÉTAPE 0 — SAUVEGARDES
═══════════════════════════════════════════════════════

Avant toute modification, crée des backups :
```bash
cp backend/app.py backend/app.py.bak
cp backend/llm_client.py backend/llm_client.py.bak
cp backend/database.py backend/database.py.bak
cp frontend/src/services/api.js frontend/src/services/api.js.bak
```

═══════════════════════════════════════════════════════
ÉTAPE 1 — backend/requirements.txt
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le contenu par :

```
flask==3.0.0
flask-cors==4.0.0
requests>=2.31.0
python-dotenv>=1.0.0
psycopg2-binary>=2.9.9
gunicorn>=21.2.0
apscheduler>=3.10.0
```

Validation : `grep apscheduler backend/requirements.txt` doit retourner une ligne.

═══════════════════════════════════════════════════════
ÉTAPE 2 — backend/.env.example
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le contenu par :

```
# Ollama Cloud
OLLAMA_API_KEY=ta_cle_api_ici
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_TIMEOUT=30

# Modèles — un seul aujourd'hui, plusieurs demain
# Plan gratuit  : OLLAMA_MODELS=qwen3.5
# Plan Pro      : OLLAMA_MODELS=qwen3.5,llama3.2:8b,deepseek-v3.1
OLLAMA_MODELS=qwen3.5

# Flask
FLASK_PORT=5000
FLASK_DEBUG=False

# Alertes (Sprint 3)
# SLACK_WEBHOOK_URL=
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=ton_email@gmail.com
# SMTP_PASS=ton_app_password
# ALERT_EMAIL=destinataire@email.com
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=

# Prod (Render)
# DATABASE_URL=postgresql://...
```

IMPORTANT : Ne pas modifier le vrai fichier .env s'il existe — seulement .env.example.

═══════════════════════════════════════════════════════
ÉTAPE 3 — backend/llm_client.py
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier par le code suivant.

CHANGEMENTS CLÉS par rapport à l'ancien fichier :
1. self.models devient une LISTE lue depuis OLLAMA_MODELS dans .env
2. query_model(prompt, model) remplace query_ollama(prompt)
3. query_ollama() est gardé comme ALIAS LEGACY pour compatibilité
4. query_all_models_for_prompt() préparé pour Sprint 2
5. Plus de clients séparés par fournisseur (OpenAI, Anthropic, etc.) — un seul client Ollama

```python
"""
LLM Client — GEO Monitor Sprint 1
Un seul client Ollama Cloud, N modèles via OLLAMA_MODELS dans .env
Format: OLLAMA_MODELS=qwen3.5
Upgrade vers multi-modèles: OLLAMA_MODELS=qwen3.5,llama3.2:8b,deepseek-v3.1
"""
import os
import requests
from typing import Dict, List
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()


class LLMClient:
    """Client unifié pour Ollama Cloud — supporte N modèles avec une seule clé API."""

    def __init__(self):
        self.base_url  = os.getenv('OLLAMA_BASE_URL', 'https://ollama.com/api')
        self.api_key   = os.getenv('OLLAMA_API_KEY')
        self.timeout   = int(os.getenv('OLLAMA_TIMEOUT', '30'))
        self.cache: Dict[str, str] = {}

        raw_models = os.getenv('OLLAMA_MODELS', 'qwen3.5')
        self.models: List[str] = [m.strip() for m in raw_models.split(',') if m.strip()]

        self.clients: Dict[str, bool] = {}

        if self.api_key:
            for model in self.models:
                self.clients[model] = True
            print(f"[LLMClient] Ollama Cloud — modèles actifs : {self.models}")
        else:
            print("[LLMClient] OLLAMA_API_KEY manquante — mode démo activé")

    def query_model(self, prompt: str, model: str, use_cache: bool = True) -> str:
        """Interroge un modèle Ollama Cloud précis."""
        if not self.api_key:
            return ""

        cache_key = f"{model}:{prompt[:120]}"
        if use_cache and cache_key in self.cache:
            print(f"  [CACHE] {model[:20]}")
            return self.cache[cache_key]

        for attempt in range(2):
            try:
                print(f"  [{model}] tentative {attempt + 1}/2 (timeout={self.timeout}s)…")
                resp = requests.post(
                    f"{self.base_url}/chat",
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {self.api_key}'
                    },
                    json={
                        'model': model,
                        'messages': [{'role': 'user', 'content': prompt}],
                        'stream': False
                    },
                    timeout=self.timeout
                )
                resp.raise_for_status()
                content = resp.json().get('message', {}).get('content', '')
                print(f"  [{model}] ✓ {len(content)} chars")
                if use_cache:
                    self.cache[cache_key] = content
                return content

            except requests.exceptions.Timeout:
                print(f"  [{model}] ✗ timeout")
                if attempt == 1:
                    return ""
            except requests.exceptions.HTTPError as e:
                print(f"  [{model}] ✗ HTTP {e.response.status_code if e.response else '?'}")
                return ""
            except Exception as e:
                print(f"  [{model}] ✗ {e}")
                return ""

        return ""

    def query_all(self, prompt: str) -> Dict[str, str]:
        """Interroge tous les modèles configurés séquentiellement."""
        results = {}
        for model in self.models:
            results[model] = self.query_model(prompt, model)
        return results

    def query_all_parallel(self, prompts: List[str], max_workers: int = 3) -> Dict[str, str]:
        """Interroge le modèle principal en parallèle pour une liste de prompts."""
        if not self.models:
            return {}

        primary_model = self.models[0]
        results: Dict[str, str] = {}

        print(f"\n[PARALLEL] {len(prompts)} prompts × modèle={primary_model} ({max_workers} workers)…")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {
                executor.submit(self.query_model, prompt, primary_model): prompt
                for prompt in prompts
            }
            for i, future in enumerate(as_completed(future_map), 1):
                prompt = future_map[future]
                try:
                    results[prompt] = future.result()
                    print(f"  [{i}/{len(prompts)}] ✓ {prompt[:50]}…")
                except Exception as e:
                    print(f"  [{i}/{len(prompts)}] ✗ {e}")
                    results[prompt] = ""

        return results

    def query_all_models_for_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Interroge TOUS les modèles pour un seul prompt.
        Préparé pour Sprint 2 (score de confiance par modèle).
        """
        if len(self.models) <= 1:
            return self.query_all(prompt)

        results: Dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=len(self.models)) as executor:
            future_map = {
                executor.submit(self.query_model, prompt, model): model
                for model in self.models
            }
            for future in as_completed(future_map):
                model = future_map[future]
                try:
                    results[model] = future.result()
                except Exception as e:
                    results[model] = ""
        return results

    def get_active_models(self) -> Dict[str, bool]:
        return self.clients

    def get_cache_stats(self) -> dict:
        return {'size': len(self.cache), 'keys': list(self.cache.keys())[:5]}

    def clear_cache(self) -> None:
        self.cache = {}
        print("[CACHE] vidé")

    def query_ollama(self, prompt: str, model: str = None, use_cache: bool = True) -> str:
        """Alias legacy — conservé pour compatibilité avec le code existant."""
        return self.query_model(
            prompt,
            model or (self.models[0] if self.models else 'qwen3.5'),
            use_cache
        )
```

Validation : `python3 -m py_compile backend/llm_client.py && echo OK`

═══════════════════════════════════════════════════════
ÉTAPE 4 — backend/database.py
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier.

CHANGEMENTS CLÉS :
1. Nouvelle table `projects` — stocke chaque projet (brand + competitors + prompts + models)
2. `analysis_history` : ajout colonne `model` (TEXT) et `top_of_mind` + `sentiment_score`
3. `save_analysis()` : enregistre par modèle séparément
4. `get_history()` : filtrable par brand ET model
5. `generate_demo_history()` : scores stables basés sur le nom de la marque (anti-biais)
6. Nouvelles fonctions : `upsert_project()`, `get_all_projects()`

```python
"""
Database — GEO Monitor Sprint 1
- SQLite pour dev, PostgreSQL pour prod (Render)
- Table projects : stocke chaque marque analysée
- Table analysis_history : historique des scores par marque et par modèle
"""
import os
import sqlite3
from datetime import datetime, timedelta
import random

DATABASE_URL = os.getenv('DATABASE_URL')
USE_POSTGRES  = DATABASE_URL is not None

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
DB_PATH  = os.path.join(DATA_DIR, 'history.db')

if USE_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor


def get_db_connection():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ph():
    return '%s' if USE_POSTGRES else '?'


def init_db():
    conn = get_db_connection()
    cur  = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            brand       TEXT NOT NULL,
            sector      TEXT,
            competitors TEXT,
            prompts     TEXT,
            models      TEXT,
            created_at  TEXT NOT NULL,
            last_run    TEXT
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp       TEXT NOT NULL,
            brand           TEXT NOT NULL,
            model           TEXT DEFAULT 'qwen3.5',
            share_of_voice  REAL,
            global_score    REAL,
            mention_rate    REAL,
            avg_position    REAL,
            top_of_mind     REAL,
            sentiment_score REAL
        )
    ''')

    conn.commit()
    conn.close()
    print(f"[DATABASE] Initialisée ({'PostgreSQL' if USE_POSTGRES else 'SQLite'})")


def upsert_project(brand: str, sector: str = '', competitors: list = None,
                   prompts: list = None, models: list = None) -> int:
    import json
    conn = get_db_connection()
    cur  = conn.cursor()
    ph   = _ph()

    now         = datetime.now().isoformat()
    comp_json   = json.dumps(competitors or [])
    prompt_json = json.dumps(prompts or [])
    model_json  = json.dumps(models or ['qwen3.5'])

    cur.execute(f'SELECT id FROM projects WHERE brand = {ph}', (brand,))
    row = cur.fetchone()

    if row:
        project_id = row[0] if USE_POSTGRES else row['id']
        cur.execute(f'''
            UPDATE projects
            SET sector={ph}, competitors={ph}, prompts={ph}, models={ph}, last_run={ph}
            WHERE brand={ph}
        ''', (sector, comp_json, prompt_json, model_json, now, brand))
    else:
        cur.execute(f'''
            INSERT INTO projects (brand, sector, competitors, prompts, models, created_at, last_run)
            VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph})
        ''', (brand, sector, comp_json, prompt_json, model_json, now, now))
        if USE_POSTGRES:
            cur.execute('SELECT lastval()')
        else:
            cur.execute('SELECT last_insert_rowid()')
        project_id = cur.fetchone()[0]

    conn.commit()
    conn.close()
    return project_id


def get_all_projects() -> list:
    import json
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute('SELECT * FROM projects ORDER BY last_run DESC')
    rows = cur.fetchall()
    conn.close()

    projects = []
    for row in rows:
        r = dict(row)
        for field in ('competitors', 'prompts', 'models'):
            try:
                r[field] = json.loads(r[field] or '[]')
            except Exception:
                r[field] = []
        projects.append(r)
    return projects


def save_analysis(results: dict):
    if not results or 'responses' not in results:
        return

    from analyzer import BrandAnalyzer
    brand       = results.get('brand', 'Unknown')
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors
    timestamp   = results.get('timestamp', datetime.now().isoformat())
    llms_used   = results.get('llms_used', ['qwen3.5'])

    analyses_by_model: dict = {m: [] for m in llms_used}
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            if llm_name in analyses_by_model:
                analyses_by_model[llm_name].append(data['analysis'])

    conn = get_db_connection()
    cur  = conn.cursor()
    ph   = _ph()

    for model, analyses in analyses_by_model.items():
        if not analyses:
            continue
        analyzer = BrandAnalyzer(brands=all_brands)
        metrics  = analyzer.calculate_metrics(analyses)

        for b, m in metrics.items():
            cur.execute(f'''
                INSERT INTO analysis_history
                (timestamp, brand, model, share_of_voice, global_score,
                 mention_rate, avg_position, top_of_mind, sentiment_score)
                VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph})
            ''', (
                timestamp, b, model,
                m.get('share_of_voice', 0),
                m.get('global_score', 0),
                m.get('mention_rate', 0),
                m.get('avg_position', 99),
                m.get('top_of_mind', 0),
                m.get('sentiment_score', 0)
            ))

    conn.commit()
    conn.close()
    print(f"[DATABASE] Sauvegardé — {brand} / {llms_used}")

    try:
        upsert_project(brand)
    except Exception:
        pass


def get_history(brand: str = None, days: int = 30, model: str = None) -> list:
    conn = get_db_connection()
    cur  = conn.cursor()
    ph   = _ph()

    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    query  = f'SELECT timestamp, brand, model, global_score FROM analysis_history WHERE timestamp > {ph}'
    params = [cutoff]

    if brand:
        query += f' AND brand = {ph}'
        params.append(brand)
    if model:
        query += f' AND model = {ph}'
        params.append(model)

    query += ' ORDER BY timestamp ASC'
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    history = {}
    for row in rows:
        r = dict(row)
        try:
            date_key = datetime.fromisoformat(r['timestamp']).strftime('%d/%m')
        except Exception:
            date_key = r['timestamp'][:10]
        if date_key not in history:
            history[date_key] = {'date': date_key}
        history[date_key][r['brand']] = round(r['global_score'], 2)

    return list(history.values())


def generate_demo_history(brand: str = 'Marque', competitors: list = None, days: int = 30) -> list:
    competitors = competitors or ['Concurrent A', 'Concurrent B', 'Concurrent C']
    all_brands  = [brand] + competitors
    today       = datetime.now()
    history     = []

    def base_score(b):
        seed = abs(hash(b)) % 10000
        rng  = random.Random(seed)
        return 30 + rng.random() * 55

    bases = {b: base_score(b) for b in all_brands}

    for i in range(days):
        date  = today - timedelta(days=days - i)
        entry = {'date': date.strftime('%d/%m')}
        for b in all_brands:
            rng   = random.Random(abs(hash(b + str(i))) % 10000)
            noise = (rng.random() - 0.5) * 6
            trend = (i / days) * 3 if b == brand else 0
            entry[b] = round(max(0, min(100, bases[b] + noise + trend)), 1)
        history.append(entry)

    return history
```

Validation : `python3 -m py_compile backend/database.py && echo OK`

═══════════════════════════════════════════════════════
ÉTAPE 5 — backend/app.py
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier.

CHANGEMENTS CLÉS par rapport à l'ancien :
1. generate_demo_data() : scores basés sur le NOM de la marque — anti-biais
   - AVANT : `base_prob = 0.75 if b == brand else random.uniform(0.4, 0.85)`
   - APRÈS  : prob calculée via `random.Random(_brand_seed(b))` — identique peu importe l'ordre
2. APScheduler : analyse automatique toutes les 6h sur tous les projets enregistrés
3. Nouvelle route : GET /api/projects
4. _run_real_or_demo() : gère les multi-modèles via llm_client.models
5. _save_and_alert() : appelle save_analysis() depuis database.py
6. upsert_project() appelé après chaque analyse pour que l'APScheduler mémorise les projets

RÈGLE CRITIQUE : la fonction `_brand_seed(b)` doit être :
```python
def _brand_seed(b):
    return abs(hash(b)) % (2**31)
```
Et la probabilité de mention doit être :
```python
def mention_prob(b):
    rng = random.Random(_brand_seed(b))
    return 0.35 + rng.random() * 0.55
```
JAMAIS `0.75 if b == brand` — c'est le biais à éliminer.

Voici le fichier complet :

```python
"""
API Flask — GEO Monitor Sprint 1
- APScheduler : analyse automatique toutes les 6h
- generate_demo_data : neutre (score basé sur le nom de la marque)
- Nouveau endpoint GET /api/projects
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import random
from datetime import datetime
from analyzer import BrandAnalyzer

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://geo-monitoring.vercel.app",
    "https://geo-monitoring-frontend.onrender.com",
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=False)

from database import (init_db, save_analysis, get_history,
                      generate_demo_history, upsert_project, get_all_projects)
from alerts import send_slack_alert
init_db()

DATA_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RESULTS_FILE = os.path.join(DATA_DIR, 'results.json')


def _scheduled_analysis():
    projects = get_all_projects()
    if not projects:
        print("[SCHEDULER] Aucun projet")
        return
    for project in projects:
        brand = project.get('brand', '')
        competitors = project.get('competitors', [])
        prompts = project.get('prompts', [])
        if not brand or not prompts:
            continue
        try:
            results = _run_real_or_demo(brand, competitors, prompts, limit=6)
            _save_and_alert(results, brand)
        except Exception as e:
            print(f"[SCHEDULER] {brand} : {e}")


def _start_scheduler():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(_scheduled_analysis, 'interval', hours=6, id='auto_analysis')
        scheduler.start()
        print("[SCHEDULER] Actif — toutes les 6h")
        return scheduler
    except ImportError:
        print("[SCHEDULER] apscheduler non installé")
        return None
    except Exception as e:
        print(f"[SCHEDULER] Erreur : {e}")
        return None


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _load_results():
    _ensure_data_dir()
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def _save_results(data):
    _ensure_data_dir()
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _brand_seed(b):
    return abs(hash(b)) % (2**31)

def generate_demo_data(brand='Marque', competitors=None, prompts=None):
    if not competitors:
        competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D']
    if not prompts:
        prompts = [
            f"Meilleur service {brand.lower()} ?",
            f"Comparatif {brand.lower()} vs concurrents"
        ]

    all_brands = [brand] + competitors

    def mention_prob(b):
        rng = random.Random(_brand_seed(b))
        return 0.35 + rng.random() * 0.55

    demo_responses = []
    for i, prompt in enumerate(prompts[:20]):
        brands_in = []
        for b in all_brands:
            base = mention_prob(b)
            rng  = random.Random(_brand_seed(b) + i * 997)
            adj  = base + (rng.random() - 0.5) * 0.15
            if random.Random(_brand_seed(b) + i * 13).random() < adj:
                brands_in.append(b)
        brands_in.sort(key=lambda b: _brand_seed(b))
        positions   = {b: idx + 1 for idx, b in enumerate(brands_in)}
        first_brand = brands_in[0] if brands_in else None
        analysis = {
            'brands_mentioned': brands_in,
            'positions':        positions,
            'first_brand':      first_brand,
            'matmut_mentioned': brand in brands_in,
            'brand_mentioned':  brand in brands_in,
            'brand_position':   positions.get(brand),
            'matmut_position':  positions.get(brand),
        }
        demo_responses.append({
            'category':     'general',
            'prompt':       prompt,
            'llm_analyses': {'ollama': {'response': f'[Demo {i+1}]', 'analysis': analysis}}
        })

    return {
        'timestamp':    datetime.now().isoformat(),
        'total_prompts': len(demo_responses),
        'llms_used':    ['ollama'],
        'brand':        brand,
        'competitors':  competitors,
        'responses':    demo_responses,
        'is_demo':      True
    }


def _run_real_or_demo(brand, competitors, prompts, limit=6, use_parallel=True):
    try:
        from llm_client import LLMClient
        llm_client = LLMClient()
        if not llm_client.clients:
            raise Exception("Pas de modèle disponible")

        all_brands = [brand] + competitors
        az         = BrandAnalyzer(brands=all_brands)
        responses  = []

        if use_parallel:
            all_resp = llm_client.query_all_parallel(prompts[:limit], max_workers=3)
            for prompt in prompts[:limit]:
                text     = all_resp.get(prompt, '')
                analyses = {}
                for model in llm_client.models:
                    analyses[model] = {'response': text, 'analysis': az.analyze_response(text)}
                responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
        else:
            for prompt in prompts[:limit]:
                all_model_resp = llm_client.query_all(prompt)
                analyses = {}
                for model, text in all_model_resp.items():
                    analyses[model] = {'response': text, 'analysis': az.analyze_response(text)}
                responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})

        return {
            'timestamp':    datetime.now().isoformat(),
            'total_prompts': limit,
            'llms_used':    llm_client.models,
            'brand':        brand,
            'competitors':  competitors,
            'responses':    responses,
            'is_demo':      False
        }
    except Exception as e:
        print(f"[ANALYSIS] Fallback demo — {e}")
        return generate_demo_data(brand, competitors, prompts[:limit])


def _save_and_alert(results, brand):
    _save_results(results)
    save_analysis(results)
    try:
        all_analyses = [d['analysis'] for r in results['responses']
                        for d in r['llm_analyses'].values()]
        all_brands   = [brand] + results.get('competitors', [])
        az       = BrandAnalyzer(brands=all_brands)
        metrics  = az.calculate_metrics(all_analyses)
        ranking  = az.generate_ranking(metrics)
        if ranking and ranking[0]['brand'] != brand:
            leader = ranking[0]
            gap    = leader['global_score'] - metrics.get(brand, {}).get('global_score', 0)
            send_slack_alert(
                f"⚠️ *{brand}* n'est plus #1 ! Leader : *{leader['brand']}* (-{gap:.1f} pts)"
            )
    except Exception as e:
        print(f"[ALERT] {e}")


@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'online', 'version': '2.1', 'message': 'GEO Monitor API Sprint 1'})

@app.route('/api/status', methods=['GET'])
def status():
    llm_status = {}
    try:
        from llm_client import LLMClient
        llm_status = LLMClient().get_active_models()
    except Exception as e:
        llm_status = {'error': str(e)}
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat(),
                    'llm_status': llm_status,
                    'system_ready': bool(llm_status) and 'error' not in llm_status})

@app.route('/api/projects', methods=['GET'])
def list_projects():
    return jsonify(get_all_projects())

@app.route('/api/generate-config', methods=['POST'])
def generate_config():
    import re as re_mod, json as json_mod
    data   = request.get_json() or {}
    brand  = data.get('brand', 'Marque')
    sector = data.get('sector', 'Autre')
    try:
        from llm_client import LLMClient
        client = LLMClient()
        if not client.api_key or not client.clients:
            raise Exception("Pas de clé API")
        prompt = (
            f'Pour la marque "{brand}" dans le secteur "{sector}", génère un JSON STRICT :\n'
            '{"products":[{"id":"p1","name":"...","description":"...","prompts":["...","..."]}],'
            '"suggested_competitors":["...","...","...","...","..."]}\n'
            '3 produits, 5 vrais concurrents. UNIQUEMENT LE JSON.'
        )
        text  = client.query_ollama(prompt)
        if not text:
            raise ValueError("Réponse vide")
        match = re_mod.search(r'\{.*\}', text, re_mod.DOTALL)
        if not match:
            raise ValueError("Pas de JSON")
        config = json_mod.loads(match.group())
        return jsonify({'status': 'success', 'config': config})
    except Exception as e:
        config = {
            'products': [
                {'id': 'p1', 'name': f'{brand} Base', 'description': 'Offre Essentielle',
                 'prompts': [f'Meilleur {sector} pas cher', f'Comparatif {sector} basique']},
                {'id': 'p2', 'name': f'{brand} Max',  'description': 'Offre Premium',
                 'prompts': [f'Top {sector} haut de gamme', f'Meilleure offre {sector}']},
                {'id': 'p3', 'name': f'{brand} Pro',  'description': 'Offre Pro',
                 'prompts': [f'{sector} pour entreprise', f'Comparatif pro {sector}']},
            ],
            'suggested_competitors': ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D', 'Concurrent E']
        }
        return jsonify({'status': 'fallback', 'config': config, 'error': str(e)})

@app.route('/api/run-analysis', methods=['POST'])
def run_analysis():
    import time
    start        = time.time()
    data         = request.get_json() or {}
    brand        = data.get('brand', 'Marque')
    competitors  = data.get('competitors', [])
    prompts      = data.get('prompts', [])
    limit        = data.get('limit', min(len(prompts), 6) if prompts else 6)
    use_parallel = data.get('parallel', True)
    use_demo     = data.get('demo', False)

    if use_demo or not prompts:
        results = generate_demo_data(brand, competitors, prompts)
        _save_results(results)
        return jsonify({'status': 'success', 'is_demo': True,
                        'timestamp': results['timestamp'],
                        'duration': round(time.time() - start, 2)})

    results = _run_real_or_demo(brand, competitors, prompts, limit, use_parallel)
    _save_and_alert(results, brand)

    try:
        upsert_project(brand, data.get('sector', ''), competitors, prompts,
                       results.get('llms_used', ['qwen3.5']))
    except Exception as e:
        print(f"[PROJECT] {e}")

    return jsonify({'status': 'success', 'is_demo': results.get('is_demo', False),
                    'timestamp': results['timestamp'],
                    'duration': round(time.time() - start, 2)})

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    results = _load_results()
    if not results:
        results = generate_demo_data()
        _save_results(results)

    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors if competitors else None
    az          = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]

    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)

    cat_data: dict = {}
    for response in results['responses']:
        cat = response.get('category', 'general')
        cat_data.setdefault(cat, [])
        for d in response['llm_analyses'].values():
            cat_data[cat].append(d['analysis'])

    category_data = {}
    for cat, analyses in cat_data.items():
        cm = az.calculate_metrics(analyses)
        category_data[cat] = {b: cm[b]['mention_rate'] for b in cm}

    return jsonify({
        'metrics':       metrics,
        'ranking':       ranking,
        'insights':      insights,
        'category_data': category_data,
        'metadata': {
            'brand':          brand,
            'competitors':    competitors,
            'total_prompts':  results['total_prompts'],
            'total_analyses': len(all_analyses),
            'timestamp':      results['timestamp'],
            'is_demo':        results.get('is_demo', False),
            'models_used':    results.get('llms_used', ['qwen3.5'])
        }
    })

@app.route('/api/history', methods=['GET'])
def get_history_data():
    brand    = request.args.get('brand')
    model    = request.args.get('model')
    use_demo = request.args.get('demo', 'false').lower() == 'true'

    if use_demo:
        results = _load_results()
        b = results.get('brand', brand or 'Marque') if results else (brand or 'Marque')
        c = results.get('competitors', []) if results else []
        return jsonify(generate_demo_history(b, c))

    history = get_history(brand=brand, model=model)
    if not history:
        results = _load_results()
        b = results.get('brand', brand or 'Marque') if results else (brand or 'Marque')
        c = results.get('competitors', []) if results else []
        return jsonify(generate_demo_history(b, c))
    return jsonify(history)

@app.route('/api/export', methods=['GET'])
def export_report():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée'}), 404
    brand      = results.get('brand', 'Marque')
    all_brands = [brand] + results.get('competitors', [])
    az         = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    return jsonify({'generated_at': datetime.now().isoformat(), 'brand': brand,
                    'ranking': ranking, 'insights': insights, 'full_metrics': metrics})


scheduler = None

if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    if not debug:
        scheduler = _start_scheduler()
    print(f"\n[INFO] GEO Monitor v2.1 — http://localhost:{port}")
    print(f"   Scheduler : {'actif (6h)' if scheduler else 'inactif'}")
    app.run(host='0.0.0.0', port=port, debug=debug)
```

Validation : `python3 -m py_compile backend/app.py && echo OK`

═══════════════════════════════════════════════════════
ÉTAPE 6 — frontend/src/services/api.js
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier.

CHANGEMENT CLÉ : DEMO_DATA_FACTORY utilise seededRand() basé sur le NOM
de la marque — pas sa position dans allBrands.
- AVANT : `const rand = (min, max, offset = 0) => min + ((seed + offset) % (max - min))`
  avec `seed = brand.split('').reduce(...)` → seed dépend de la marque ENTRÉE
- APRÈS : `function seededRand(seed)` appelé avec le HASH du nom de chaque marque
  → scores identiques peu importe l'ordre d'entrée

```javascript
/**
 * API Service — GEO Monitor Sprint 1
 * FIX biais : scores basés sur le nom de la marque, pas sa position
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function DEMO_DATA_FACTORY(brand = 'Marque', competitors = []) {
  const allBrands = [brand, ...competitors];
  if (allBrands.length < 2) allBrands.push('Concurrent A', 'Concurrent B', 'Concurrent C');

  const metrics = {};

  allBrands.forEach((b) => {
    const brandSeed = b.split('').reduce((acc, c) => acc + c.charCodeAt(0) * 31, 0);
    const rand = seededRand(brandSeed);

    const mentionRate    = Math.round(30 + rand() * 55);
    const avgPosition    = parseFloat((1.2 + rand() * 4.5).toFixed(2));
    const topOfMind      = Math.round(rand() * 35);
    const sentimentScore = Math.round(-20 + rand() * 100);
    const mentionCount   = Math.round(mentionRate * 0.4);

    metrics[b] = {
      mention_count:   mentionCount,
      mention_rate:    mentionRate,
      avg_position:    avgPosition,
      top_of_mind:     topOfMind,
      first_position_count: Math.round(topOfMind * 0.04),
      sentiment_score: sentimentScore,
      share_of_voice:  0,
      global_score:    0
    };
  });

  const totalMentions = Object.values(metrics).reduce((s, m) => s + m.mention_count, 0);
  Object.keys(metrics).forEach(b => {
    metrics[b].share_of_voice = parseFloat(
      (metrics[b].mention_count / (totalMentions || 1) * 100).toFixed(2)
    );
  });

  Object.keys(metrics).forEach(b => {
    const m = metrics[b];
    const score =
      m.mention_rate * 0.4 +
      (m.avg_position > 0 ? 100 / m.avg_position : 0) * 0.3 +
      m.share_of_voice * 0.2 +
      m.top_of_mind * 0.1 +
      Math.max(m.sentiment_score, 0) * 0.1;
    metrics[b].global_score = parseFloat(score.toFixed(2));
  });

  const ranking = Object.entries(metrics)
    .map(([b, d]) => ({ brand: b, ...d }))
    .sort((a, b) => b.global_score - a.global_score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const mainData = metrics[brand] || {};
  const mainRank = ranking.find(r => r.brand === brand)?.rank;
  const leader   = ranking[0];

  const insights = {
    rank: mainRank,
    main_brand: brand,
    strengths: [
      mainData.mention_rate > 60
        ? `Bonne visibilité générale (${mainData.mention_rate}% de mention)` : null,
      mainData.avg_position <= 2 && mainData.avg_position > 0
        ? `Excellente position moyenne (${mainData.avg_position})` : null,
      mainData.top_of_mind > 20
        ? `Fort top-of-mind (${mainData.top_of_mind}%)` : null,
    ].filter(Boolean),
    weaknesses: [
      mainData.mention_rate <= 60
        ? `Visibilité limitée (${mainData.mention_rate}% de mention)` : null,
      mainData.avg_position > 3
        ? `Position moyenne perfectible (${mainData.avg_position})` : null,
      mainData.top_of_mind < 10
        ? `Rarement citée en premier (${mainData.top_of_mind}%)` : null,
    ].filter(Boolean),
    recommendations: [
      leader && leader.brand !== brand
        ? `Réduire l'écart avec ${leader.brand} (-${(leader.global_score - (mainData.global_score || 0)).toFixed(1)} pts)`
        : null,
      'Renforcer le contenu expert sur le secteur',
      'Améliorer SEO/GEO sur requêtes génériques',
    ].filter(Boolean)
  };

  return {
    metrics,
    ranking,
    insights,
    category_data: {
      general: Object.fromEntries(Object.keys(metrics).map(b => [b, metrics[b].mention_rate]))
    },
    metadata: {
      brand,
      competitors,
      total_prompts: 20,
      total_analyses: 40,
      timestamp: new Date().toISOString(),
      is_demo: true
    }
  };
}

export async function fetchMetrics(options = {}) {
  try {
    const response = await fetch(`${API_URL}/metrics`);
    if (!response.ok) throw new Error('Backend not available');
    return await response.json();
  } catch {
    return DEMO_DATA_FACTORY(options.brand, options.competitors);
  }
}

export async function runAnalysis(options = {}) {
  try {
    const response = await fetch(`${API_URL}/run-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return await response.json();
  } catch {
    return { status: 'demo' };
  }
}

export async function fetchExport() {
  try {
    const response = await fetch(`${API_URL}/export`);
    if (!response.ok) throw new Error('Export not available');
    return await response.json();
  } catch {
    return { error: 'Backend not available' };
  }
}

export async function fetchHistory() {
  try {
    const response = await fetch(`${API_URL}/history`);
    if (!response.ok) throw new Error('History not available');
    return await response.json();
  } catch {
    return [];
  }
}

export function generateTrendHistory(ranking, brand, days = 30) {
  if (!ranking || !brand) return [];

  const today       = new Date();
  const history     = [];
  const competitors = ranking.filter(r => r.brand !== brand).slice(0, 3);
  const brandData   = ranking.find(r => r.brand === brand);
  if (!brandData) return [];

  const makeSeed = (b) => b.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date    = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const point   = { date: dateStr };

    const brandRand = seededRand(makeSeed(brand) + i);
    const noise     = (brandRand() - 0.5) * 6;
    const trend     = (i / days) * -3;
    point[brand]    = parseFloat(Math.min(100, Math.max(0, brandData.global_score + noise + trend)).toFixed(1));

    competitors.forEach(comp => {
      const compRand = seededRand(makeSeed(comp.brand) + i);
      const compNoise = (compRand() - 0.5) * 5;
      point[comp.brand] = parseFloat(Math.min(100, Math.max(0, comp.global_score + compNoise)).toFixed(1));
    });

    history.push(point);
  }

  return history;
}

export async function checkStatus() {
  try {
    const response = await fetch(`${API_URL}/status`);
    return await response.json();
  } catch {
    return { status: 'offline' };
  }
}
```

Validation : `cd frontend && npx vite build --mode development 2>&1 | tail -5`

═══════════════════════════════════════════════════════
ÉTAPE 7 — MISE À JOUR DU .env RÉEL (si existant)
═══════════════════════════════════════════════════════

Si le fichier `backend/.env` existe, ajouter la ligne suivante
SANS supprimer les lignes existantes :

```
OLLAMA_MODELS=qwen3.5
```

Commande : `grep -q 'OLLAMA_MODELS' backend/.env || echo 'OLLAMA_MODELS=qwen3.5' >> backend/.env`

═══════════════════════════════════════════════════════
ÉTAPE 8 — VALIDATION FINALE
═══════════════════════════════════════════════════════

Exécute ces commandes et vérifie que tout est vert :

```bash
# 1. Syntaxe Python
python3 -m py_compile backend/app.py && echo "✅ app.py"
python3 -m py_compile backend/llm_client.py && echo "✅ llm_client.py"
python3 -m py_compile backend/database.py && echo "✅ database.py"

# 2. APScheduler installé
pip show apscheduler | grep Version && echo "✅ apscheduler"

# 3. LLMClient charge les modèles depuis .env
cd backend && python3 -c "
import os; os.environ['OLLAMA_MODELS'] = 'qwen3.5,llama3.2'
from llm_client import LLMClient
c = LLMClient()
assert len(c.models) == 2, 'models list failed'
assert 'qwen3.5' in c.models
assert 'llama3.2' in c.models
print('✅ multi-modèles OK')
"

# 4. Fix biais — Nike = Nike peu importe l'ordre
python3 -c "
import sys; sys.path.insert(0, 'backend')
from app import generate_demo_data, _brand_seed

r1 = generate_demo_data('Nike',   ['Adidas', 'Puma'])
r2 = generate_demo_data('Adidas', ['Nike',   'Puma'])

def rate(res, b):
    t = len(res['responses'])
    h = sum(1 for r in res['responses'] if b in r['llm_analyses']['ollama']['analysis']['brands_mentioned'])
    return round(h/t*100, 1) if t else 0

nike_r1   = rate(r1, 'Nike')
nike_r2   = rate(r2, 'Nike')
adidas_r1 = rate(r1, 'Adidas')
adidas_r2 = rate(r2, 'Adidas')

print(f'Nike   (entré Nike)   : {nike_r1}%')
print(f'Nike   (entré Adidas) : {nike_r2}%')
print(f'Adidas (entré Nike)   : {adidas_r1}%')
print(f'Adidas (entré Adidas) : {adidas_r2}%')

assert abs(nike_r1 - nike_r2) < 5,   f'BIAIS NIKE encore présent! {nike_r1} vs {nike_r2}'
assert abs(adidas_r1 - adidas_r2) < 5, f'BIAIS ADIDAS encore présent! {adidas_r1} vs {adidas_r2}'
print('✅ Fix biais validé')
"

# 5. Frontend build
cd ../frontend && npm run build 2>&1 | grep -E "(error|warning|built)" | head -10
```

Si une validation échoue :
- `py_compile` : recopier le fichier exact depuis ce prompt
- apscheduler non trouvé : `pip install apscheduler>=3.10.0`
- biais présent : vérifier que `_brand_seed()` est bien `abs(hash(b)) % (2**31)` et que `mention_prob()` n'utilise PAS `if b == brand`
- npm build échoue : vérifier que api.js ne contient pas d'import manquant

═══════════════════════════════════════════════════════
CONTRAINTES ABSOLUES
═══════════════════════════════════════════════════════

1. NE PAS TOUCHER : analyzer.py, prompts.py, alerts.py,
   tous les composants React dans frontend/src/components/,
   App.jsx, App.css, index.css, vite.config.js, package.json

2. NE PAS SUPPRIMER la fonction query_ollama() dans llm_client.py
   — elle est utilisée dans generate_config()

3. NE PAS MODIFIER le .env réel sauf pour ajouter OLLAMA_MODELS
   — ne jamais écraser OLLAMA_API_KEY

4. Si un fichier contient déjà une fonction avec le même nom,
   REMPLACER entièrement la fonction, pas l'ajouter en doublon

5. Après chaque remplacement de fichier, valider la syntaxe
   avant de passer au fichier suivant
```

---

## 🔄 Rollback si problème

```bash
cp backend/app.py.bak backend/app.py
cp backend/llm_client.py.bak backend/llm_client.py
cp backend/database.py.bak backend/database.py
cp frontend/src/services/api.js.bak frontend/src/services/api.js
```

---

## 📦 Résumé des changements Sprint 1

| Fichier | Type | Impact |
|---|---|---|
| `llm_client.py` | REMPLACER | Architecture multi-modèles via `.env` |
| `database.py` | REMPLACER | Table `projects` + historique par modèle |
| `app.py` | REMPLACER | Fix biais + APScheduler 6h + `/api/projects` |
| `requirements.txt` | REMPLACER | `apscheduler>=3.10.0` |
| `.env.example` | REMPLACER | `OLLAMA_MODELS=qwen3.5` |
| `api.js` | REMPLACER | Fix biais frontend `seededRand()` |
