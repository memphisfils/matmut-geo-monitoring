# 🧪 Plan de Tests UI - GEO Monitor

## 📋 Checklist de Tests

### 1️⃣ Navigateurs à Tester

| Navigateur | Version | OS | Statut |
|------------|---------|-----|--------|
| **Chrome** | Latest | Windows | ⬜ |
| **Chrome** | Latest | Android | ⬜ |
| **Safari** | Latest | iOS | ⬜ |
| **Safari** | Latest | macOS | ⬜ |
| **Edge** | Latest | Windows | ⬜ |
| **Firefox** | Latest | Windows | ⬜ |
| **Samsung Internet** | Latest | Android | ⬜ |

---

## 2️⃣ Flow Complet à Tester

### **Étape 1 : Onboarding**

#### Test 1.1 - Saisie Marque + Secteur
- [ ] Le champ "MARQUE" accepte le texte
- [ ] Les chips de secteur sont cliquables
- [ ] Le bouton "ANALYSER AVEC IA" est activé quand marque + secteur sont remplis
- [ ] Le bouton est désactivé si un champ est vide
- [ ] Loading state affiché pendant la génération IA

#### Test 1.2 - Génération IA (Étape 2)
- [ ] Les produits s'affichent avec nom, description
- [ ] Les concurrents sont générés (5 par défaut)
- [ ] On peut sélectionner/désélectionner les produits
- [ ] On peut ajouter un concurrent manuel
- [ ] On peut supprimer un concurrent avec la croix
- [ ] Le bouton "CONFIRMER" est activé si produits ET concurrents sélectionnés

#### Test 1.3 - Résumé (Étape 3)
- [ ] La marque s'affiche correctement
- [ ] Le nombre de produits est correct
- [ ] Le nombre de concurrents est correct
- [ ] Le nombre de prompts est correct
- [ ] Le bouton "LANCER L'ANALYSE" déclenche l'analyse

---

### **Étape 2 : Analyse en Cours**

#### Test 2.1 - Loading State
- [ ] Message "Analyse de {marque} en cours..." affiché
- [ ] Animation de chargement visible
- [ ] Pas d'erreur console

#### Test 2.2 - Backend Response
- [ ] Appel API `/api/run-analysis` → Status 200
- [ ] Appel API `/api/metrics` → Status 200
- [ ] Données reçues non vides

---

### **Étape 3 : Dashboard**

#### Test 3.1 - KPI Cards
- [ ] **Rang** : Affiche `#1`, `#2`, etc.
- [ ] **Score Global** : Affiche XX.X/100
- [ ] **Taux Mention** : Affiche XX%
- [ ] **Position Moyenne** : Affiche X.X
- [ ] Couleurs respectées (jaune pour rang/score)

#### Test 3.2 - Trend Chart
- [ ] Graphique affiche 30 jours
- [ ] La marque cible est en jaune
- [ ] Les concurrents sont en gris
- [ ] Légende interactive
- [ ] Tooltip au survol

#### Test 3.3 - Duel Card
- [ ] Dropdown pour choisir le concurrent
- [ ] Les 4 métriques s'affichent
- [ ] Comparaison visuelle claire

#### Test 3.4 - Ranking Table
- [ ] Toutes les marques affichées
- [ ] Tri par score global (décroissant)
- [ ] La marque cible est surlignée en jaune
- [ ] Barres de progression visibles

#### Test 3.5 - Charts Row
- [ ] **Sentiment Chart** : Jauge affichée
- [ ] **Mention Chart** : Bar chart avec 8 marques
- [ ] **Sov Chart** : Donut chart avec 6 marques

#### Test 3.6 - Insights Panel
- [ ] **Radar** : 5 axes (Mention, Position, SoV, Top Mind, Score)
- [ ] **Heatmap** : Marques × Catégories
- [ ] **Recommandations** : 3 sections (Forces, Faiblesses, Recos)

---

## 3️⃣ Tests Responsive

### Desktop (1920x1080)
- [ ] Layout en 4 sections verticales
- [ ] KPI : 4 cartes sur 1 ligne
- [ ] Charts Row : 3 charts sur 1 ligne
- [ ] Insights : 3 panels sur 1 ligne

### Tablette (768x1024)
- [ ] KPI : 2 cartes sur 2 lignes
- [ ] Charts Row : 1 chart par ligne
- [ ] Insights : 1 panel par ligne

### Mobile (375x667)
- [ ] KPI : 1 carte par ligne
- [ ] Charts Row : 1 chart par ligne
- [ ] Insights : 1 panel par ligne
- [ ] Navigation fluide
- [ ] Boutons accessibles

---

## 4️⃣ Tests Fonctionnels Avancés

### Test 4.1 - Refresh
- [ ] Bouton Refresh dans navbar
- [ ] Recharge les données sans recharger la page
- [ ] Animation de chargement visible

### Test 4.2 - Export
- [ ] Bouton Export dans navbar
- [ ] Télécharge un fichier JSON
- [ ] Le fichier contient ranking, insights, metrics

### Test 4.3 - Reset
- [ ] Bouton Reset dans navbar
- [ ] Retourne à l'onboarding
- [ ] Efface la configuration actuelle

### Test 4.4 - Navigation
- [ ] Scroll fluide entre sections
- [ ] Ancres fonctionnelles (#ranking, #insights)

---

## 5️⃣ Tests d'Erreurs

### Test 5.1 - Backend HS
- [ ] Message d'erreur affiché
- [ ] Fallback en mode démo
- [ ] Données démo affichées

### Test 5.2 - API Timeout
- [ ] Timeout après 30s
- [ ] Message d'erreur utilisateur
- [ ] Possibilité de réessayer

### Test 5.3 - Données Invalides
- [ ] Marque vide → Message d'erreur
- [ ] Secteur non sélectionné → Bouton désactivé
- [ ] Aucun produit sélectionné → Bouton désactivé

---

## 6️⃣ Performance

### Métriques à Mesurer

| Métrique | Cible | Mesurée |
|----------|-------|---------|
| **First Contentful Paint** | < 1.5s | ⬜ |
| **Time to Interactive** | < 3.5s | ⬜ |
| **Largest Contentful Paint** | < 2.5s | ⬜ |
| **Cumulative Layout Shift** | < 0.1 | ⬜ |
| **Analyse 6 prompts** | < 90s | ⬜ |

---

## 📝 Template de Rapport de Bug

```markdown
### 🐛 Bug Report

**Navigateur** : Chrome 145 / Windows 11
**Étape** : Onboarding → Étape 2
**Description** : Les concurrents ne s'affichent pas

**Reproduction** :
1. Saisir "Nike" comme marque
2. Sélectionner "Automobile"
3. Cliquer sur "ANALYSER AVEC IA"
4. Étape 2 : La section concurrents est vide

**Attendu** : 5 concurrents générés par l'IA
**Observé** : Section vide, pas d'erreur console

**Capture** : [screenshot.png]
```

---

## ✅ Validation Finale

- [ ] Tous les tests Desktop passés
- [ ] Tous les tests Mobile passés
- [ ] Aucun bug critique trouvé
- [ ] Performance dans les targets
- [ ] Accessibilité vérifiée (tabulation, contrastes)

---

**Date des tests** : ___________
**Testé par** : ___________
**Version** : 2.0
