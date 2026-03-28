# 🤖 Sprint 4 — Plan d'intégration complet
> Plateforme : **OpenCode CLI**
> Objectif   : Export PDF (WeasyPrint) + UI/UX Mobile responsive
> Prérequis  : Sprint 1 ✅ + Sprint 2 ✅ + Sprint 3 ✅

---

## 📁 Carte des fichiers Sprint 4

```
FICHIERS À REMPLACER
backend/
├── app.py               ← REMPLACER (routes /api/export/pdf + /api/health)
frontend/
├── index.html           ← REMPLACER (viewport mobile, meta PWA)
frontend/src/
└── App.jsx              ← REMPLACER (ExportButton dans navbar)

FICHIERS NOUVEAUX À CRÉER
backend/
└── pdf_report.py        ← CRÉER (générateur HTML→PDF WeasyPrint)

frontend/src/components/
├── ExportButton.jsx     ← CRÉER
└── ExportButton.css     ← CRÉER

frontend/src/
└── mobile.css           ← CRÉER (responsive complet)

FICHIER À METTRE À JOUR
backend/
└── requirements.txt     ← APPEND weasyprint>=60.0

FICHIER À COMPLÉTER (ajout en bas)
frontend/src/
└── index.css            ← APPEND import mobile.css

FICHIERS NON TOUCHÉS — NE PAS MODIFIER
backend/
├── analyzer.py          ← intact Sprint 2
├── alerts.py            ← intact Sprint 3
├── llm_client.py        ← intact Sprint 1
├── database.py          ← intact Sprint 1
└── prompts.py           ← intact
frontend/src/
├── services/api.js      ← intact Sprint 2
├── App.css              ← intact Sprint 3
├── components/AnalysisProgress.jsx/.css ← intact Sprint 2
├── components/LLMBreakdown.jsx/.css     ← intact Sprint 2
├── components/PromptComparator.jsx/.css ← intact Sprint 3
├── components/AlertsPanel.jsx/.css      ← intact Sprint 3
└── tous les autres composants
```

---

## ✅ Checklist de validation Sprint 4

```
[ ] 1.  pdf_report.py    — build_report_html() présente
[ ] 2.  pdf_report.py    — generate_pdf_bytes() avec WeasyPrint présente
[ ] 3.  pdf_report.py    — generate_report() fallback HTML si WeasyPrint absent
[ ] 4.  pdf_report.py    — 6 sections : cover, exec, ranking, prompts, confidence, recos
[ ] 5.  app.py           — route GET /api/export/pdf présente
[ ] 6.  app.py           — route GET /api/export/pdf?format=html présente
[ ] 7.  app.py           — route GET /api/export/pdf/check présente
[ ] 8.  app.py           — route GET /api/health (enrichie Sprint 4)
[ ] 9.  app.py           — _build_full_report_data() helper présent
[ ] 10. ExportButton.jsx + .css — fichiers créés
[ ] 11. mobile.css       — fichier créé avec tous les breakpoints
[ ] 12. index.html       — viewport + meta PWA présents
[ ] 13. App.jsx          — ExportButton importé et monté dans navbar
[ ] 14. requirements.txt — weasyprint>=60.0 ajouté
[ ] 15. index.css        — import mobile.css ajouté
[ ] 16. python3 -m py_compile backend/pdf_report.py  — OK
[ ] 17. python3 -m py_compile backend/app.py         — OK
[ ] 18. cd frontend && npm run build                 — OK
[ ] 19. Test /api/export/pdf/check → {available: bool}
[ ] 20. Test /api/export/pdf?format=html → télécharge HTML
[ ] 21. Test /api/health → {version, sprint, uptime, features}
[ ] 22. UI mobile — onglets scrollables, cartes pleine largeur
[ ] 23. Dropdown export — PDF (si WeasyPrint) + HTML + JSON
```

---

## 🤖 PROMPT AGENT — À coller tel quel dans OpenCode CLI

