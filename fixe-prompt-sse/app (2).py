"""
API Flask — GEO Monitor Sprint 5
Nouveautés :
  - GET    /api/projects/dashboard  → vue agrégée de tous les projets + métriques
  - DELETE /api/projects/:brand     → supprime un projet
  - POST   /api/projects/:brand/refresh → relance l'analyse d'un projet
  - GET    /api/projects/:brand/metrics → métriques d'un projet spécifique
"""
from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import json
import os
import io
import random
import time
from datetime import datetime
from analyzer import BrandAnalyzer

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://geo-monitoring.vercel.app",
    "https://geo-monitoring-frontend.onrender.com",
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=False)

from database import (init_db, save_analysis, get_history, generate_demo_history,
                      upsert_project, get_all_projects, delete_project,
                      upsert_project_metrics, get_project_snapshot,
                      get_all_projects_with_metrics)
from alerts import send_alert, alert_rank_lost, alert_weekly_summary, send_slack_alert
init_db()

DATA_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RESULTS_FILE = os.path.join(DATA_DIR, 'results.json')
START_TIME   = datetime.now()


# ── Scheduler ─────────────────────────────────────────────────────────────────

def _scheduled_analysis():
    projects = get_all_projects()
    if not projects:
        return
    for project in projects:
        brand, competitors, prompts = (
            project.get('brand', ''), project.get('competitors', []), project.get('prompts', []))
        if not brand or not prompts:
            continue
        try:
            results = _run_real_or_demo(brand, competitors, prompts, limit=6)
            _save_and_alert(results, brand)
        except Exception as e:
            print(f"[SCHEDULER] {brand} : {e}")


def _scheduled_weekly_summary():
    results = _load_results()
    if not results:
        return
    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    az          = BrandAnalyzer(brands=[brand] + competitors)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics         = az.calculate_metrics(all_analyses)
    ranking         = az.generate_ranking(metrics)
    brand_data      = metrics.get(brand, {})
    brand_rank      = next((r['rank'] for r in ranking if r['brand'] == brand), None)
    top_competitors = [r for r in ranking if r['brand'] != brand][:5]
    alert_weekly_summary(brand=brand, rank=brand_rank or 0,
                         score=brand_data.get('global_score', 0),
                         mention_rate=brand_data.get('mention_rate', 0),
                         top_competitors=top_competitors)


def _start_scheduler():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(_scheduled_analysis, 'interval', hours=6, id='auto_analysis')
        scheduler.add_job(_scheduled_weekly_summary, 'cron',
                          day_of_week='mon', hour=9, minute=0, id='weekly_summary')
        scheduler.start()
        print("[SCHEDULER] Actif — analyse 6h + résumé lundi 09h")
        return scheduler
    except ImportError:
        print("[SCHEDULER] apscheduler non installé")
        return None
    except Exception as e:
        print(f"[SCHEDULER] Erreur : {e}")
        return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _load_results():
    _ensure_data_dir()
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def _save_results(data):
    _ensure_data_dir()
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _brand_seed(b):
    return abs(hash(b)) % (2**31)

def _sse(event_type: str, data: dict) -> str:
    payload = json.dumps({'type': event_type, **data}, ensure_ascii=False)
    return f"data: {payload}\n\n"

