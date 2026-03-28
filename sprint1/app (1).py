"""
API Flask — GEO Monitor Sprint 1
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import random
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

from database import (init_db, save_analysis, get_history,
                      generate_demo_history, upsert_project, get_all_projects)
from alerts import send_slack_alert
init_db()

DATA_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RESULTS_FILE = os.path.join(DATA_DIR, 'results.json')


def _scheduled_analysis():
    projects = get_all_projects()
    if not projects:
        print("[SCHEDULER] Aucun projet")
        return
    for project in projects:
        brand = project.get('brand', '')
        competitors = project.get('competitors', [])
        prompts = project.get('prompts', [])
        if not brand or not prompts:
            continue
        try:
            results = _run_real_or_demo(brand, competitors, prompts, limit=6)
            _save_and_alert(results, brand)
        except Exception as e:
            print(f"[SCHEDULER] {brand} : {e}")


def _start_scheduler():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(_scheduled_analysis, 'interval', hours=6, id='auto_analysis')
        scheduler.start()
        print("[SCHEDULER] Actif — toutes les 6h")
        return scheduler
    except ImportError:
        print("[SCHEDULER] apscheduler non installé")
        return None
    except Exception as e:
        print(f"[SCHEDULER] Erreur : {e}")
        return None


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

def generate_demo_data(brand='Marque', competitors=None, prompts=None):
    if not competitors:
        competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D']
    if not prompts:
        prompts = [f"Meilleur service {brand.lower()} ?", f"Comparatif {brand.lower()} vs concurrents"]

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
            'brands_mentioned': brands_in,
            'positions':        positions,
            'first_brand':      first_brand,
            'matmut_mentioned': brand in brands_in,
            'brand_mentioned':  brand in brands_in,
            'brand_position':   positions.get(brand),
            'matmut_position':  positions.get(brand),
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
                analyses = {}
                for model in llm_client.models:
                    analyses[model] = {'response': text, 'analysis': az.analyze_response(text)}
                responses.append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
        else:
            for prompt in prompts[:limit]:
                all_model_resp = llm_client.query_all(prompt)
                analyses = {}
                for model, text in all_model_resp.items():
                    analyses[model] = {'response': text, 'analysis': az.analyze_response(text)}
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
        all_analyses = [d['analysis'] for r in results['responses'] for d in r['llm_analyses'].values()]
        all_brands   = [brand] + results.get('competitors', [])
        az       = BrandAnalyzer(brands=all_brands)
        metrics  = az.calculate_metrics(all_analyses)
        ranking  = az.generate_ranking(metrics)
        if ranking and ranking[0]['brand'] != brand:
            leader = ranking[0]
            gap    = leader['global_score'] - metrics.get(brand, {}).get('global_score', 0)
            send_slack_alert(f"⚠️ *{brand}* n'est plus #1 ! Leader : *{leader['brand']}* (-{gap:.1f} pts)")
    except Exception as e:
        print(f"[ALERT] {e}")


@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'online', 'version': '2.1', 'message': 'GEO Monitor API Sprint 1'})

@app.route('/api/status', methods=['GET'])
def status():
    llm_status = {}
    try:
        from llm_client import LLMClient
        llm_status = LLMClient().get_active_models()
    except Exception as e:
        llm_status = {'error': str(e)}
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat(),
                    'llm_status': llm_status, 'system_ready': bool(llm_status) and 'error' not in llm_status})

@app.route('/api/projects', methods=['GET'])
def list_projects():
    return jsonify(get_all_projects())

@app.route('/api/generate-config', methods=['POST'])
def generate_config():
    import re as re_mod, json as json_mod
    data   = request.get_json() or {}
    brand  = data.get('brand', 'Marque')
    sector = data.get('sector', 'Autre')
    try:
        from llm_client import LLMClient
        client = LLMClient()
        if not client.api_key or not client.clients:
            raise Exception("Pas de clé API")
        prompt = (f'Pour la marque "{brand}" dans le secteur "{sector}", génère un JSON STRICT :\n'
                  '{"products":[{"id":"p1","name":"...","description":"...","prompts":["...","..."]}],'
                  '"suggested_competitors":["...","...","...","...","..."]}\n'
                  '3 produits, 5 vrais concurrents. UNIQUEMENT LE JSON.')
        text  = client.query_ollama(prompt)
        if not text:
            raise ValueError("Réponse vide")
        match = re_mod.search(r'\{.*\}', text, re_mod.DOTALL)
        if not match:
            raise ValueError("Pas de JSON")
        config = json_mod.loads(match.group())
        return jsonify({'status': 'success', 'config': config})
    except Exception as e:
        config = {
            'products': [
                {'id': 'p1', 'name': f'{brand} Base', 'description': 'Offre Essentielle', 'prompts': [f'Meilleur {sector} pas cher', f'Comparatif {sector} basique']},
                {'id': 'p2', 'name': f'{brand} Max',  'description': 'Offre Premium',     'prompts': [f'Top {sector} haut de gamme', f'Meilleure offre {sector}']},
                {'id': 'p3', 'name': f'{brand} Pro',  'description': 'Offre Pro',          'prompts': [f'{sector} pour entreprise',   f'Comparatif pro {sector}']},
            ],
            'suggested_competitors': ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D', 'Concurrent E']
        }
        return jsonify({'status': 'fallback', 'config': config, 'error': str(e)})

@app.route('/api/run-analysis', methods=['POST'])
def run_analysis():
    import time
    start        = time.time()
    data         = request.get_json() or {}
    brand        = data.get('brand', 'Marque')
    competitors  = data.get('competitors', [])
    prompts      = data.get('prompts', [])
    limit        = data.get('limit', min(len(prompts), 6) if prompts else 6)
    use_parallel = data.get('parallel', True)
    use_demo     = data.get('demo', False)

    print(f"\n[ANALYSIS] {brand} | {limit} prompts")

    if use_demo or not prompts:
        results = generate_demo_data(brand, competitors, prompts)
        _save_results(results)
        return jsonify({'status': 'success', 'is_demo': True, 'timestamp': results['timestamp'],
                        'duration': round(time.time() - start, 2)})

    results = _run_real_or_demo(brand, competitors, prompts, limit, use_parallel)
    _save_and_alert(results, brand)

    try:
        upsert_project(brand, data.get('sector', ''), competitors, prompts, results.get('llms_used', ['qwen3.5']))
    except Exception as e:
        print(f"[PROJECT] {e}")

    return jsonify({'status': 'success', 'is_demo': results.get('is_demo', False),
                    'timestamp': results['timestamp'], 'duration': round(time.time() - start, 2)})

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    results = _load_results()
    if not results:
        results = generate_demo_data()
        _save_results(results)
    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors if competitors else None
    az          = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses'] for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    cat_data: dict = {}
    for response in results['responses']:
        cat = response.get('category', 'general')
        cat_data.setdefault(cat, [])
        for d in response['llm_analyses'].values():
            cat_data[cat].append(d['analysis'])
    category_data = {cat: {b: az.calculate_metrics(a)[b]['mention_rate'] for b in az.calculate_metrics(a)}
                     for cat, a in cat_data.items()}
    return jsonify({'metrics': metrics, 'ranking': ranking, 'insights': insights,
                    'category_data': category_data,
                    'metadata': {'brand': brand, 'competitors': competitors,
                                 'total_prompts': results['total_prompts'],
                                 'total_analyses': len(all_analyses),
                                 'timestamp': results['timestamp'],
                                 'is_demo': results.get('is_demo', False),
                                 'models_used': results.get('llms_used', ['qwen3.5'])}})

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
def export_report():
    results = _load_results()
    if not results:
        return jsonify({'error': 'Aucune donnée'}), 404
    brand      = results.get('brand', 'Marque')
    all_brands = [brand] + results.get('competitors', [])
    az         = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses'] for d in r['llm_analyses'].values()]
    metrics  = az.calculate_metrics(all_analyses)
    ranking  = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)
    return jsonify({'generated_at': datetime.now().isoformat(), 'brand': brand,
                    'ranking': ranking, 'insights': insights, 'full_metrics': metrics})


scheduler = None

if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    if not debug:
        scheduler = _start_scheduler()
    print(f"\n[INFO] GEO Monitor v2.1 — http://localhost:{port}")
    print(f"   Scheduler : {'actif (6h)' if scheduler else 'inactif'}")
    app.run(host='0.0.0.0', port=port, debug=debug)
