# 🧪 Commands de Test Rapide

## 1️⃣ Test Backend API

```bash
# Status
curl https://geo-monitoring-backend.onrender.com/api/status

# Générer config (test IA)
curl -X POST https://geo-monitoring-backend.onrender.com/api/generate-config \
  -H "Content-Type: application/json" \
  -d '{"brand":"Nike","sector":"Automobile"}'

# Lancer analyse
curl -X POST https://geo-monitoring-backend.onrender.com/api/run-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Nike",
    "competitors": ["Adidas", "Puma", "Reebok"],
    "prompts": [
      "Meilleures sneakers Nike",
      "Comparatif Nike vs Adidas"
    ],
    "limit": 2
  }'

# Récupérer metrics
curl https://geo-monitoring-backend.onrender.com/api/metrics

# Historique
curl https://geo-monitoring-backend.onrender.com/api/history

# Export
curl https://geo-monitoring-backend.onrender.com/api/export
```

---

## 2️⃣ Test Frontend URLs

```bash
# Page principale
curl https://matmut-geo-monitoring-xyz.vercel.app

# Vérifier que le HTML contient translate="no"
curl https://matmut-geo-monitoring-xyz.vercel.app | grep "translate"
```

---

## 3️⃣ Test Console Navigateur

Ouvre la console (F12) et teste :

```javascript
// Vérifier l'URL API
console.log('API URL:', import.meta.env.VITE_API_URL)

// Tester l'API
fetch('https://geo-monitoring-backend.onrender.com/api/status')
  .then(r => r.json())
  .then(d => console.log('Backend status:', d))

// Tester generate-config
fetch('https://geo-monitoring-backend.onrender.com/api/generate-config', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({brand: 'Test', sector: 'Auto'})
})
  .then(r => r.json())
  .then(d => console.log('Config:', d))
```

---

## 4️⃣ Test Responsive

```bash
# Chrome DevTools → Device Toolbar
# Tester les résolutions :

Desktop : 1920x1080
Tablette : 768x1024
Mobile : 375x667
Mobile Plus : 414x896
```

---

## 5️⃣ Checklist Rapide (5 min)

- [ ] Charger le frontend
- [ ] Onboarding : Saisir marque + secteur
- [ ] Générer config IA
- [ ] Valider produits + concurrents
- [ ] Lancer analyse
- [ ] Dashboard s'affiche
- [ ] KPI visibles
- [ ] Graphiques chargés
- [ ] Scroll fluide
- [ ] Refresh fonctionne
- [ ] Export fonctionne
- [ ] Reset fonctionne

---

## 6️⃣ Test Cross-Browser

```
Chrome (Desktop)
  [ ] Onboarding
  [ ] Dashboard
  [ ] Charts

Safari (iOS/Mac)
  [ ] Onboarding
  [ ] Dashboard
  [ ] Charts

Edge (Desktop)
  [ ] Onboarding
  [ ] Dashboard
  [ ] Charts

Firefox (Desktop)
  [ ] Onboarding
  [ ] Dashboard
  [ ] Charts

Chrome (Android)
  [ ] Onboarding
  [ ] Dashboard
  [ ] Charts
```

---

## 7️⃣ Performance Test

```bash
# Lighthouse (Chrome DevTools)
# Onglet "Lighthouse" → Analyser

Objectifs :
- Performance : > 90
- Accessibility : > 90
- Best Practices : > 90
- SEO : > 90
```

---

## 📊 Template de Rapport

```
=== TEST REPORT ===
Date: 2026-03-17
Navigateur: Chrome 145 / Windows 11

✅ PASS:
- Onboarding flow
- API calls
- Dashboard display
- KPI cards
- Charts rendering

⚠️ WARNINGS:
- TrendChart un peu lent au chargement

❌ FAIL:
- Aucun

Notes: RAS, tout fonctionne parfaitement
```
