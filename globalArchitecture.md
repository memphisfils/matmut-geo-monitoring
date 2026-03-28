# GEO Dashboard - Architecture Globale

> Documentation technique complète du système GEO Dashboard
> Dernière mise à jour : Mars 2026

---

## 1. Vue d'Ensemble

### 1.1 Description du Projet

**GEO Dashboard** est une plateforme de monitoring de visibilité IA qui analyse comment les LLMs (ChatGPT, Claude, Gemini, etc.) perçoivent une marque par rapport à ses concurrents.

### 1.2 Métriques Mesurées

| Métrique | Description |
|----------|-------------|
| **Taux de Mention** | Pourcentage de réponses mentionnant la marque |
| **Position Moyenne** | Position moyenne dans les réponses |
| **Share of Voice** | Part de voix relative vs concurrents |
| **Top of Mind** | Pourcentage de réponses citant la marque en 1ère position |
| **Score Global** | Score composite sur 100 |
| **Sentiment** | Tonalité des mentions (positif/négatif) |

### 1.3 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Backend** | Flask 3.0.0 + Python 3.10+ |
| **Frontend** | React 19 + Vite 7.3.1 |
| **Base de données** | SQLite (dev) / PostgreSQL (prod) |
| **LLM** | Ollama Cloud (qwen3.5, llama3.2) |
| **Déploiement** | Render (backend) + Vercel (frontend) |
| **Tests** | Pytest (backend) + Vitest (frontend) |

---

## 2. Fonctionnement du Système

### 2.1 Vue d'Ensemble du Flux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GEO DASHBOARD WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐      ┌──────────────┐      ┌─────────────────┐
     │  UTILISATEUR │ ──▶ │   FRONTEND   │ ──▶ │    BACKEND     │
     └──────────┘      └──────────────┘      └─────────────────┘
                            │                        │
                            │ React 19               │ Flask + Python
                            │ Vite                   │ Ollama Cloud
                            │                        │
                            ▼                        ▼
                    ┌──────────────┐      ┌─────────────────┐
                    │  Interface   │      │   Analyse LLM   │
                    │  Utilisateur │      │   + Métriques   │
                    └──────────────┘      └─────────────────┘
```

### 2.2 Architecture des Données

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUX DE DONNÉES COMPLET                          │
└─────────────────────────────────────────────────────────────────────────┘

  1. UTILISATEUR
     │
     │ POST /api/generate-config
     ▼
  2. BACKEND → LLM (Ollama Cloud)
     │  - Génère produits
     │  - Génère concurrents  
     │  - Génère prompts SEO
     ▼
  3. FRONTEND (Validation utilisateur)
     │
     │ POST /api/run-analysis/stream (SSE)
     ▼
  4. BACKEND - Boucle d'Analyse
     │
     │ Pour chaque prompt:
     │   a) Envoi au LLM
     │   b) Réception réponse
     │   c) BrandAnalyzer.extraction()
     │   d) Calcul métriques
     │   e) Emission event SSE
     │
     ▼
  5. results.json (fichier local)
     │
     │ 5 secondes délai
     ▼
  6. FRONTEND → GET /api/metrics
     │
     ▼
  7. DASHBOARD AFFICHÉ
```

