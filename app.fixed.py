"""
API Flask pour GEO Monitor - Plateforme générique de monitoring de visibilité IA
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime
from analyzer import BrandAnalyzer

app = Flask(__name__)

# ← FIX CORS : autorise les domaines de production
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    # Vercel
    "https://geo-monitoring.vercel.app",
    # Render frontend
    "https://geo-monitoring-frontend.onrender.com",
    # Wildcard Vercel previews
    "https://*.vercel.app",
]

CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=False)

from database import init_db, save_analysis, get_history, generate_demo_history
from alerts import send_slack_alert
init_db()

analyzer = BrandAnalyzer()

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RESULTS_FILE = os.path.join(DATA_DIR, 'results.json')


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def load_results():
    ensure_data_dir()
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def save_results(data):
    ensure_data_dir()
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_demo_data(brand='Marque', competitors=None, prompts=None):
    import random
    random.seed(hash(brand) % 2**32)

    if not competitors:
        competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D']
    if not prompts:
        prompts = [f"Meilleur service {brand.lower()} ?", f"Comparatif {brand.lower()} vs concurrents"]

    all_brands = [brand] + competitors
    demo_responses = []

    for i, prompt in enumerate(prompts[:20]):
        llm_analyses = {}
        for llm_name in ['ollama']:
            brands_in_response = []
            for b in all_brands:
                base_prob = 0.75 if b == brand else random.uniform(0.4, 0.85)
                if random.random() < base_prob:
                    brands_in_response.append(b)

            random.shuffle(brands_in_response)
            positions = {b: idx + 1 for idx, b in enumerate(brands_in_response)}
            first_brand = brands_in_response[0] if brands_in_response else None

            analysis = {
                'brands_mentioned': brands_in_response,
                'positions': positions,
                'first_brand': first_brand,
                'matmut_mentioned': brand in brands_in_response,
                'brand_mentioned': brand in brands_in_response,
                'brand_position': positions.get(brand, None),
                'matmut_position': positions.get(brand, None)
            }
            llm_analyses[llm_name] = {
                'response': f'[Réponse simulée {llm_name}]',
                'analysis': analysis
            }

        demo_responses.append({
            'category': 'general',
            'prompt': prompt,
            'llm_analyses': llm_analyses
        })

    return {
        'timestamp': datetime.now().isoformat(),
        'total_prompts': len(demo_responses),
        'llms_used': ['ollama'],
        'brand': brand,
        'competitors': competitors,
        'responses': demo_responses,
        'is_demo': True
    }


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'online',
        'message': 'GEO Monitor API v2.0',
        'version': '2.0'
    })


@app.route('/api/status', methods=['GET'])
def status():
    llm_status = {}
    try:
        from llm_client import LLMClient
        client = LLMClient()
        llm_status = client.get_active_models()
    except Exception as e:
        llm_status = {'error': str(e)}

    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'llm_status': llm_status,
        'system_ready': len(llm_status) > 0 and 'error' not in llm_status
    })


@app.route('/api/generate-config', methods=['POST'])
def generate_config():
    import re

    data = request.get_json() or {}
    brand = data.get('brand', 'Marque')
    sector = data.get('sector', 'Autre')

    print(f"[CONFIG] Generating config for {brand} ({sector})...")

    try:
        from llm_client import LLMClient
        llm_client = LLMClient()

        if not llm_client.api_key:
            raise Exception("OLLAMA_API_KEY not configured")

        if 'ollama' not in llm_client.clients:
            raise Exception("Ollama client not available")

        prompt = f"""Tu es un expert en analyse de marché et GEO.
Pour la marque "{brand}" dans le secteur "{sector}", génère un JSON STRICT :

{{
  "products": [
    {{"id": "p1", "name": "Nom 1", "description": "Description courte", "prompts": ["prompt 1", "prompt 2"]}},
    {{"id": "p2", "name": "Nom 2", "description": "Description courte", "prompts": ["prompt 1", "prompt 2"]}},
    {{"id": "p3", "name": "Nom 3", "description": "Description courte", "prompts": ["prompt 1", "prompt 2"]}}
  ],
  "suggested_competitors": ["Concurrent 1", "Concurrent 2", "Concurrent 3", "Concurrent 4", "Concurrent 5"]
}}

Réponds UNIQUEMENT avec le JSON, rien d'autre."""

        response_text = llm_client.query_ollama(prompt)

        if not response_text:
            raise ValueError("Empty response from Ollama")

        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            import json as json_module
            config = json_module.loads(json_match.group())
            return jsonify({'status': 'success', 'config': config})
        else:
            raise ValueError("No JSON found in response")

    except Exception as e:
        print(f"[CONFIG] Fallback mode: {e}")
        config = {
            'products': [
                {'id': 'p1', 'name': f'{brand} Base', 'description': 'Offre Essentielle', 'prompts': [f'Meilleur {sector} pas cher', f'Comparatif {sector} basique']},
                {'id': 'p2', 'name': f'{brand} Max', 'description': 'Offre Premium', 'prompts': [f'Top {sector} haut de gamme', f'Meilleure offre {sector}']},
                {'id': 'p3', 'name': f'{brand} Pro', 'description': 'Offre Pro', 'prompts': [f'{sector} pour entreprise', f'Comparatif pro {sector}']}
            ],
            'suggested_competitors': ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D', 'Concurrent E']
        }
        return jsonify({'status': 'fallback', 'config': config, 'error': str(e)})