def _build_full_report_data(results, brand):
    competitors  = results.get('competitors', [])
    all_brands   = [brand] + competitors
    az           = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    prompt_stats = []
    for response in results['responses']:
        prompt = response.get('prompt', '')
        if not prompt:
            continue
        analyses = [d['analysis'] for d in response['llm_analyses'].values()]
        total = len(analyses)
        if not total:
            continue
        mentions = sum(1 for a in analyses if brand in a.get('brands_mentioned', []))
        mpct     = round(mentions / total * 100, 1)
        positions = [a['positions'].get(brand) for a in analyses if a['positions'].get(brand) is not None]
        avg_pos   = round(sum(positions) / len(positions), 2) if positions else None
        first_cnt = sum(1 for a in analyses if a.get('first_brand') == brand)
        tom       = round(first_cnt / total * 100, 1)
        comp_m    = {}
        for a in analyses:
            for b in a.get('brands_mentioned', []):
                if b != brand:
                    comp_m[b] = comp_m.get(b, 0) + 1
        score = mpct * 0.5 + (100 / avg_pos if avg_pos else 0) * 0.3 + tom * 0.2
        prompt_stats.append({'prompt': prompt, 'mention_rate': mpct, 'avg_position': avg_pos,
                              'top_of_mind': tom, 'brand_mentioned': mentions > 0,
                              'brand_position': positions[0] if positions else None,
                              'competitors_mentioned': sorted(comp_m, key=lambda x: -comp_m[x])[:3],
                              'models_count': total, 'score': round(score, 1)})
    prompt_stats.sort(key=lambda x: -x['score'])
    confidence = None
    try:
        report     = az.get_full_confidence_report(results['responses'], main_brand=brand)
        confidence = report.get('confidence')
    except Exception:
        pass
    metadata = {'timestamp': results.get('timestamp', datetime.now().isoformat()),
                'is_demo':   results.get('is_demo', False),
                'models_used': results.get('llms_used', ['qwen3.5'])}
    return metrics, ranking, insights, prompt_stats, confidence, metadata


# ── Demo data ─────────────────────────────────────────────────────────────────

def generate_demo_data(brand='Marque', competitors=None, prompts=None):
    if not competitors:
        competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D']
    if not prompts:
        prompts = [f"Meilleur service {brand.lower()} ?",
                   f"Comparatif {brand.lower()} vs concurrents"]
    all_brands = [brand] + competitors

    def mention_prob(b):
        rng = random.Random(_brand_seed(b))
        return 0.35 + rng.random() * 0.55

    demo_responses = []
    for i, prompt in enumerate(prompts[:20]):
        brands_in = []
        for b in all_brands:
            base = mention_prob(b)
            rng  = random.Random(_brand_seed(b) + i * 997)
            adj  = base + (rng.random() - 0.5) * 0.15
            if random.Random(_brand_seed(b) + i * 13).random() < adj:
                brands_in.append(b)
        brands_in.sort(key=lambda b: _brand_seed(b))
        positions   = {b: idx + 1 for idx, b in enumerate(brands_in)}
        first_brand = brands_in[0] if brands_in else None
        analysis = {
            'brands_mentioned': brands_in, 'positions': positions, 'first_brand': first_brand,
            'matmut_mentioned': brand in brands_in, 'brand_mentioned': brand in brands_in,
            'brand_position': positions.get(brand), 'matmut_position': positions.get(brand),
        }
        demo_responses.append({'category': 'general', 'prompt': prompt,
                                'llm_analyses': {'ollama': {'response': f'[Demo {i+1}]', 'analysis': analysis}}})
    return {'timestamp': datetime.now().isoformat(), 'total_prompts': len(demo_responses),
            'llms_used': ['ollama'], 'brand': brand, 'competitors': competitors,
            'responses': demo_responses, 'is_demo': True}


def _run_real_or_demo(brand, competitors, prompts, limit=6, use_parallel=True):
    try:
        from llm_client import LLMClient
        llm_client = LLMClient()
        if not llm_client.clients:
            raise Exception("Pas de modèle disponible")
        all_brands = [brand] + competitors
        az         = BrandAnalyzer(brands=all_brands)
        responses  = []
        if use_parallel:
            all_resp = llm_client.query_all_parallel(prompts[:limit], max_workers=3)
            for prompt in prompts[:limit]:
                text = all_resp.get(prompt, '')
                analyses = {model: {'response': text, 'analysis': az.analyze_response(text)}
                            for model in llm_client.models}
                responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
        else:
            for prompt in prompts[:limit]:
                all_model_resp = llm_client.query_all(prompt)
                analyses = {model: {'response': text, 'analysis': az.analyze_response(text)}
                            for model, text in all_model_resp.items()}
                responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
        return {'timestamp': datetime.now().isoformat(), 'total_prompts': limit,
                'llms_used': llm_client.models, 'brand': brand,
                'competitors': competitors, 'responses': responses, 'is_demo': False}
    except Exception as e:
        print(f"[ANALYSIS] Fallback demo — {e}")
        return generate_demo_data(brand, competitors, prompts[:limit])