### 2.3 Architecture des Composants

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE COMPOSANTS                             │
└─────────────────────────────────────────────────────────────────────────┘

  FRONTEND (React 19)
  │
  ├── App.jsx (Main)
  │   ├── State: config, data, activeTab, isAnalyzing
  │   │
  │   ├── Onboarding.jsx (Si pas de config)
  │   │   ├── Step 1: Marque + Secteur
  │   │   ├── Step 2: Génération IA
  │   │   └── Step 3: Validation
  │   │
  │   ├── TopNavbar.jsx (Navigation)
  │   │   ├── Dashboard | Benchmark | Prompts | Alertes
  │   │   └── Refresh | Export | Reset
  │   │
  │   └── Contenu (selon activeTab)
  │       ├── Dashboard:
  │       │   ├── KpiCards (Rang, Score, Mention, Position)
  │       │   ├── TrendChart (30 jours)
  │       │   ├── DuelCard (1 vs 1)
  │       │   ├── RankingTable
  │       │   ├── Charts (Sentiment, Mention, SOV)
  │       │   ├── LLMBreakdown
  │       │   └── InsightsPanel
  │       │
  │       ├── Benchmark:
  │       │   ├── BrandSelector (2-6 marques)
  │       │   ├── GenerateButton (IA)
  │       │   ├── RunButton
  │       │   └── Results
  │       │
  │       ├── Prompts:
  │       │   └── PromptComparator
  │       │
  │       └── Alerts:
  │           └── AlertsPanel
  │
  └── services/api.js
      ├── fetchMetrics()
      ├── fetchHistory()
      ├── runAnalysisStream()  ← SSE
      ├── createBenchmark()
      ├── runBenchmarkStream() ← SSE
      └── fetchExport()

  BACKEND (Flask)
  │
  ├── app.py (Routes + Logique)
  │   ├── /api/run-analysis/stream
  │   ├── /api/run-benchmark/stream
  │   ├── /api/metrics
  │   └── ...
  │
  ├── services/analyzer.py (BrandAnalyzer)
  │   ├── extract_brands()
  │   ├── analyze_response()
  │   ├── calculate_metrics()
  │   └── generate_ranking()
  │
  ├── services/llm_client.py
  │   └── query_all_models_for_prompt()
  │
  ├── models/database.py
  │   ├── SQLite (dev)
  │   └── PostgreSQL (prod)
  │
  └── alerts.py
      ├── Slack
      ├── Email
      └── Telegram
```

---

## 3. Processus d'Onboarding

### 3.1 Description

L'onboarding est le processus en 3 étapes qui permet à l'utilisateur de configurer son analyse.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW ONBOARDING                             │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────────────┐
     │                    ÉTAPE 1 : SAISIE                         │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  ┌────────────────┐    ┌────────────────┐                  │
     │  │ Marque:       │    │ Secteur:       │                  │
     │  │ Matmut        │    │ Assurance Auto │                  │
     │  └────────────────┘    └────────────────┘                  │
     │                                                              │
     │  [CONTINUER]                                                │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────────────────┐
     │              ÉTAPE 2 : GÉNÉRATION IA                       │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  POST /api/generate-config                                   │
     │         │                                                    │
     │         ▼                                                    │
     │  ┌─────────────────────────────────────────────────────┐    │
     │  │ LLM (Ollama Cloud)                                   │    │
     │  │                                                       │    │
     │  │ Prompt: "Pour Matmut secteur Assurance Auto,        │    │
     │  │ génère 3 produits et 5 concurrents réels"            │    │
     │  │                                                       │    │
     │  │ Réponse JSON:                                        │    │
     │  │ {                                                     │    │
     │  │   "products": [                                       │    │
     │  │     {"id": "p1", "name": "Assurance auto", ...},     │    │
     │  │     {"id": "p2", "name": "Mutuelle santé", ...}      │    │
     │  │   ],                                                   │    │
     │  │   "suggested_competitors": ["MAIF", "MMA", ...]       │    │
     │  │ }                                                     │    │
     │  └─────────────────────────────────────────────────────┘    │
     │                                                              │
     │  [VALIDER] ou [MODIFIER]                                   │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────────────────┐
     │              ÉTAPE 3 : VALIDATION + LANCEMENT              │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  ┌─────────────────────────────────────────────────────┐    │
     │  │ RÉSUMÉ DE LA CONFIGURATION                          │    │
     │  │                                                     │    │
     │  │ Marque: Matmut                                      │    │
     │  │ Secteur: Assurance Auto                             │    │
     │  │                                                     │    │
     │  │ Produits:                                           │    │
     │  │   - Assurance auto Tous Risques                    │    │
     │  │   - Mutuelle santé                                  │    │
     │  │   - Assurance habitation                           │    │
     │  │                                                     │    │
     │  │ Concurrents:                                        │    │
     │  │   - MAIF, MMA, GMF, Axa, Generali                  │    │
     │  │                                                     │    │
     │  │ Prompts SEO: 6 prompts comparatifs                  │    │
     │  │                                                     │    │
     │  └─────────────────────────────────────────────────────┘    │
     │                                                              │
     │  [LANCER L'ANALYSE]                                         │
     │         │                                                    │
     │         ▼                                                    │
     │  STREAMING SSE - Progression en temps réel                  │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
```

### 3.2 Code de l'Onboarding (App.jsx)