```
Tu es un développeur fullstack senior Python/Flask/React.
Tu intègres le Sprint 4 du projet GEO Monitor.
Les Sprints 1, 2 et 3 sont déjà en place — ne rien casser.
Suis les instructions dans l'ordre exact. Valide la syntaxe après chaque fichier.

═══════════════════════════════════════════════════════
CONTEXTE SPRINT 4
═══════════════════════════════════════════════════════

Sprint 4 ajoute deux fonctionnalités :

1. EXPORT PDF PROFESSIONNEL (WeasyPrint)
   - Nouveau fichier backend/pdf_report.py
   - Rapport complet : cover page, résumé exec, classement, prompts, confiance, recos
   - Design noir/jaune GEO Monitor en HTML/CSS → converti en PDF via WeasyPrint
   - Fallback HTML si WeasyPrint non installé (le rapport reste identique)
   - Route GET /api/export/pdf → téléchargement direct
   - Route GET /api/export/pdf?format=html → version HTML
   - Route GET /api/export/pdf/check → vérifie disponibilité WeasyPrint
   - Composant React ExportButton avec dropdown PDF/HTML/JSON

2. UI/UX MOBILE RESPONSIVE
   - Fichier frontend/src/mobile.css autonome
   - Breakpoints : 768px (tablet) et 480px (mobile)
   - Touch targets agrandis pour les écrans tactiles
   - index.html mis à jour : viewport-fit=cover, meta PWA

═══════════════════════════════════════════════════════
ÉTAPE 0 — SAUVEGARDES
═══════════════════════════════════════════════════════

```bash
cp backend/app.py backend/app.py.bak
cp frontend/index.html frontend/index.html.bak
cp frontend/src/App.jsx frontend/src/App.jsx.bak
```

═══════════════════════════════════════════════════════
ÉTAPE 1 — INSTALLER WeasyPrint (si pas déjà fait)
═══════════════════════════════════════════════════════

```bash
# Linux/Debian/Ubuntu
sudo apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b 2>/dev/null || true
pip install weasyprint --break-system-packages

# macOS
# brew install pango
# pip install weasyprint

