# 🚀 GEO Monitor — Roadmap Complète
> **Objectif :** SaaS de monitoring de visibilité IA — prêt pour grandes marques, PME et entreprises  
> **Durée :** 3 semaines (max 4) | **Outils :** Claude Code + OpenCode  
> **Stack :** React 19 + Flask + PostgreSQL + Hetzner + OAuth2 Google  
> **Design :** Arctic Professional (`#F4F7FA` / `#0077CC` / Outfit font)

---

## 📅 Vue d'Ensemble des Deadlines

| Phase | Période | Durée | Statut |
|-------|---------|-------|--------|
| **Phase 0** — Infrastructure & Auth | Jours 1–3 | 3j | 🔧 En cours |
| **Phase 1** — Landing Page & Onboarding | Jours 4–6 | 3j | ⏳ À faire |
| **Phase 2** — Dashboard Core (Arctic Design) | Jours 7–10 | 4j | ⏳ À faire |
| **Phase 3** — Analyse Temps Réel & SSE | Jours 11–13 | 3j | ✅ Partiel |
| **Phase 4** — Benchmark & Compétiteurs | Jours 14–16 | 3j | ✅ Partiel |
| **Phase 5** — Alertes & CronJobs | Jours 17–18 | 2j | ✅ Partiel |
| **Phase 6** — Features Avancées | Jours 19–20 | 2j | ⏳ À faire |
| **Phase 7** — Mise en Production Hetzner | Jours 21 | 1j | ⏳ À faire |

---

## 🗓️ SEMAINE 1 — Fondations & Infrastructure (Jours 1–7)

### Jour 1–2 · Infrastructure Hetzner + CI/CD
**Deadline : Fin Jour 2**

#### Infrastructure
- [ ] Commander VPS Hetzner CPX31 (4 vCPU / 8 Go / 12€/mois)
- [ ] Configurer Ubuntu 24.04 LTS + SSH keys
- [ ] Installer Docker + Docker Compose
- [ ] Installer Caddy (SSL auto + reverse proxy)
- [ ] Configurer domaine `geo-monitor.fr` → DNS → IP Hetzner
- [ ] Activer Hetzner Backups automatiques (snapshots)

#### Docker Compose Stack
```yaml
# docker-compose.yml — 1 seul VPS, tout dedans
services:
  frontend:    # React 19 build statique servi par Caddy
  backend:     # Flask + Gunicorn (gthread, 4 workers)
  db:          # PostgreSQL 16 + volume persistant
  redis:       # Cache sessions OAuth2 + rate limiting
  caddy:       # Reverse proxy + SSL Let's Encrypt auto
```

#### CI/CD Pipeline
- [ ] GitHub Actions → build → push → deploy Hetzner
- [ ] Scripts de rollback automatique
- [ ] Variables d'environnement sécurisées (`.env.prod`)

---

### Jour 3 · OAuth2 Google
**Deadline : Fin Jour 3**

#### Backend Flask
- [ ] `pip install authlib flask-session redis`
- [ ] Route `/auth/google` → redirect Google Consent
- [ ] Route `/auth/google/callback` → échange token + session
- [ ] Table `users` PostgreSQL : `id, email, name, avatar_url, google_id, created_at, plan`
- [ ] Middleware `@login_required` sur toutes les routes API
- [ ] Route `/auth/logout` + invalidation session Redis
- [ ] Rate limiting : 5 tentatives / minute / IP

#### Frontend React
- [ ] Page `/login` — bouton "Continuer avec Google" (design Arctic)
- [ ] Context `AuthContext` + hook `useAuth()`
- [ ] `ProtectedRoute` wrapper → redirect `/login` si non connecté
- [ ] Affichage avatar + nom utilisateur dans la navbar
- [ ] Gestion token expiration + refresh silencieux

#### Sécurité
- [ ] CSRF token sur toutes les routes POST
- [ ] Headers sécurité via Caddy (`X-Frame-Options`, `CSP`, `HSTS`)
- [ ] Validation strict des emails autorisés (whitelist ou domaine)

---

### Jour 4–5 · Landing Page (Hero → Conversion)
**Deadline : Fin Jour 5**

#### Structure Landing Page
```
/landing
├── Hero Section          ← Titre fort + CTA + Démo animée
├── Problem Statement     ← "Votre marque est-elle citée par les IA ?"
├── How It Works         ← 3 étapes (Input → IA → Score)
├── Features Grid        ← 6 features clés avec icônes
├── Social Proof         ← Logos marques + témoignages
├── Pricing Section      ← Starter / Pro / Business / Enterprise
├── FAQ                  ← 8 questions fréquentes
└── Footer               ← Liens + Contact + Legal
```