```javascript
const handleOnboardingComplete = useCallback(async (cfg) => {
  setConfig(cfg);              // Sauvegarde config
  setIsAnalyzing(true);       // Début analyse

  // Streaming SSE
  for await (const event of runAnalysisStream({
    brand: cfg.brand,
    competitors: cfg.competitors,
    prompts: cfg.prompts,
    products: cfg.products,
    sector: cfg.sector
  })) {
    if (event.type === 'start') {
      // Début - modèles disponibles
      setAnalysisModels(event.models);
    }
    if (event.type === 'progress') {
      // Progression - prompt X/Y
      setAnalysisProgress(event);
      setCompletedPrompts([...prev, event]);
    }
    if (event.type === 'complete') {
      // Terminé
      setIsAnalysisComplete(true);
      await loadDashboardData(cfg);  // Chargement métriques
    }
  }
}, []);
```

### 3.3 Données d'Onboarding

```javascript
// cfg objet transmis au backend
{
  brand: "Matmut",                    // Marque principale
  sector: "Assurance Auto",            // Secteur d'activité
  products: [                         // Produits (générés par IA)
    { id: "p1", name: "Assurance auto", ... },
    { id: "p2", name: "Mutuelle santé", ... }
  ],
  competitors: [                       // Concurrents (générés par IA)
    "MAIF", "MMA", "GMF", "Axa", "Generali"
  ],
  prompts: [                           // Prompts SEO comparatifs
    "Meilleur assurance auto 2026 : Matmut vs ...",
    "Comparatif mutuelle santé : ..."
  ]
}
```

---

## 4. Analyse en Streaming (SSE)

### 4.1 Comment Fonctionne le Streaming

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVER-SENT EVENTS (SSE)                           │
└─────────────────────────────────────────────────────────────────────────┘

  FRONTEND                              BACKEND
     │                                      │
     │ ── POST /api/run-analysis/stream ──▶│
     │                                      │
     │ ◀── data: {"type": "start"} ───────│ (Initialisation)
     │                                      │
     │ ◀── data: {"type": "progress", ─────│
     │        "current": 1,                │
     │        "total": 6,                  │
     │        "brand_position": 1} ────────│ (Prompt 1/6)
     │                                      │
     │ ◀── data: {"type": "progress", ─────│
     │        "current": 2,                │
     │        "total": 6,                  │
     │        "brand_position": 2} ────────│ (Prompt 2/6)
     │                                      │
     │ ◀── ... ─────────────────────────────│
     │                                      │
     │ ◀── data: {"type": "complete", ─────│
     │        "timestamp": "2026-03-24",   │
     │        "is_demo": false} ───────────│ (Terminé)
     │                                      │
     ▼                                      ▼
