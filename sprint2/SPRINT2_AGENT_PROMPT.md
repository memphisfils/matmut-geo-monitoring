# 🤖 Sprint 2 — Plan d'intégration complet
> Plateforme : **OpenCode CLI**
> Objectif : Score de confiance par LLM + Analyse temps réel (SSE)
> Prérequis : Sprint 1 intégré et validé

---

## 📁 Carte des fichiers Sprint 2

```
FICHIERS À REMPLACER
backend/
├── analyzer.py          ← REMPLACER (ajout méthodes confiance)
├── app.py               ← REMPLACER (route SSE + route by-model)

frontend/src/
├── App.jsx              ← REMPLACER (streaming + nouveaux composants)
└── services/
    └── api.js           ← REMPLACER (runAnalysisStream)

FICHIERS NOUVEAUX À CRÉER
frontend/src/components/
├── AnalysisProgress.jsx ← CRÉER
├── AnalysisProgress.css ← CRÉER
├── LLMBreakdown.jsx     ← CRÉER
└── LLMBreakdown.css     ← CRÉER

FICHIERS NON TOUCHÉS — NE PAS MODIFIER
backend/
├── llm_client.py        ← intact (Sprint 1)
├── database.py          ← intact (Sprint 1)
├── alerts.py            ← intact
└── prompts.py           ← intact
frontend/src/
├── components/Charts.jsx, DuelCard.jsx, InsightsPanel.jsx
├── components/KpiCards.jsx, RankingTable.jsx, SentimentChart.jsx
├── components/TrendChart.jsx, TopNavbar.jsx, Onboarding.jsx
├── index.css, App.css, main.jsx
```

---

## ✅ Checklist de validation Sprint 2

```
[ ] 1.  analyzer.py   — méthode calculate_metrics_by_model() présente
[ ] 2.  analyzer.py   — méthode calculate_confidence_score() présente
[ ] 3.  analyzer.py   — méthode get_full_confidence_report() présente
[ ] 4.  app.py        — route POST /api/run-analysis/stream présente
[ ] 5.  app.py        — route GET  /api/metrics/by-model présente
[ ] 6.  app.py        — _sse() helper présente
[ ] 7.  app.py        — threaded=True dans app.run()
[ ] 8.  AnalysisProgress.jsx + .css  — fichiers créés
[ ] 9.  LLMBreakdown.jsx + .css      — fichiers créés
[ ] 10. App.jsx       — import AnalysisProgress et LLMBreakdown
[ ] 11. App.jsx       — for await (const event of runAnalysisStream(...))
[ ] 12. api.js        — export async function* runAnalysisStream()
[ ] 13. python3 -m py_compile backend/analyzer.py  — OK
[ ] 14. python3 -m py_compile backend/app.py       — OK
[ ] 15. cd frontend && npm run build               — OK
[ ] 16. Test SSE curl — réponse en événements data:
[ ] 17. Test by-model — retourne by_model + confidence
```

---

## 🤖 PROMPT AGENT — À coller tel quel dans OpenCode CLI