# Vérifier
python3 -c "import weasyprint; print('✅ WeasyPrint', weasyprint.__version__)"
```

Si WeasyPrint échoue à l'install : continuer quand même.
Le code gère le fallback HTML automatiquement.

═══════════════════════════════════════════════════════
ÉTAPE 2 — CRÉER backend/pdf_report.py
═══════════════════════════════════════════════════════

Crée le fichier depuis zéro. Fonctions à implémenter dans l'ordre :

**A) Constantes de couleurs :**
```python
YELLOW = "#FFD700"
BLACK  = "#0A0A0A"
DARK   = "#111111"
SURFACE = "#1A1A1A"
BORDER  = "#2A2A2A"
WHITE   = "#FFFFFF"
MUTED   = "#888888"
GREEN   = "#00CC44"
RED     = "#FF4444"
```

**B) build_report_html(brand, ranking, metrics, insights, prompt_stats=None, confidence=None, metadata=None) → str**

Génère le HTML complet avec CSS inline. Structure exacte :
```
@page { size: A4; margin: 0; }
body  { background: #0A0A0A; color: #FFF; font-family: Arial; }
```

Sections dans l'ordre :
1. `.cover` — page de garde (border-left 6px #FFD700)
   - Logo "GEO MONITOR" en haut à gauche
   - Brand name en très grand (52px)
   - 3 KPIs : score global (jaune), rang (#), taux de mention
   - Footer : date + modèles + badge DONNÉES DÉMO si is_demo
   
2. `.section` numérotée 01 — "RÉSUMÉ EXÉCUTIF"
   - Grid 4 KPI cards (rang, mention, position, top of mind)
   - Grid 2 colonnes : forces (vert) + faiblesses (rouge)

3. `.section` numérotée 02 — "CLASSEMENT COMPÉTITIF"
   - Tableau : rang, marque, score, mentions+barre, position, top mind, SOV
   - Ligne cible en jaune (target-row)

4. Si prompt_stats : `.section` 03 — "ANALYSE PAR PROMPT"
   - Tableau : prompt, mentionné (✓/—), mention%, position, top mind, score
   - Meilleur prompt : border-left vert ; pire : gris

5. Si confidence : `.section` — "SCORE DE CONFIANCE INTER-MODÈLES"
   - Grid 3 colonnes de cartes (marque, confiance%, divergence)
   - Couleur selon niveau : vert/jaune/rouge

6. `.section` finale — "RECOMMANDATIONS"
   - Liste numérotée, fond #1A1A1A, border-left jaune

**C) generate_pdf_bytes(html: str) → bytes**
```python
def generate_pdf_bytes(html):
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    font_config = FontConfiguration()
    return HTML(string=html).write_pdf(font_config=font_config)
```

**D) generate_report(brand, ranking, metrics, insights, prompt_stats=None, confidence=None, metadata=None, output_format='pdf') → tuple[bytes, str]**
```python
def generate_report(..., output_format='pdf'):
    html = build_report_html(brand, ranking, metrics, insights,
                             prompt_stats, confidence, metadata)
    if output_format == 'html':
        return html.encode('utf-8'), 'text/html; charset=utf-8'
    try:
        return generate_pdf_bytes(html), 'application/pdf'
    except ImportError:
        print("[PDF] WeasyPrint non dispo — fallback HTML")
        return html.encode('utf-8'), 'text/html; charset=utf-8'
```

Le fichier complet est fourni dans les livrables Sprint 4 (pdf_report.py).

Validation :
```bash
python3 -m py_compile backend/pdf_report.py && echo "✅ pdf_report.py"
python3 -c "
import sys; sys.path.insert(0,'backend')
from pdf_report import build_report_html, generate_report

ranking = [
  {'brand':'Nike','rank':1,'global_score':72.5,'mention_rate':85,'avg_position':1.5,'top_of_mind':42,'share_of_voice':38},
  {'brand':'Adidas','rank':2,'global_score':61.3,'mention_rate':72,'avg_position':2.1,'top_of_mind':28,'share_of_voice':30},
]
metrics  = {r['brand']: r for r in ranking}
insights = {'rank':1,'main_brand':'Nike','strengths':['Bonne visibilité'],
            'weaknesses':['Position améliorable'],'recommendations':['Renforcer SEO/GEO']}
metadata = {'timestamp':'2026-03-18T10:00:00','is_demo':True,'models_used':['qwen3.5']}

html = build_report_html('Nike', ranking, metrics, insights, metadata=metadata)
assert '<!DOCTYPE html>' in html and 'Nike' in html and '#FFD700' in html
assert 'RÉSUMÉ EXÉCUTIF' in html or 'exécutif' in html.lower()
print(f'✅ build_report_html — {len(html):,} chars')

content, ct = generate_report('Nike', ranking, metrics, insights, metadata=metadata, output_format='html')
assert ct == 'text/html; charset=utf-8'
print('✅ generate_report(html) — content-type OK')
print('✅ pdf_report.py — tous les tests OK')
"
```

═══════════════════════════════════════════════════════
ÉTAPE 3 — backend/app.py
═══════════════════════════════════════════════════════

REMPLACE INTÉGRALEMENT le fichier app.py.

Conserve TOUTES les routes des Sprints 1, 2 et 3 sans modification.

AJOUTES :

**A) En haut du fichier, après les imports :**
```python
START_TIME = datetime.now()
```

**B) Nouvelle fonction _build_full_report_data(results, brand) :**
```python
def _build_full_report_data(results, brand):
    """Agrège toutes les données nécessaires pour le rapport PDF."""
    competitors  = results.get('competitors', [])
    all_brands   = [brand] + competitors
    az           = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)

    # Prompt stats
    prompt_stats = []
    for response in results['responses']:
        prompt = response.get('prompt', '')
        if not prompt: continue
        analyses = [d['analysis'] for d in response['llm_analyses'].values()]
        total    = len(analyses)
        if not total: continue
        mentions = sum(1 for a in analyses if brand in a.get('brands_mentioned', []))
        mpct     = round(mentions / total * 100, 1)
        positions = [a['positions'].get(brand) for a in analyses
                     if a['positions'].get(brand) is not None]
        avg_pos   = round(sum(positions)/len(positions), 2) if positions else None
        first_cnt = sum(1 for a in analyses if a.get('first_brand') == brand)
        tom       = round(first_cnt / total * 100, 1)
        comp_m    = {}
        for a in analyses:
            for b in a.get('brands_mentioned', []):
                if b != brand: comp_m[b] = comp_m.get(b, 0) + 1
        score = mpct * 0.5 + (100/avg_pos if avg_pos else 0) * 0.3 + tom * 0.2
        prompt_stats.append({'prompt': prompt, 'mention_rate': mpct, 'avg_position': avg_pos,
                              'top_of_mind': tom, 'brand_mentioned': mentions > 0,
                              'brand_position': positions[0] if positions else None,
                              'competitors_mentioned': sorted(comp_m, key=lambda x: -comp_m[x])[:3],
                              'models_count': total, 'score': round(score, 1)})
    prompt_stats.sort(key=lambda x: -x['score'])

    # Confiance LLM
    confidence = None
    try:
        report = az.get_full_confidence_report(results['responses'], main_brand=brand)
        confidence = report.get('confidence')
    except Exception:
        pass

    metadata = {
        'timestamp':   results.get('timestamp', datetime.now().isoformat()),
        'is_demo':     results.get('is_demo', False),
        'models_used': results.get('llms_used', ['qwen3.5']),
    }
    return metrics, ranking, insights, prompt_stats, confidence, metadata
```

**C) Route GET /api/health (enrichie) :**
```python
@app.route('/api/health', methods=['GET'])
def health():
    uptime_sec = int((datetime.now() - START_TIME).total_seconds())
    uptime_str = f"{uptime_sec // 3600}h {(uptime_sec % 3600) // 60}m {uptime_sec % 60}s"
    weasyprint_ok = False
    try:
        import weasyprint; weasyprint_ok = True
    except ImportError:
        pass
    return jsonify({'status': 'ok', 'version': '2.4', 'sprint': 4,
                    'uptime': uptime_str, 'timestamp': datetime.now().isoformat(),
                    'features': {'pdf_export': weasyprint_ok, 'streaming': True,
                                 'alerts': True, 'prompt_compare': True}})