```

### 4.2 Événements SSE

| Événement | Données | Description |
|-----------|---------|-------------|
| `start` | `{type, models, is_demo, total_prompts}` | Début de l'analyse |
| `progress` | `{type, current, total, brand_position, ...}` | Progression d'un prompt |
| `complete` | `{type, timestamp, is_demo}` | Analyse terminée |
| `error` | `{type, message}` | Erreur lors de l'analyse |

### 4.3 Code du Streaming (App.jsx)

```javascript
// Écoute des événements SSE
for await (const event of runAnalysisStream({
  brand: cfg.brand,
  competitors: cfg.competitors,
  prompts: cfg.prompts
})) {
  switch (event.type) {
    case 'start':
      console.log('Analyse démarrée', event.models);
      break;
    case 'progress':
      setAnalysisProgress(event);      // Mise à jour UI
      setCompletedPrompts(prev => [...prev, event]);
      break;
    case 'complete':
      setIsAnalysisComplete(true);
      await loadDashboardData(cfg);     // Chargement résultats
      break;
    case 'error':
      throw new Error(event.message);
  }
}
```

---

## 5. Benchmark Multi-Marques

### 5.1 Comparaison vs Analyse Simple

| Aspect | Analyse Simple | Benchmark |
|--------|---------------|-----------|
| **Marques** | 1 marque + concurrents | 2-6 marques égales |
| **Prompts** | Différents par marque | MÊMES prompts pour toutes |
| **Objectif** | Visibilité individuelle | Comparaison équitable |
| **Méthodologie** | Via onboarding |Via onglet Benchmark |

### 5.2 Workflow Benchmark

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW BENCHMARK                                 │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────────────┐
     │ 1. SÉLECTION DES MARQUES (2-6)                             │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  [Tesla] [BMW] [Mercedes] [+ Ajouter]                      │
     │                                                              │
     │  Suggestions: Apple, Samsung, Nike, ...                    │
     │                                                              │
     │  [GÉNÉRER LE BENCHMARK]                                    │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────────────────┐
     │ 2. GÉNÉRATION IA (secteur + produits + prompts)            │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  POST /api/benchmark                                         │
     │         │                                                    │
     │         ▼                                                    │
     │  {                                                           │
     │    "sector": "Voitures électriques",                        │
     │    "products": [                                             │
     │      {"id": "p1", "name": "Model Y", ...},                 │
     │      {"id": "p2", "name": "i4", ...}                       │
     │    ],                                                        │
     │    "seo_prompts": [                                         │
     │      "Comparatif Tesla Model Y vs BMW i4 vs Mercedes EQE"  │
     │    ]                                                         │
     │  }                                                           │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────────────────┐
     │ 3. LANCEMENT ANALYSE (SSE)                                 │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  POST /api/run-benchmark/stream                             │
     │                                                              │
     │  Pour CHAQUE prompt:                                        │
     │    → Tesla + BMW + Mercedes sur MÊME prompt                │
     │    → Comparabilité garantie                                  │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────────────────┐
     │ 4. RÉSULTATS COMPARABLES                                   │
     ├──────────────────────────────────────────────────────────────┤
     │                                                              │
     │  ┌─────────────────────────────────────────────────────┐    │
     │  │ RANKING:                                            │    │
     │  │  1. Tesla        Score: 85                         │    │
     │  │  2. BMW          Score: 72                         │    │
     │  │  3. Mercedes     Score: 68                         │    │
     │  └─────────────────────────────────────────────────────┘    │
     │                                                              │
     │  Métriques comparables car mêmes prompts!                   │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
```

---

## 6. Calcul des Métriques

### 6.1 Processus de Calcul

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CALCUL DES MÉTRIQUES                                │
└─────────────────────────────────────────────────────────────────────────┘

  RÉPONSE LLM
  │
  ▼
  ┌─────────────────────────────────────────────────────┐
  │ BrandAnalyzer.analyze_response()                    │
  │                                                     │
  │ 1. Extraction JSON: {"mentions": [...]}           │
  │ 2. Détection des marques mentionnées              │
  │ 3. Positions dans le classement                   │
  │ 4. Sentiment (positif/négatif/neutre)             │
  │                                                     │
  └─────────────────────────────────────────────────────┘
          │
          ▼
  ANALYSE (1 prompt)
  {
    "brands_mentioned": ["Tesla", "BMW", "Mercedes"],
    "positions": {"Tesla": 1, "BMW": 2, "Mercedes": 3},
    "first_brand": "Tesla",
    "brand_mentioned": true,
    "brand_position": 1,
    "sentiment": "positive"
  }
          │
          ▼
  ┌─────────────────────────────────────────────────────┐
  │ BrandAnalyzer.calculate_metrics()                   │
  │                                                     │
  │ Pour chaque marque:                                  │
  │   - mention_rate: % mentions / total prompts       │
  │   - avg_position: moyenne des positions             │
  │   - top_of_mind: % première position               │
  │   - sentiment_score: moyenne sentiments            │
  │   - share_of_voice: % vs total mentions            │
  │                                                     │
  └─────────────────────────────────────────────────────┘
          │
          ▼
  MÉTRIQUES
  {
    "Tesla": {
      "mention_rate": 85.0,
      "avg_position": 1.4,
      "share_of_voice": 42.0,
      "top_of_mind": 70.0,
      "sentiment_score": 0.8,
      "global_score": 76.3
    },
    "BMW": {...}
  }
          │
          ▼
  ┌─────────────────────────────────────────────────────┐
  │ BrandAnalyzer.generate_ranking()                   │
  │                                                     │
  │ Tri par global_score DESC                          │
  │                                                     │
  └─────────────────────────────────────────────────────┘
          │
          ▼
  RANKING
  [
    {"rank": 1, "brand": "Tesla", "global_score": 76.3, ...},
    {"rank": 2, "brand": "BMW", "global_score": 62.1, ...},
    {"rank": 3, "brand": "Mercedes", "global_score": 58.7, ...}
  ]
