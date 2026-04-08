# 🎨 GEO Monitor — Prompt de Design Complet
## Style : **Arctic Professional**
> À coller directement dans Claude Code, OpenCode, ou tout LLM de génération de code.  
> Ce prompt décrit **chaque pixel** du système de design. Ne rien omettre.

---

## 🧠 CONTEXTE ET INTENTION DU DESIGN

Tu construis l'interface d'un SaaS d'analyse de visibilité de marque dans les LLMs (ChatGPT, Gemini, Claude). Les utilisateurs cibles sont des **directeurs marketing, agences, grands comptes, PME**. Ils restent plusieurs heures sur la plateforme. L'interface doit être **froide, analytique, fiable, professionnelle** — comme Segment, Mixpanel, ou les dashboards Google Cloud. Pas de fioriture. Pas de gradients agressifs. Pas de noir profond. Tout respire. Tout est lisible.

**Ambiance visuelle cible** : un tableau de bord d'analyse de données de haut niveau. Blanc cassé froid, bleu marine profond, cyan vif pour les données importantes. Comme un outil Bloomberg ou Datadog, mais accessible et élégant.

---

## 🎨 SECTION 1 — PALETTE DE COULEURS COMPLÈTE

### Variables CSS obligatoires (à déclarer dans `:root`)

```css
:root {
  /* ─── Fonds ─────────────────────────────────────── */
  --bg-main:        #F4F7FA;   /* Fond de page principal — gris-bleu arctique très clair */
  --bg-card:        #FFFFFF;   /* Fond de toutes les cartes et conteneurs */
  --bg-hover:       #F1F5F9;   /* Fond au survol des lignes et items */
  --bg-sidebar:     #FFFFFF;   /* Fond sidebar — blanc pur, séparé par bordure */

  /* ─── Bordures ───────────────────────────────────── */
  --border:         #E1E8F0;   /* Bordure universelle sur toutes les cartes */
  --border-strong:  #CBD5E1;   /* Bordure plus visible pour séparateurs section */
  --border-focus:   #0077CC;   /* Bordure en focus (inputs, sélection active) */

  /* ─── Textes ─────────────────────────────────────── */
  --text-primary:   #1E293B;   /* Texte principal — titres, valeurs importantes */
  --text-secondary: #64748B;   /* Labels, sous-titres, descriptions */
  --text-muted:     #94A3B8;   /* Métadonnées, dates, texte tertiaire */
  --text-disabled:  #CBD5E1;   /* Texte inactif, placeholders */
  --text-inverse:   #FFFFFF;   /* Texte sur fond coloré (boutons, badges) */

  /* ─── Accent Principal — Bleu Marine ─────────────── */
  --accent:         #0077CC;   /* Bleu professionnel — boutons primaires, onglets actifs */
  --accent-hover:   #005FA3;   /* Hover du bouton primaire — légèrement plus sombre */
  --accent-light:   #EBF5FF;   /* Fond de l'onglet actif, badges accent, highlights */
  --accent-dark:    #004E8C;   /* Pressed state, texte lien visité */

  /* ─── Accent Secondaire — Cyan ───────────────────── */
  --cyan:           #00CED1;   /* Cyan vif — points de données clés, graphiques, KPI cyan */
  --cyan-light:     #E0FFFE;   /* Fond léger cyan pour badges, tags KPI */
  --cyan-dark:      #008B8D;   /* Variante sombre du cyan pour contraste */

  /* ─── Statuts ─────────────────────────────────────── */
  --success:        #10B981;   /* Émeraude — mentions positives, deltas en hausse */
  --success-light:  #ECFDF5;   /* Fond badge succès */
  --success-dark:   #065F46;   /* Texte sur fond success-light */

  --warning:        #F59E0B;   /* Ambre — mentions neutres, alertes modérées */
  --warning-light:  #FFFBEB;   /* Fond badge warning */
  --warning-dark:   #92400E;   /* Texte sur fond warning-light */

  --danger:         #EF4444;   /* Rouge — mentions absentes, deltas négatifs, alertes */
  --danger-light:   #FEF2F2;   /* Fond badge danger */
  --danger-dark:    #991B1B;   /* Texte sur fond danger-light */

  /* ─── Neutres ─────────────────────────────────────── */
  --neutral:        #64748B;
  --neutral-light:  #F1F5F9;
  --neutral-dark:   #334155;

  /* ─── Ombres ─────────────────────────────────────── */
  --shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow:      0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -1px rgb(0 0 0 / 0.03);
  --shadow-md:   0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -2px rgb(0 0 0 / 0.03);
  --shadow-lg:   0 20px 25px -5px rgb(0 0 0 / 0.08), 0 10px 10px -5px rgb(0 0 0 / 0.03);
  /* RÈGLE : Les ombres sont très douces. Jamais de drop-shadow lourd. */

  /* ─── Rayons ─────────────────────────────────────── */
  --radius-sm:  4px;    /* Badges, mini tags, petits éléments */
  --radius:     8px;    /* Cartes, boutons, inputs — rayon standard */
  --radius-lg:  12px;   /* Cartes importantes, modales */
  --radius-xl:  16px;   /* Cartes dashboard principal */
  --radius-full: 9999px; /* Pills, dots, badges ronds */

  /* ─── Espacement ─────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ─── Transitions ────────────────────────────────── */
  --transition: 150ms ease;
  --transition-slow: 250ms ease;
}
```