@app.route('/api/run-analysis', methods=['POST'])
def run_analysis():
    import time
    start_time = time.time()

    data = request.get_json() or {}
    use_demo = data.get('demo', False)
    brand = data.get('brand', 'Marque')
    competitors = data.get('competitors', [])
    prompts = data.get('prompts', [])
    limit = data.get('limit', min(len(prompts), 6) if prompts else 6)
    use_parallel = data.get('parallel', True)

    print(f"\n[ANALYSIS] Starting: '{brand}' | {limit} prompts | parallel={use_parallel}")

    if use_demo or not prompts:
        results = generate_demo_data(brand, competitors, prompts)
        save_results(results)
        return jsonify({
            'status': 'success',
            'message': f'Analyse démo complétée pour {brand}',
            'timestamp': results['timestamp'],
            'is_demo': True,
            'duration': time.time() - start_time
        })

    try:
        from llm_client import LLMClient
        llm_client = LLMClient()
        requested_llms = data.get('llms', ['ollama'])
        use_llms = [llm for llm in requested_llms if llm in llm_client.clients]

        if not use_llms:
            raise Exception("No LLM clients available")

    except Exception as e:
        print(f"[ANALYSIS] LLM unavailable ({e}), using demo data")
        results = generate_demo_data(brand, competitors, prompts[:limit])
        save_results(results)
        return jsonify({
            'status': 'success',
            'message': f'Analyse démo pour {brand}',
            'timestamp': results['timestamp'],
            'is_demo': True,
            'duration': time.time() - start_time
        })

    results = {
        'timestamp': datetime.now().isoformat(),
        'total_prompts': limit,
        'llms_used': use_llms,
        'brand': brand,
        'competitors': competitors,
        'responses': []
    }

    all_brands = [brand] + competitors
    analyzer_instance = BrandAnalyzer(brands=all_brands)

    if use_parallel:
        all_responses = llm_client.query_all_parallel(prompts[:limit], max_workers=3)
        for i, prompt in enumerate(prompts[:limit]):
            response_text = all_responses.get(prompt, '')
            analyses = {}
            for llm_name in use_llms:
                analysis = analyzer_instance.analyze_response(response_text)
                analyses[llm_name] = {'response': response_text, 'analysis': analysis}
            results['responses'].append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})
    else:
        for i, prompt in enumerate(prompts[:limit]):
            llm_responses = llm_client.query_all(prompt)
            analyses = {}
            for llm_name, response_text in llm_responses.items():
                if llm_name in use_llms:
                    analysis = analyzer_instance.analyze_response(response_text)
                    analyses[llm_name] = {'response': response_text, 'analysis': analysis}
            results['responses'].append({'category': 'general', 'prompt': prompt, 'llm_analyses': analyses})

    save_results(results)
    save_analysis(results)

    duration = time.time() - start_time
    print(f"[ANALYSIS] Done in {duration:.2f}s")

    return jsonify({
        'status': 'success',
        'message': f'Analyse terminée pour {brand}',
        'timestamp': results['timestamp'],
        'duration': duration
    })


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    results = load_results()

    if not results:
        results = generate_demo_data()
        save_results(results)

    brand = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    all_brands = [brand] + competitors if competitors else None

    analyzer_dynamic = BrandAnalyzer(brands=all_brands)

    all_analyses = []
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            all_analyses.append(data['analysis'])

    metrics = analyzer_dynamic.calculate_metrics(all_analyses)
    ranking = analyzer_dynamic.generate_ranking(metrics)
    insights = analyzer_dynamic.generate_insights(metrics, ranking, main_brand=brand)

    category_metrics = {}
    for response in results['responses']:
        cat = response.get('category', 'general')
        if cat not in category_metrics:
            category_metrics[cat] = []
        for llm_name, data in response['llm_analyses'].items():
            category_metrics[cat].append(data['analysis'])

    category_data = {}
    for cat, analyses in category_metrics.items():
        cat_metrics = analyzer_dynamic.calculate_metrics(analyses)
        category_data[cat] = {b: cat_metrics[b]['mention_rate'] for b in cat_metrics}

    return jsonify({
        'metrics': metrics,
        'ranking': ranking,
        'insights': insights,
        'category_data': category_data,
        'metadata': {
            'brand': brand,
            'competitors': competitors,
            'total_prompts': results['total_prompts'],
            'total_analyses': len(all_analyses),
            'timestamp': results['timestamp'],
            'is_demo': results.get('is_demo', False)
        }
    })


@app.route('/api/history', methods=['GET'])
def get_history_data():
    use_demo = request.args.get('demo', 'false').lower() == 'true'
    if use_demo:
        return jsonify(generate_demo_history())
    history = get_history()
    if not history:
        return jsonify(generate_demo_history())
    return jsonify(history)


@app.route('/api/export', methods=['GET'])
def export_report():
    results = load_results()
    if not results:
        return jsonify({'error': 'No data available'}), 404

    brand = results.get('brand', 'Marque')
    all_analyses = []
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            all_analyses.append(data['analysis'])

    analyzer_dynamic = BrandAnalyzer(brands=[brand] + results.get('competitors', []))
    metrics = analyzer_dynamic.calculate_metrics(all_analyses)
    ranking = analyzer_dynamic.generate_ranking(metrics)
    insights = analyzer_dynamic.generate_insights(metrics, ranking, main_brand=brand)

    return jsonify({
        'generated_at': datetime.now().isoformat(),
        'brand': brand,
        'ranking': ranking,
        'insights': insights,
        'full_metrics': metrics
    })


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    print(f"\n[INFO] GEO Monitor API v2.0 — http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