def _save_and_alert(results, brand):
    _save_results(results)
    save_analysis(results)
    try:
        all_analyses = [d['analysis'] for r in results['responses']
                        for d in r['llm_analyses'].values()]
        all_brands   = [brand] + results.get('competitors', [])
        az      = BrandAnalyzer(brands=all_brands)
        metrics = az.calculate_metrics(all_analyses)
        ranking = az.generate_ranking(metrics)

        # Sprint 5 : sauvegarder le snapshot
        brand_data = metrics.get(brand, {})
        brand_rank = next((r['rank'] for r in ranking if r['brand'] == brand), 0)
        upsert_project_metrics(
            brand=brand, rank=brand_rank,
            global_score=brand_data.get('global_score', 0),
            mention_rate=brand_data.get('mention_rate', 0),
            avg_position=brand_data.get('avg_position', 0),
            top_of_mind=brand_data.get('top_of_mind', 0),
            competitors=results.get('competitors', [])
        )

        if ranking and ranking[0]['brand'] != brand:
            leader   = ranking[0]
            gap      = leader['global_score'] - brand_data.get('global_score', 0)
            new_rank = next((r['rank'] for r in ranking if r['brand'] == brand), None)
            alert_rank_lost(brand, leader['brand'], gap, new_rank or 0)
    except Exception as e:
        print(f"[ALERT/SNAPSHOT] {e}")


# ── Routes existantes (Sprints 1→4) ──────────────────────────────────────────

@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'online', 'version': '2.5', 'message': 'GEO Monitor API Sprint 5'})

@app.route('/api/health', methods=['GET'])
def health():
    uptime_sec = int((datetime.now() - START_TIME).total_seconds())
    uptime_str = f"{uptime_sec // 3600}h {(uptime_sec % 3600) // 60}m {uptime_sec % 60}s"
    weasyprint_ok = False
    try:
        import weasyprint; weasyprint_ok = True
    except ImportError:
        pass
    return jsonify({'status': 'ok', 'version': '2.5', 'sprint': 5,
                    'uptime': uptime_str, 'timestamp': datetime.now().isoformat(),
                    'features': {'pdf_export': weasyprint_ok, 'streaming': True,
                                 'alerts': True, 'prompt_compare': True,
                                 'multi_project': True}})

@app.route('/api/status', methods=['GET'])
def status():
    llm_status = {}
    try:
        from llm_client import LLMClient
        llm_status = LLMClient().get_active_models()
    except Exception as e:
        llm_status = {'error': str(e)}
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat(),
                    'llm_status': llm_status,
                    'system_ready': bool(llm_status) and 'error' not in llm_status})

@app.route('/api/projects', methods=['GET'])
def list_projects():
    return jsonify(get_all_projects())

@app.route('/api/generate-config', methods=['POST'])
def generate_config():
    import re as re_mod, json as json_mod
    data = request.get_json() or {}
    brand, sector = data.get('brand', 'Marque'), data.get('sector', 'Autre')
    try:
        from llm_client import LLMClient
        client = LLMClient()
        if not client.api_key or not client.clients:
            raise Exception("Pas de clé API")
        prompt = (f'Pour la marque "{brand}" dans le secteur "{sector}", génère un JSON STRICT :\n'
                  '{"products":[{"id":"p1","name":"...","description":"...","prompts":["...","..."]}],'
                  '"suggested_competitors":["...","...","...","...","..."]}\n'
                  '3 produits, 5 vrais concurrents. UNIQUEMENT LE JSON.')
        text = client.query_ollama(prompt)
        if not text:
            raise ValueError("Réponse vide")
        match = re_mod.search(r'\{.*\}', text, re_mod.DOTALL)
        if not match:
            raise ValueError("Pas de JSON")
        return jsonify({'status': 'success', 'config': json_mod.loads(match.group())})
    except Exception as e:
        config = {
            'products': [
                {'id': 'p1', 'name': f'{brand} Base', 'description': 'Offre Essentielle',
                 'prompts': [f'Meilleur {sector} pas cher', f'Comparatif {sector} basique']},
                {'id': 'p2', 'name': f'{brand} Max', 'description': 'Offre Premium',
                 'prompts': [f'Top {sector} haut de gamme', f'Meilleure offre {sector}']},
                {'id': 'p3', 'name': f'{brand} Pro', 'description': 'Offre Pro',
                 'prompts': [f'{sector} pour entreprise', f'Comparatif pro {sector}']},
            ],
            'suggested_competitors': ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D', 'Concurrent E']
        }
        return jsonify({'status': 'fallback', 'config': config, 'error': str(e)})

