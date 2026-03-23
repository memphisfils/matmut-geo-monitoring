"""
API Flask — GEO Monitor Sprint 4
Nouveautés :
  - GET  /api/export/pdf     → rapport PDF complet (WeasyPrint)
  - GET  /api/export/pdf/check → vérifie disponibilité WeasyPrint
  - GET  /api/health         → health check enrichi (version, uptime)
  - POST /api/run-analysis/stream → streaming SSE
"""
from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
import json
import os
import random
import time
from datetime import datetime
from analyzer import BrandAnalyzer

load_dotenv()

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://geo-monitoring.vercel.app",
    "https://geo-monitoring-frontend.onrender.com",
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=False)

from database import (init_db, save_analysis, get_history,
                      generate_demo_history, upsert_project, get_all_projects)
from alerts import send_alert, alert_rank_lost, alert_weekly_summary, send_slack_alert
from prompts import build_geo_prompt, GEO_SYSTEM_PROMPT, generate_benchmark_prompt
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
    metrics = az.calculate_metrics(all_analyses)
    ranking = az.generate_ranking(metrics)
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
        print("[SCHEDULER] Actif — analyse 6h + résumé hebdo lundi 09h")
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
            data = json.load(f)
        print(f"[LOAD] results.json lu : {data.get('total_prompts')} prompts, is_demo={data.get('is_demo')}, brand={data.get('brand')}")
        return data
    print(f"[LOAD] results.json inexistant")
    return None

def _save_results(data):
    _ensure_data_dir()
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[SAVE] results.json écrit : {data.get('total_prompts')} prompts, is_demo={data.get('is_demo')}")

def _brand_seed(b):
    return abs(hash(b)) % (2**31)

def _sse(event_type: str, data: dict) -> str:
    payload = json.dumps({'type': event_type, **data}, ensure_ascii=False)
    return f"data: {payload}\n\n"

def _build_full_report_data(results, brand):
    """Construit les données complètes pour le rapport PDF."""
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors
    az          = BrandAnalyzer(brands=all_brands)

    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)

    # Prompt stats
    prompt_stats = []
    for response in results['responses']:
        prompt = response.get('prompt', '')
        if not prompt:
            continue
        analyses_for_prompt = [d['analysis'] for d in response['llm_analyses'].values()]
        total_models = len(analyses_for_prompt)
        if total_models == 0:
            continue
        mentions    = sum(1 for a in analyses_for_prompt if brand in a.get('brands_mentioned', []))
        mention_pct = round(mentions / total_models * 100, 1)
        positions   = [a['positions'].get(brand) for a in analyses_for_prompt
                       if a['positions'].get(brand) is not None]
        avg_pos     = round(sum(positions) / len(positions), 2) if positions else None
        first_counts = sum(1 for a in analyses_for_prompt if a.get('first_brand') == brand)
        top_of_mind  = round(first_counts / total_models * 100, 1)
        comp_mentions = {}
        for a in analyses_for_prompt:
            for b in a.get('brands_mentioned', []):
                if b != brand:
                    comp_mentions[b] = comp_mentions.get(b, 0) + 1
        score = (mention_pct * 0.5 + (100 / avg_pos if avg_pos else 0) * 0.3 + top_of_mind * 0.2)
        prompt_stats.append({
            'prompt': prompt, 'mention_rate': mention_pct, 'avg_position': avg_pos,
            'top_of_mind': top_of_mind, 'brand_mentioned': mentions > 0,
            'brand_position': positions[0] if positions else None,
            'competitors_mentioned': sorted(comp_mentions, key=lambda x: -comp_mentions[x])[:3],
            'models_count': total_models, 'score': round(score, 1)
        })
    prompt_stats.sort(key=lambda x: -x['score'])

    # Confiance LLM
    confidence_data = None
    try:
        report = az.get_full_confidence_report(results['responses'], main_brand=brand)
        confidence_data = report.get('confidence')
    except Exception:
        pass

    metadata = {
        'timestamp':   results.get('timestamp', datetime.now().isoformat()),
        'is_demo':     results.get('is_demo', False),
        'models_used': results.get('llms_used', ['qwen3.5']),
    }

    return metrics, ranking, insights, prompt_stats, confidence_data, metadata


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
            base_seed = _brand_seed(b)
            base = mention_prob(b)  # Calcule la probabilité de base (0.35-0.9)
            rng  = random.Random(base_seed + i * 997)
            adj  = base + (rng.random() - 0.5) * 0.15
            if random.Random(base_seed + i * 13).random() < adj:
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
                text     = all_resp.get(prompt, '')
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
        if ranking and ranking[0]['brand'] != brand:
            leader   = ranking[0]
            gap      = leader['global_score'] - metrics.get(brand, {}).get('global_score', 0)
            new_rank = next((r['rank'] for r in ranking if r['brand'] == brand), None)
            alert_rank_lost(brand, leader['brand'], gap, new_rank or 0)
    except Exception as e:
        print(f"[ALERT] {e}")