#### Hero Section (prioritaire)
- [ ] **Titre H1** : "Sachez exactement comment les IA perçoivent votre marque"
- [ ] **Sous-titre** : Dashboard temps réel — ChatGPT, Gemini, Claude
- [ ] **CTA primaire** : "Analyser ma marque gratuitement" → `/login`
- [ ] **CTA secondaire** : "Voir une démo" → modal vidéo / GIF
- [ ] **Démo animée** : Mockup du dashboard en arrière-plan (CSS animation)
- [ ] **Badge de confiance** : "Analysé par +3 modèles IA • Rapport en 5 min"

#### Section Pricing
```
Starter 199€/mois  → 1 marque, 3 LLMs, alertes email
Pro 499€/mois      → 5 marques, tous LLMs, alertes Slack/Telegram, PDF
Business 999€/mois → 15 marques, API accès, rapport hebdo auto, benchmark
Enterprise 1999€   → Marques illimitées, SLA 99,9%, support dédié, custom
```
- [ ] Toggle mensuel/annuel (remise 20%)
- [ ] Bouton "Essai gratuit 14 jours" sur chaque plan
- [ ] Badge "Populaire" sur Pro

---

### Jour 6–7 · Design System Arctic + Composants
**Deadline : Fin Jour 7**

#### Tokens CSS (variables globales)
```css
:root {
  --bg-main: #F4F7FA;
  --bg-card: #FFFFFF;
  --border: #E1E8F0;
  --text-primary: #1E293B;
  --text-secondary: #64748B;
  --accent-primary: #0077CC;
  --accent-secondary: #00CED1;
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --radius: 8px;
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
  --font: 'Outfit', 'Public Sans', sans-serif;
}
```

#### Composants à construire
- [ ] `KpiCard` — Valeur + delta + icône + sparkline mini
- [ ] `TrendChart` — Courbe lisse Recharts + gradient fill cyan→transparent
- [ ] `CompetitorTable` — Rang + score + barre de progression
- [ ] `PromptRow` — Texte prompt + badge mention + score
- [ ] `AlertBadge` — Email / Slack / Telegram avec statut
- [ ] `LLMBreakdownCard` — Barre par modèle avec couleur distincte
- [ ] `SentimentGauge` — Donut chart positif/neutre/négatif
- [ ] `StatusPill` — Online/Offline/Analyzing avec dot animé
- [ ] `Sidebar` — Navigation + projet switcher + user menu
- [ ] `TopNavbar` — Search + notifs + profil utilisateur
- [ ] `EmptyState` — Onboarding si pas de données
- [ ] `LoadingSpinner` — Pendant les analyses SSE

---

## 🗓️ SEMAINE 2 — Features Core (Jours 8–14)

### Jour 8–9 · Dashboard Principal
**Deadline : Fin Jour 9**

#### Layout Dashboard (inspiré de la photo Arctic Professional)
```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR : Logo | Search | Notifs | Projet | Profil       │
├────────┬─────────────────────────────────────────────────┤
│        │  4 KPI CARDS : Mentions | Sentiment | SOV | Pos  │
│ SIDE   ├─────────────────────────────────────────────────┤
│ BAR    │  TREND CHART (pleine largeur, 7j/30j/90j)       │
│        ├──────────────────────┬──────────────────────────┤
│ - Dash │  BENCHMARK TABLE     │  FLUX MENTIONS RÉCENTES  │
│ - Bench│  (Concurrent + score)│  (avec icônes LLM)       │
│ - Prom ├──────────────────────┴──────────────────────────┤
│ - Alert│  ANALYSE PAR LLM     │  SENTIMENT ANALYSIS      │
│ - Proj └──────────────────────┴──────────────────────────┘
```

#### KPI Cards (4 métriques principales)
- [ ] **Score Global** : valeur /100 + delta vs période précédente
- [ ] **Taux de Mentions** : % prompts + nombre absolu
- [ ] **Share of Voice** : % vs concurrents + rang
- [ ] **Position Moyenne** : rang moyen dans les réponses LLM

#### Détails KPI supplémentaires (expandable)
- [ ] Top of Mind (% cité en 1ère position)
- [ ] Sentiment Score (+/- sur 100)
- [ ] Indice de confiance inter-modèles
- [ ] Tendance hebdomadaire (↑ ↓ →)

