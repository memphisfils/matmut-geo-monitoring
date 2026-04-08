# Step 1 - UX, Wording, Theme

## Product Direction

- Product name: `GEO Arctic`
- Positioning: plateforme de pilotage de visibilite IA pour suivre la presence d'une marque dans les reponses des LLM et son evolution face aux concurrents.
- Split experience:
- `Public`: landing page + login + signup
- `Private`: dashboard utilisateur + projets + analyses + benchmarks + alertes + rapports

## Visual Thesis

Arctic Professional: une interface froide, nette, premium et calme, avec une sensation de precision operationnelle plutot que de marketing demonstratif.

## Content Plan

1. Hero: nom produit, promesse, CTA
2. Proof: ce que la plateforme mesure concretement
3. Workflow: comment un utilisateur suit ses marques et benchmarks
4. Final CTA: se connecter ou commencer l'analyse

## Interaction Thesis

1. Hero avec apparition progressive du titre, du sous-texte et du CTA
2. Scroll sobre avec transitions d'opacite et de translation courtes
3. Surfaces produit avec hover discret, sans effets gadgets

## Theme System

### Palette

- Background primary: `#EAF3F8`
- Background secondary: `#DCEAF2`
- Surface: `rgba(255, 255, 255, 0.68)`
- Surface strong: `rgba(255, 255, 255, 0.84)`
- Border: `rgba(76, 110, 128, 0.18)`
- Text primary: `#10212B`
- Text secondary: `#48606E`
- Accent primary: `#4BA3C7`
- Accent strong: `#1E6F97`
- Success: `#3C8F7C`
- Warning: `#C58A2B`
- Danger: `#B95C5C`

### Typography

- Heading: `Space Grotesk`
- Body/UI: `Inter`

### Visual Rules

- Pas de hero en cartes
- Pas de mosaïque de cards sur le landing
- Sur le dashboard, les cartes restent utilitaires et peu nombreuses
- Un seul accent fort: bleu glacier
- Ombres tres legeres, profondeur par couches et transparence
- Fond avec gradients froids et halos tres subtils

## Public Pages

### Landing Page Structure

#### Section 1 - Hero

- Eyebrow: `GEO Arctic`
- Headline: `Pilotez votre visibilite dans les reponses IA.`
- Subheadline: `Suivez votre presence, votre rang et vos ecarts face aux autres marques sur ChatGPT, Claude, Gemini et Qwen.`
- Primary CTA: `Commencer l'analyse`
- Secondary CTA: `Voir une demo`
- Support line: `Mesure, comparaison, tendances et alertes sur vos marques.`

#### Section 2 - What It Measures

- Title: `Ce que vous suivez vraiment`
- Items:
- `Presence dans les reponses IA`
- `Position de votre marque`
- `Evolution face aux concurrents`
- `Prompts qui vous avantagent ou vous font perdre`

#### Section 3 - Workflow

- Title: `Un cockpit simple pour suivre vos marques`
- Steps:
- `Connectez votre compte`
- `Creez ou reprenez un projet`
- `Suivez vos benchmarks et vos alertes`
- `Analysez ce qui change dans le temps`

#### Section 4 - Final CTA

- Title: `Passez a votre cockpit GEO`
- Text: `Accedez a vos projets, votre historique et vos comparaisons en un seul espace.`
- CTA primary: `Se connecter`
- CTA secondary: `Creer un compte`

### Landing Navigation

- `Produit`
- `Mesure`
- `Workflow`
- `Tarif` (placeholder si non defini)
- `Connexion`

## Auth Pages

### Login Page

- Title: `Connexion`
- Subtitle: `Accedez a votre cockpit GEO, vos projets et votre historique d'analyse.`
- Tabs or switch:
- `Connexion`
- `Creer un compte`

### Login Form Labels

- `Adresse email`
- `Mot de passe`
- Primary CTA: `Se connecter`
- Secondary auth CTA: `Continuer avec Google`
- Helper link: `Mot de passe oublie`

### Signup Form Labels

- `Nom`
- `Adresse email`
- `Mot de passe`
- `Confirmer le mot de passe`
- Primary CTA: `Creer mon compte`
- Secondary auth CTA: `Continuer avec Google`

### Auth Behavior

- Si session valide: redirection immediate vers le dashboard
- Si utilisateur connecte sans projet: page d'onboarding projet
- Si utilisateur connecte avec projets: page `Vue d'ensemble`

## Private App Navigation

### Primary Tabs

- `Vue d'ensemble`
- `Mes marques`
- `Requetes`
- `Benchmarks`
- `Tendances`
- `Alertes`
- `Rapports`
- `Compte`

### Secondary Labels

- Overview subtitle: `Suivi global de vos marques et de vos ecarts concurrentiels`
- Brands subtitle: `Vos projets, vos marques suivies et leur etat actuel`
- Queries subtitle: `Les prompts et reponses qui influencent votre visibilite`
- Benchmarks subtitle: `Comparez plusieurs marques sur les memes requetes`
- Trends subtitle: `Observe l'evolution de votre visibilite dans le temps`
- Alerts subtitle: `Recevez les signaux utiles quand votre position change`
- Reports subtitle: `Exportez les analyses et resumes decisionnels`
- Account subtitle: `Gerez votre compte, vos sessions et vos preferences`

## Utility Copy

### Dashboard Headings

- `Indicateurs cles`
- `Classement actuel`
- `Variation recente`
- `Top requetes`
- `Ecarts concurrents`
- `Derniere synchronisation`
- `Historique d'analyse`
- `Actions recommandees`

### Empty States

- No project: `Aucun projet actif pour le moment. Creez votre premiere analyse pour commencer.`
- No history: `Pas encore d'historique disponible. Lancez plusieurs analyses pour suivre l'evolution.`
- No alerts: `Aucune alerte active. Votre suivi est calme pour le moment.`
- No benchmark: `Aucun benchmark disponible. Comparez plusieurs marques pour ouvrir cette vue.`

## User Flow

1. Arrivee sur landing
2. CTA vers login
3. Login formulaire ou Google
4. Session creee
5. Redirect:
- si projets existants -> `Vue d'ensemble`
- sinon -> `Creer un projet`
6. Depuis dashboard:
- ouvrir un projet
- lancer une analyse
- suivre les tendances
- comparer a d'autres marques
- exporter

## Step 1 Validation Targets

- Theme `Arctic Professional` valide
- Wording landing valide
- Wording login valide
- Noms d'onglets valides
- Structure publique/privee validee avant implementation