# ── Routes Sprint 1 / 2 / 3 ───────────────────────────────────────────────────

@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'online', 'version': '2.4', 'message': 'GEO Monitor API Sprint 4'})

@app.route('/api/health', methods=['GET'])
def health():
    uptime_sec = int((datetime.now() - START_TIME).total_seconds())
    uptime_str = f"{uptime_sec // 3600}h {(uptime_sec % 3600) // 60}m {uptime_sec % 60}s"
    weasyprint_ok = False
    try:
        import weasyprint
        weasyprint_ok = True
    except ImportError:
        pass
    return jsonify({'status': 'ok', 'version': '2.4', 'sprint': 4,
                    'uptime': uptime_str, 'timestamp': datetime.now().isoformat(),
                    'features': {'pdf_export': weasyprint_ok, 'streaming': True,
                                 'alerts': True, 'prompt_compare': True}})

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
    """Génère produits et concurrents via LLM. Pas de fallback - tout par IA."""
    import re as re_mod, json as json_mod
    data   = request.get_json() or {}
    brand  = data.get('brand', 'Marque')
    sector = data.get('sector', 'Autre')

    if not brand or not sector:
        return jsonify({'status': 'error', 'error': 'Marque et secteur requis'}), 400

    try:
        from llm_client import LLMClient
        client = LLMClient()
        if not client.api_key or not client.clients:
            raise Exception("Pas de clé API")

        # Appel direct avec think=False pour éviter le timeout
        import requests as req
        # Prompts comparatifs: {{brand}} vs concurrents + requetes SEO habituelles
        competitors_list = [f"[CONCURRENTS]"] * 5  # Placeholder, LLM génère les noms
        prompt_llm = (
            f'Pour "{brand}" dans le secteur "{sector}", génère un JSON strict avec :\n'
            f'- 3 produits avec id, name, description, prompts SEO comparatifs (qui mentionnent {brand} ET d\'autres marques)\n'
            f'- 5 vrais concurrents du secteur\n'
            f'Les prompts SEO doivent être du type "Meilleur [produit] {sector} : {brand} vs [autres]" ou "Comparatif [produit] {sector} : [marques]" '
            f'pour forcer l\'IA à mentionner plusieurs marques.\n'
            f'Format: {{"products":[{{"id":"p1","name":"...","description":"...","prompts":["prompt1 vs2...","prompt2..."]}}],"suggested_competitors":["C1","C2","C3","C4","C5"]}}\n'
            f'JSON uniquement.'
        )
        resp = req.post(
            f"{client.base_url}/chat",
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {client.api_key}'
            },
            json={
                'model': client.models[0],
                'messages': [{'role': 'user', 'content': prompt_llm}],
                'think': False,
                'stream': False
            },
            timeout=50
        )
        resp.raise_for_status()
        text = resp.json().get('message', {}).get('content', '')
        if not text:
            raise ValueError("Réponse LLM vide")

        # Extraction JSON flexible
        match = re_mod.search(r'\{[\s\S]*\}', text, re_mod.DOTALL)
        if not match:
            raise ValueError("Pas de JSON dans la réponse")

        config = json_mod.loads(match.group())

        # Validation minimale
        if 'products' not in config or 'suggested_competitors' not in config:
            raise ValueError("JSON incomplet")
        if len(config.get('products', [])) < 1:
            raise ValueError("Aucun produit")
        if len(config.get('suggested_competitors', [])) < 1:
            raise ValueError("Aucun concurrent")

        return jsonify({'status': 'success', 'config': config})

    except Exception as e:
        print(f"[generate-config] Erreur LLM: {e}")
        # Plus de fallback - on retourne une erreur claire
        return jsonify({
            'status': 'error',
            'error': f'Génération IA impossible: {str(e)}. Veuillez réessayer ou saisir manuellement.'
        }), 500


