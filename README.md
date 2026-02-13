# 📊 Matmut GEO Dashboard

> **Dashboard de Monitoring de Visibilité IA** pour Matmut.
> Analysez comment ChatGPT, DeepSeek, Claude et Gemini perçoivent votre marque.

![Dashboard Preview](https://placehold.co/1200x600/0f172a/3b82f6?text=Matmut+GEO+Dashboard)

## 🚀 Fonctionnalités Clés

### 1. 🧠 Multi-LLM & Flexibilité
- **Compatible :** OpenAI (ChatGPT), DeepSeek, Anthropic (Claude), Google (Gemini).
- **Mode Flexible :** Fonctionne avec **une seule clé API**. Si vous n'avez que DeepSeek, le dashboard tourne sur DeepSeek.
- **Mode Démo :** Pas de clé ? Le dashboard génère des données réalistes pour tester l'interface.

### 2. 📈 Analyse de Tendances
- Suivez l'évolution de la visibilité sur 30 jours (via SQLite).
- KPI : Part de Voix, Taux de Mention, Position Moyenne.

### 3. ⚔️ Mode Duel
- **Comparateur direct** : Matmut vs Concurrent (ex: MAIF).
- Radar Chart pour visualiser les forces/faiblesses relatives.

### 4. 📄 Export & Reporting
- **PDF PRO** : Générez un rapport A4 complet en un clic.
- **Slack Alerts** : Recevez une notif si Matmut perd sa 1ère place.

### 5. 🎨 Design Premium
- Interface sombre "SaaS", Glassmorphism, Animations fluides.
- Graphiques interactifs (Recharts).

---

## 🛠️ Installation

### Pré-requis
- Node.js 18+
- Python 3.10+

### 1. Backend (Flask)
```bash
cd project/backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Copier l'exemple de config
cp .env.example .env
# --> Ajoutez vos clés API dans .env (DEEPSEEK_API_KEY, etc.)

python app.py
# Serveur tourne sur http://localhost:5000
```

### 2. Frontend (React + Vite)
```bash
cd project/frontend
npm install
npm run dev
# Dashboard accessible sur http://localhost:5173
```

---

## 📂 Structure du Projet

```
project/
├── backend/            # API Flask
│   ├── app.py          # Point d'entrée
│   ├── analyzer.py     # Logique de calcul (NLP, Sentiment)
│   ├── llm_client.py   # Connecteurs IA (Simulés ou Réels)
│   ├── alerts.py       # Webhook Slack
│   └── database.py     # Gestion SQLite
│
├── frontend/           # React App
│   ├── src/
│   │   ├── components/ # Widgets (Charts, Duel, Header...)
│   │   ├── services/   # Appels API
│   │   └── App.jsx     # Layout Principal
```

## 🤝 Contribution
Projet interne Matmut.
Dev: @memphisfils