@app.route('/api/run-analysis', methods=['POST'])
def run_analysis():
    start        = time.time()
    data         = request.get_json() or {}
    brand        = data.get('brand', 'Marque')
    competitors  = data.get('competitors', [])
    prompts      = data.get('prompts', [])
    limit        = data.get('limit', min(len(prompts), 6) if prompts else 6)
    use_parallel = data.get('parallel', True)
    use_demo     = data.get('demo', False)
    if use_demo or not prompts:
        results = generate_demo_data(brand, competitors, prompts)
        _save_results(results)
        return jsonify({'status': 'success', 'is_demo': True,
                        'timestamp': results['timestamp'],
                        'duration': round(time.time() - start, 2)})
    results = _run_real_or_demo(brand, competitors, prompts, limit, use_parallel)
    _save_and_alert(results, brand)
    try:
        upsert_project(brand, data.get('sector', ''), competitors, prompts,
                       results.get('llms_used', ['qwen3.5']))
    except Exception as e:
        print(f"[PROJECT] {e}")
    return jsonify({'status': 'success', 'is_demo': results.get('is_demo', False),
                    'timestamp': results['timestamp'],
                    'duration': round(time.time() - start, 2)})

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
        start         = time.time()
        llm_client    = None
        active_models = ['demo']
        if not use_demo and prompts:
            try:
                from llm_client import LLMClient
                llm_client    = LLMClient()
                active_models = llm_client.models if llm_client.clients else ['demo']
                if not llm_client.clients:
                    llm_client = None
            except Exception:
                llm_client = None
        is_demo = llm_client is None
        yield _sse('start', {'brand': brand, 'total_prompts': limit,
                              'models': active_models, 'is_demo': is_demo})
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
                text = f'[Demo {i+1}]'
                analyses = {'ollama': {'response': text, 'analysis': {
                    'brands_mentioned': brands_in,
                    'positions':        {b: idx+1 for idx, b in enumerate(brands_in)},
                    'first_brand':      brands_in[0] if brands_in else None,
                    'matmut_mentioned': brand in brands_in, 'brand_mentioned': brand in brands_in,
                    'brand_position':   next((idx+1 for idx, b in enumerate(brands_in) if b == brand), None),
                    'matmut_position':  next((idx+1 for idx, b in enumerate(brands_in) if b == brand), None),
                }}}
            else:
                # Mode réel avec FALLBACK si Ollama timeout/crash
                try:
                    all_model_resp = llm_client.query_all_models_for_prompt(prompt)
                    analyses = {}
                    brands_in = []
                    for model, text in all_model_resp.items():
                        if text:
                            analysis = az.analyze_response(text)
                            analyses[model] = {'response': text, 'analysis': analysis}
                            brands_in = analysis.get('brands_mentioned', [])
                    if not analyses:
                        raise ValueError("Toutes les réponses LLM sont vides")
                except Exception as _llm_err:
                    print(f"[STREAM] LLM error prompt {i+1}: {_llm_err} — fallback demo")
                    brands_in = []
                    for b in all_brands:
                        rng = random.Random(_brand_seed(b) + i * 997)
                        if rng.random() < (0.35 + random.Random(_brand_seed(b)).random() * 0.55):
                            brands_in.append(b)
                    brands_in.sort(key=lambda b: _brand_seed(b))
                    _demo_analysis = {
                        'brands_mentioned': brands_in,
                        'positions': {b: idx+1 for idx, b in enumerate(brands_in)},
                        'first_brand': brands_in[0] if brands_in else None,
                        'matmut_mentioned': brand in brands_in,
                        'brand_mentioned': brand in brands_in,
                        'brand_position': next((idx+1 for idx, b in enumerate(brands_in) if b == brand), None),
                        'matmut_position': next((idx+1 for idx, b in enumerate(brands_in) if b == brand), None),
                    }
                    analyses = {'ollama': {'response': f'[Fallback {i+1}]', 'analysis': _demo_analysis}}
                    # brands_in déjà défini dans le bloc except
            brand_pos = next((analyses[m]['analysis'].get('brand_position')
                              for m in analyses if analyses[m]['analysis'].get('brand_position')), None)
            responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
            yield _sse('progress', {
                'current': i+1, 'total': limit, 'prompt': prompt,
                'brands_found': brands_in, 'brand_mentioned': brand in brands_in,
                'brand_position': brand_pos,
                'duration_ms': round((time.time() - prompt_start) * 1000)
            })
        results = {'timestamp': datetime.now().isoformat(), 'total_prompts': limit,
                   'llms_used': active_models, 'brand': brand,
                   'competitors': competitors, 'responses': responses, 'is_demo': is_demo}
        try:
            _save_and_alert(results, brand)
        except Exception as e:
            print(f"[STREAM] save_and_alert error: {e}")
        try:
            upsert_project(brand, sector, competitors, prompts, active_models)
        except Exception:
            pass
        yield _sse('complete', {'timestamp': results['timestamp'],
                                'is_demo': is_demo, 'duration': round(time.time() - start, 2)})

    return Response(stream_with_context(generate_events()),
                    content_type='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no',
                             'Connection': 'keep-alive'})

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    results = _load_results()
    if not results:
        results = generate_demo_data()
        _save_results(results)
    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    az          = BrandAnalyzer(brands=[brand]+competitors if competitors else None)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    cat_data: dict = {}
    for response in results['responses']:
        cat = response.get('category', 'general')
        cat_data.setdefault(cat, [])
        for d in response['llm_analyses'].values():
            cat_data[cat].append(d['analysis'])
    category_data = {}
    for cat, analyses in cat_data.items():
        cm = az.calculate_metrics(analyses)
        category_data[cat] = {b: cm[b]['mention_rate'] for b in cm}
    return jsonify({'metrics': metrics, 'ranking': ranking, 'insights': insights,
                    'category_data': category_data,
                    'metadata': {'brand': brand, 'competitors': competitors,
                                 'total_prompts': results['total_prompts'],
                                 'total_analyses': len(all_analyses),
                                 'timestamp': results['timestamp'],
                                 'is_demo': results.get('is_demo', False),
                                 'models_used': results.get('llms_used', ['qwen3.5'])}})