```

**D) Route GET /api/export/pdf :**
```python
@app.route('/api/export/pdf', methods=['GET'])
def export_pdf():
    fmt     = request.args.get('format', 'pdf')   # 'pdf' | 'html'
    results = _load_results()
    if not results:
        results = generate_demo_data()
        _save_results(results)
    brand = results.get('brand', 'Marque')
    try:
        from pdf_report import generate_report
        metrics, ranking, insights, prompt_stats, confidence, metadata = \
            _build_full_report_data(results, brand)
        content, content_type = generate_report(
            brand=brand, ranking=ranking, metrics=metrics, insights=insights,
            prompt_stats=prompt_stats, confidence=confidence,
            metadata=metadata, output_format=fmt
        )
        ext      = 'pdf' if content_type == 'application/pdf' else 'html'
        date_str = datetime.now().strftime('%Y-%m-%d')
        filename = f"geo-{brand.lower().replace(' ','-')}-{date_str}.{ext}"
        return Response(content, content_type=content_type,
                        headers={'Content-Disposition': f'attachment; filename="{filename}"',
                                 'Content-Length': str(len(content))})
    except Exception as e:
        return jsonify({'error': str(e),
                        'hint': 'pip install weasyprint --break-system-packages'}), 500
```

**E) Route GET /api/export/pdf/check :**
```python
@app.route('/api/export/pdf/check', methods=['GET'])
def check_pdf_support():
    try:
        import weasyprint
        return jsonify({'available': True, 'version': weasyprint.__version__})
    except ImportError:
        return jsonify({'available': False,
                        'install': 'pip install weasyprint --break-system-packages',
                        'fallback': 'GET /api/export/pdf?format=html'})