```

### 6.2 Formule du Score Global

```python
global_score = (
    mention_rate * 0.4 +           # 40% - Importance de la visibilité
    (100 / avg_position) * 0.3 +  # 30% - Position privilégiée
    share_of_voice * 0.2 +         # 20% - Part de marché
    top_of_mind * 0.1 +            # 10% - Top of mind
    max(sentiment_score, 0) * 0.1  # Bonus sentiment positif
)
```

---

## 7. Backend

### 2.1 Structure des Fichiers

```
backend/
├── app.py                    # Application principale (~1000 lignes)
├── alerts.py                # Notifications (Slack/Email/Telegram)
├── pdf_report.py            # Génération PDF (WeasyPrint)
│
├── services/                # Modules de services (refactoring)
│   ├── __init__.py
│   ├── analyzer.py          # BrandAnalyzer (extraction + scoring)
│   ├── llm_client.py        # Client Ollama Cloud (sync)
│   └── async_llm_client.py # Client async (parallel)
│
├── models/                  # Modèles de données
│   ├── __init__.py
│   └── database.py          # SQLite/PostgreSQL
│
├── utils/                   # Utilitaires
│   ├── __init__.py
│   └── prompts.py           # Prompts GEO + Benchmark
│
├── routes/                  # Routes API (placeholder)
│   └── __init__.py
│
├── tests/                   # Tests unitaires
│   ├── conftest.py          # Fixtures partagées
│   ├── services/
│   │   ├── test_analyzer.py  # 20 tests
│   │   ├── test_prompts.py  # 6 tests
│   │   └── test_database.py # 5 tests
│   └── routes/
│       └── test_routes.py   # 10 tests
│
├── data/                    # Données runtime
│   ├── results.json         # Derniers résultats
│   └── history.db           # Historique SQLite
│
├── requirements.txt         # Dépendances Python
└── .env                     # Variables d'environnement
```

### 2.2 Modules Clés

#### `services/analyzer.py` (BrandAnalyzer)

```python
class BrandAnalyzer:
    def __init__(self, brands: List[str])
    def extract_brands(text) -> List[Tuple[str, int]]
    def analyze_response(text) -> Dict
    def calculate_metrics(analyses: List[Dict]) -> Dict
    def calculate_metrics_by_model(responses: List[Dict]) -> Dict
    def calculate_confidence_score(metrics_by_model: Dict, brand: str) -> Dict
    def generate_ranking(metrics: Dict) -> List[Dict]
    def generate_insights(metrics: Dict, ranking: List[Dict], main_brand: str) -> Dict
```

**Formule du Score Global :**
```python
global_score = (
    mention_rate * 0.4 +
    (100 / avg_position) * 0.3 +
    share_of_voice * 0.2 +
    top_of_mind * 0.1 +
    max(sentiment_score, 0) * 0.1
)
```

#### `services/llm_client.py` (LLMClient)

```python
class LLMClient:
    def __init__(self)
    def get_active_models() -> Dict
    def query_model(prompt: str, model: str, use_cache: bool = True) -> str
    def query_all_models_for_prompt(prompt: str, system_prompt: str = None) -> Dict[str, str]
```

#### `models/database.py`

```python
def init_db()
def upsert_project(brand: str, sector: str, competitors: list, prompts: list, llms: list)
def get_all_projects() -> list
def save_analysis(results: dict)
def get_history(brand: str = None, days: int = 30, model: str = None) -> list
def generate_demo_history(brand: str, competitors: list, days: int) -> list
```

#### `utils/prompts.py`

```python
GEO_SYSTEM_PROMPT  # Prompt système GEO neutral
def build_geo_prompt(benchmark_brands: list) -> str
def generate_benchmark_prompt(brands: list) -> str
```

### 2.3 Variables d'Environnement

```bash
# API Ollama Cloud
OLLAMA_API_KEY=votre_cle_api
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=qwen3.5
OLLAMA_TIMEOUT=40

# Flask
FLASK_PORT=5000
FLASK_DEBUG=False

# Déploiement
GUNICORN_TIMEOUT=120