@app.route('/api/metrics/by-model', methods=['GET'])
def get_metrics_by_model():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée — lancez une analyse'}), 404
    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    az          = BrandAnalyzer(brands=[brand]+competitors if competitors else None)
    report      = az.get_full_confidence_report(results['responses'], main_brand=brand)
    rankings_by_model = {model: az.generate_ranking(metrics)
                         for model, metrics in report['by_model'].items()}
    return jsonify({'by_model': report['by_model'], 'rankings_by_model': rankings_by_model,
                    'confidence': report['confidence'],
                    'main_brand_confidence': report['main_brand_confidence'],
                    'models': list(report['by_model'].keys()), 'brand': brand,
                    'metadata': {'timestamp': results['timestamp'],
                                 'is_demo': results.get('is_demo', False),
                                 'total_prompts': results['total_prompts']}})

@app.route('/api/history', methods=['GET'])
def get_history_data():
    brand    = request.args.get('brand')
    model    = request.args.get('model')
    use_demo = request.args.get('demo', 'false').lower() == 'true'
    if use_demo:
        results = _load_results()
        b = results.get('brand', brand or 'Marque') if results else (brand or 'Marque')
        c = results.get('competitors', []) if results else []
        return jsonify(generate_demo_history(b, c))
    history = get_history(brand=brand, model=model)
    if not history:
        results = _load_results()
        b = results.get('brand', brand or 'Marque') if results else (brand or 'Marque')
        c = results.get('competitors', []) if results else []
        return jsonify(generate_demo_history(b, c))
    return jsonify(history)

