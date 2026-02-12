# 🚀 Matmut GEO Dashboard
> **Le premier outil de monitoring de réputation de marque sur les moteurs de recherche IA (ChatGPT, Claude, Gemini).**

![Dashboard Preview](https://via.placeholder.com/800x400.png?text=Matmut+GEO+Dashboard+Preview)

## 🎯 Pourquoi ce dashboard ?
Les moteurs de recherche changent. Aujourd'hui, vos clients demandent conseil à l'IA.
**Matmut GEO Dashboard** vous permet de :
*   👀 **Voir** ce que ChatGPT répond sur "Meilleure assurance auto".
*   📊 **Mesurer** votre part de voix (Share of Voice) face à la MAIF, AXA, etc.
*   📈 **Suivre** l'évolution de votre visibilité dans le temps.
*   🧠 **Analyser** le sentiment (Positif/Négatif) des mentions.

---

## ✨ Fonctionnalités Clés

### 1. 🏆 Classement Temps Réel
Qui est le numéro 1 ? Visualisez instantanément votre position moyenne sur 50+ requêtes stratégiques.

### 2. 🧠 Analyse de Sentiment (IA) `[NOUVEAU]`
L'IA ne fait pas que vous citer. Elle donne un avis.
*   🟢 **Positif :** "Matmut offre un service client réactif."
*   🔴 **Négatif :** "Les tarifs sont parfois élevés."
*   *Le dashboard quantifie ces émotions.*

### 3. 📈 Historique & Tendances `[NOUVEAU]`
Suivez votre progression sur 30 jours grâce à notre base de données locale. Prouvez le ROI de vos actions SEO/Contenu.

### 4. ⚡ Mode Démo "Zéro Config"
Pas de clé API ? Pas de problème. Le dashboard génère une simulation réaliste pour vous permettre de tester l'interface immédiatement.

---

## 🚀 Démarrage Rapide (2 minutes)

### Pré-requis
*   Python 3.8+
*   Node.js 16+

### 1. Installation & Lancement
```bash
# Clonez le projet
git clone https://github.com/memphisfils/matmut-geo-monitoring.git
cd matmut-geo-monitoring

# Lancez le Backend (API)
cd project/backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
# 🟢 API running on http://localhost:5000

# Lancez le Frontend (Dashboard) - Dans un nouveau terminal
cd project/frontend
npm install
npm run dev
# 🟢 Dashboard running on http://localhost:5173
```

### 2. Configuration (Optionnel)
Pour avoir des **vraies données**, ajoutez vos clés API dans `project/backend/.env` :
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=AI...
```
*Sans clés, le Mode Démo s'active automatiquement.*

---

## 🛠️ Stack Technique

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

---

## 🔮 Roadmap
- [x] Analyse de Sentiment
- [x] Historique 30 jours
- [ ] Export PDF Exécutif
- [ ] Comparateur "Head-to-Head" (Duel)
- [ ] Alerte Slack en cas de chute

---

**Développé pour Matmut par Memphis.**