```

Validation :
```bash
python3 -m py_compile backend/app.py && echo "✅ app.py"
grep "/api/export/pdf"       backend/app.py && echo "✅ route PDF"
grep "/api/export/pdf/check" backend/app.py && echo "✅ route check"
grep "/api/health"           backend/app.py && echo "✅ route health"
grep "START_TIME"            backend/app.py && echo "✅ START_TIME défini"
grep "_build_full_report"    backend/app.py && echo "✅ helper PDF présent"
```

═══════════════════════════════════════════════════════
ÉTAPE 4 — CRÉER frontend/src/components/ExportButton.css
═══════════════════════════════════════════════════════

```css
.eb-wrapper { position:relative; display:inline-flex; flex-direction:column; align-items:flex-end; gap:4px; }
.eb-main-btn { display:flex; align-items:center; gap:8px; padding:8px 16px; font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; background:var(--bg-secondary); border:var(--border-thick) solid var(--accent-yellow); color:var(--accent-yellow); cursor:pointer; transition:all 0.15s; white-space:nowrap; }
.eb-main-btn:hover:not(:disabled) { background:var(--accent-yellow); color:#000; }
.eb-main-btn:disabled { opacity:0.6; cursor:not-allowed; }
.eb-main-btn.loading { border-color:var(--text-muted); color:var(--text-muted); }
.eb-icon { font-size:13px; }
.eb-label { flex:1; }
.eb-chevron { font-size:8px; opacity:0.6; }
.eb-spinner { display:inline-block; width:12px; height:12px; border:2px solid var(--text-muted); border-top-color:var(--accent-yellow); border-radius:50%; animation:eb-spin 0.7s linear infinite; }
@keyframes eb-spin { to { transform:rotate(360deg); } }
.eb-dropdown { position:absolute; top:calc(100% + 6px); right:0; min-width:280px; background:var(--bg-secondary); border:var(--border-thick) solid var(--border-color); z-index:100; box-shadow:0 8px 32px rgba(0,0,0,0.6); }
.eb-option { display:flex; align-items:center; gap:12px; width:100%; padding:12px 16px; background:transparent; border:none; border-bottom:1px solid var(--border-color); color:var(--text-secondary); cursor:pointer; text-align:left; transition:background 0.12s; }
.eb-option:last-of-type { border-bottom:none; }
.eb-option:hover:not(.disabled) { background:var(--bg-tertiary); }
.eb-option.primary:hover:not(.disabled) { background:rgba(255,215,0,0.08); }
.eb-option.disabled { opacity:0.45; cursor:not-allowed; }
.eb-opt-icon { font-size:16px; width:24px; text-align:center; flex-shrink:0; }
.eb-opt-body { flex:1; display:flex; flex-direction:column; gap:2px; }
.eb-opt-label { font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--text-primary); }
.eb-opt-desc { font-family:var(--font-mono); font-size:9px; color:var(--text-muted); line-height:1.3; }
.eb-opt-arrow { font-size:12px; color:var(--text-muted); flex-shrink:0; }
.eb-opt-badge { font-family:var(--font-mono); font-size:8px; font-weight:700; padding:2px 6px; background:rgba(255,68,68,0.1); color:#ff4444; border:1px solid #ff4444; flex-shrink:0; }
.eb-divider { height:1px; background:var(--border-color); margin:2px 0; }
.eb-install-note { display:flex; flex-direction:column; gap:2px; padding:10px 16px; background:rgba(255,215,0,0.04); border-top:1px solid var(--border-color); }
.eb-install-note code { font-family:var(--font-mono); font-size:10px; color:var(--accent-yellow); }
.eb-install-note span { font-family:var(--font-mono); font-size:9px; color:var(--text-muted); }
.eb-last { font-family:var(--font-mono); font-size:9px; color:var(--accent-green); letter-spacing:0.3px; text-align:right; }
```

═══════════════════════════════════════════════════════
ÉTAPE 5 — CRÉER frontend/src/components/ExportButton.jsx
═══════════════════════════════════════════════════════

```jsx
import React, { useState, useEffect } from 'react';
import './ExportButton.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ExportButton({ brand }) {
  const [pdfAvailable, setPdfAvailable] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [open, setOpen]                 = useState(false);
  const [lastExport, setLastExport]     = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/export/pdf/check`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPdfAvailable(d.available))
      .catch(() => setPdfAvailable(false));
  }, []);

  const download = async (url, filename) => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = async (format) => {
    setLoading(true); setOpen(false);
    const date_str = new Date().toISOString().split('T')[0];
    const slug     = (brand || 'rapport').toLowerCase().replace(/\s+/g, '-');
    try {
      if (format === 'json') {
        const data = await fetch(`${API_URL}/export`).then(r => r.json());
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = `geo-${slug}-${date_str}.json`;
        link.click(); URL.revokeObjectURL(link.href);
        setLastExport({ format: 'json', time: new Date().toLocaleTimeString('fr-FR') });
        return;
      }
      const url  = `${API_URL}/export/pdf${format === 'html' ? '?format=html' : ''}`;
      const ext  = format === 'pdf' ? 'pdf' : 'html';
      await download(url, `geo-${slug}-${date_str}.${ext}`);
      setLastExport({ format: ext, time: new Date().toLocaleTimeString('fr-FR') });
    } catch (err) {
      alert(`Erreur export : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eb-wrapper">
      <button className={`eb-main-btn ${loading ? 'loading' : ''}`}
              onClick={() => !loading && setOpen(o => !o)} disabled={loading}>
        {loading ? <span className="eb-spinner" /> : <span className="eb-icon">↓</span>}
        <span className="eb-label">{loading ? 'Génération…' : 'Exporter'}</span>
        {!loading && <span className="eb-chevron">{open ? '▲' : '▼'}</span>}
      </button>

      {open && (
        <div className="eb-dropdown">
          <button className={`eb-option ${!pdfAvailable ? 'disabled' : 'primary'}`}
                  onClick={() => pdfAvailable && handleExport('pdf')} disabled={!pdfAvailable}>
            <span className="eb-opt-icon">📄</span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Rapport PDF</span>
              <span className="eb-opt-desc">
                {pdfAvailable === null ? 'Vérification…'
                  : pdfAvailable ? 'Rapport complet, mise en page pro'
                  : 'WeasyPrint requis — voir docs'}
              </span>
            </div>
            {pdfAvailable && <span className="eb-opt-arrow">→</span>}
            {pdfAvailable === false && <span className="eb-opt-badge">INDISPO</span>}
          </button>

          <button className="eb-option" onClick={() => handleExport('html')}>
            <span className="eb-opt-icon">🌐</span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Rapport HTML</span>
              <span className="eb-opt-desc">{pdfAvailable === false ? 'Fallback PDF — ouvrir dans le navigateur' : 'Version web du rapport'}</span>
            </div>
            <span className="eb-opt-arrow">→</span>
          </button>

          <div className="eb-divider" />

          <button className="eb-option" onClick={() => handleExport('json')}>
            <span className="eb-opt-icon">{ }</span>
            <div className="eb-opt-body">
              <span className="eb-opt-label">Données JSON</span>
              <span className="eb-opt-desc">Métriques brutes — pour intégration</span>
            </div>
            <span className="eb-opt-arrow">→</span>
          </button>

          {pdfAvailable === false && (
            <div className="eb-install-note">
              <code>pip install weasyprint</code>
              <span>pour activer le PDF natif</span>
            </div>
          )}
        </div>
      )}

      {lastExport && !open && (
        <div className="eb-last">✓ {lastExport.format.toUpperCase()} · {lastExport.time}</div>
      )}
    </div>
  );
}
```

═══════════════════════════════════════════════════════
ÉTAPE 6 — CRÉER frontend/src/mobile.css
═══════════════════════════════════════════════════════

Crée le fichier complet fourni dans les livrables Sprint 4 (mobile.css).

Structure requise — ce fichier DOIT contenir :
- `@media (max-width: 768px)` — tablet/mobile medium
  - `.kpi-grid { grid-template-columns: repeat(2, 1fr); }`
  - `.charts-row { grid-template-columns: 1fr; }`
  - `.ap2-channels { grid-template-columns: 1fr; }`
  - `.pc-bw-row { grid-template-columns: 1fr; }`
  - `.eb-dropdown { right:auto; left:0; }`

- `@media (max-width: 480px)` — mobile strict
  - `.navbar-btn-text { display: none; }`
  - padding réduit partout

- `@media (hover: none) and (pointer: coarse)` — touch targets
  - `.app-tab { min-height: 44px; }`
  - `.eb-option { min-height: 52px; }`
  - `.pc-ctrl-btn { min-height: 36px; }`
  - `.navbar-btn { min-height: 38px; }`

- `@media print` — impression
  - `.navbar, .app-tabs, .eb-wrapper { display: none !important; }`

Validation :
```bash
test -f frontend/src/mobile.css && echo "✅ mobile.css créé"
grep "max-width: 768px" frontend/src/mobile.css && echo "✅ breakpoint 768px"
grep "max-width: 480px" frontend/src/mobile.css && echo "✅ breakpoint 480px"
grep "pointer: coarse"  frontend/src/mobile.css && echo "✅ touch targets"
grep "@media print"     frontend/src/mobile.css && echo "✅ print styles"
```

═══════════════════════════════════════════════════════
ÉTAPE 7 — frontend/index.html
═══════════════════════════════════════════════════════

REMPLACE INTÉGRALEMENT le fichier index.html.

CHANGEMENTS par rapport à l'existant :
1. `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
   → `viewport-fit=cover` = utilise le safe-area sur iPhone (notch)