@app.route('/api/export', methods=['GET'])
def export_json():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée'}), 404
    brand      = results.get('brand', 'Marque')
    az         = BrandAnalyzer(brands=[brand]+results.get('competitors', []))
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    return jsonify({'generated_at': datetime.now().isoformat(), 'brand': brand,
                    'ranking': ranking, 'insights': insights, 'full_metrics': metrics})

@app.route('/api/export/pdf', methods=['GET'])
def export_pdf():
    fmt     = request.args.get('format', 'pdf')
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
        return jsonify({'error': str(e), 'hint': 'pip install weasyprint'}), 500

@app.route('/api/export/pdf/check', methods=['GET'])
def check_pdf_support():
    try:
        import weasyprint
        return jsonify({'available': True, 'version': weasyprint.__version__})
    except ImportError:
        return jsonify({'available': False,
                        'install': 'pip install weasyprint --break-system-packages',
                        'fallback': 'GET /api/export/pdf?format=html'})

@app.route('/api/prompts/compare', methods=['GET'])
def compare_prompts():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée — lancez une analyse'}), 404
    brand       = results.get('brand', 'Marque')
    prompt_stats = []
    for response in results['responses']:
        prompt = response.get('prompt', '')
        if not prompt:
            continue
        analyses = [d['analysis'] for d in response['llm_analyses'].values()]
        total    = len(analyses)
        if not total:
            continue
        mentions = sum(1 for a in analyses if brand in a.get('brands_mentioned', []))
        mpct     = round(mentions / total * 100, 1)
        positions = [a['positions'].get(brand) for a in analyses if a['positions'].get(brand) is not None]
        avg_pos   = round(sum(positions) / len(positions), 2) if positions else None
        first_cnt = sum(1 for a in analyses if a.get('first_brand') == brand)
        tom       = round(first_cnt / total * 100, 1)
        comp_m    = {}
        for a in analyses:
            for b in a.get('brands_mentioned', []):
                if b != brand:
                    comp_m[b] = comp_m.get(b, 0) + 1
        score = mpct * 0.5 + (100 / avg_pos if avg_pos else 0) * 0.3 + tom * 0.2
        prompt_stats.append({'prompt': prompt, 'mention_rate': mpct, 'avg_position': avg_pos,
                              'top_of_mind': tom, 'brand_mentioned': mentions > 0,
                              'brand_position': positions[0] if positions else None,
                              'competitors_mentioned': sorted(comp_m, key=lambda x: -comp_m[x])[:3],
                              'models_count': total, 'score': round(score, 1)})
    prompt_stats.sort(key=lambda x: -x['score'])
    return jsonify({'brand': brand, 'prompts': prompt_stats,
                    'best_prompt':  prompt_stats[0]['prompt']  if prompt_stats else None,
                    'worst_prompt': prompt_stats[-1]['prompt'] if prompt_stats else None,
                    'total_prompts': len(prompt_stats),
                    'metadata': {'timestamp': results['timestamp'],
                                 'is_demo': results.get('is_demo', False),
                                 'models': results.get('llms_used', ['qwen3.5'])}})

@app.route('/api/alerts/status', methods=['GET'])
def alerts_status():
    return jsonify({
        'slack':    {'configured': bool(os.environ.get('SLACK_WEBHOOK_URL')), 'channel': 'webhook'},
        'email':    {'configured': all([os.environ.get(k) for k in ['SMTP_HOST','SMTP_USER','SMTP_PASS','ALERT_EMAIL']]),
                     'recipient': os.environ.get('ALERT_EMAIL', '—'), 'host': os.environ.get('SMTP_HOST', '—')},
        'telegram': {'configured': all([os.environ.get('TELEGRAM_BOT_TOKEN'), os.environ.get('TELEGRAM_CHAT_ID')]),
                     'chat_id':   os.environ.get('TELEGRAM_CHAT_ID', '—')}
    })

@app.route('/api/alerts/test', methods=['POST'])
def test_alert():
    data    = request.get_json() or {}
    channel = data.get('channel', 'all')
    message = data.get('message', '🧪 Test GEO Monitor.')
    results = {}
    from alerts import send_slack_alert as _sl, send_email_alert as _em, send_telegram_alert as _tg
    if channel in ('all', 'slack'):    results['slack']    = _sl(message)
    if channel in ('all', 'email'):    results['email']    = _em("Test GEO Monitor", message)
    if channel in ('all', 'telegram'): results['telegram'] = _tg(message)
    success = any(results.values())
    return jsonify({'status': 'success' if success else 'failed', 'results': results,
                    'message': 'OK' if success else 'Aucun canal configuré'})

