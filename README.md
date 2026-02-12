# 📊 Matmut GEO Monitoring Dashboard

Dashboard interactif pour mesurer la **visibilité de la marque Matmut** sur les moteurs de recherche génératifs (ChatGPT, Claude, Gemini) par rapport à ses concurrents.

![Dashboard](screenshots/dashboard.png)

## 🎯 Objectif

Analyser et visualiser la présence de Matmut dans les réponses des LLMs sur des requêtes liées à l'assurance et la mutuelle.

## 🏗️ Architecture

### Backend (Python Flask)
- **API REST** pour l'analyse et les métriques
- **Multi-LLM** : ChatGPT, Claude, Gemini
- **Analyse automatique** des mentions de marques
- **Données de démo** intégrées pour fonctionner sans API keys

### Frontend (React + Vite)
- **Dashboard interactif** avec Recharts
- **Design premium** dark theme aux couleurs Matmut
- **Animations fluides** avec Framer Motion
- **Visualisations** : bar charts, doughnut, radar, heatmap
- **Insights actionnables** pour Matmut
- **Export** des rapports en JSON

## 📊 Métriques Calculées

| Métrique | Description |
|----------|-------------|
| **Taux de Mention** | % de prompts où la marque est citée |
| **Position Moyenne** | Rang moyen d'apparition |
| **Share of Voice** | Part de visibilité totale |
| **Top of Mind** | % de fois en 1ère position |
| **Score Global** | Score pondéré sur 100 |

## 🚀 Installation

### Prérequis
- Python 3.9+
- Node.js 18+
- API Keys : OpenAI, Anthropic, Google (optionnel - données démo disponibles)

### Setup Backend

```bash
cd backend

# Installer les dépendances
pip install -r requirements.txt

# Configurer les API keys (optionnel)
cp .env.example .env
# Éditer .env et ajouter vos clés

# Lancer le serveur
python app.py
```

Le backend sera accessible sur `http://localhost:5000`

### Setup Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

> **Note :** Le dashboard fonctionne en **mode démo** même sans le backend, avec des données réalistes pré-intégrées.

## 📝 Utilisation

### 1. Lancer une analyse

```bash
# Via API (avec API keys configurées)
curl -X POST http://localhost:5000/api/run-analysis \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "llms": ["chatgpt", "claude"]}'

# Avec données de démo
curl -X POST http://localhost:5000/api/run-analysis \
  -H "Content-Type: application/json" \
  -d '{"demo": true}'
```

### 2. Visualiser le dashboard

1. Ouvrir `http://localhost:5173`
2. Le dashboard se charge automatiquement avec les données
3. Explorer les visualisations et insights

### 3. Exporter le rapport

Cliquer sur **"Exporter"** pour télécharger un JSON complet.

## 📁 Structure du Projet

```
matmut-geo-dashboard/
├── backend/
│   ├── app.py              # API Flask + données démo
│   ├── analyzer.py          # Analyse des mentions
│   ├── llm_client.py        # Client multi-LLM
│   ├── prompts.py           # 50 prompts de test
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx      # Navigation
│   │   │   ├── Header.jsx       # Actions
│   │   │   ├── KpiCards.jsx     # Cartes KPI
│   │   │   ├── RankingTable.jsx # Classement
│   │   │   ├── Charts.jsx       # Graphiques
│   │   │   └── InsightsPanel.jsx # Insights
│   │   ├── services/
│   │   │   └── api.js           # Service API
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css            # Design system
│   ├── package.json
│   └── vite.config.js
├── data/
│   └── results.json         # Résultats stockés
├── screenshots/
├── README.md
└── .gitignore
```

## 🎨 Design

- **Couleur principale Matmut** : `#003D7A`
- **Theme** : Dark dashboard premium
- **Police** : Inter (Google Fonts)
- **Animations** : Framer Motion
- **Charts** : Recharts

## ⚙️ Configuration

### Variables d'environnement (.env)

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
FLASK_PORT=5000
FLASK_DEBUG=True
```

### Personnalisation des prompts

Éditer `backend/prompts.py` pour ajouter/modifier les prompts de test.

## 📊 Méthodologie

### Prompts de Test
50 prompts répartis en 5 catégories :
- Assurance Auto (10)
- Assurance Habitation (10)
- Mutuelle Santé (10)
- Assurance Professionnelle (10)
- Questions Générales (10)

### Scoring
```
Score Global = 
  Taux de Mention × 0.4 +
  (100 / Position Moyenne) × 0.3 +
  Share of Voice × 0.2 +
  Top of Mind × 0.1
```

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| `No data available` | Lancer une analyse via `/api/run-analysis` |
| `CORS Error` | Vérifier que Flask-CORS est installé |
| `API Keys Error` | Le dashboard utilise les données démo automatiquement |
| `Frontend ne charge pas` | Vérifier `npm run dev` et accéder à port 5173 |

## 📄 License

MIT

## 👤 Auteur

Memphis - Exercice technique Matmut GEO Monitoring