@app.route('/api/benchmark', methods=['POST'])
def create_benchmark():
    """
    Génère une configuration de benchmark multi-marques.
    Les marques sont comparées ensemble sur les mêmes produits/prompts.
    """
    data = request.get_json() or {}
    brands = data.get('brands', [])

    if not brands or len(brands) < 2:
        return jsonify({
            'status': 'error',
            'error': 'Minimum 2 marques requises pour un benchmark'
        }), 400

    try:
        from llm_client import LLMClient
        client = LLMClient()
        if not client.api_key or not client.clients:
            raise Exception("Pas de clé API")

        prompt = generate_benchmark_prompt(brands)

        import requests as req
        resp = req.post(
            f"{client.base_url}/chat",
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {client.api_key}'
            },
            json={
                'model': client.models[0],
                'messages': [{'role': 'user', 'content': prompt}],
                'think': False,
                'stream': False
            },
            timeout=60
        )
        resp.raise_for_status()
        text = resp.json().get('message', {}).get('content', '')

        if not text:
            raise ValueError("Réponse LLM vide")

        import re as re_mod, json as json_mod
        match = re_mod.search(r'\{[\s\S]*\}', text, re_mod.DOTALL)
        if not match:
            raise ValueError("Pas de JSON dans la réponse")

        config = json_mod.loads(match.group())

        # Validation
        if 'products' not in config or 'seo_prompts' not in config:
            raise ValueError("JSON incomplet")

        return jsonify({
            'status': 'success',
            'benchmark': {
                'sector': config.get('sector', 'Générique'),
                'brands': brands,
                'products': config.get('products', []),
                'prompts': config.get('seo_prompts', []),
                'all_brands': brands  # Toutes les marques = le benchmark complet
            }
        })

    except Exception as e:
        print(f"[benchmark] Erreur: {e}")
        return jsonify({
            'status': 'error',
            'error': f'Génération benchmark impossible: {str(e)}'
        }), 500