@app.route('/api/alerts/weekly', methods=['POST'])
def trigger_weekly():
    try:
        _scheduled_weekly_summary()
        return jsonify({'status': 'success', 'message': 'Résumé hebdo envoyé'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ── SPRINT 5 — Multi-projets ──────────────────────────────────────────────────

@app.route('/api/projects/dashboard', methods=['GET'])
def projects_dashboard():
    """
    Vue agrégée de tous les projets enregistrés avec leurs métriques.

    Response:
    {
      "projects": [
        {
          "brand":        "Nike",
          "sector":       "Sport",
          "rank":         1,
          "global_score": 72.5,
          "mention_rate": 85.0,
          "avg_position": 1.5,
          "top_of_mind":  42.0,
          "competitors":  ["Adidas", "Puma"],
          "last_analysis": "2026-03-18T10:00:00",
          "has_data":     true
        },
        ...
      ],
      "total": 3,
      "leader": "Nike"
    }
    """
    projects = get_all_projects_with_metrics()

    if not projects:
        # Données démo si aucun projet
        projects = _demo_dashboard_projects()

    leader = None
    if projects:
        sorted_by_score = sorted(projects, key=lambda p: p.get('global_score') or 0, reverse=True)
        leader = sorted_by_score[0].get('brand') if sorted_by_score[0].get('global_score') else None

    return jsonify({
        'projects': projects,
        'total':    len(projects),
        'leader':   leader
    })


@app.route('/api/projects/<string:brand>', methods=['DELETE'])
def delete_project_route(brand: str):
    """Supprime un projet et toutes ses données."""
    try:
        deleted = delete_project(brand)
        if deleted:
            return jsonify({'status': 'success', 'message': f'Projet {brand} supprimé'})
        return jsonify({'status': 'not_found', 'message': f'Projet {brand} introuvable'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/projects/<string:brand>/metrics', methods=['GET'])
def get_project_metrics(brand: str):
    """Métriques du dernier snapshot pour un projet spécifique."""
    snapshot = get_project_snapshot(brand)
    if not snapshot:
        return jsonify({'error': f'Aucune donnée pour {brand} — lancez une analyse'}), 404
    return jsonify(snapshot)


@app.route('/api/projects/<string:brand>/refresh', methods=['POST'])
def refresh_project(brand: str):
    """
    Relance l'analyse pour un projet existant.
    Utile depuis le dashboard multi-projets.
    """
    data    = request.get_json() or {}
    use_sse = data.get('stream', False)

    # Récupérer la config du projet
    projects = get_all_projects()
    project  = next((p for p in projects if p['brand'] == brand), None)

    if not project:
        return jsonify({'error': f'Projet {brand} introuvable'}), 404

    competitors = project.get('competitors', [])
    prompts     = project.get('prompts', [])

    if not prompts:
        return jsonify({'error': f'Aucun prompt configuré pour {brand}'}), 400

    if use_sse:
        # Streaming mode
        all_brands = [brand] + competitors
        az         = BrandAnalyzer(brands=all_brands)

        def generate_events():
            start_t = time.time()
            llm_client    = None
            active_models = ['demo']
            try:
                from llm_client import LLMClient
                llm_client    = LLMClient()
                active_models = llm_client.models if llm_client.clients else ['demo']
                if not llm_client.clients:
                    llm_client = None
            except Exception:
                llm_client = None
            is_demo = llm_client is None
            limit   = min(len(prompts), 6)
            yield _sse('start', {'brand': brand, 'total_prompts': limit,
                                  'models': active_models, 'is_demo': is_demo})
            responses = []
            for i, prompt in enumerate(prompts[:limit]):
                if is_demo:
                    time.sleep(0.3)
                    brands_in = [b for b in all_brands
                                 if random.Random(_brand_seed(b) + i * 997).random() <
                                 (0.35 + random.Random(_brand_seed(b)).random() * 0.55)]
                    brands_in.sort(key=lambda b: _brand_seed(b))
                    analyses = {'ollama': {'response': f'[Demo {i+1}]', 'analysis': {
                        'brands_mentioned': brands_in,
                        'positions': {b: idx+1 for idx, b in enumerate(brands_in)},
                        'first_brand': brands_in[0] if brands_in else None,
                        'matmut_mentioned': brand in brands_in, 'brand_mentioned': brand in brands_in,
                        'brand_position': next((idx+1 for idx, b in enumerate(brands_in) if b == brand), None),
                        'matmut_position': next((idx+1 for idx, b in enumerate(brands_in) if b == brand), None),
                    }}}
                else:
                    all_model_resp = llm_client.query_all_models_for_prompt(prompt)
                    analyses    = {}
                    brands_in   = []
                    for model, text in all_model_resp.items():
                        analysis = az.analyze_response(text)
                        analyses[model] = {'response': text, 'analysis': analysis}
                        brands_in = analysis.get('brands_mentioned', [])
                brand_pos = next((analyses[m]['analysis'].get('brand_position')
                                  for m in analyses if analyses[m]['analysis'].get('brand_position')), None)
                responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
                yield _sse('progress', {
                    'current': i+1, 'total': limit, 'prompt': prompt,
                    'brands_found': brands_in, 'brand_mentioned': brand in brands_in,
                    'brand_position': brand_pos,
                    'duration_ms': round((time.time() - start_t) * 1000)
                })
            results = {'timestamp': datetime.now().isoformat(), 'total_prompts': limit,
                       'llms_used': active_models, 'brand': brand,
                       'competitors': competitors, 'responses': responses, 'is_demo': is_demo}
            _save_and_alert(results, brand)
            yield _sse('complete', {'timestamp': results['timestamp'],
                                    'is_demo': is_demo, 'duration': round(time.time() - start_t, 2)})

        return Response(stream_with_context(generate_events()),
                        content_type='text/event-stream',
                        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no',
                                 'Connection': 'keep-alive'})
    else:
        # Mode synchrone
        start_t = time.time()
        results = _run_real_or_demo(brand, competitors, prompts, limit=6)
        _save_and_alert(results, brand)
        return jsonify({'status': 'success', 'brand': brand,
                        'is_demo': results.get('is_demo', False),
                        'timestamp': results['timestamp'],
                        'duration': round(time.time() - start_t, 2)})


def _demo_dashboard_projects():
    """Données démo pour le dashboard multi-projets."""
    import random as rnd
    brands = [
        ('Nike',    'Sport',    ['Adidas', 'Puma', 'New Balance']),
        ('Adidas',  'Sport',    ['Nike', 'Puma', 'Reebok']),
        ('Zara',    'Mode',     ['H&M', 'Uniqlo', 'Mango']),
    ]
    projects = []
    for brand, sector, comps in brands:
        seed = abs(hash(brand)) % (2**31)
        rng  = rnd.Random(seed)
        mr   = round(30 + rng.random() * 55, 1)
        pos  = round(1.2 + rng.random() * 4, 2)
        score = round(mr * 0.4 + (100 / pos if pos else 0) * 0.3, 1)
        projects.append({
            'brand': brand, 'sector': sector, 'competitors': comps,
            'rank': 1, 'global_score': score, 'mention_rate': mr,
            'avg_position': pos, 'top_of_mind': round(mr * 0.4, 1),
            'last_analysis': datetime.now().isoformat(), 'has_data': True,
            'is_demo': True
        })
    projects.sort(key=lambda p: -p['global_score'])
    for i, p in enumerate(projects):
        p['rank'] = i + 1
    return projects


# ── Démarrage ─────────────────────────────────────────────────────────────────

scheduler = None

if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    if not debug:
        scheduler = _start_scheduler()
    print(f"\n[INFO] GEO Monitor v2.5 — Sprint 5 — http://localhost:{port}")
    print(f"   GET  /api/projects/dashboard      → vue multi-projets")
    print(f"   DELETE /api/projects/:brand        → supprimer un projet")
    print(f"   GET  /api/projects/:brand/metrics  → snapshot métriques")
    print(f"   POST /api/projects/:brand/refresh  → relancer l'analyse")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