#### Filtres Globaux
- [ ] Sélecteur de période : 7j / 30j / 90j / personnalisé
- [ ] Sélecteur de LLM : Tous / GPT-4o / Gemini / Claude / qwen
- [ ] Sélecteur de marque (si multi-projets)
- [ ] Bouton "Actualiser" + timestamp dernière analyse

---

### Jour 10 · Analyse Temps Réel + SSE
**Deadline : Fin Jour 10**

#### Progress Bar d'Analyse
- [ ] Barre de progression SSE en temps réel (0% → 100%)
- [ ] Affichage du prompt en cours d'analyse
- [ ] Compteur : "Prompt 3/6 — LLM GPT-4o"
- [ ] ETA estimé (secondes restantes)
- [ ] Annulation possible en cours d'analyse

#### Streaming des Résultats
- [ ] Résultats qui apparaissent au fur et à mesure (pas de chargement final)
- [ ] Score qui se met à jour à chaque prompt traité
- [ ] Notification toast : "Analyse terminée ✓" avec résumé
- [ ] Auto-refresh du dashboard après analyse sans rechargement

#### Gestion des Erreurs
- [ ] Timeout LLM → afficher "LLM indisponible" + continuer avec les autres
- [ ] Reconnexion SSE automatique si perte connexion
- [ ] Fallback mode démo si tous les LLMs sont down
- [ ] Message d'erreur explicite + bouton "Réessayer"

---

### Jour 11–12 · Benchmark Compétitif
**Deadline : Fin Jour 12**

#### Interface Benchmark
- [ ] Sélecteur de marques à comparer (2 à 8 marques max)
- [ ] Génération automatique des concurrents via IA
- [ ] **Même set de prompts** pour toutes les marques (méthodologie identique)
- [ ] Vue comparative : tableau + graphiques côte à côte

#### Métriques Benchmark
- [ ] Tableau classement : Rang | Marque | Score | Mentions | SOV | Sentiment
- [ ] Graphique radar : 6 axes (Score, Mentions, Position, SOV, Top Mind, Sentiment)
- [ ] Graphique barres groupées : par LLM et par marque
- [ ] "Duel" 1v1 : ma marque vs concurrent sélectionné (vue détaillée)
- [ ] Évolution du classement dans le temps (historique benchmarks)

#### Export Benchmark
- [ ] Export PDF rapport complet (WeasyPrint sur Hetzner)
- [ ] Export CSV données brutes
- [ ] Share link (lien public temporaire 24h)

---

### Jour 13 · Analyse des Prompts
**Deadline : Fin Jour 13**

#### Gestionnaire de Prompts
- [ ] Liste de tous les prompts testés avec leurs résultats
- [ ] Score par prompt : mention O/N + position + sentiment
- [ ] Tri par score / mention / date
- [ ] Ajout de prompts personnalisés manuellement
- [ ] Génération IA de nouveaux prompts pertinents

#### Comparateur de Prompts
- [ ] Comparer 2 prompts côte à côte (A/B testing)
- [ ] Visualiser quelle formulation génère le plus de mentions
- [ ] Recommandations : "Ces 3 prompts performent mieux pour votre secteur"
- [ ] Export liste des meilleurs prompts

#### Insights Automatiques
- [ ] Détection des prompts sans mention (opportunités)
- [ ] Détection des prompts avec mention négative (risques)
- [ ] Suggestion de reformulations pour améliorer le score

---

### Jour 14 · Alertes & CronJobs
**Deadline : Fin Jour 14**

#### CronJobs (crontab Linux sur Hetzner)
```bash
# /etc/cron.d/geo-monitor
# Analyse automatique toutes les 6h
0 */6 * * *  geo python /app/run_auto_analysis.py >> /var/log/geo/analysis.log 2>&1

# Résumé hebdomadaire lundi 9h
0 9 * * 1    geo python /app/send_weekly_summary.py >> /var/log/geo/weekly.log 2>&1

# Alerte quotidienne si score baisse >5pts
0 8 * * *    geo python /app/check_score_alerts.py >> /var/log/geo/alerts.log 2>&1

# Backup PostgreSQL journalier 2h du matin
0 2 * * *    geo pg_dump geo_monitor | gzip > /backups/geo_$(date +%Y%m%d).sql.gz

# Nettoyage logs > 30j
0 3 * * 0    geo find /var/log/geo -name "*.log" -mtime +30 -delete
```

#### Système d'Alertes
- [ ] **Email** (SendGrid) : score baisse >5pts, nouvelle mention négative, rapport hebdo
- [ ] **Telegram Bot** : alerte instantanée si mention critique
- [ ] **Slack Webhook** : intégration canal #geo-monitor
- [ ] **In-app** : notification bell dans la navbar