@app.route('/api/run-benchmark/stream', methods=['POST'])
def run_benchmark_stream():
    """
    Lance une analyse pour un benchmark multi-marques.
    Toutes les marques sont analysées ensemble avec les mêmes prompts.
    """
    data = request.get_json() or {}
    benchmark_name = data.get('name', 'Benchmark')
    brands = data.get('brands', [])  # Liste des marques du benchmark
    prompts = data.get('prompts', [])
    limit = data.get('limit', min(len(prompts), 6) if prompts else 6)
    use_demo = data.get('demo', False)

    if len(brands) < 2:
        return jsonify({'error': 'Minimum 2 marques requises'}), 400

    # Le "brand" principal est la première marque (pour compatibilité)
    main_brand = brands[0]
    competitors = brands[1:]

    print(f"[BENCHMARK] {benchmark_name}: {brands}, prompts={len(prompts)}, limit={limit}")

    all_brands = brands  # TOUTES les marques = le benchmark
    az = BrandAnalyzer(brands=all_brands)
    geo_system = build_geo_prompt(all_brands)

    def generate_events():
        start_time = time.time()
        llm_client = None
        active_models = ['demo']
        llm_failures = 0
        MAX_FAILURES = 3
        MAX_TIME_PER_PROMPT = 50

        if not use_demo and prompts:
            try:
                from llm_client import LLMClient
                llm_client = LLMClient()
                active_models = llm_client.models if llm_client.clients else ['demo']
                if not llm_client.clients:
                    llm_client = None
            except Exception:
                llm_client = None

        is_demo = llm_client is None

        # Test Ollama avant la boucle
        if not is_demo and llm_client:
            try:
                _ping = llm_client.query_model("ok", llm_client.models[0], use_cache=False)
                if not _ping:
                    raise ValueError("vide")
            except Exception as _e:
                print(f"[BENCHMARK] Ping Ollama échoué ({_e}) → démo")
                is_demo = True
                llm_client = None
                active_models = ['demo']

        yield _sse('start', {
            'name': benchmark_name,
            'brands': all_brands,
            'total_prompts': limit,
            'models': active_models,
            'is_demo': is_demo,
            'mode': 'benchmark'
        })

        responses = []

        for i, prompt in enumerate(prompts[:limit]):
            prompt_start = time.time()
            elapsed_total = time.time() - start_time

            print(f"[BENCHMARK] Prompt {i+1}/{limit} — elapsed: {elapsed_total:.1f}s")

            if is_demo:
                print(f"[BENCHMARK] Prompt {i+1}/{limit} — MODE DÉMO")
                brands_in = all_brands[:]
                rng = random.Random(i * 997)
                rng.shuffle(brands_in)
                text = f'[Demo {i+1}]'
                analyses = {'demo': {'response': text, 'analysis': {
                    'brands_mentioned': brands_in,
                    'positions': {b: idx+1 for idx, b in enumerate(brands_in)},
                    'first_brand': brands_in[0] if brands_in else None,
                    'main_brand_mentioned': main_brand in brands_in,
                }}}
            else:
                elapsed_prompt = time.time() - prompt_start

                if elapsed_prompt > MAX_TIME_PER_PROMPT:
                    print(f"[BENCHMARK] Timeout prompt {i+1} → démo")
                    llm_failures += 1
                    brands_in = all_brands[:]
                    random.shuffle(brands_in)
                    analyses = {'ollama': {'response': f'[Timeout {i+1}]', 'analysis': {
                        'brands_mentioned': brands_in,
                        'positions': {b: idx+1 for idx, b in enumerate(brands_in)},
                        'first_brand': brands_in[0],
                        'main_brand_mentioned': main_brand in brands_in,
                    }}}
                else:
                    try:
                        print(f"[BENCHMARK] Prompt {i+1}/{limit} — Appel LLM...")
                        all_model_resp = llm_client.query_all_models_for_prompt(prompt, system_prompt=geo_system)
                        analyses = {}
                        brands_in = []
                        for model, text in all_model_resp.items():
                            if text:
                                analysis = az.analyze_response(text)
                                analyses[model] = {'response': text, 'analysis': analysis}
                                brands_in = analysis.get('brands_mentioned', [])
                                print(f"[BENCHMARK]   → {model}: OK {len(text)} chars, brands={brands_in}")
                            else:
                                print(f"[BENCHMARK]   → {model}: X réponse vide")

                        if not analyses:
                            raise ValueError("Toutes les réponses LLM sont vides")

                        llm_failures = 0
                    except BaseException as _llm_err:
                        if isinstance(_llm_err, SystemExit):
                            return
                        llm_failures += 1
                        brands_in = all_brands[:]
                        analyses = {'ollama': {'response': f'[Error {i+1}]', 'analysis': {
                            'brands_mentioned': brands_in,
                            'positions': {b: idx+1 for idx, b in enumerate(brands_in)},
                            'first_brand': brands_in[0],
                            'main_brand_mentioned': main_brand in brands_in,
                        }}}

            responses.append({
                'prompt': prompt,
                'llm_analyses': analyses
            })

            yield _sse('progress', {
                'current': i + 1,
                'total': limit,
                'prompt': prompt[:100],
                'brands_mentioned': brands_in if 'brands_in' in dir() else [],
                'brand_position': next((idx+1 for idx, b in enumerate(brands_in if 'brands_in' in dir() else []) if b == main_brand), None),
                'elapsed': time.time() - start_time,
                'is_demo': is_demo
            })

            if llm_failures >= MAX_FAILURES:
                print(f"[BENCHMARK] {MAX_FAILURES} échecs → mode démo forcé")
                is_demo = True

        results = {
            'timestamp': datetime.now().isoformat(),
            'total_prompts': limit,
            'llms_used': active_models,
            'name': benchmark_name,
            'brands': all_brands,
            'main_brand': main_brand,
            'competitors': competitors,
            'responses': responses,
            'is_demo': is_demo,
            'mode': 'benchmark'
        }

        _save_results(results)
        save_analysis(results)

        yield _sse('complete', {
            'timestamp': results['timestamp'],
            'total_prompts': limit,
            'is_demo': is_demo,
            'results': results
        })

    return Response(
        stream_with_context(generate_events()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


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
    
    # DEBUG : log des données reçues
    print(f"[STREAM] Reçu : brand={brand}, prompts={len(prompts)}, demo={use_demo}")
    
    all_brands   = [brand] + competitors
    az           = BrandAnalyzer(brands=all_brands)

    # Construire le system prompt GEO avec le benchmark de marques
    geo_system = build_geo_prompt(all_brands)

    def generate_events():
        start         = time.time()
        llm_client    = None
        active_models = ['demo']
        llm_failures  = 0  # Compteur d'échecs LLM
        MAX_FAILURES  = 3  # Après 3 échecs → mode démo forcé (était 2)
        MAX_TIME_PER_PROMPT = 50  # secondes

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

        # NOUVEAU : test Ollama UNE fois avant la boucle (fail fast)
        if not is_demo and llm_client:
            try:
                _ping = llm_client.query_model(
                    "ok", llm_client.models[0], use_cache=False
                )
                if not _ping:
                    raise ValueError("vide")
            except Exception as _e:
                print(f"[STREAM] Ping Ollama échoué ({_e}) → démo")
                is_demo = True
                llm_client = None
                active_models = ['demo']

        yield _sse('start', {'brand': brand, 'total_prompts': limit,
                              'models': active_models, 'is_demo': is_demo})
        responses = []

        for i, prompt in enumerate(prompts[:limit]):
            prompt_start = time.time()
            elapsed_total = time.time() - start
            
            print(f"[STREAM] Prompt {i+1}/{limit} début — elapsed: {elapsed_total:.1f}s")

            # TIMEOUT GLOBAL : si on dépasse limit * MAX_TIME_PER_PROMPT, fallback démo
            if elapsed_total > limit * MAX_TIME_PER_PROMPT:
                print(f"[STREAM] Timeout global ({elapsed_total:.0f}s > {limit * MAX_TIME_PER_PROMPT}s) → fallback démo")
                is_demo = True
                active_models = ['demo']

            if is_demo:
                print(f"[STREAM] Prompt {i+1}/{limit} — MODE DÉMO (is_demo=True)")
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
                elapsed_prompt = time.time() - prompt_start
                
                # TIMEOUT PAR PROMPT : si > MAX_TIME_PER_PROMPT, fallback démo
                if elapsed_prompt > MAX_TIME_PER_PROMPT:
                    print(f"[STREAM] Timeout prompt {i+1} ({elapsed_prompt:.0f}s > {MAX_TIME_PER_PROMPT}s) → fallback démo")
                    llm_failures += 1
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
                    analyses = {'ollama': {'response': f'[Timeout {i+1}]', 'analysis': _demo_analysis}}
                else:
                    try:
                        print(f"[STREAM] Prompt {i+1}/{limit} — Appel LLM en cours...")
                        all_model_resp = llm_client.query_all_models_for_prompt(prompt, system_prompt=geo_system)
                        analyses = {}
                        brands_in = []
                        for model, text in all_model_resp.items():
                            if text:
                                analysis = az.analyze_response(text)
                                analyses[model] = {'response': text, 'analysis': analysis}
                                brands_in = analysis.get('brands_mentioned', [])
                                print(f"[STREAM]   → {model}: ✓ {len(text)} chars, brands={brands_in}")
                                print(f"[STREAM]   → TEXT sample: {text[:300]}")
                            else:
                                print(f"[STREAM]   → {model}: ✗ réponse vide")
                        
                        if not analyses:
                            print(f"[STREAM] Prompt {i+1}/{limit} — ÉCHEC: Aucune réponse LLM valide")
                            raise ValueError("Toutes les réponses LLM sont vides")
                        
                        print(f"[STREAM] Prompt {i+1}/{limit} — ✓ VALIDÉ (brands: {brands_in})")
                        llm_failures = 0  # Reset counter on success
                    except BaseException as _llm_err:
                        # Attrape aussi SystemExit levé par Gunicorn/sys.exit(1)
                        if isinstance(_llm_err, SystemExit):
                            print(f"[STREAM] Prompt {i+1}/{limit} — SystemExit (Gunicorn kill)")
                            return  # Gunicorn kill propre
                        llm_failures += 1
                        print(f"[STREAM] Prompt {i+1}/{limit} — ✗ ÉCHEC LLM: {_llm_err} (failures={llm_failures}/{MAX_FAILURES})")

                        # FORCE DEMO MODE après 2 échecs
                        if llm_failures >= MAX_FAILURES:
                            print(f"[STREAM] ⚠ {MAX_FAILURES} échecs LLM → passage en mode démo forcé pour les prompts restants")
                            is_demo = True
                            active_models = ['demo']

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
                        print(f"[STREAM] Prompt {i+1}/{limit} — ↻ FALLBACK DÉMO (brands: {brands_in})")

            brand_pos = next(
                (analyses[m]['analysis'].get('brand_position')
                 for m in analyses if analyses[m]['analysis'].get('brand_position')), None)
            responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})

            yield _sse('progress', {
                'current': i+1, 'total': limit, 'prompt': prompt,
                'brands_found': brands_in, 'brand_mentioned': brand in brands_in,
                'brand_position': brand_pos,
                'duration_ms': round((time.time() - prompt_start) * 1000)
            })
            
            print(f"[STREAM] Prompt {i+1}/{limit} terminé — duration: {time.time() - prompt_start:.1f}s")

        results = {'timestamp': datetime.now().isoformat(), 'total_prompts': limit,
                   'llms_used': active_models, 'brand': brand,
                   'competitors': competitors, 'responses': responses, 'is_demo': is_demo}
        _save_and_alert(results, brand)
        print(f"[STREAM] ✓ Sauvegarde terminée — {limit} prompts, is_demo={is_demo}")
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
    print(f"[METRICS] Appel de /api/metrics")
    
    # Essayer de charger results.json — s'il n'existe pas, attendre et réessayer
    # Ça évite de générer des données démo pendant qu'un streaming est en cours
    results = None
    for attempt in range(5):  # 5 tentatives × 2s = 10s max
        results = _load_results()
        if results:
            print(f"[METRICS] results.json trouvé après {attempt+1} tentative(s)")
            break
        print(f"[METRICS] results.json inexistant — attente 2s (tentative {attempt+1}/5)")
        time.sleep(2)
    
    if not results:
        print(f"[METRICS] results.json toujours vide → génération démo")
        results = generate_demo_data()
        _save_results(results)

    brand       = results.get('brand') or results.get('main_brand', 'Marque')
    # Support mode benchmark: brands est la liste complete
    if results.get('brands') and len(results.get('brands', [])) > 0:
        all_brands = results.get('brands')
        competitors = results.get('brands', [])[1:] if len(results.get('brands', [])) > 1 else []
    elif results.get('mode') == 'benchmark':
        all_brands = [brand] + results.get('competitors', [])
        competitors = results.get('competitors', [])
    else:
        competitors = results.get('competitors', [])
        all_brands = [brand] + competitors if competitors else None
    az          = BrandAnalyzer(brands=all_brands)
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
    brand       = results.get('brand') or results.get('main_brand', 'Marque')
    # Support mode benchmark
    if results.get('brands') and len(results.get('brands', [])) > 0:
        all_brands = results.get('brands')
    else:
        competitors = results.get('competitors', [])
        all_brands = [brand] + competitors if competitors else None
    az          = BrandAnalyzer(brands=all_brands)
    report = az.get_full_confidence_report(results['responses'], main_brand=brand)
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
    all_brands = [brand] + results.get('competitors', [])
    az         = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    return jsonify({'generated_at': datetime.now().isoformat(), 'brand': brand,
                    'ranking': ranking, 'insights': insights, 'full_metrics': metrics})

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
        analyses_for_prompt = [d['analysis'] for d in response['llm_analyses'].values()]
        total_models = len(analyses_for_prompt)
        if total_models == 0:
            continue
        mentions    = sum(1 for a in analyses_for_prompt if brand in a.get('brands_mentioned', []))
        mention_pct = round(mentions / total_models * 100, 1)
        positions   = [a['positions'].get(brand) for a in analyses_for_prompt
                       if a['positions'].get(brand) is not None]
        avg_pos     = round(sum(positions) / len(positions), 2) if positions else None
        first_counts = sum(1 for a in analyses_for_prompt if a.get('first_brand') == brand)
        top_of_mind  = round(first_counts / total_models * 100, 1)
        comp_mentions = {}
        for a in analyses_for_prompt:
            for b in a.get('brands_mentioned', []):
                if b != brand:
                    comp_mentions[b] = comp_mentions.get(b, 0) + 1
        comps_list = [b for b, _ in sorted(comp_mentions.items(), key=lambda x: -x[1])[:3]]
        score = (mention_pct * 0.5 + (100 / avg_pos if avg_pos and avg_pos > 0 else 0) * 0.3 + top_of_mind * 0.2)
        prompt_stats.append({'prompt': prompt, 'mention_rate': mention_pct, 'avg_position': avg_pos,
                              'top_of_mind': top_of_mind, 'brand_mentioned': mentions > 0,
                              'brand_position': positions[0] if positions else None,
                              'competitors_mentioned': comps_list, 'models_count': total_models,
                              'score': round(score, 1)})
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
                     'chat_id': os.environ.get('TELEGRAM_CHAT_ID', '—')}
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