2. `<meta name="theme-color" content="#0a0a0a" />`
   → couleur de la barre d'adresse sur mobile Chrome
3. `<meta name="mobile-web-app-capable" content="yes" />`
4. `<meta name="apple-mobile-web-app-capable" content="yes" />`
5. `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
6. `<meta name="apple-mobile-web-app-title" content="GEO Monitor" />`
7. `<meta name="google" content="notranslate" />` (anti-traduction — existait déjà dans fix deploy)
8. `<html lang="fr" translate="no">` (idem)
9. Favicon inline SVG : `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,...G..."`

```html
<!doctype html>
<html lang="fr" translate="no">
  <head>
    <meta charset="UTF-8" />
    <meta name="google" content="notranslate" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0a" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="GEO Monitor" />
    <meta name="description" content="GEO Monitor — Surveillez la visibilité de votre marque dans les réponses IA" />
    <link rel="icon" type="image/svg+xml"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230a0a0a'/%3E%3Ctext x='4' y='24' font-size='22' font-family='monospace' fill='%23FFD700'%3EG%3C/text%3E%3C/svg%3E" />
    <title>GEO Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Validation :
```bash
grep "viewport-fit=cover"           frontend/index.html && echo "✅ viewport-fit"
grep "theme-color"                  frontend/index.html && echo "✅ theme-color"
grep "apple-mobile-web-app-capable" frontend/index.html && echo "✅ Apple PWA meta"
grep "translate=\"no\""             frontend/index.html && echo "✅ translate=no"
```

═══════════════════════════════════════════════════════
ÉTAPE 8 — frontend/src/App.jsx
═══════════════════════════════════════════════════════

REMPLACE INTÉGRALEMENT le fichier App.jsx.

Conserve TOUT le contenu Sprint 3 (onglets, PromptComparator, AlertsPanel, streaming, etc.)

SEULE modification : intégrer ExportButton dans la navbar.

1. Ajouter l'import :
```jsx
import ExportButton from './components/ExportButton';
```

2. Dans TopNavbar, ajouter la prop exportSlot :
```jsx
<TopNavbar
  brand={config.brand}
  onRefresh={handleRefresh}
  isLoading={isAnalyzing}
  isBackendOnline={isBackendOnline}
  onReset={() => { setConfig(null); setData(null); setCompletedPrompts([]); setActiveTab('dashboard'); }}
  exportSlot={<ExportButton brand={config.brand} />}   {/* ← SPRINT 4 */}
/>
```

3. Dans TopNavbar.jsx (si accessible) — ajouter le slot dans le JSX :
```jsx
// Dans le return du composant TopNavbar, dans la section .navbar-actions :
{props.exportSlot && (
  <div className="navbar-export-slot">
    {props.exportSlot}
  </div>
)}
```

IMPORTANT : Si TopNavbar.jsx n'accepte pas de props.exportSlot,
intégrer ExportButton directement APRÈS le composant TopNavbar dans App.jsx :
```jsx
<TopNavbar ... />
<div className="navbar-export-overlay">
  <ExportButton brand={config.brand} />
</div>
```
Et ajouter dans App.css :
```css
.navbar-export-overlay {
  position: absolute;
  top: 10px;
  right: 16px;
  z-index: 101;
}
```

Validation :
```bash
grep "ExportButton"  frontend/src/App.jsx && echo "✅ ExportButton importé"
grep "exportSlot"    frontend/src/App.jsx && echo "✅ exportSlot passé"
```

═══════════════════════════════════════════════════════
ÉTAPE 9 — APPEND frontend/src/index.css
═══════════════════════════════════════════════════════

AJOUTER à la FIN du fichier index.css existant (ne pas écraser) :

```bash
cat >> frontend/src/index.css << 'ENDCSS'