#### Configuration Alertes (UI)
- [ ] Activer/désactiver par canal (email / Telegram / Slack)
- [ ] Seuils personnalisables : "Alerter si score < 60"
- [ ] Fréquence : immédiat / quotidien / hebdomadaire
- [ ] Test d'alerte depuis l'interface ("Envoyer une alerte test")
- [ ] Historique des alertes envoyées (log)

---

## 🗓️ SEMAINE 3 — Features Avancées + Production (Jours 15–21)

### Jour 15–16 · Features Avancées
**Deadline : Fin Jour 16**

#### Multi-Projets
- [ ] Tableau de bord centralisé (vue tous les projets)
- [ ] Créer / renommer / archiver des projets
- [ ] Switcher de projet dans la sidebar (dropdown)
- [ ] Score global agrégé sur tous les projets

#### Nuage de Mots-Clés (Keyword Intelligence)
- [ ] Extraction des mots-clés fréquents dans les réponses LLM
- [ ] Visualisation word cloud (taille = fréquence)
- [ ] Couleur selon sentiment (vert = positif, rouge = négatif)
- [ ] Clic sur un mot → voir les prompts associés

#### Historique & Tendances
- [ ] Graphique d'évolution sur 90 jours max
- [ ] Marqueurs d'événements (ex: "Campagne lancée le 10 mars")
- [ ] Comparaison période N vs période N-1
- [ ] Détection des pics et creux automatiques

#### Export & Rapports
- [ ] **Rapport PDF** : couverture + résumé + graphiques + recommandations
- [ ] **Export CSV** : toutes les métriques brutes
- [ ] **Rapport hebdomadaire automatique** : envoyé par email chaque lundi
- [ ] **Rapport de benchmark** : comparatif complet multi-marques
- [ ] Template de rapport personnalisable (logo client)

---

### Jour 17–18 · Petites Fonctionnalités Cruciales
**Deadline : Fin Jour 18**

#### Actions Rapides (Quick Actions)
- [ ] **Bouton "Analyser maintenant"** — déclenche une analyse immédiate
- [ ] **Bouton "Partager"** — génère un lien de rapport public (24h/7j)
- [ ] **Bouton "Rafraîchir"** — recharge les métriques sans relancer l'analyse
- [ ] **Bouton "Comparer"** — lance un benchmark rapide vs concurrent principal
- [ ] **Copier le score** en un clic (pour Slack / email)

#### Onboarding & UX
- [ ] **Wizard 3 étapes** : Marque → Génération IA → Validation → Lancement
- [ ] **Progress indicator** bien visible pendant la génération de config
- [ ] **Empty state** attractif avec CTA si pas encore de données
- [ ] **Tooltip** sur chaque métrique (explication en 1 phrase)
- [ ] **Shortcut clavier** : `Cmd+R` pour relancer, `Cmd+E` pour exporter

#### Gestion de Compte
- [ ] Page `/settings` : profil, plan, facturation, API keys
- [ ] Changement d'email + de nom
- [ ] Déconnexion de tous les appareils
- [ ] Suppression de compte (RGPD)
- [ ] Gestion des membres équipe (plan Business+)

#### Gestion des Erreurs & Santé
- [ ] Page `/status` : état de chaque LLM en temps réel
- [ ] Health check dashboard (uptime des 7 derniers jours)
- [ ] Notification si LLM dégradé pendant une analyse
- [ ] Mode maintenance avec message personnalisé

#### Sécurité & RGPD
- [ ] Log de toutes les connexions (IP + date + appareil)
- [ ] Politique de cookies + bandeau de consentement
- [ ] Export de données personnelles (RGPD Article 20)
- [ ] Chiffrement des clés API en base (AES-256)
- [ ] Rotation automatique des sessions toutes les 24h

---

### Jour 19 · Tests & QA
**Deadline : Fin Jour 19**