---

## 🔤 SECTION 2 — TYPOGRAPHIE

### Police principale
```css
/* Import Google Fonts — OBLIGATOIRE */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

/* Fallback si Outfit non disponible */
font-family: 'Outfit', 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

**RÈGLE ABSOLUE** : N'utiliser que Outfit. Jamais Inter, Roboto, Arial, ou system-ui seul.

### Hiérarchie typographique complète

```css
/* H1 — Titre de page (ex: "Vue d'ensemble — Nike") */
.h1 {
  font-size: 22px;       /* Ou 24px selon contexte */
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* H2 — Titre de section / carte */
.h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

/* H3 — Sous-titre de carte */
.h3 {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* LABEL — Étiquettes de section (toujours uppercase + letter-spacing) */
.label {
  font-size: 10px;        /* 10px ou 11px max */
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em; /* Très important pour l'effet "professionnel" */
}

/* KPI / Métrique — La valeur chiffrée principale */
.kpi-value {
  font-size: 32px;        /* Grand et lisible d'un coup d'oeil */
  font-weight: 700;
  color: var(--accent);   /* Ou --success / --cyan selon la métrique */
  line-height: 1;
  letter-spacing: -0.03em;
}

/* Corps de texte standard */
.body {
  font-size: 13px;        /* Pas 14px — 13px respire mieux */
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Texte secondaire / métadonnée */
.meta {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Petit label de tableau */
.table-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

---

## 📐 SECTION 3 — LAYOUT ET STRUCTURE DE PAGE

### Architecture générale

```
┌─────────────────────────────────────────────────── 100vw ───┐
│  NAVBAR  (height: 60px, sticky top:0, z-index:100)           │
├────────────────────────────────────────────────────────────  │
│  SIDEBAR (width: 220px) │  MAIN CONTENT (flex:1, padding:24px)│
│  sticky, height:calc(   │                                     │
│  100vh - 60px)          │                                     │
└─────────────────────────────────────────────────────────────┘
```

**RÈGLE** : Le layout est `display: flex`. La sidebar est `position: sticky; top: 60px; height: calc(100vh - 60px); overflow-y: auto`. Le main est `flex: 1; min-width: 0; padding: 24px`.

---

## 🧭 SECTION 4 — NAVBAR (Barre de Navigation)

### Spécifications exactes

```
height: 60px
background: #FFFFFF
border-bottom: 1px solid #E1E8F0
position: sticky
top: 0
z-index: 100
padding: 0 24px
display: flex
align-items: center
gap: 20px
```

### Contenu de gauche à droite

**1. Logo (min-width: 180px)**
- Icône carrée `32×32px`, `border-radius: 8px`
- Fond : `background: linear-gradient(135deg, #0077CC, #00CED1)` — dégradé bleu→cyan
- Lettre "G" en blanc, `font-size: 16px`, `font-weight: 700`, centrée
- Nom "GEO Monitor" à droite, `font-size: 16px`, `font-weight: 700`, `color: #1E293B`

**2. Onglets de navigation (flex: 1)**
- Items : Dashboard | Benchmark | Prompts | Alertes | Projets
- Style par défaut : `padding: 6px 14px`, `border-radius: 6px`, `font-size: 13px`, `font-weight: 500`, `color: #64748B`, `background: none`, `border: none`, `cursor: pointer`
- Hover : `background: #F4F7FA`, `color: #1E293B`
- **Actif** : `background: #EBF5FF`, `color: #0077CC`, `font-weight: 600`
- Transition : `150ms ease` sur background et color

**3. Éléments droite**
- **Barre de recherche** : `width: 220px`, `height: 34px`, `background: #F4F7FA`, `border: 1px solid #E1E8F0`, `border-radius: 8px`, `padding: 6px 12px`, icône loupe 🔍 à gauche, placeholder "Rechercher une marque…" en `#94A3B8`, `font-size: 13px`. Focus: `border-color: #0077CC`, `box-shadow: 0 0 0 3px rgba(0,119,204,0.12)`
- **Bouton notification** : `36×36px`, `background: #F4F7FA`, `border: 1px solid #E1E8F0`, `border-radius: 8px`. Badge rouge en haut à droite `16×16px`, `background: #EF4444`, chiffre "3" blanc `font-size: 9px`
- **Bouton paramètres** : même style que notification, icône ⚙️
- **Profil utilisateur** : avatar rond `32×32px` avec initiales (dégradé bleu→cyan), nom `font-size: 13px; font-weight: 600`, sous-titre "Plan Pro" `font-size: 10px; color: #94A3B8`. Hover : `background: #F4F7FA`, `border-radius: 8px`, `padding: 4px 8px`

---

## 🗂️ SECTION 5 — SIDEBAR (Barre latérale)

### Spécifications

```
width: 220px
background: #FFFFFF
border-right: 1px solid #E1E8F0
padding: 16px 0
position: sticky
top: 60px
height: calc(100vh - 60px)
overflow-y: auto
flex-shrink: 0
```

### Project Switcher (en haut de la sidebar)
```
margin: 8px 12px 0
padding: 10px 12px
background: #F4F7FA
border: 1px solid #E1E8F0
border-radius: 8px
cursor: pointer
```
- Nom du projet : `font-size: 12px; font-weight: 600; color: #1E293B`
- Secteur + rang : `font-size: 10px; color: #94A3B8; margin-top: 1px`
- Chevron ▾ à droite pour le dropdown

### Section label
```
font-size: 10px
font-weight: 600
color: #94A3B8
text-transform: uppercase
letter-spacing: 0.06em
padding: 8px 20px 4px
```

### Item de navigation

**Style par défaut :**
```
display: flex
align-items: center
gap: 10px
padding: 8px 20px
border-radius: 8px    ← À l'intérieur, donc margin: 0 12px
font-size: 13px
font-weight: 500
color: #64748B
cursor: pointer
transition: 150ms ease
margin-bottom: 2px
```

**Hover :** `background: #F4F7FA; color: #1E293B`

**Actif :** `background: #EBF5FF; color: #0077CC; font-weight: 600`

**Icône :** `font-size: 16px; width: 20px; text-align: center`

**Badge numérique :**
```
margin-left: auto
background: #EF4444    ← ou #10B981 pour positif
color: white
font-size: 9px
font-weight: 700
padding: 2px 6px
border-radius: 10px
font-family: Outfit
```

**Séparateur :** `height: 1px; background: #E1E8F0; margin: 8px 20px`

### Items de navigation complets
```
Navigation principale :
  📊 Dashboard     [actif par défaut]
  ⚔️  Benchmark    [badge vert si nouveaux résultats]
  💬 Prompts
  🔔 Alertes       [badge rouge si alertes non lues]
  📁 Projets
  📄 Exports

Séparateur

Analyse :
  🕐 Historique
  🔍 Mots-clés
  😊 Sentiment
  🤖 LLM Status

Séparateur

Compte :
  👤 Profil
  💳 Facturation
  🔑 API Keys
```

---

## 📦 SECTION 6 — CARTES (Cards)

### Carte standard

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E1E8F0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -1px rgb(0 0 0 / 0.03);
}
```

**RÈGLE** : Jamais de fond coloré sur une carte. Toujours blanc pur. La couleur vient des éléments intérieurs.

### En-tête de carte (card-header)

```css
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px 0;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
}

.card-subtitle {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 2px;
}

.card-action {
  font-size: 12px;
  color: #0077CC;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.card-action:hover { text-decoration: underline; }
```

---

## 📊 SECTION 7 — KPI CARDS (4 métriques en haut)

### Grid

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
```

### Anatomie d'une KPI Card

```
┌─────────────────────────────┐  border: 1px solid #E1E8F0
│  🏆 SCORE GLOBAL            │  ← label: 11px, 600, uppercase, #94A3B8
│                             │     icône emoji à gauche du label
│  78.4                       │  ← valeur: 32px, 700, color selon type
│                             │
│  ▲ +3.2 pts                 │  ← delta badge (voir ci-dessous)
│  vs 30 derniers jours       │  ← sous-texte: 12px, #94A3B8
└─────────────────────────────┘
  padding: 20px
```

### Types de valeurs KPI et leurs couleurs
- **Score Global** → `color: #0077CC` (accent bleu)
- **Taux Mentions** → `color: #10B981` (vert succès)
- **Share of Voice** → `color: #00CED1` (cyan)
- **Position Moyenne** → `color: #F59E0B` (ambre — la position c'est "à surveiller")

### Badge Delta (▲ / ▼)

```css
.kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;    /* pills */
}

/* Hausse */
.kpi-delta.up {
  background: #ECFDF5;
  color: #10B981;
}

/* Baisse */
.kpi-delta.down {
  background: #FEF2F2;
  color: #EF4444;
}

/* Stable */
.kpi-delta.neutral {
  background: #F1F5F9;
  color: #64748B;
}
```

---

## 📈 SECTION 8 — GRAPHIQUE DE TENDANCE (Trend Chart)

### Conteneur

```
padding: 20px
margin-bottom: 20px
(utilise la classe .card)
```

### En-tête avec tabs 7J/30J/90J

```css
/* Tabs de période */
.chart-tab {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #E1E8F0;
  background: transparent;
  color: #64748B;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
}

.chart-tab.active {
  background: #0077CC;
  color: #FFFFFF;
  border-color: #0077CC;
}

.chart-tab:hover:not(.active) {
  background: #F4F7FA;
}
```

### Style du graphique SVG

**Lignes de grille horizontales** : `stroke: #E1E8F0; stroke-width: 1`

**Labels des axes** : `font-size: 9px; fill: #94A3B8; font-family: Outfit`

**Ligne Nike (marque principale)** :
- `stroke: #00CED1` (cyan)
- `stroke-width: 2.5`
- `stroke-linejoin: round; stroke-linecap: round`
- Courbe lisse (SVG path avec courbes cubiques, pas de lignes droites)

**Zone de remplissage (Area Fill)** sous la ligne :
```css
/* SVG linearGradient */
stop offset="0%"   → stop-color="#00CED1" stop-opacity="0.18"
stop offset="100%" → stop-color="#00CED1" stop-opacity="0"
```

**Ligne concurrent** :
- `stroke: #0077CC; stroke-opacity: 0.4; stroke-width: 1.5`

**Ligne concurrent 2** :
- `stroke: #EF4444; stroke-opacity: 0.3; stroke-width: 1.5`

**Point de données actif (dot)** :
- Cercle plein `r:4` en `#00CED1`
- Cercle de halo `r:7` en `#00CED1` à `opacity: 0.2`

**Tooltip flottant** (carte SVG au-dessus du dernier point) :
```
rect: fill white, rx:6, drop-shadow(0 2px 4px rgba(0,0,0,.10))
barre top: 2px, fill #00CED1
date: 8px, #94A3B8
valeur: 14px, 700, #1E293B
delta: 9px, #10B981 (ex: "▲ +3.2 vs j-7")
```

**Légende** : petits cercles `r:4` + texte `9px, #64748B` en haut à gauche du SVG

**hauteur chart-wrapper** : `200px`

---

## 🏆 SECTION 9 — TABLEAU CLASSEMENT COMPÉTITIF

### Structure HTML

```
<table>
  <thead> → header en gris clair
  <tbody> → ligne surlignée en bleu clair si c'est MA marque
</table>
```

### Styles tableau

```css
table { width: 100%; border-collapse: collapse; }

thead tr { border-bottom: 2px solid #E1E8F0; }

th {
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

tbody tr {
  border-bottom: 1px solid #E1E8F0;
  transition: background 150ms ease;
}
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #F4F7FA; }

td { padding: 12px 16px; font-size: 13px; }

/* Ligne "ma marque" — surlignage doux */
tbody tr.my-brand { background: #EBF5FF; }
tbody tr.my-brand:hover { background: #DBEAFE; }
```

### Badge de rang

```css
.rank-badge {
  width: 28px; height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.rank-1 { background: #EBF5FF; color: #0077CC; }    /* Ma marque = bleu */
.rank-2 { background: #F1F5F9; color: #475569; }    /* Concurrent = gris */
.rank-3 { background: #F1F5F9; color: #475569; }
```

### Cellule marque (avec avatar)

```css
.brand-cell { display: flex; align-items: center; gap: 10px; }

.brand-avatar {
  width: 28px; height: 28px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 11px; color: #FFFFFF;
  /* background: couleur propre à chaque marque */
}
```

### Barre de score inline

```css
.score-bar-wrap { display: flex; align-items: center; gap: 8px; }
.score-bar { height: 4px; border-radius: 2px; background: #E1E8F0; width: 80px; }
.score-fill { height: 4px; border-radius: 2px; }
/* Couleur fill = couleur de la marque */
```

---

## 📡 SECTION 10 — FLUX D'ANALYSES RÉCENTES (Mentions Feed)

### Conteneur

```css
.mention-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #E1E8F0;
}
.mention-item:last-child { border-bottom: none; }
```

### Icône LLM

```css
.mention-icon {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
/* Par LLM */
.mention-icon.gpt    { background: #ECFDF5; }   /* Vert pâle pour OpenAI */
.mention-icon.gemini { background: #EBF5FF; }   /* Bleu pâle pour Google */
.mention-icon.claude { background: #F3F4F6; }   /* Gris pâle pour Anthropic */
.mention-icon.qwen   { background: #FFFBEB; }   /* Ambre pâle pour Qwen */
```

### Corps de la mention

```css
.mention-prompt {
  font-size: 13px;
  color: #1E293B;
  font-weight: 500;
  line-height: 1.4;
}

.mention-meta {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 3px;
}

/* Statut de mention dans le meta */
.mention-positive { color: #10B981; font-weight: 600; }   /* "✓ Nike mentionné en #1" */
.mention-warning  { color: #F59E0B; font-weight: 600; }   /* "⚠ Mentionné en #3" */
.mention-negative { color: #EF4444; font-weight: 600; }   /* "✗ Non mentionné" */
```

### Score à droite

```css
.mention-score {
  font-size: 13px;
  font-weight: 700;
  color: #0077CC;   /* ou #EF4444 si mauvais score */
}
```

---

## 🤖 SECTION 11 — LLM BREAKDOWN (Analyse par Modèle)

### Item LLM

```css
.llm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #E1E8F0;
}
.llm-item:last-child { border-bottom: none; }
```

### Logo LLM

```css
.llm-logo {
  width: 32px; height: 32px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
/* Fonds par LLM */
.llm-logo.gpt    { background: #ECFDF5; }
.llm-logo.gemini { background: #EBF5FF; }
.llm-logo.claude { background: #F3F4F6; }
.llm-logo.qwen   { background: #FFFBEB; }
```

### Barre de progression LLM

```css
.llm-bar-bg {
  flex: 1;
  max-width: 100px;
  height: 5px;
  background: #E1E8F0;
  border-radius: 3px;
}
.llm-bar-fill { height: 5px; border-radius: 3px; }

/* Couleurs par LLM */
GPT-4o     → #10B981 (vert)
Gemini     → #0077CC (bleu)
Claude     → #7C3AED (violet)
qwen       → #F59E0B (ambre)
```

### Valeur % à droite

```css
.llm-val {
  font-size: 13px;
  font-weight: 700;
  width: 36px;
  text-align: right;
  /* Couleur = même que la barre */
}
```

### Indicateurs en bas du panneau LLM

```css
/* Deux petites cartes côte à côte */
.confidence-row {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E1E8F0;
  font-size: 12px;
}
/* Label : 12px, #94A3B8 */
/* Valeur : 16px, 700 — success pour confiance, primary pour divergence */
```

---

## 🍩 SECTION 12 — ANALYSE DE SENTIMENT (Donut Chart)

### SVG Donut

```
cx=50, cy=50, r=35
stroke-width: 14
fill: none
```

- **Bague de fond** : `stroke: #E1E8F0`
- **Positif (65%)** : `stroke: #10B981`, `stroke-dasharray: 143 77`, départ à -90°
- **Neutre (25%)** : `stroke: #F59E0B`, `stroke-dasharray: 55 165`, décalé de -143
- **Négatif (10%)** : `stroke: #EF4444`, `stroke-dasharray: 22 198`, décalé de -198

**Texte centré dans le donut** :
- Valeur : `font-size: 14px; font-weight: 700; fill: #1E293B`
- Label : `font-size: 8px; fill: #94A3B8`

### Légende à droite du donut

```css
.donut-legend { display: flex; flex-direction: column; gap: 8px; }
.donut-leg-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.donut-dot { width: 10px; height: 10px; border-radius: 50%; }
.donut-leg-val { font-weight: 700; font-size: 14px; }
```

---

## 🔔 SECTION 13 — CONFIGURATION ALERTES

### Item alerte

```css
.alert-config {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #E1E8F0;
}
.alert-config:last-child { border-bottom: none; }
```

### Toggle ON/OFF

```css
.toggle {
  width: 40px; height: 22px;
  background: #0077CC;    /* ON = bleu */
  border-radius: 11px;
  position: relative;
  cursor: pointer;
  transition: background 200ms ease;
}

/* Pastille blanche */
.toggle::after {
  content: '';
  width: 18px; height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px; right: 2px;    /* Côté droit = ON */
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: right 200ms ease;
}

/* OFF */
.toggle.off { background: #E1E8F0; }
.toggle.off::after { right: auto; left: 2px; }
```

### Panneau "Prochain cron job"

```css
.cron-info {
  margin-top: 12px;
  padding: 10px 12px;
  background: #F4F7FA;
  border-radius: 8px;
  font-size: 12px;
}
/* Label : font-weight: 600; color: #1E293B */
/* Valeur temps : color: #0077CC; font-weight: 700 */
/* Description : color: #94A3B8 */
```

---

## 💬 SECTION 14 — TABLE DES PROMPTS

### Ligne de prompt

```css
.prompt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #E1E8F0;
}
.prompt-row:last-child { border-bottom: none; }

.prompt-text { flex: 1; font-size: 13px; color: #1E293B; }

.prompt-mention {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.prompt-mention.yes { color: #10B981; }   /* "✓ #1" */
.prompt-mention.no  { color: #EF4444; }   /* "✗ Non" */
```

---

## ☁️ SECTION 15 — NUAGE DE MOTS-CLÉS

### Conteneur

```css
.word-cloud {
  padding: 12px 20px 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
```

### Tag de mot-clé

```css
.word-tag {
  padding: 4px 10px;
  border-radius: 20px;    /* pills */
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms ease;
  font-family: 'Outfit', sans-serif;
}
.word-tag:hover { opacity: 0.8; }
```

### Règles d'attribution taille / couleur

```
Fréquence très haute  → font-size: 20–22px
Fréquence haute       → font-size: 16–18px
Fréquence moyenne     → font-size: 13–15px
Fréquence faible      → font-size: 11–12px

Sentiment positif   → color: #10B981, background: #ECFDF5
                    → OU color: #0077CC, background: #EBF5FF
                    → OU color: #00CED1, background: #E0FFFE
Sentiment neutre    → color: #64748B, background: #F1F5F9
Sentiment négatif   → color: #EF4444, background: #FEF2F2
Sentiment ambigu    → color: #F59E0B, background: #FFFBEB
                    → OU color: #7C3AED, background: #F3E8FF
```

---

## ⚡ SECTION 16 — QUICK ACTIONS (Actions Rapides)

```css
.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #FFFFFF;
  border: 1px solid #E1E8F0;
  border-radius: 20px;    /* toujours pills pour les quick actions */
  font-size: 12px;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  transition: all 150ms ease;
  font-family: 'Outfit', sans-serif;
}

.quick-action:hover {
  border-color: #0077CC;
  color: #0077CC;
  background: #EBF5FF;
}

/* Action primaire (Analyser maintenant) */
.quick-action.primary {
  background: #0077CC;
  color: #FFFFFF;
  border-color: #0077CC;
}
.quick-action.primary:hover { background: #005FA3; }
```

---

## 📊 SECTION 17 — STATUS BAR (Barre de Statut LLMs)

```css
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #FFFFFF;
  border: 1px solid #E1E8F0;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748B;
}

/* Dot indicateur */
.dot { width: 7px; height: 7px; border-radius: 50%; }
.dot-green  { background: #10B981; box-shadow: 0 0 0 2px #D1FAE5; } /* halo vert */
.dot-yellow { background: #F59E0B; }
.dot-red    { background: #EF4444; }

/* Séparateur vertical */
.status-divider { width: 1px; height: 16px; background: #E1E8F0; }

/* Sélecteur de période — à droite de la status bar */
.period-selector { display: flex; gap: 4px; margin-left: auto; }
```

---

## 🏗️ SECTION 18 — EN-TÊTE DE PAGE (Page Header)

```css
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 13px;
  color: #64748B;
  margin-top: 2px;
}

.page-actions { display: flex; gap: 8px; }
```

---

## 🔘 SECTION 19 — BOUTONS

```css
/* Base */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 150ms ease;
  font-family: 'Outfit', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* Primaire */
.btn-primary { background: #0077CC; color: #FFFFFF; }
.btn-primary:hover { background: #005FA3; }
.btn-primary:active { background: #004E8C; }
.btn-primary:focus { box-shadow: 0 0 0 3px rgba(0,119,204,0.25); outline: none; }

/* Secondaire */
.btn-secondary {
  background: #FFFFFF;
  color: #1E293B;
  border: 1px solid #E1E8F0;
}
.btn-secondary:hover { background: #F4F7FA; }

/* Succès */
.btn-success { background: #10B981; color: #FFFFFF; }
.btn-success:hover { background: #059669; }

/* Danger */
.btn-danger { background: #EF4444; color: #FFFFFF; }
.btn-danger:hover { background: #DC2626; }
```

---

## 🏷️ SECTION 20 — BADGES ET PILLS

```css
/* Base badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
}

.badge-success { background: #ECFDF5; color: #10B981; }
.badge-warning { background: #FFFBEB; color: #F59E0B; }
.badge-danger  { background: #FEF2F2; color: #EF4444; }
.badge-accent  { background: #EBF5FF; color: #0077CC; }
.badge-neutral { background: #F1F5F9; color: #475569; }
.badge-cyan    { background: #E0FFFE; color: #00CED1; }
.badge-purple  { background: #F3E8FF; color: #7C3AED; }
```

---

## 📐 SECTION 21 — GRILLES ET ESPACEMENTS

```css
/* Grid 2 colonnes */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

/* Grid 3 colonnes */
.three-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

/* Grid KPI (4 colonnes) */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
```

**RÈGLE D'ESPACEMENT** :
- Gap entre cartes : `16px`
- Margin-bottom entre sections : `20px`
- Padding interne des cartes : `20px` (horizontal) + `16px` (vertical)
- Padding main content : `24px`

---

## 📝 SECTION 22 — INPUTS ET FORMULAIRES

```css
.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E1E8F0;
  border-radius: 8px;
  font-size: 13px;
  font-family: 'Outfit', sans-serif;
  color: #1E293B;
  background: #FFFFFF;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input::placeholder { color: #94A3B8; }

.input:hover { border-color: #CBD5E1; }

.input:focus {
  border-color: #0077CC;
  box-shadow: 0 0 0 3px rgba(0,119,204,0.12);
  outline: none;
}

/* Select */
.select {
  /* Même style que .input */
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* chevron */
  padding-right: 32px;
  cursor: pointer;
}
```

---

## ✨ SECTION 23 — RÈGLES MICRO-INTERACTIONS ET ANIMATIONS

### Transitions obligatoires

```css
/* Sur TOUS les éléments interactifs */
transition: background-color 150ms ease,
            border-color 150ms ease,
            color 150ms ease,
            box-shadow 150ms ease,
            transform 150ms ease;
```

### Hover sur cartes (optionnel, subtil)

```css
.card:hover {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.07);
  /* PAS de transform. PAS de border-color change. Juste l'ombre. */
}
```

### Dot "pulsant" pour statut en ligne

```css
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
  50%       { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
}
.dot-green { animation: pulse-dot 2s ease infinite; }
```

### Barre de progression (analyse SSE)

```css
@keyframes progress-bar {
  from { width: 0%; }
  to   { width: var(--progress); }
}
.progress-fill {
  height: 4px;
  background: linear-gradient(90deg, #0077CC, #00CED1);
  border-radius: 2px;
  animation: progress-bar 0.5s ease forwards;
}
```

### Skeleton loading (pendant les analyses)

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
```

---

## 🚫 SECTION 24 — CE QU'IL NE FAUT JAMAIS FAIRE

| ❌ Interdit | ✅ À la place |
|---|---|
| Fond noir `#000000` ou `#111111` | Fond page `#F4F7FA` |
| Fond de carte coloré | Fond carte toujours `#FFFFFF` |
| Gradients de fond agressifs | Fond uni froid `#F4F7FA` |
| Bordures épaisses `2px+` | Bordures `1px solid #E1E8F0` |
| Ombres portées lourdes | `box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05)` |
| Police Inter, Roboto, Arial seul | Police `Outfit` (Google Fonts) |
| Texte en blanc sur fond blanc | Toujours vérifier le contraste |
| Angles vifs `border-radius: 0` | `border-radius: 8px` par défaut |
| Couleurs vives partout | Couleurs vives UNIQUEMENT sur données (KPI, graphiques) |
| Animations de page spectaculaires | Transitions subtiles `150ms ease` |
| 5 couleurs d'accent différentes | Maximum 2 accents : `#0077CC` + `#00CED1` |
| Emoji comme décoration principale | Emoji uniquement pour icônes d'items sidebar/alertes |
| `font-size: 16px` sur les labels | Labels toujours `10px–11px` + uppercase + letter-spacing |
| Couleur texte autre que `#1E293B` pour le corps | Uniquement les 4 niveaux de texte définis |

---

## 📏 SECTION 25 — CHECKLISTE FINALE DE QUALITÉ

Avant de livrer chaque composant, vérifier :

- [ ] Police `Outfit` importée et appliquée sur `body`
- [ ] Variables CSS `:root` toutes déclarées
- [ ] Fond page = `#F4F7FA`, fond cartes = `#FFFFFF`
- [ ] Toutes bordures = `1px solid #E1E8F0`
- [ ] Tous rayons = `8px` par défaut
- [ ] Toutes ombres = version douce définie dans `--shadow`
- [ ] Labels uppercase + `letter-spacing: 0.06em`
- [ ] KPI values = `32px, 700` avec couleur sémantique
- [ ] Delta badges = pills colorés selon direction
- [ ] Graphique = courbe lisse, gradient fill cyan→transparent
- [ ] Transitions `150ms ease` sur tous les éléments cliquables
- [ ] Toggle alertes = bleu ON / gris OFF
- [ ] Dots statut avec animation pulse pour "en ligne"
- [ ] Responsive : sidebar collapse sur mobile, grille → 1 colonne
- [ ] Aucun gradient de fond sur les cartes
- [ ] Contrastes AA accessibles vérifiés

---

*Prompt de design GEO Monitor — Arctic Professional*  
*Version 1.0 — Mars 2026 — Auteur : Paul fils*  
*À utiliser avec Claude Code ou OpenCode pour reproduire le design fidèlement*
