# 📊 GEO Dashboard — Monitoring de Visibilité IA

> **Plateforme générique de monitoring de visibilité IA** pour analyser comment les LLMs (ChatGPT, Claude, Gemini, etc.) perçoivent votre marque par rapport à ses concurrents.

![Dashboard Preview](https://placehold.co/1200x600/0f172a/FFD700?text=GEO+Dashboard+v2.0)

---

## 🎯 À Quoi Sert Ce Projet ?

Ce dashboard vous permet de **mesurer la visibilité de votre marque** dans les réponses des intelligences artificielles génératives (LLMs).

### Cas d'Usage Concrets

| Scénario | Question | Résultat |
|----------|----------|----------|
| **Marque** | "Quelles sont les meilleures banques en ligne ?" | Votre marque est-elle citée ? À quelle position ? |
| **Concurrent** | "Comparatif MAIF vs Matmut" | Quelle marque est favorisée ? |
| **Secteur** | "Assurance auto pas chère" | Votre visibilité sur le marché |

### Métriques Clés

- **Taux de Mention** : % de fois où votre marque est citée
- **Position Moyenne** : Position moyenne dans les réponses
- **Share of Voice** : Part de voix relative vs concurrents
- **Top of Mind** : % de fois citée en première position
- **Score Global** : Score composite sur 100
- **Sentiment** : Tonalité des mentions (positif/négatif)

---

## 🚀 Fonctionnalités Principales

### 1. 🧠 Multi-LLM avec Ollama Cloud

| Fournisseur | Modèles Supportés |
|-------------|-------------------|
| **Ollama Cloud** | qwen3.5, llama3.2, nemotron-3-super, etc. |

- **Flexible** : Fonctionne avec une seule clé API
- **Mode Démo** : Génère des données réalistes sans clé API
- **Cache Intelligent** : Réutilise les réponses identiques (gain de performance)

### 2. 📈 Analyse de Tendances

- **Historique 30 jours** : Suivez l'évolution de votre visibilité
- **Graphiques Dynamiques** : TrendChart, MentionChart, Share of Voice
- **Données Réelles** : Basées sur vos analyses, pas de données fictives

### 3. ⚔️ Mode Duel

- **Comparaison 1-vs-1** : Votre marque vs un concurrent direct
- **Radar Multi-Critères** : Visualisez forces/faiblesses relatives
- **Sélection Interactive** : Changez de concurrent à la volée

### 4. 🎯 Onboarding Guidé par IA

**Processus en 3 étapes :**

1. **Marque + Secteur** → Saisie manuelle
2. **Génération IA** → L'IA propose produits et concurrents réels
3. **Validation** → Résumé et lancement de l'analyse

### 5. 📊 Dashboard Complet

| Section | Composants |
|---------|------------|
| **KPI Cards** | Rang, Score Global, Taux de Mention, Position Moyenne |
| **Trend Chart** | Évolution du score sur 30 jours |
| **Duel Card** | Comparaison directe avec un concurrent |
| **Ranking Table** | Classement complet de toutes les marques |
| **Charts** | Sentiment, Mentions, Share of Voice |
| **Insights** | Radar, Heatmap, Recommandations |

### 6. 📄 Export & Reporting

- **Export JSON** : Téléchargez les données brutes
- **Export PDF** : Génération de rapport (via html2canvas + jsPDF)
- **Alertes Slack** : Notification si votre marque perd sa première place

### 7. 🎨 Design Premium

- **Dark Mode "SaaS"** : Interface sombre professionnelle
- **Layout Vertical** : Sections organisées pour une lisibilité optimale
- **Graphiques Interactifs** : Recharts avec animations fluides
- **Responsive** : Adaptation desktop, tablette, mobile

---

## 🛠️ Installation

### Pré-requis

| Logiciel | Version Requise |
|----------|-----------------|
| **Node.js** | 18+ |
| **Python** | 3.10+ |
| **Git** | 2.0+ |

### 1. Backend (Flask + Ollama Cloud)

```bash
# Navigation
cd project/backend

# Création de l'environnement virtuel
python -m venv venv

# Activation (Windows)
venv\Scripts\activate

# Activation (Mac/Linux)
source venv/bin/activate

# Installation des dépendances
pip install -r requirements.txt

# Configuration de l'API
cp .env.example .env

# Édition du fichier .env
# Ajoutez votre clé API Ollama Cloud :
# OLLAMA_API_KEY=votre_cle_ici
# OLLAMA_MODEL=qwen3.5

# Lancement du serveur
python app.py

# Le backend tourne sur http://localhost:5000
```

### 2. Frontend (React + Vite)

```bash
# Navigation
cd project/frontend

# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Le frontend est accessible sur http://localhost:5173
```

---

## 📂 Structure du Projet

```
project/
├── backend/                    # API Flask
│   ├── app.py                  # Point d'entrée, routes API
│   ├── analyzer.py             # Logique NLP (extraction, scoring)
│   ├── llm_client.py           # Connecteur Ollama Cloud
│   ├── alerts.py               # Système d'alertes Slack
│   ├── database.py             # Gestion SQLite (historique)
│   ├── prompts.py              # Bibliothèque de prompts
│   ├── requirements.txt        # Dépendances Python
│   └── .env.example            # Template de configuration
│
├── frontend/                   # Application React
│   ├── src/
│   │   ├── components/         # Composants UI (22 fichiers)
│   │   │   ├── Onboarding.jsx  # Écran de configuration
│   │   │   ├── KpiCards.jsx    # 4 cartes KPI
│   │   │   ├── TrendChart.jsx  # Graphique d'évolution
│   │   │   ├── DuelCard.jsx    # Comparaison 1-vs-1
│   │   │   ├── RankingTable.jsx # Tableau de classement
│   │   │   ├── Charts.jsx      # 4 graphiques (Recharts)
│   │   │   └── InsightsPanel.jsx # Recommandations
│   │   ├── services/
│   │   │   └── api.js          # Couche d'accès API
│   │   ├── App.jsx             # Composant principal
│   │   ├── App.css             # Layout principal
│   │   └── index.css           # Styles globaux
│   ├── package.json
│   └── vite.config.js
│
├── data/
│   └── history.db              # Base SQLite d'historique
│
├── screenshots/                # Captures d'écran
└── README.md                   # Ce fichier
```

---

## 🔧 Configuration

### Fichier `.env` (Backend)

```bash
# API Keys - Ollama Cloud
OLLAMA_API_KEY=votre_cle_api_ici

# URL de base pour Ollama Cloud
OLLAMA_BASE_URL=https://ollama.com/api

# Modèle à utiliser
# Options: qwen3.5, llama3.2:8b, nemotron-3-super, etc.
OLLAMA_MODEL=qwen3.5

# Configuration Flask
FLASK_PORT=5000
FLASK_DEBUG=True
```

### Obtenir une Clé API Ollama Cloud

1. Rendez-vous sur [ollama.com](https://ollama.com)
2. Créez un compte / Connectez-vous
3. Allez dans **Settings → API Keys**
4. Générez une nouvelle clé
5. Copiez-la dans votre fichier `.env`

---

## 📖 Utilisation

### 1. Lancement de l'Application

```bash
# Terminal 1 - Backend
cd backend
venv\Scripts\activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Onboarding (Première Utilisation)

1. **Étape 1** : Saisissez votre marque et secteur
   - Ex: `adidas` / `Automobile` (ou `Sport`)
   
2. **Étape 2** : Génération IA
   - Cliquez sur "ANALYSER AVEC IA"
   - L'IA génère 3 produits et 5 concurrents réels
   
3. **Étape 3** : Validation
   - Vérifiez les produits et concurrents
   - Ajustez si nécessaire
   - Lancez l'analyse

### 3. Dashboard

Après l'analyse, le dashboard affiche :

- **KPI Cards** : Rang, Score, Taux de Mention, Position
- **Trend Chart** : Évolution sur 30 jours
- **Duel Card** : Comparaison avec un concurrent
- **Ranking Table** : Classement complet
- **Charts** : Sentiment, Mentions, Share of Voice
- **Insights** : Recommandations IA

### 4. Refresh des Données

- Cliquez sur le bouton **Refresh** dans la navbar
- Ou relancez une analyse complète

---

## ⚡ Performances

### Optimisations Implémentées

| Optimisation | Avant | Après | Gain |
|--------------|-------|-------|------|
| **Timeout** | 120s × 2 | 30s × 1 | 4x |
| **Mode** | Séquentiel | Parallèle (3 workers) | 3x |
| **Cache** | Aucun | Mémoire | Instantané |
| **Modèle** | nemotron-3-super | qwen3.5 | 30-50% |

### Temps de Réponse

| Scénario | Temps |
|----------|-------|
| **6 prompts (parallèle)** | ~45-90s |
| **6 prompts (séquentiel)** | ~3 min |
| **Avec cache (2ème run)** | ~2s |

---

## 🗑️ Fichiers à Ne Pas Commiter

Le fichier `.gitignore` exclut automatiquement :

```
.env                    # Clés API (à ne jamais commiter !)
data/*.json             # Données d'analyse
__pycache__/            # Cache Python
node_modules/           # Dépendances Node
venv/                   # Environnement virtuel
```

---

## 🤝 Contribution

### Workflow de Développement

```bash
# 1. Récupérer les dernières modifications
git pull origin main

# 2. Créer une branche pour votre feature
git checkout -b feat/ma-nouvelle-fonctionnalite

# 3. Développer et tester
# ...

# 4. Commiter
git add .
git commit -m "feat: description de la modification"

# 5. Pusher
git push origin feat/ma-nouvelle-fonctionnalite

# 6. Créer une Pull Request sur GitHub
```

### Conventions de Commit

| Préfixe | Description |
|---------|-------------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `perf:` | Optimisation de performance |
| `refactor:` | Refactoring de code |
| `docs:` | Documentation |
| `style:` | Formatage, style |
| `test:` | Tests |

---

## 📊 API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/` | GET | Status de l'API |
| `/api/status` | GET | État des LLMs connectés |
| `/api/generate-config` | POST | Génère config (produits + concurrents) via IA |
| `/api/run-analysis` | POST | Lance une analyse complète |
| `/api/metrics` | GET | Récupère les métriques calculées |
| `/api/history` | GET | Historique des analyses (30 jours) |
| `/api/export` | GET | Export des données en JSON |

---

## 🧩 Technologies Utilisées

### Backend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Flask** | 3.0.0 | Framework web |
| **Requests** | 2.31.0 | Requêtes HTTP |
| **Python-dotenv** | 1.0.0 | Gestion des variables d'environnement |
| **SQLite** | - | Base de données (historique) |

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **React** | 19.2.0 | Framework UI |
| **Vite** | 7.3.1 | Build tool |
| **Recharts** | 3.7.0 | Graphiques |
| **Framer Motion** | 12.34.0 | Animations |
| **Lucide React** | 0.563.0 | Icônes |
| **jsPDF** | 4.1.0 | Export PDF |
| **html2canvas** | 1.4.1 | Capture DOM |

---

## 🐛 Dépannage

### Problème : "No LLM clients available"

**Cause** : Clé API manquante ou invalide

**Solution** :
```bash
# Vérifier .env
cat backend/.env

# La clé doit être présente
OLLAMA_API_KEY=your_key_here
```

### Problème : Timeout des requêtes

**Cause** : Modèle trop lent ou réseau instable

**Solution** :
```bash
# Changer de modèle dans .env
OLLAMA_MODEL=llama3.2:8b  # Plus rapide

# Ou augmenter le timeout dans llm_client.py
timeout = 60  # secondes
```

### Problème : Données fictives affichées

**Cause** : Backend non disponible ou erreur API

**Solution** :
```bash
# Vérifier que le backend tourne
curl http://localhost:5000/api/status

# Vérifier les logs du backend
# Les erreurs s'affichent dans la console
```

---

## 📈 Roadmap

### Fonctionnalités à Venir

- [ ] Authentification (login/mot de passe)
- [ ] Cache Redis persistant
- [ ] Tests automatisés (pytest + Vitest)
- [ ] Éditeur de prompts custom
- [ ] Export PDF template serveur
- [ ] WebSockets pour logs en temps réel
- [ ] Sentiment analysis avancé (VADER, transformers)

---

## 📄 Licence

Projet interne — Tous droits réservés.

---

## 👥 Équipe

**Développeur** : @memphisfils

**Contact** : [GitHub](https://github.com/memphisfils/matmut-geo-monitoring)

---

## 🙏 Remerciements

- **Ollama** : Pour leur API Cloud et leurs modèles open-source
- **Recharts** : Bibliothèque de graphiques React
- **Flask** : Framework Python simple et efficace

---

**Dernière mise à jour** : Mars 2026  
**Version** : 2.0