# Alertes (optionnel)
SLACK_WEBHOOK_URL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password
ALERT_EMAIL=recipient@example.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Base de données
DATABASE_URL=postgresql://...  # Production
```

---

## 3. Architecture Frontend

### 3.1 Structure des Fichiers

```
frontend/
├── src/
│   ├── App.jsx              # Composant principal (4 onglets)
│   ├── App.css              # Styles principaux
│   ├── index.css            # Variables CSS globales
│   │
│   ├── components/          # Composants UI
│   │   ├── Onboarding.jsx   # Wizard 3 étapes
│   │   ├── Benchmark.jsx    # Comparateur multi-marques
│   │   ├── TopNavbar.jsx    # Navigation + onglets
│   │   ├── KpiCards.jsx     # 4 cartes KPI
│   │   ├── TrendChart.jsx   # Graphique 30 jours
│   │   ├── RankingTable.jsx # Tableau de classement
│   │   ├── DuelCard.jsx     # Comparaison 1-vs-1
│   │   ├── Charts.jsx       # 4 graphiques (Recharts)
│   │   ├── SentimentChart.jsx
│   │   ├── InsightsPanel.jsx
│   │   ├── AnalysisProgress.jsx
│   │   ├── LLMBreakdown.jsx
│   │   ├── PromptComparator.jsx
│   │   ├── AlertsPanel.jsx
│   │   └── ExportButton.jsx
│   │
│   ├── services/
│   │   └── api.js           # Couche API + SSE streaming
│   │
│   └── __tests__/           # Tests Vitest
│       ├── setup.js
│       ├── services/api.test.js
│       └── components/
│           ├── KpiCards.test.jsx
│           └── Benchmark.test.jsx
│
├── package.json
├── vite.config.js
└── vitest.config.js
```

### 3.2 Navigation (TopNavbar)

Les 4 onglets sont maintenant intégrés dans la TopNavbar :

```
┌─────────────────────────────────────────────────────────────────┐
│  GEO MONITOR  │  Dashboard | Benchmark | Prompts | Alertes  │  API │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Flux Utilisateur

```
┌────────────────────────────────────────────────────────────────────┐
│                         ONBOARDING                                 │
├────────────────────────────────────────────────────────────────────┤
│  1. Marque + Secteur                                               │
│     ↓                                                              │
│  2. Génération IA (produits + concurrents)                        │
│     ↓                                                              │
│  3. Validation + Lancement analyse                                 │
│     ↓                                                              │
│  4. Streaming SSE (progression temps réel)                        │
│     ↓                                                              │
│  5. Dashboard complet                                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints

### 4.1 Endpoints Principaux

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/` | Status de l'API |
| GET | `/api/health` | Health check enrichi |
| GET | `/api/status` | État des LLMs connectés |
| GET | `/api/projects` | Liste des projets |
| POST | `/api/generate-config` | Génère produits/concurrents via IA |
| POST | `/api/benchmark` | Génère config benchmark multi-marques |
| POST | `/api/run-analysis` | Lance analyse (sync) |
| POST | `/api/run-analysis/stream` | Lance analyse (SSE streaming) |
| POST | `/api/run-benchmark/stream` | Lance benchmark (SSE streaming) |
| GET | `/api/metrics` | Métriques calculées |
| GET | `/api/metrics/by-model` | Métriques par modèle LLM |
| GET | `/api/history` | Historique 30 jours |
| GET | `/api/export` | Export JSON |
| GET | `/api/export/pdf` | Export PDF (WeasyPrint) |
| GET | `/api/export/pdf/check` | Vérifie dispo WeasyPrint |
| GET | `/api/prompts/compare` | Comparateur de prompts |
| GET | `/api/alerts/status` | Status des alertes |
| POST | `/api/alerts/test` | Test d'alerte |
| POST | `/api/alerts/weekly` | Configure alerte hebdo |

### 4.2 Timeouts

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `OLLAMA_TIMEOUT` | 40s | Timeout par appel LLM |
| `MAX_TIME_PER_PROMPT` | 50s | Timeout par prompt |
| Global SSE | 300s | 6 prompts × 50s |
| Gunicorn | 180s | Timeout worker Render |
| Frontend EventSource | 300s | Timeout SSE frontend |

---

## 5. Flux de Données

### 5.1 Analyse Simple (Single Brand)

```
Onboarding
    ↓
POST /api/run-analysis/stream (SSE)
    ↓
Backend: Boucle prompts → LLM → BrandAnalyzer
    ↓
SSE: {type: 'start'} → {type: 'progress'} → {type: 'complete'}
    ↓
results.json écrit
    ↓
Frontend: wait 5s → GET /api/metrics
    ↓
Dashboard affiché
```

### 5.2 Benchmark Multi-Marques