```
Tu es un développeur fullstack senior Python/Flask/React.
Tu intègres le Sprint 2 du projet GEO Monitor.
Le Sprint 1 est déjà en place — ne rien casser.
Suis les instructions dans l'ordre exact. Valide la syntaxe après chaque fichier.

═══════════════════════════════════════════════════════
CONTEXTE
═══════════════════════════════════════════════════════

Sprint 2 ajoute deux fonctionnalités majeures :
1. STREAMING SSE : l'analyse se fait prompt par prompt en temps réel
   → Le frontend voit chaque résultat au fur et à mesure
   → Pas besoin d'attendre la fin pour voir quelque chose
2. SCORE DE CONFIANCE PAR LLM : quand plusieurs modèles sont configurés,
   on mesure leur divergence (std_dev sur les mention rates)
   → Avec plan gratuit (1 seul modèle) : la fonctionnalité s'affiche
     mais indique "modèle unique — divergence N/A"

═══════════════════════════════════════════════════════
ÉTAPE 0 — SAUVEGARDES
═══════════════════════════════════════════════════════

```bash
cp backend/analyzer.py backend/analyzer.py.bak
cp backend/app.py backend/app.py.bak
cp frontend/src/App.jsx frontend/src/App.jsx.bak
cp frontend/src/services/api.js frontend/src/services/api.js.bak
```

═══════════════════════════════════════════════════════
ÉTAPE 1 — backend/analyzer.py
═══════════════════════════════════════════════════════

IMPORTANT : Remplace INTÉGRALEMENT le fichier.
Conserve toutes les méthodes existantes (extract_brands, analyze_response,
calculate_metrics, generate_ranking, generate_insights, calculate_sentiment).
AJOUTE trois nouvelles méthodes APRÈS calculate_metrics :

1. calculate_metrics_by_model(self, responses: List[Dict]) -> Dict
2. calculate_confidence_score(self, metrics_by_model: Dict, brand: str) -> Dict
3. get_full_confidence_report(self, responses: List[Dict], main_brand: str) -> Dict

Voici les trois méthodes à ajouter, EXACTEMENT ainsi :

```python
    def calculate_metrics_by_model(self, responses: List[Dict]) -> Dict:
        """
        Calcule les métriques séparément pour chaque modèle LLM.
        responses : liste brute depuis results['responses']
        Retourne : {model: {brand: {mention_rate, global_score, ...}}}
        """
        by_model: Dict[str, List[Dict]] = {}
        for response in responses:
            for model, data in response.get('llm_analyses', {}).items():
                by_model.setdefault(model, [])
                by_model[model].append(data.get('analysis', {}))
        return {
            model: self.calculate_metrics(analyses)
            for model, analyses in by_model.items()
            if analyses
        }

    def calculate_confidence_score(self, metrics_by_model: Dict, brand: str) -> Dict:
        """
        Score de confiance = cohérence entre les modèles.
        Confiance élevée (std_dev faible) = les modèles s'accordent.
        Confiance faible (std_dev élevé) = résultats divergents.
        """
        if not metrics_by_model:
            return {'confidence': None, 'divergence_level': 'N/A',
                    'std_dev': 0, 'avg_mention_rate': 0, 'per_model': {}}

        if len(metrics_by_model) == 1:
            model = list(metrics_by_model.keys())[0]
            rate  = metrics_by_model[model].get(brand, {}).get('mention_rate', 0)
            return {
                'confidence': None,
                'divergence_level': 'N/A — modèle unique',
                'std_dev': 0,
                'avg_mention_rate': round(rate, 1),
                'per_model': {model: round(rate, 1)},
                'note': 'Activez plusieurs modèles dans OLLAMA_MODELS pour la divergence'
            }

        rates    = [m.get(brand, {}).get('mention_rate', 0) for m in metrics_by_model.values()]
        avg      = sum(rates) / len(rates)
        variance = sum((r - avg) ** 2 for r in rates) / len(rates)
        std_dev  = variance ** 0.5
        confidence = max(0.0, 100.0 - std_dev * 2.5)

        if std_dev < 10:   level = 'faible'
        elif std_dev < 25: level = 'modérée'
        else:              level = 'élevée'

        return {
            'confidence':       round(confidence, 1),
            'divergence_level': level,
            'std_dev':          round(std_dev, 1),
            'avg_mention_rate': round(avg, 1),
            'per_model': {
                model: round(m.get(brand, {}).get('mention_rate', 0), 1)
                for model, m in metrics_by_model.items()
            }
        }

    def get_full_confidence_report(self, responses: List[Dict], main_brand: str) -> Dict:
        """
        Rapport complet : métriques par modèle + confiance pour toutes les marques.
        """
        by_model = self.calculate_metrics_by_model(responses)
        confidence_by_brand = {
            brand: self.calculate_confidence_score(by_model, brand)
            for brand in self.brands
        }
        return {
            'by_model':              by_model,
            'confidence':            confidence_by_brand,
            'main_brand_confidence': confidence_by_brand.get(main_brand, {})
        }
```

Validation :
```bash
python3 -m py_compile backend/analyzer.py && echo "✅ analyzer.py"
python3 -c "
import sys; sys.path.insert(0,'backend')
from analyzer import BrandAnalyzer
az = BrandAnalyzer(brands=['Nike','Adidas'])
fake = [{'llm_analyses': {
  'qwen3.5':  {'analysis': {'brands_mentioned': ['Nike'], 'positions': {'Nike':1}, 'first_brand':'Nike'}},
  'llama3.2': {'analysis': {'brands_mentioned': ['Adidas'], 'positions': {'Adidas':1}, 'first_brand':'Adidas'}}
}}]
r = az.get_full_confidence_report(fake, 'Nike')
assert 'by_model' in r and 'confidence' in r
print('✅ get_full_confidence_report OK')
"
```

═══════════════════════════════════════════════════════
ÉTAPE 2 — backend/app.py
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier app.py.

CHANGEMENTS par rapport au Sprint 1 :
1. Ajout import : `from flask import Response, stream_with_context`
2. Ajout import en haut : `import time` (si pas déjà là)
3. Nouvelle fonction helper `_sse(event_type, data)` → formate un event SSE
4. Nouvelle route : POST /api/run-analysis/stream (SSE streaming)
5. Nouvelle route : GET /api/metrics/by-model (confiance par modèle)
6. `app.run(..., threaded=True)` — OBLIGATOIRE pour le streaming Flask

RÈGLE CRITIQUE : threaded=True doit être dans app.run() sinon le streaming
bloque le serveur entier.

La fonction _sse() :
```python
def _sse(event_type: str, data: dict) -> str:
    payload = json.dumps({'type': event_type, **data}, ensure_ascii=False)
    return f"data: {payload}\n\n"
