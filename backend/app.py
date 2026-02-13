"""
API Flask pour le dashboard GEO Matmut
Inclut des données de démo pour fonctionner sans API keys
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime
from analyzer import BrandAnalyzer
from prompts import ALL_PROMPTS, PROMPTS, BRANDS

app = Flask(__name__)
CORS(app)

# Initialize DB
from database import init_db, save_analysis, get_history, generate_demo_history
from alerts import send_slack_alert
init_db()

# Initialisation
analyzer = BrandAnalyzer()

# Stockage des résultats
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RESULTS_FILE = os.path.join(DATA_DIR, 'results.json')


def ensure_data_dir():
    """Crée le dossier data s'il n'existe pas"""
    os.makedirs(DATA_DIR, exist_ok=True)


def load_results():
    """Charge les résultats depuis le fichier"""
    ensure_data_dir()
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def save_results(data):
    """Sauvegarde les résultats dans le fichier"""
    ensure_data_dir()
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_demo_data():
    """Génère des données de démo réalistes pour le dashboard"""
    import random
    random.seed(42)  # Reproductible
    
    demo_responses = []
    
    # Simuler 20 prompts avec des résultats réalistes
    for i, prompt_data in enumerate(ALL_PROMPTS[:20]):
        # Réponses simulées par LLM
        llm_analyses = {}
        
        for llm_name in ['chatgpt', 'claude', 'gemini', 'deepseek']:
            # Simuler quelles marques sont mentionnées
            mentioned = []
            
            # Probabilités réalistes de mention
            brand_probs = {
                'MAIF': 0.85, 'AXA': 0.82, 'Matmut': 0.68,
                'MACIF': 0.72, 'Groupama': 0.70, 'GMF': 0.65,
                'Allianz': 0.60, 'MMA': 0.55, 'MACSF': 0.45,
                'Generali': 0.40, 'AG2R': 0.35, 'APRIL': 0.25
            }
            
            # Ajuster par catégorie
            category = prompt_data['category']
            if category == 'mutuelle_sante':
                brand_probs['Matmut'] = 0.75
                brand_probs['MACSF'] = 0.80
            elif category == 'assurance_auto':
                brand_probs['Matmut'] = 0.72
                brand_probs['MACIF'] = 0.80
            elif category == 'assurance_pro':
                brand_probs['Matmut'] = 0.45
                brand_probs['AXA'] = 0.90
                brand_probs['Allianz'] = 0.75
            
            brands_in_response = []
            for brand in BRANDS:
                prob = brand_probs.get(brand, 0.3)
                # Add some randomness per LLM
                adjusted = prob + random.uniform(-0.15, 0.15)
                if random.random() < adjusted:
                    brands_in_response.append(brand)
            
            # Shuffle pour les positions
            random.shuffle(brands_in_response)
            
            # Construire l'analyse
            positions = {brand: idx + 1 for idx, brand in enumerate(brands_in_response)}
            first_brand = brands_in_response[0] if brands_in_response else None
            matmut_pos = positions.get('Matmut', None)
            
            analysis = {
                'brands_mentioned': brands_in_response,
                'positions': positions,
                'first_brand': first_brand,
                'matmut_mentioned': 'Matmut' in brands_in_response,
                'matmut_position': matmut_pos
            }
            
            llm_analyses[llm_name] = {
                'response': f'[Réponse simulée du {llm_name} pour: {prompt_data["prompt"]}]',
                'analysis': analysis
            }
        
        demo_responses.append({
            'category': prompt_data['category'],
            'prompt': prompt_data['prompt'],
            'llm_analyses': llm_analyses
        })
    
    return {
        'timestamp': datetime.now().isoformat(),
        'total_prompts': 20,
        'llms_used': ['chatgpt', 'claude'],
        'responses': demo_responses,
        'is_demo': True
    }


@app.route('/', methods=['GET'])
def index():
    """Route racine pour éviter le 404"""
    return jsonify({
        'status': 'online',
        'message': 'Matmut GEO Dashboard API is running',
        'endpoints': {
            'status': '/api/status',
            'analysis': '/api/run-analysis',
            'metrics': '/api/metrics'
        }
    })


@app.route('/api/status', methods=['GET'])
def status():
    """Vérifie le statut de l'API"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'llms_configured': True # Todo: check actual keys
    })