/* ── Sprint 4 — Mobile responsive ── */
@import './mobile.css';
ENDCSS
echo "✅ import mobile.css ajouté dans index.css"
```

Si l'import @import ne fonctionne pas avec Vite dans index.css,
alternative : importer directement dans main.jsx :
```jsx
// Dans frontend/src/main.jsx — ajouter après les imports existants :
import './mobile.css';
```

Validation :
```bash
grep "mobile.css" frontend/src/index.css || grep "mobile.css" frontend/src/main.jsx
echo "✅ mobile.css importé"
```

═══════════════════════════════════════════════════════
ÉTAPE 10 — APPEND backend/requirements.txt
═══════════════════════════════════════════════════════

```bash
echo "" >> backend/requirements.txt
echo "# Sprint 4 — Export PDF" >> backend/requirements.txt
echo "weasyprint>=60.0" >> backend/requirements.txt
echo "✅ weasyprint ajouté dans requirements.txt"
```

═══════════════════════════════════════════════════════
ÉTAPE 11 — VALIDATION FINALE COMPLÈTE SPRINT 4
═══════════════════════════════════════════════════════

```bash
# 1. Syntaxe Python
python3 -m py_compile backend/pdf_report.py && echo "✅ pdf_report.py"
python3 -m py_compile backend/app.py        && echo "✅ app.py"

# 2. Tests fonctionnels pdf_report.py
python3 -c "
import sys; sys.path.insert(0,'backend')
from pdf_report import build_report_html, generate_report

ranking = [
  {'brand':'Nike','rank':1,'global_score':72.5,'mention_rate':85,'avg_position':1.5,'top_of_mind':42,'share_of_voice':38},
  {'brand':'Adidas','rank':2,'global_score':61.3,'mention_rate':72,'avg_position':2.1,'top_of_mind':28,'share_of_voice':30},
]
metrics  = {r['brand']: r for r in ranking}
insights = {'rank':1,'main_brand':'Nike','strengths':['Bonne visibilité'],
            'weaknesses':['Position améliorable'],'recommendations':['Renforcer SEO']}
metadata = {'timestamp':'2026-03-18T10:00:00','is_demo':True,'models_used':['qwen3.5']}

html = build_report_html('Nike', ranking, metrics, insights, metadata=metadata)
assert len(html) > 3000, f'HTML trop court ({len(html)} chars)'
assert '#FFD700' in html, 'Couleur jaune manquante'
assert 'Nike' in html and 'Adidas' in html
print(f'✅ build_report_html — {len(html):,} chars')

content, ct = generate_report('Nike', ranking, metrics, insights, metadata=metadata, output_format='html')
assert ct == 'text/html; charset=utf-8'
print('✅ generate_report(html) — OK')
print('✅ pdf_report.py — tous les tests OK')
"

# 3. Vérifier routes app.py
grep "/api/export/pdf\b"     backend/app.py && echo "✅ route /api/export/pdf"
grep "/api/export/pdf/check" backend/app.py && echo "✅ route check"
grep "/api/health"           backend/app.py && echo "✅ route health"
grep "START_TIME"            backend/app.py && echo "✅ START_TIME"
grep "_build_full_report"    backend/app.py && echo "✅ helper report"

# 4. Fichiers frontend
test -f frontend/src/components/ExportButton.jsx && echo "✅ ExportButton.jsx"
test -f frontend/src/components/ExportButton.css && echo "✅ ExportButton.css"
test -f frontend/src/mobile.css                  && echo "✅ mobile.css"

# 5. index.html mobile
grep "viewport-fit=cover"           frontend/index.html && echo "✅ viewport-fit"
grep "theme-color"                  frontend/index.html && echo "✅ theme-color"
grep "apple-mobile-web-app-capable" frontend/index.html && echo "✅ Apple meta"

# 6. App.jsx
grep "ExportButton" frontend/src/App.jsx && echo "✅ ExportButton dans App.jsx"

# 7. mobile.css
grep "max-width: 768px"  frontend/src/mobile.css && echo "✅ breakpoint 768px"
grep "pointer: coarse"   frontend/src/mobile.css && echo "✅ touch targets"

# 8. requirements.txt
grep "weasyprint" backend/requirements.txt && echo "✅ weasyprint dans requirements.txt"

# 9. Build frontend
cd frontend && npm run build 2>&1 | tail -5 && echo "✅ Build OK"