# ── SPRINT 4 — Export PDF ────────────────────────────────────────────────────

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
        metrics, ranking, insights, prompt_stats, confidence_data, metadata = \
            _build_full_report_data(results, brand)

        content, content_type = generate_report(
            brand=brand, ranking=ranking, metrics=metrics,
            insights=insights, prompt_stats=prompt_stats,
            confidence=confidence_data, metadata=metadata,
            output_format=fmt
        )

        date_str = datetime.now().strftime('%Y-%m-%d')

        if content_type == 'application/pdf':
            filename = f"geo-{brand.lower().replace(' ','-')}-{date_str}.pdf"
        else:
            filename = f"geo-{brand.lower().replace(' ','-')}-{date_str}.html"

        return Response(
            content,
            content_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(content))
            }
        )

    except Exception as e:
        print(f"[PDF] Erreur génération : {e}")
        return jsonify({'error': str(e), 'hint': 'pip install weasyprint --break-system-packages'}), 500


@app.route('/api/export/pdf/check', methods=['GET'])
def check_pdf_support():
    try:
        import weasyprint
        return jsonify({'available': True, 'version': weasyprint.__version__})
    except ImportError:
        return jsonify({
            'available': False,
            'install': 'pip install weasyprint --break-system-packages',
            'fallback': 'Le format HTML est disponible via ?format=html'
        })




# ── Démarrage ─────────────────────────────────────────────────────────────────

scheduler = None

if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    if not debug:
        scheduler = _start_scheduler()
    print(f"\n[INFO] GEO Monitor v2.4 — Sprint 4 — http://localhost:{port}")
    print(f"   GET /api/export/pdf       → Rapport PDF (WeasyPrint)")
    print(f"   GET /api/export/pdf?format=html → Rapport HTML (fallback)")
    print(f"   GET /api/export/pdf/check → Vérifier WeasyPrint")
    print(f"   GET /api/health           → Health check enrichi")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