#### Tests Fonctionnels
- [ ] Test complet du flow OAuth2 (login → dashboard → logout)
- [ ] Test analyse SSE de bout en bout (onboarding → résultats)
- [ ] Test benchmark multi-marques (3 marques simultanées)
- [ ] Test export PDF (vérifier WeasyPrint sur Hetzner)
- [ ] Test alertes email + Telegram
- [ ] Test cron jobs (forcer l'exécution manuelle)

#### Tests de Performance
- [ ] Charge : 50 utilisateurs simultanés (Apache Benchmark)
- [ ] Temps de réponse API < 200ms sur toutes les routes
- [ ] LCP < 2.5s sur la landing page
- [ ] Audit Lighthouse > 90 (Performance, A11y, SEO)

#### Tests Cross-Browser
- [ ] Chrome + Firefox + Safari + Edge
- [ ] Mobile responsive (iPhone 14, Samsung Galaxy)
- [ ] Tablette (iPad)

---

### Jour 20 · Mise en Production Hetzner
**Deadline : Fin Jour 20**

#### Checklist Déploiement
- [ ] Variables `.env.prod` configurées et sécurisées
- [ ] `docker compose -f docker-compose.prod.yml up -d`
- [ ] Migration DB : `flask db upgrade`
- [ ] Vérifier SSL Caddy (HTTPS vert)
- [ ] Pointer DNS geo-monitor.fr → IP Hetzner
- [ ] Test OAuth2 sur le domaine final
- [ ] Vérifier tous les cron jobs actifs
- [ ] Activer monitoring Sentry (erreurs production)
- [ ] Désactiver Render/Vercel actuels
- [ ] Activer Hetzner Backups

#### Go-Live Communication
- [ ] Email à l'équipe avec l'URL finale
- [ ] Credentials CEO + accès démo
- [ ] Documentation utilisateur (1 page PDF)
- [ ] Support Slack/Telegram actif

---

### Jour 21 · Buffer & Polish
**Deadline : Fin Jour 21 (max)**

- [ ] Corrections de bugs remontés post-déploiement
- [ ] Optimisations CSS (animations, transitions)
- [ ] SEO : meta tags, Open Graph, sitemap.xml
- [ ] Favicon + Apple touch icon
- [ ] 404 page custom + 500 page custom
- [ ] Analytics (Plausible ou PostHog — RGPD compliant)

---

## 🏗️ Architecture Technique Finale

```
geo-monitor.fr (Hetzner CPX31 — 12€/mois)
│
├── Caddy (443/80) — SSL auto + reverse proxy
│   ├── / → Frontend React 19 (build statique)
│   ├── /api/* → Backend Flask (port 8000)
│   └── /auth/* → Flask OAuth2 routes
│
├── Frontend React 19
│   ├── Landing Page (/landing)
│   ├── Login (/login) — OAuth2 Google
│   ├── Dashboard (/dashboard)
│   ├── Benchmark (/benchmark)
│   ├── Prompts (/prompts)
│   ├── Alertes (/alerts)
│   ├── Projets (/projects)
│   └── Paramètres (/settings)
│
├── Backend Flask + Gunicorn
│   ├── Auth routes (OAuth2, sessions)
│   ├── Analysis routes (SSE streaming)
│   ├── Benchmark routes
│   ├── Metrics routes
│   ├── Export routes (PDF, CSV)
│   └── Alerts routes
│
├── PostgreSQL 16 (port 5432 interne)
│   ├── users (OAuth2 profiles)
│   ├── projects (marques suivies)
│   ├── analyses (résultats historiques)
│   ├── competitors (concurrents par projet)
│   ├── prompts (prompts testés)
│   ├── alerts (config + historique)
│   └── llm_responses (réponses brutes)
│
├── Redis (sessions OAuth2 + cache + rate limit)
│
└── CronJobs (crontab)
    ├── Analyse auto /6h
    ├── Résumé hebdo lundi 9h
    ├── Vérification alertes /8h
    └── Backup DB 2h du matin
```

---

## 📊 Métriques de Succès (KPIs Produit)

| Métrique | Cible Semaine 3 | Cible Mois 2 |
|----------|----------------|--------------|
| Temps d'analyse complet | < 90 secondes | < 60 secondes |
| Uptime | 99% | 99,9% |
| LCP Landing Page | < 2.5s | < 1.5s |
| Taux conversion démo → inscription | — | > 15% |
| NPS (si beta users) | — | > 40 |

---

## 🔗 Ressources & Outils

| Ressource | URL |
|-----------|-----|
| GitHub | https://github.com/memphisfils/matmut-geo-monitoring |
| Frontend (actuel) | https://matmut-geo-monitoring.vercel.app |
| Backend (actuel) | https://geo-monitoring-backend.onrender.com |
| Hetzner Console | https://console.hetzner.cloud |
| Google Cloud Console | https://console.cloud.google.com |
| SendGrid | https://app.sendgrid.com |
| Sentry | https://sentry.io |

---

*Roadmap générée le 25 Mars 2026 — GEO Monitor v3.0*  
*Auteur : Paul fils | Stack : React 19 + Flask + PostgreSQL + Hetzner*