# 10. Tests API (backend doit tourner)
# curl http://localhost:5000/api/health | python3 -m json.tool
# → {status:ok, version:2.4, sprint:4, uptime:..., features:{pdf_export:bool}}
#
# curl http://localhost:5000/api/export/pdf/check | python3 -m json.tool
# → {available:true|false}
#
# curl "http://localhost:5000/api/export/pdf?format=html" -o test_report.html
# → Fichier HTML téléchargé avec le rapport GEO Monitor
# open test_report.html  (macOS) / xdg-open test_report.html (Linux)
#
# Si WeasyPrint installé :
# curl "http://localhost:5000/api/export/pdf" -o test_report.pdf
# → Fichier PDF téléchargé
```

═══════════════════════════════════════════════════════
CONTRAINTES ABSOLUES
═══════════════════════════════════════════════════════

1. NE PAS TOUCHER : analyzer.py, alerts.py, llm_client.py, database.py,
   api.js, AnalysisProgress, LLMBreakdown, PromptComparator, AlertsPanel,
   App.css (Sprint 3), Charts, DuelCard, KpiCards, etc.

2. mobile.css → CRÉER comme fichier autonome (pas modifier index.css)
   L'import se fait via index.css ou main.jsx

3. requirements.txt → APPEND uniquement (cat >>) — ne jamais écraser

4. index.css → APPEND uniquement si on y ajoute l'import mobile.css

5. pdf_report.py ne doit JAMAIS crasher si WeasyPrint est absent :
   generate_report() retourne du HTML si ImportError → le téléchargement reste fonctionnel

6. Le nom du fichier téléchargé suit le pattern :
   `geo-{brand-slug}-{YYYY-MM-DD}.pdf` (ou .html ou .json)

7. ExportButton appelle /api/export/pdf/check au mount (useEffect)
   Si le backend est absent → pdfAvailable reste false → bouton HTML/JSON toujours dispo
```

---

## 🔄 Rollback si problème

```bash
cp backend/app.py.bak backend/app.py
cp frontend/index.html.bak frontend/index.html
cp frontend/src/App.jsx.bak frontend/src/App.jsx
rm -f backend/pdf_report.py
rm -f frontend/src/components/ExportButton.jsx
rm -f frontend/src/components/ExportButton.css
rm -f frontend/src/mobile.css
# Retirer la ligne weasyprint de requirements.txt manuellement
```

---

## 🔧 WeasyPrint sur Render (production)

Sur Render, WeasyPrint nécessite des librairies système.
Ajouter dans `render.yaml` si tu en as un, sinon dans la section
"Build Command" des settings Render :

```yaml
# render.yaml
services:
  - type: web
    name: geo-monitoring-backend
    runtime: python
    buildCommand: |
      apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b || true
      pip install -r backend/requirements.txt
    startCommand: python backend/app.py
```

Ou via les **Settings → Build Command** dans le dashboard Render :
```bash
apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 2>/dev/null; pip install -r backend/requirements.txt
```

Si l'install système échoue sur Render plan gratuit → le fallback HTML
fonctionne automatiquement sans aucune modification de code.

---

## 📦 Résumé Sprint 4

| Fichier | Type | Impact |
|---|---|---|
| `backend/pdf_report.py` | CRÉER | Générateur HTML→PDF, 6 sections, design GEO Monitor |
| `backend/app.py` | REMPLACER | Routes /export/pdf + /export/pdf/check + /health enrichi |
| `backend/requirements.txt` | APPEND | weasyprint>=60.0 |
| `ExportButton.jsx/.css` | CRÉER | Dropdown PDF/HTML/JSON avec check WeasyPrint |
| `frontend/src/mobile.css` | CRÉER | Responsive 768px + 480px + touch + print |
| `frontend/index.html` | REMPLACER | Viewport + PWA meta + favicon SVG |
| `frontend/src/App.jsx` | REMPLACER | ExportButton dans navbar |
| `frontend/src/index.css` | APPEND | import mobile.css |

## ⚡ Ce que l'utilisateur voit après Sprint 4

**Bouton Exporter** dans la navbar (remplace l'ancien bouton JSON) :
- Clic → dropdown avec 3 options
- 📄 Rapport PDF — grisé avec badge INDISPO si WeasyPrint absent
- 🌐 Rapport HTML — toujours disponible, même mise en page que le PDF
- `{}` Données JSON — métriques brutes pour intégration

**Rapport PDF/HTML** (14 sections) :
- Page de garde noire avec score en jaune, date, modèles
- Résumé exécutif : 4 KPIs + forces/faiblesses côte à côte
- Classement : tableau complet avec barres visuelles
- Analyse par prompt : meilleur/pire identifiés, scores par prompt
- Score de confiance LLM : cartes vert/jaune/rouge par marque
- Recommandations numérotées sur fond noir

**Mobile** :
- KPI cards en 2×2 au lieu de 4 en ligne
- Charts en colonne unique
- Onglets scrollables horizontalement
- Touch targets 44px minimum sur mobile tactile
- Navbar compacte (texte masqué sur 480px, icônes seules)
- App installable sur iOS/Android (PWA meta tags)