```

La route /api/run-analysis/stream — structure exacte :
```python
@app.route('/api/run-analysis/stream', methods=['POST'])
def run_analysis_stream():
    data         = request.get_json() or {}
    brand        = data.get('brand', 'Marque')
    competitors  = data.get('competitors', [])
    prompts      = data.get('prompts', [])
    limit        = data.get('limit', min(len(prompts), 6) if prompts else 6)
    use_demo     = data.get('demo', False)
    sector       = data.get('sector', '')
    all_brands   = [brand] + competitors
    az           = BrandAnalyzer(brands=all_brands)

    def generate_events():
        start = time.time()
        llm_client    = None
        active_models = ['demo']

        if not use_demo and prompts:
            try:
                from llm_client import LLMClient
                llm_client    = LLMClient()
                active_models = llm_client.models if llm_client.clients else ['demo']
                if not llm_client.clients:
                    llm_client = None
            except Exception as e:
                llm_client = None

        is_demo = llm_client is None

        yield _sse('start', {
            'brand': brand, 'total_prompts': limit,
            'models': active_models, 'is_demo': is_demo
        })

        responses = []

        for i, prompt in enumerate(prompts[:limit]):
            prompt_start = time.time()

            if is_demo:
                time.sleep(0.3)
                brands_in = []
                for b in all_brands:
                    rng = random.Random(_brand_seed(b) + i * 997)
                    if rng.random() < (0.35 + random.Random(_brand_seed(b)).random() * 0.55):
                        brands_in.append(b)
                brands_in.sort(key=lambda b: _brand_seed(b))
                text     = f'[Demo prompt {i+1}]'
                analyses = {'ollama': {'response': text, 'analysis': {
                    'brands_mentioned': brands_in,
                    'positions':        {b: idx+1 for idx,b in enumerate(brands_in)},
                    'first_brand':      brands_in[0] if brands_in else None,
                    'matmut_mentioned': brand in brands_in,
                    'brand_mentioned':  brand in brands_in,
                    'brand_position':   next((idx+1 for idx,b in enumerate(brands_in) if b==brand), None),
                    'matmut_position':  next((idx+1 for idx,b in enumerate(brands_in) if b==brand), None),
                }}}
            else:
                all_model_resp = llm_client.query_all_models_for_prompt(prompt)
                analyses    = {}
                brands_in   = []
                for model, text in all_model_resp.items():
                    analysis = az.analyze_response(text)
                    analyses[model] = {'response': text, 'analysis': analysis}
                    brands_in = analysis.get('brands_mentioned', [])

            brand_pos = next(
                (analyses[m]['analysis'].get('brand_position')
                 for m in analyses if analyses[m]['analysis'].get('brand_position')),
                None
            )
            responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})

            yield _sse('progress', {
                'current':         i + 1,
                'total':           limit,
                'prompt':          prompt,
                'brands_found':    brands_in,
                'brand_mentioned': brand in brands_in,
                'brand_position':  brand_pos,
                'duration_ms':     round((time.time() - prompt_start) * 1000)
            })

        results = {
            'timestamp':    datetime.now().isoformat(),
            'total_prompts': limit,
            'llms_used':    active_models,
            'brand':        brand,
            'competitors':  competitors,
            'responses':    responses,
            'is_demo':      is_demo
        }
        _save_and_alert(results, brand)
        try:
            upsert_project(brand, sector, competitors, prompts, active_models)
        except Exception:
            pass

        yield _sse('complete', {
            'timestamp': results['timestamp'],
            'is_demo':   is_demo,
            'duration':  round(time.time() - start, 2)
        })

    return Response(
        stream_with_context(generate_events()),
        content_type='text/event-stream',
        headers={
            'Cache-Control':     'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection':        'keep-alive'
        }
    )
```

La route /api/metrics/by-model :
```python
@app.route('/api/metrics/by-model', methods=['GET'])
def get_metrics_by_model():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée — lancez une analyse'}), 404

    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors if competitors else None
    az          = BrandAnalyzer(brands=all_brands)

    report = az.get_full_confidence_report(results['responses'], main_brand=brand)

    rankings_by_model = {
        model: az.generate_ranking(metrics)
        for model, metrics in report['by_model'].items()
    }

    return jsonify({
        'by_model':              report['by_model'],
        'rankings_by_model':     rankings_by_model,
        'confidence':            report['confidence'],
        'main_brand_confidence': report['main_brand_confidence'],
        'models':                list(report['by_model'].keys()),
        'brand':                 brand,
        'metadata': {
            'timestamp':    results['timestamp'],
            'is_demo':      results.get('is_demo', False),
            'total_prompts': results['total_prompts']
        }
    })