@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    """Retourne la liste des prompts par catégorie"""
    return jsonify(PROMPTS)


@app.route('/api/run-analysis', methods=['POST'])
def run_analysis():
    """
    Lance l'analyse complète
    Paramètres:
        - limit: nombre de prompts à tester (optionnel, défaut: 10)
        - llms: liste des LLMs à utiliser (optionnel, défaut: tous)
        - demo: utiliser données de démo (optionnel, défaut: false)
    """
    data = request.get_json() or {}
    use_demo = data.get('demo', False)
    
    if use_demo:
        results = generate_demo_data()
        save_results(results)
        return jsonify({
            'status': 'success',
            'message': 'Demo analysis completed with 20 prompts',
            'timestamp': results['timestamp'],
            'is_demo': True
        })
    
    limit = data.get('limit', 10)
    # Default to available clients is handled in llm_client, but we can pass preference
    requested_llms = data.get('llms', ['chatgpt', 'claude', 'gemini', 'deepseek'])
    
    # Essayer d'importer le client LLM
    try:
        from llm_client import LLMClient
        llm_client = LLMClient()
        use_llms = [llm for llm in requested_llms if llm in llm_client.clients]
        
        if not use_llms:
            raise Exception("No LLM clients available (check .env)")
            
    except Exception as e:
        # Fallback: générer des données démo
        print(f"LLM Client init failed ({e}), using demo data...")
        results = generate_demo_data()
        save_results(results)
        return jsonify({
            'status': 'success',
            'message': 'Demo analysis completed (API keys not configured)',
            'timestamp': results['timestamp'],
            'is_demo': True
        })
    
    print(f"Starting analysis with {limit} prompts...")
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'total_prompts': limit,
        'llms_used': use_llms,
        'responses': []
    }
    
    # Tester les prompts
    for i, prompt_data in enumerate(ALL_PROMPTS[:limit]):
        print(f"\nPrompt {i+1}/{limit}: {prompt_data['prompt']}")
        
        # Interroger les LLMs
        llm_responses = llm_client.query_all(prompt_data['prompt'])
        
        # Analyser chaque réponse
        analyses = {}
        for llm_name, response_text in llm_responses.items():
            if llm_name in use_llms:
                analysis = analyzer.analyze_response(response_text)
                analyses[llm_name] = {
                    'response': response_text,
                    'analysis': analysis
                }
        
        results['responses'].append({
            'category': prompt_data['category'],
            'prompt': prompt_data['prompt'],
            'llm_analyses': analyses
        })
    
    # Sauvegarder
    save_results(results)
    
    # Save to SQLite History
    if not use_demo:
        save_analysis(results)
        
    # Slack Alert Check
    # On recalcule rapidement le ranking pour vérifier
    try:
        analyses = []
        for response in results['responses']:
            for llm_name, data in response['llm_analyses'].items():
                analyses.append(data['analysis'])
        metrics = analyzer.calculate_metrics(analyses)
        ranking = analyzer.generate_ranking(metrics)
        
        if ranking and ranking[0]['brand'] != 'Matmut':
            leader = ranking[0]['brand']
            gap = ranking[0]['global_score'] - metrics.get('Matmut', {}).get('global_score', 0)
            msg = f"⚠️ *Alerte Position*: Matmut n'est plus en tête !\nLeader actuel: *{leader}* (Score: {ranking[0]['global_score']})\nÉcart: -{round(gap, 1)} pts"
            send_slack_alert(msg)
    except Exception as e:
        print(f"Error checking slack alert: {e}")
    
    return jsonify({
        'status': 'success',
        'message': f'Analysis completed for {limit} prompts',
        'timestamp': results['timestamp']
    })