```
Benchmark tab
    ↓
POST /api/benchmark (brands: [...])
    ↓
LLM génère: sector + products + prompts
    ↓
POST /api/run-benchmark/stream
    ↓
TOUTES les marques analysées sur LES MÊMES prompts
    ↓
Résultats comparables (méthodologie identique)
```

---

## 6. Fixes Critiques (Session 2026-03-23)

### 6.1 Problèmes Résolus

| Problème | Solution |
|----------|----------|
| LLM timeout (0 chars) | Ajout `'think': False` aux appels Ollama |
| 100% mention rate | Prompt système neutralisé (GEO_SYSTEM_PROMPT) |
| Biais extraction JSON | `_extract_json_from_response()` sépare narrative/JSON |
| Incomparabilité benchmark | Toutes marques sur mêmes prompts |
| Unicode Windows | ✓/✗ → OK/X |

### 6.2 Race Condition

**Problème** : Frontend fetch /api/metrics avant results.json écrit

**Solution** : Délai 5s dans `loadDashboardData()`

---

## 7. Scheduler (APScheduler)

### 7.1 Tâches Planifiées

| Fréquence | Tâche |
|-----------|-------|
| Toutes les 6h | Analyse auto pour tous les projets |
| Lundi 9h | Résumé hebdomadaire par email |

---

## 8. Déploiement

### 8.1 URLs de Production

| Service | URL |
|---------|-----|
| Backend | https://geo-monitor.onrender.com |
| Frontend | https://matmut-geo-monitoring.vercel.app |

### 8.2 Services Externes

| Service | Usage | Dashboard |
|---------|-------|-----------|
| Ollama Cloud | LLM API | https://ollama.com/api |
| Render | Backend hosting | https://render.com/dashboard |
| Vercel | Frontend hosting | https://vercel.com/dashboard |
| PostgreSQL | DB production | Render dashboard |

---

## 9. Tests

### 9.1 Backend (Pytest)

```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

**Couverture** : 35 tests
- `test_analyzer.py` : 20 tests
- `test_prompts.py` : 6 tests
- `test_database.py` : 5 tests
- `test_routes.py` : 10 tests

### 9.2 Frontend (Vitest)

```bash
cd frontend
npm install
npm run test:run
```

---

## 10. Commandes de Développement

### 10.1 Backend

```bash
cd backend
python -m venv venv           # First time
venv\Scripts\activate
pip install -r requirements.txt
python app.py                 # http://localhost:5000
```

### 10.2 Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
npm run build                 # Production → dist/
npm run lint                  # ESLint
npm run test:run             # Tests Vitest
```

---

## 11. Préférences Utilisateur

- **Langue** : Français
- **Style** : Réponses terses, directes
- **Code** : Pas de sur-engineering, éviter abstractions prématurées
- **Commit** : Bundler les changements liés, focus sur le "pourquoi"

---

## 12. Mémoire du Projet

### 12.1 Fichiers de Référence

| Fichier | Description |
|---------|-------------|
| `CLAUDE.md` | Instructions pour Claude Code |
| `memory/MEMORY.md` | Vue d'ensemble sessions |
| `memory/project.md` | Architecture complète |
| `memory/debugging.md` | Guide dépannage |
| `memory/feedback.md` | Préférences utilisateur |
| `memory/reference.md` | URLs externes |

### 12.2 Documentation Externe

- **GitHub** : https://github.com/memphisfils/matmut-geo-monitoring
- **Render Dashboard** : https://render.com/dashboard
- **Vercel Dashboard** : https://vercel.com/dashboard

---

## 13. Améliorations Futures

| Priorité | Amélioration |
|----------|--------------|
| Haute | Refactoring app.py en sous-modules |
| Haute | Tests覆盖率 80%+ |
| Moyenne | Cache Redis |
| Moyenne | Authentification JWT |
| Basse | WebSockets pour logs temps réel |
| Basse | Sentiment analysis avancé (VADER/BERT) |

---

## 14. Glossaire

| Terme | Définition |
|-------|------------|
| **GEO** | Generative Engine Optimization |
| **LLM** | Large Language Model |
| **SSE** | Server-Sent Events |
| **SOV** | Share of Voice |
| **Top of Mind** | % première mention |
| **Benchmark** | Comparaison multi-marques |

---

*Document généré le 24 Mars 2026*
*Version 2.0*