```

RAPPEL : dans app.run() final → `app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)`

Validation :
```bash
python3 -m py_compile backend/app.py && echo "✅ app.py"
# Vérifier threaded=True
grep "threaded=True" backend/app.py && echo "✅ threaded=True présent"
# Vérifier les deux nouvelles routes
grep "run-analysis/stream" backend/app.py && echo "✅ route SSE présente"
grep "metrics/by-model" backend/app.py && echo "✅ route by-model présente"
```

═══════════════════════════════════════════════════════
ÉTAPE 3 — CRÉER frontend/src/components/AnalysisProgress.css
═══════════════════════════════════════════════════════

Crée le fichier avec ce contenu exact :

```css
.ap-wrapper {
  background: var(--bg-secondary);
  border: var(--border-thick) solid var(--border-color);
  margin-bottom: 20px;
  padding: 24px;
}
.ap-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}
.ap-title-row { display: flex; align-items: center; gap: 10px; }
.ap-title {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-primary);
  text-transform: uppercase;
}
.ap-icon-spin { color: var(--accent-yellow); animation: spin 1s linear infinite; }
.ap-icon-done { color: var(--accent-green); }
@keyframes spin { to { transform: rotate(360deg); } }
.ap-badge-demo {
  font-size: 10px; font-family: var(--font-mono); font-weight: 700;
  letter-spacing: 1px; padding: 2px 8px;
  background: rgba(255,215,0,0.1); color: var(--accent-yellow);
  border: 1px solid var(--accent-yellow);
}
.ap-models { display: flex; gap: 6px; flex-wrap: wrap; }
.ap-model-chip {
  font-family: var(--font-mono); font-size: 10px; padding: 3px 10px;
  border: 1px solid var(--border-color); color: var(--text-muted);
  background: var(--bg-tertiary);
}
.ap-bar-wrapper { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.ap-bar-track { flex: 1; height: 6px; background: var(--border-color); overflow: hidden; }
.ap-bar-fill { height: 100%; background: var(--accent-yellow); transition: width 0.4s ease; }
.ap-bar-fill.complete { background: var(--accent-green); }
.ap-bar-label {
  font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
  white-space: nowrap; min-width: 80px; text-align: right;
}
.ap-current {
  display: flex; flex-direction: column; gap: 4px; padding: 12px;
  background: rgba(255,215,0,0.04); border-left: 3px solid var(--accent-yellow);
  margin-bottom: 16px;
}
.ap-current-label {
  font-family: var(--font-mono); font-size: 9px;
  letter-spacing: 1.5px; color: var(--text-muted);
}
.ap-current-text { font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); }
.ap-log { display: flex; flex-direction: column; gap: 2px; max-height: 260px; overflow-y: auto; }
.ap-log-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
  border-left: 2px solid transparent;
}
.ap-log-row.mentioned {
  color: var(--text-secondary); border-left-color: var(--accent-green);
  background: rgba(0,204,68,0.03);
}
.ap-log-num { width: 20px; text-align: right; color: var(--text-muted); flex-shrink: 0; }
.ap-log-prompt { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-log-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.ap-log-pos { font-weight: 600; color: var(--accent-green); font-size: 11px; }
.ap-log-absent { color: var(--text-muted); }
.ap-log-check { color: var(--accent-green); }
.ap-log-x { color: var(--text-muted); }
```

═══════════════════════════════════════════════════════
ÉTAPE 4 — CRÉER frontend/src/components/AnalysisProgress.jsx
═══════════════════════════════════════════════════════

```jsx
import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import './AnalysisProgress.css';

export default function AnalysisProgress({
  brand, progress, models = [], isComplete = false,
  isDemo = false, completedPrompts = []
}) {
  const pct = progress?.total > 0
    ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="ap-wrapper">
      <div className="ap-header">
        <div className="ap-title-row">
          {isComplete
            ? <CheckCircle size={18} className="ap-icon-done" />
            : <Loader2 size={18} className="ap-icon-spin" />}
          <span className="ap-title">
            {isComplete ? 'Analyse terminée' : `Analyse de ${brand} en cours…`}
          </span>
          {isDemo && <span className="ap-badge-demo">DÉMO</span>}
        </div>
        <div className="ap-models">
          {models.map(m => <span key={m} className="ap-model-chip">{m}</span>)}
        </div>
      </div>

      <div className="ap-bar-wrapper">
        <div className="ap-bar-track">
          <div className={`ap-bar-fill ${isComplete ? 'complete' : ''}`}
               style={{ width: `${pct}%` }} />
        </div>
        <span className="ap-bar-label">
          {progress?.current ?? 0} / {progress?.total ?? '?'} prompts
        </span>
      </div>

      {progress && !isComplete && (
        <div className="ap-current">
          <span className="ap-current-label">PROMPT EN COURS</span>
          <span className="ap-current-text">{progress.prompt}</span>
        </div>
      )}

      {completedPrompts.length > 0 && (
        <div className="ap-log">
          {completedPrompts.map((p, i) => (
            <div key={i} className={`ap-log-row ${p.brand_mentioned ? 'mentioned' : ''}`}>
              <span className="ap-log-num">{p.current}</span>
              <span className="ap-log-prompt">{p.prompt}</span>
              <div className="ap-log-right">
                {p.brand_mentioned
                  ? <span className="ap-log-pos">#{p.brand_position ?? '?'}</span>
                  : <span className="ap-log-absent">—</span>}
                {p.brand_mentioned
                  ? <CheckCircle size={12} className="ap-log-check" />
                  : <XCircle size={12} className="ap-log-x" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

═══════════════════════════════════════════════════════
ÉTAPE 5 — CRÉER frontend/src/components/LLMBreakdown.css
═══════════════════════════════════════════════════════

```css
.llm-wrapper { background: var(--bg-secondary); border: var(--border-thick) solid var(--border-color); margin-bottom: 20px; }
.llm-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: var(--border-thick) solid var(--border-color); background: var(--bg-tertiary); flex-wrap: wrap; gap: 8px; }
.llm-title { font-size: 12px; font-family: var(--font-display); color: var(--text-primary); margin: 0; }
.llm-conf-badge { font-family: var(--font-mono); font-size: 10px; font-weight: 700; padding: 3px 10px; letter-spacing: 0.5px; }
.llm-conf-badge.high { background: rgba(0,204,68,0.1); color: var(--accent-green); border: 1px solid var(--accent-green); }
.llm-conf-badge.mid  { background: rgba(255,215,0,0.1); color: var(--accent-yellow); border: 1px solid var(--accent-yellow); }
.llm-conf-badge.low  { background: rgba(255,68,68,0.1); color: var(--accent-red); border: 1px solid var(--accent-red); }
.llm-conf-badge.single { background: rgba(100,100,100,0.1); color: var(--text-muted); border: 1px solid var(--border-color); }
.llm-single-note { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); padding: 10px 20px; border-bottom: 1px solid var(--border-color); }
.llm-single-note code { background: var(--bg-tertiary); padding: 1px 5px; color: var(--accent-yellow); font-size: 11px; }
.llm-table-scroll { overflow-x: auto; }
.llm-table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 12px; }
.llm-th-brand, .llm-th-model, .llm-th-conf { padding: 8px 16px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.llm-th-model, .llm-th-conf { text-align: center; }
.llm-table tr { border-bottom: 1px solid rgba(255,255,255,0.04); }
.llm-table tr:hover { background: var(--bg-tertiary); }
.llm-row-target { background: rgba(255,215,0,0.04) !important; border-left: 3px solid var(--accent-yellow); }
.llm-td-brand { padding: 10px 16px; color: var(--text-secondary); white-space: nowrap; font-weight: 600; }
.llm-row-target .llm-td-brand { color: var(--accent-yellow); }
.llm-td-val { padding: 8px 16px; min-width: 120px; }
.llm-cell { display: flex; align-items: center; gap: 8px; }
.llm-cell-bar { height: 4px; min-width: 4px; max-width: 80px; flex: 1; transition: width 0.4s ease; }
.llm-cell-num { font-size: 11px; color: var(--text-secondary); width: 36px; text-align: right; flex-shrink: 0; }
.llm-td-conf { padding: 8px 16px; text-align: center; }
.llm-div-badge { font-size: 10px; padding: 2px 8px; font-weight: 700; }
.llm-div-badge.high { color: var(--accent-green); }
.llm-div-badge.mid  { color: var(--accent-yellow); }
.llm-div-badge.low  { color: var(--accent-red); }
.llm-legend { display: flex; gap: 20px; padding: 10px 20px; font-family: var(--font-mono); font-size: 10px; flex-wrap: wrap; border-top: 1px solid var(--border-color); }
.llm-leg.high { color: var(--accent-green); }
.llm-leg.mid  { color: var(--accent-yellow); }
.llm-leg.low  { color: var(--accent-red); }
.llm-loading { padding: 40px; text-align: center; font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); letter-spacing: 2px; }
```

═══════════════════════════════════════════════════════
ÉTAPE 6 — CRÉER frontend/src/components/LLMBreakdown.jsx
═══════════════════════════════════════════════════════

IMPORTANT : Ce composant appelle /api/metrics/by-model directement
depuis le composant (pas via App.jsx). Il gère son propre état loading.
En cas d'erreur backend → génère des données démo localement.

```jsx
import React, { useState, useEffect } from 'react';
import './LLMBreakdown.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function LLMBreakdown({ brand }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    fetch(`${API_URL}/metrics/by-model`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(makeDemoData(brand)); setLoading(false); });
  }, [brand]);

  if (loading) return <div className="llm-wrapper"><div className="llm-loading">CHARGEMENT…</div></div>;
  if (!data)   return null;

  const models      = data.models || [];
  const byModel     = data.by_model || {};
  const confMap     = data.confidence || {};
  const singleModel = models.length <= 1;

  const allBrands = Object.keys(Object.values(byModel)[0] || {}).sort((a, b) => {
    const avgA = models.reduce((s, m) => s + (byModel[m]?.[a]?.global_score || 0), 0) / (models.length || 1);
    const avgB = models.reduce((s, m) => s + (byModel[m]?.[b]?.global_score || 0), 0) / (models.length || 1);
    return avgB - avgA;
  });

  const mainConf = confMap[brand] || {};

  function getConfLevel(c) {
    if (c >= 75) return 'high';
    if (c >= 45) return 'mid';
    return 'low';
  }

  return (
    <div className="llm-wrapper">
      <div className="llm-header">
        <h3 className="llm-title">SCORE DE CONFIANCE — {brand?.toUpperCase()}</h3>
        {!singleModel && mainConf.confidence != null
          ? <div className={`llm-conf-badge ${getConfLevel(mainConf.confidence)}`}>
              {mainConf.confidence}% confiance · divergence {mainConf.divergence_level}
            </div>
          : <div className="llm-conf-badge single">Modèle unique — divergence N/A</div>
        }
      </div>

      {singleModel && (
        <div className="llm-single-note">
          Ajoutez des modèles : <code>OLLAMA_MODELS=qwen3.5,llama3.2:8b</code>
        </div>
      )}

      <div className="llm-table-scroll">
        <table className="llm-table">
          <thead>
            <tr>
              <th className="llm-th-brand">MARQUE</th>
              {models.map(m => <th key={m} className="llm-th-model">{m}</th>)}
              {!singleModel && <th className="llm-th-conf">DIVERGENCE</th>}
            </tr>
          </thead>
          <tbody>
            {allBrands.map(b => {
              const conf = confMap[b] || {};
              return (
                <tr key={b} className={b === brand ? 'llm-row-target' : ''}>
                  <td className="llm-td-brand">{b}</td>
                  {models.map(m => {
                    const rate = byModel[m]?.[b]?.mention_rate ?? 0;
                    return (
                      <td key={m} className="llm-td-val">
                        <div className="llm-cell">
                          <div className="llm-cell-bar"
                               style={{ width: `${rate}%`, background: b === brand ? 'var(--accent-yellow)' : '#444' }} />
                          <span className="llm-cell-num">{rate}%</span>
                        </div>
                      </td>
                    );
                  })}
                  {!singleModel && (
                    <td className="llm-td-conf">
                      {conf.std_dev != null
                        ? <span className={`llm-div-badge ${getConfLevel(100 - conf.std_dev * 2.5)}`}>±{conf.std_dev}%</span>
                        : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!singleModel && (
        <div className="llm-legend">
          <span className="llm-leg high">■ Faible divergence — résultats fiables</span>
          <span className="llm-leg mid">■ Divergence modérée</span>
          <span className="llm-leg low">■ Forte divergence — interpréter avec précaution</span>
        </div>
      )}
    </div>
  );
}

function makeDemoData(brand) {
  const competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C'];
  const allBrands   = [brand, ...competitors];
  const byModel     = { 'qwen3.5': {} };
  allBrands.forEach(b => {
    let s = b.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 0);
    const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    byModel['qwen3.5'][b] = { mention_rate: Math.round(30 + rand() * 55), global_score: Math.round(20 + rand() * 60) };
  });
  const confidence = {};
  allBrands.forEach(b => {
    confidence[b] = { confidence: null, divergence_level: 'N/A — modèle unique', std_dev: 0,
                      avg_mention_rate: byModel['qwen3.5'][b]?.mention_rate || 0,
                      per_model: { 'qwen3.5': byModel['qwen3.5'][b]?.mention_rate || 0 } };
  });
  return { models: ['qwen3.5'], by_model: byModel, confidence, brand };
}
```

═══════════════════════════════════════════════════════
ÉTAPE 7 — frontend/src/services/api.js
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier.

CHANGEMENT CLÉ : ajout de `export async function* runAnalysisStream(options)`
C'est un générateur async (fonction étoile) — le frontend itère dessus avec
`for await (const event of runAnalysisStream(...))`.

La fonction essaie d'abord le backend réel via fetch + ReadableStream.
Si le backend est absent → simulation démo avec setTimeout.

Le fichier complet est fourni dans les livrables Sprint 2 (api_s2.js).
Structure des fonctions exportées :
- seededRand(seed) — fonction interne (non exportée)
- export DEMO_DATA_FACTORY(brand, competitors) — identique Sprint 1
- export async function* runAnalysisStream(options) — NOUVEAU Sprint 2
- export fetchMetrics, runAnalysis, fetchExport, fetchHistory — inchangés
- export generateTrendHistory, checkStatus — inchangés

Validation :
```bash
node -e "
const code = require('fs').readFileSync('frontend/src/services/api.js','utf8');
if (!code.includes('async function* runAnalysisStream')) {
  console.error('❌ runAnalysisStream manquant'); process.exit(1);
}
if (!code.includes('seededRand')) {
  console.error('❌ seededRand manquant'); process.exit(1);
}
console.log('✅ api.js validé');
"
```

═══════════════════════════════════════════════════════
ÉTAPE 8 — frontend/src/App.jsx
═══════════════════════════════════════════════════════

Remplace INTÉGRALEMENT le fichier.

CHANGEMENTS par rapport à App.jsx Sprint 1 :
1. Nouveaux imports :
   ```jsx
   import AnalysisProgress from './components/AnalysisProgress';
   import LLMBreakdown from './components/LLMBreakdown';
   import { runAnalysisStream, ... } from './services/api';
   ```

2. Nouveaux états :
   ```jsx
   const [isAnalyzing, setIsAnalyzing]           = useState(false);
   const [analysisProgress, setAnalysisProgress] = useState(null);
   const [completedPrompts, setCompletedPrompts] = useState([]);
   const [analysisModels, setAnalysisModels]     = useState([]);
   const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
   const [isDemo, setIsDemo]                     = useState(false);
   ```

3. handleOnboardingComplete utilise `for await (const event of runAnalysisStream(...))` :
   ```jsx
   for await (const event of runAnalysisStream({ brand, competitors, prompts, sector })) {
     if (event.type === 'start')    setAnalysisModels(event.models);
     if (event.type === 'progress') { setAnalysisProgress(event); setCompletedPrompts(prev => [...prev, event]); }
     if (event.type === 'complete') { setIsAnalysisComplete(true); setIsAnalyzing(false); await loadDashboardData(cfg); }
   }
   ```

4. Dans le JSX, AVANT le dashboard principal :
   ```jsx
   {(isAnalyzing || completedPrompts.length > 0) && (
     <AnalysisProgress brand={config.brand} progress={analysisProgress}
       models={analysisModels} isComplete={isAnalysisComplete}
       isDemo={isDemo} completedPrompts={completedPrompts} />
   )}
   ```

5. Dans le dashboard, APRÈS RankingTable et AVANT les charts :
   ```jsx
   <LLMBreakdown brand={config.brand} />
   ```

6. loadDashboardData = fonction séparée qui appelle fetchMetrics + generateTrendHistory

Le fichier complet est fourni dans les livrables Sprint 2 (App_s2.jsx).

Validation :
```bash
grep "AnalysisProgress" frontend/src/App.jsx && echo "✅ AnalysisProgress importé"
grep "LLMBreakdown"     frontend/src/App.jsx && echo "✅ LLMBreakdown importé"
grep "runAnalysisStream" frontend/src/App.jsx && echo "✅ runAnalysisStream utilisé"
grep "for await"         frontend/src/App.jsx && echo "✅ for await présent"
```

═══════════════════════════════════════════════════════
ÉTAPE 9 — VALIDATION FINALE COMPLÈTE
═══════════════════════════════════════════════════════

```bash
# 1. Syntaxe Python
python3 -m py_compile backend/analyzer.py && echo "✅ analyzer.py"
python3 -m py_compile backend/app.py      && echo "✅ app.py"

# 2. Test confidence report
python3 -c "
import sys; sys.path.insert(0,'backend')
from analyzer import BrandAnalyzer
az = BrandAnalyzer(brands=['Nike','Adidas','Puma'])
fake = [{'llm_analyses': {
  'qwen3.5':  {'analysis': {'brands_mentioned':['Nike','Adidas'],'positions':{'Nike':1,'Adidas':2},'first_brand':'Nike'}},
  'llama3.2': {'analysis': {'brands_mentioned':['Adidas'],'positions':{'Adidas':1},'first_brand':'Adidas'}}
}}]
r = az.get_full_confidence_report(fake, 'Nike')
assert 'qwen3.5' in r['by_model']
assert 'llama3.2' in r['by_model']
c = r['main_brand_confidence']
assert c['std_dev'] is not None
print(f'✅ confidence Nike: std={c[\"std_dev\"]}% per_model={c[\"per_model\"]}')
"

# 3. Vérifier threaded=True dans app.py
grep "threaded=True" backend/app.py && echo "✅ threaded=True"

# 4. Vérifier les routes SSE
grep "/run-analysis/stream" backend/app.py && echo "✅ route SSE"
grep "/metrics/by-model"    backend/app.py && echo "✅ route by-model"

# 5. Vérifier les nouveaux composants
test -f frontend/src/components/AnalysisProgress.jsx && echo "✅ AnalysisProgress.jsx"
test -f frontend/src/components/AnalysisProgress.css && echo "✅ AnalysisProgress.css"
test -f frontend/src/components/LLMBreakdown.jsx     && echo "✅ LLMBreakdown.jsx"
test -f frontend/src/components/LLMBreakdown.css     && echo "✅ LLMBreakdown.css"

# 6. Vérifier App.jsx
grep "runAnalysisStream" frontend/src/App.jsx && echo "✅ streaming dans App.jsx"
grep "LLMBreakdown"      frontend/src/App.jsx && echo "✅ LLMBreakdown dans App.jsx"

# 7. Build frontend
cd frontend && npm run build 2>&1 | tail -5

# 8. Test SSE (backend doit tourner)
# curl -X POST http://localhost:5000/api/run-analysis/stream \
#   -H "Content-Type: application/json" \
#   -d '{"brand":"Nike","competitors":["Adidas"],"prompts":["Top marques sport"],"demo":true}' \
#   --no-buffer
# Doit afficher: data: {"type": "start", ...}
#               data: {"type": "progress", ...}
#               data: {"type": "complete", ...}
```

═══════════════════════════════════════════════════════
CONTRAINTES ABSOLUES
═══════════════════════════════════════════════════════

1. NE PAS TOUCHER : llm_client.py, database.py, alerts.py, prompts.py,
   tous les composants existants (Charts, DuelCard, KpiCards, RankingTable,
   SentimentChart, TrendChart, TopNavbar, Onboarding, Sidebar)

2. threaded=True est OBLIGATOIRE dans app.run() — sans ça, le streaming
   Flask bloque tous les autres appels HTTP pendant l'analyse

3. X-Accel-Buffering: no est OBLIGATOIRE dans les headers SSE — sinon
   nginx (Render) bufferise et le streaming ne fonctionne pas

4. runAnalysisStream est un générateur async (function*) — ne pas le
   convertir en fonction normale qui retourne une Promise

5. Si une étape échoue, restaurer le backup AVANT de recommencer
```

---

## 🔄 Rollback si problème

```bash
cp backend/analyzer.py.bak backend/analyzer.py
cp backend/app.py.bak backend/app.py
cp frontend/src/App.jsx.bak frontend/src/App.jsx
cp frontend/src/services/api.js.bak frontend/src/services/api.js
rm -f frontend/src/components/AnalysisProgress.jsx
rm -f frontend/src/components/AnalysisProgress.css
rm -f frontend/src/components/LLMBreakdown.jsx
rm -f frontend/src/components/LLMBreakdown.css
```

---

## 📦 Résumé Sprint 2

| Fichier | Type | Impact |
|---|---|---|
| `analyzer.py` | REMPLACER | 3 nouvelles méthodes confiance |
| `app.py` | REMPLACER | Route SSE + route by-model + threaded=True |
| `AnalysisProgress.jsx/.css` | CRÉER | Barre progression temps réel |
| `LLMBreakdown.jsx/.css` | CRÉER | Scores par modèle + divergence |
| `App.jsx` | REMPLACER | for await streaming + nouveaux composants |
| `api.js` | REMPLACER | runAnalysisStream() générateur async |

## ⚠️ Note Render (production)

Sur Render plan gratuit, le streaming SSE peut être limité par le timeout
de 30s de la connexion. Si l'analyse dépasse 30s, le frontend reçoit
`complete` via le fallback (fetch normal). Le mode démo (< 5s) fonctionne
toujours sans problème.

Pour contourner sur Render : définir `FLASK_DEBUG=False` et s'assurer
que `gunicorn` est lancé avec `--timeout 120 --worker-class gthread`.
```