@app.route('/api/history', methods=['GET'])
def get_history_data():
    """Récupère l'historique pour le graphique d'évolution"""
    use_demo = request.args.get('demo', 'false').lower() == 'true'
    
    if use_demo:
        return jsonify(generate_demo_history())
        
    history = get_history()
    if not history:
        return jsonify(generate_demo_history())
        
    return jsonify(history)


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Calcule et retourne les métriques globales"""
    results = load_results()
    
    if not results:
        # Auto-generate demo data if no results exist
        results = generate_demo_data()
        save_results(results)
    
    # Agréger les analyses de tous les LLMs
    all_analyses = []
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            all_analyses.append(data['analysis'])
    
    # Calculer métriques
    metrics = analyzer.calculate_metrics(all_analyses)
    ranking = analyzer.generate_ranking(metrics)
    insights = analyzer.generate_insights(metrics, ranking)
    
    # Métriques par catégorie
    category_metrics = {}
    for response in results['responses']:
        cat = response['category']
        if cat not in category_metrics:
            category_metrics[cat] = []
        for llm_name, data in response['llm_analyses'].items():
            category_metrics[cat].append(data['analysis'])
    
    category_data = {}
    for cat, analyses in category_metrics.items():
        cat_metrics = analyzer.calculate_metrics(analyses)
        category_data[cat] = {brand: cat_metrics[brand]['mention_rate'] for brand in cat_metrics}
    
    return jsonify({
        'metrics': metrics,
        'ranking': ranking,
        'insights': insights,
        'category_data': category_data,
        'metadata': {
            'total_prompts': results['total_prompts'],
            'total_analyses': len(all_analyses),
            'timestamp': results['timestamp'],
            'is_demo': results.get('is_demo', False)
        }
    })


@app.route('/api/details', methods=['GET'])
def get_details():
    """Retourne les détails complets avec breakdown par LLM"""
    results = load_results()
    
    if not results:
        return jsonify({'error': 'No data available'}), 404
    
    # Métriques par LLM
    by_llm = {}
    
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            if llm_name not in by_llm:
                by_llm[llm_name] = []
            by_llm[llm_name].append(data['analysis'])
    
    # Calculer métriques pour chaque LLM
    llm_metrics = {}
    for llm_name, analyses in by_llm.items():
        llm_metrics[llm_name] = {
            'metrics': analyzer.calculate_metrics(analyses),
            'ranking': analyzer.generate_ranking(analyzer.calculate_metrics(analyses))
        }
    
    return jsonify({
        'by_llm': llm_metrics,
        'raw_responses': results['responses']
    })


@app.route('/api/export', methods=['GET'])
def export_report():
    """Exporte un rapport complet en JSON"""
    results = load_results()
    
    if not results:
        return jsonify({'error': 'No data available'}), 404
    
    # Agréger
    all_analyses = []
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            all_analyses.append(data['analysis'])
    
    metrics = analyzer.calculate_metrics(all_analyses)
    ranking = analyzer.generate_ranking(metrics)
    insights = analyzer.generate_insights(metrics, ranking)
    
    report = {
        'generated_at': datetime.now().isoformat(),
        'data_timestamp': results['timestamp'],
        'executive_summary': {
            'matmut_rank': insights['rank'],
            'total_brands_tracked': len(ranking),
            'total_prompts_tested': results['total_prompts']
        },
        'ranking': ranking,
        'insights': insights,
        'full_metrics': metrics
    }
    
    return jsonify(report)


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True') == 'True'
    
    print(f"\n[INFO] Matmut GEO Dashboard API")
    print(f"   Server: http://localhost:{port}")
    print(f"   Endpoints:")
    print(f"     GET  /api/status      - Health check")
    print(f"     GET  /api/metrics     - Get metrics & ranking")
    print(f"     POST /api/run-analysis - Run analysis")
    print(f"     GET  /api/details     - Detailed breakdown by LLM")
    print(f"     GET  /api/export      - Export full report")
    print(f"")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
