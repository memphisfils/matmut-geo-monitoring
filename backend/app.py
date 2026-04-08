"""
API Flask — GEO Monitor Sprint 4
Nouveautés :
  - GET  /api/export/pdf     → rapport PDF complet (WeasyPrint)
  - GET  /api/export/pdf/check → vérifie disponibilité WeasyPrint
  - GET  /api/health         → health check enrichi (version, uptime)
  - POST /api/run-analysis/stream → streaming SSE
"""
from flask import Flask, jsonify, request, Response, stream_with_context, session
from flask_cors import CORS
from dotenv import load_dotenv
import json
import os
import random
import re
import threading
import time
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from services import BrandAnalyzer, LLMClient
from catalogs import get_alert_catalog, get_alert_summary, get_report_catalog, get_report_definition

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY') or os.getenv('SECRET_KEY') or 'geo-monitor-dev-secret'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = bool(os.getenv('RENDER') or os.getenv('FLASK_ENV') == 'production')
app.config['SESSION_COOKIE_NAME'] = 'geo_arctic_session'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024

IS_PRODUCTION = bool(os.getenv('RENDER') or os.getenv('FLASK_ENV') == 'production')
DEFAULT_SECRET_IN_USE = app.config['SECRET_KEY'] == 'geo-monitor-dev-secret'
AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
AUTH_RATE_LIMIT_MAX_ATTEMPTS = 8
_auth_attempts = {}
_auth_attempts_lock = threading.Lock()

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://geo-monitoring.vercel.app",
    "https://geo-monitoring-frontend.onrender.com",
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=True)

from models import (init_db, save_analysis, get_history, get_previous_prompt_run,
                   generate_demo_history, upsert_project, get_all_projects, get_project_by_id,
                   create_user, get_user_by_id, get_user_by_email, get_user_by_google_sub,
                   update_user_login, attach_google_identity, get_alert_preferences,
                   upsert_alert_channel_setting, upsert_alert_rule_setting)
from alerts import send_alert, alert_rank_lost, alert_weekly_summary, send_slack_alert
from utils import build_geo_prompt, GEO_SYSTEM_PROMPT, generate_benchmark_prompt
init_db()

DATA_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RESULTS_FILE = os.path.join(DATA_DIR, 'results.json')
RESULTS_SNAPSHOTS_DIR = os.path.join(DATA_DIR, 'results_by_brand')
START_TIME   = datetime.now()
scheduler = None

PROMPT_INTENT_RULES = [
    ('comparaison', 'Comparaison', re.compile(r'(comparatif|compare|vs|alternative|alternatives|meilleur .* ou)', re.I)),
    ('prix', 'Prix', re.compile(r'(prix|tarif|pas cher|cher|rapport qualite|budget)', re.I)),
    ('reassurance', 'Reassurance', re.compile(r'(avis|fiable|confiance|service client|garantie|serieux)', re.I)),
    ('decouverte', 'Decouverte', re.compile(r'(meilleur|top|quelle|quels|recommande|qui choisir)', re.I)),
]


def _normalize_email(value: str) -> str:
    return (value or '').strip().lower()


def _client_ip():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _auth_scope_key(scope: str, email: str = ''):
    return f"{scope}:{_client_ip()}:{_normalize_email(email)}"


def _is_rate_limited(scope: str, email: str = ''):
    key = _auth_scope_key(scope, email)
    now = time.time()
    with _auth_attempts_lock:
        attempts = [stamp for stamp in _auth_attempts.get(key, []) if now - stamp < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        _auth_attempts[key] = attempts
        return len(attempts) >= AUTH_RATE_LIMIT_MAX_ATTEMPTS


def _register_failed_attempt(scope: str, email: str = ''):
    key = _auth_scope_key(scope, email)
    now = time.time()
    with _auth_attempts_lock:
        attempts = [stamp for stamp in _auth_attempts.get(key, []) if now - stamp < AUTH_RATE_LIMIT_WINDOW_SECONDS]
        attempts.append(now)
        _auth_attempts[key] = attempts


def _clear_failed_attempts(scope: str, email: str = ''):
    key = _auth_scope_key(scope, email)
    with _auth_attempts_lock:
        _auth_attempts.pop(key, None)


def _rate_limited_response():
    return jsonify({
        'error': 'Trop de tentatives. Reessayez plus tard.',
        'retry_after_seconds': AUTH_RATE_LIMIT_WINDOW_SECONDS
    }), 429


def _origin_allowed(origin: str):
    return not origin or origin in ALLOWED_ORIGINS


def _security_warnings():
    warnings = []
    if DEFAULT_SECRET_IN_USE:
        warnings.append('default_secret_key')
    if not app.config.get('SESSION_COOKIE_SECURE'):
        warnings.append('session_cookie_not_secure')
    if not os.getenv('ALERT_SETTINGS_ENCRYPTION_KEY') and DEFAULT_SECRET_IN_USE:
        warnings.append('alert_settings_key_not_set')
    return warnings


@app.before_request
def enforce_request_security():
    if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        origin = request.headers.get('Origin')
        if not _origin_allowed(origin):
            return jsonify({'error': 'Origin non autorisee'}), 403


@app.after_request
def apply_security_headers(response):
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    if app.config.get('SESSION_COOKIE_SECURE'):
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    if request.path.startswith('/api/auth') or request.path.startswith('/api/session'):
        response.headers['Cache-Control'] = 'no-store'
    return response


def _public_user(user: dict = None):
    if not user:
        return None
    return {
        'id': user.get('id'),
        'name': user.get('name'),
        'email': user.get('email'),
        'auth_provider': user.get('auth_provider'),
        'avatar_url': user.get('avatar_url'),
        'created_at': user.get('created_at'),
        'last_login_at': user.get('last_login_at')
    }


def _set_user_session(user: dict):
    session.clear()
    session.permanent = True
    session['user_id'] = user.get('id')
    session['email'] = user.get('email')
    session['auth_provider'] = user.get('auth_provider')


def _current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return get_user_by_id(user_id)


def _require_auth():
    user = _current_user()
    if not user:
        return None, (jsonify({'authenticated': False, 'error': 'Authentication required'}), 401)
    return user, None


def _latest_project_for_user(user_id: int):
    projects = get_all_projects(user_id=user_id)
    return projects[0] if projects else None


def _resolve_results_for_request(requested_brand: str = None, user_id: int = None):
    if requested_brand:
        return _load_results(requested_brand, user_id=user_id)

    if user_id is not None:
        project = _project_from_request(user_id)
        if project:
            return _load_results(project.get('brand'), user_id=user_id)
        return None

    return _load_results()


def _active_or_latest_project(user_id: int):
    active_project_id = session.get('active_project_id')
    if active_project_id:
        project = get_project_by_id(active_project_id, user_id=user_id)
        if project:
            return project
    return _latest_project_for_user(user_id)


def _project_from_request(user_id: int):
    project_id = request.args.get('project_id')
    if project_id is None and request.view_args:
        project_id = request.view_args.get('project_id')
    if project_id:
        try:
            project = get_project_by_id(int(project_id), user_id=user_id)
        except (TypeError, ValueError):
            project = None
        if project:
            return project
        return None
    return _active_or_latest_project(user_id)


def _mask_secret(value: str):
    value = (value or '').strip()
    if not value:
        return ''
    if len(value) <= 6:
        return '***'
    return f"{value[:3]}***{value[-3:]}"


def _serialize_alert_preferences(user_id: int, project_id: int = None):
    preferences = get_alert_preferences(user_id=user_id, project_id=project_id)
    channels = {}

    for channel_key, settings in preferences['channels'].items():
        config = settings.get('config') or {}
        if channel_key == 'email':
            target = config.get('recipient') or ''
            config_preview = {
                'recipient': _mask_secret(target),
                'host': config.get('host', ''),
                'port': config.get('port', '')
            }
            configured = bool(target and config.get('host') and config.get('user') and config.get('password'))
        elif channel_key == 'slack':
            target = config.get('webhook_url') or ''
            config_preview = {'webhook_url': _mask_secret(target)}
            configured = bool(target)
        else:
            target = config.get('chat_id') or ''
            config_preview = {
                'chat_id': _mask_secret(target),
                'bot_token': _mask_secret(config.get('bot_token') or '')
            }
            configured = bool(target and config.get('bot_token'))

        channels[channel_key] = {
            'enabled': bool(settings.get('enabled')),
            'configured': configured,
            'source': settings.get('source', 'default'),
            'config': config_preview
        }

    rules = []
    for alert_id, rule in preferences['rules'].items():
        rules.append({
            'id': alert_id,
            'name': rule.get('name'),
            'severity': rule.get('severity'),
            'frequency': rule.get('frequency'),
            'enabled': bool(rule.get('enabled')),
            'source': rule.get('source', 'default')
        })

    rules.sort(key=lambda item: (item['severity'], item['name']))

    return {
        'project_id': project_id,
        'channels': channels,
        'rules': rules,
        'enabled_channels': [key for key, item in channels.items() if item.get('enabled')],
        'enabled_rules_count': sum(1 for item in rules if item.get('enabled'))
    }


def _scheduler_state():
    role = os.getenv('SCHEDULER_ROLE', 'disabled')
    running = bool(scheduler and getattr(scheduler, 'running', False))
    return {
        'role': role,
        'running': running,
        'configured': role != 'disabled'
    }


def _normalize_prompt_text(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '').strip())


def _derive_prompt_intent(prompt: str):
    for key, label, pattern in PROMPT_INTENT_RULES:
        if pattern.search(prompt or ''):
            return {'key': key, 'label': label}
    return {'key': 'consideration', 'label': 'Consideration'}


def _audit_single_prompt(prompt: str, brand: str, competitors=None, sector: str = None):
    prompt = _normalize_prompt_text(prompt)
    prompt_lower = prompt.lower()
    competitors = competitors or []
    sector = (sector or '').strip()
    word_count = len([part for part in re.split(r'\s+', prompt) if part])
    brand_present = bool(brand and brand.lower() in prompt_lower)
    competitor_hits = [item for item in competitors if item and item.lower() in prompt_lower]
    comparison_term = bool(re.search(r'(comparatif|compare|vs|alternative|alternatives|\bou\b)', prompt_lower))
    query_term = bool(re.search(r'(quel|quelle|quels|meilleur|top|avis|comparatif|pourquoi|comment)', prompt_lower))
    sector_present = bool(sector and sector.lower() in prompt_lower)
    intent = _derive_prompt_intent(prompt)
    competitor_target = min(2, len(competitors)) if competitors else 0

    quality_score = 32
    issues = []

    if brand_present:
        quality_score += 20
    else:
        issues.append('La marque n est pas nommee explicitement.')

    if comparison_term:
        quality_score += 18
    else:
        issues.append('Le prompt ne force pas une lecture comparative.')

    if competitor_hits:
        quality_score += min(18, len(competitor_hits) * 8)
    elif competitors:
        issues.append('Aucun concurrent du benchmark n apparait dans la formulation.')

    if competitor_target and len(competitor_hits) < competitor_target:
        quality_score -= 8
        issues.append('Le prompt cite trop peu de concurrents pour un benchmark neutre.')

    if brand_present and not comparison_term:
        quality_score -= 12
        issues.append('Le prompt cite la marque sans terrain comparatif suffisamment clair.')

    if brand_present and competitors and not competitor_hits:
        quality_score -= 12
        issues.append('Le prompt risque de favoriser la marque sans exposer de vraie alternative.')

    if sector_present:
        quality_score += 8

    if query_term:
        quality_score += 8
    else:
        issues.append('Le prompt est peu oriente decision ou recommandation.')

    if 6 <= word_count <= 18:
        quality_score += 10
    elif word_count < 6:
        quality_score -= 14
        issues.append('Le prompt est trop court pour cadrer correctement la comparaison.')
    else:
        quality_score -= 8
        issues.append('Le prompt est long et risque de diluer l intention.')

    quality_score = max(0, min(100, quality_score))
    if quality_score >= 75:
        label = 'Fort'
    elif quality_score >= 55:
        label = 'Correct'
    else:
        label = 'Fragile'

    if brand_present and not comparison_term:
        prompt_profile = 'brand-first'
    elif comparison_term and competitor_hits:
        prompt_profile = 'benchmark'
    elif comparison_term:
        prompt_profile = 'comparison'
    else:
        prompt_profile = 'discovery'

    if prompt_profile == 'brand-first' or quality_score < 55:
        neutrality_risk = 'high'
    elif competitor_target and len(competitor_hits) < competitor_target:
        neutrality_risk = 'medium'
    else:
        neutrality_risk = 'low'

    return {
        'prompt': prompt,
        'intent': intent,
        'brand_present': brand_present,
        'competitor_hits': competitor_hits,
        'competitor_coverage': round((len(competitor_hits) / len(competitors) * 100), 1) if competitors else 0,
        'word_count': word_count,
        'quality_score': quality_score,
        'quality_label': label,
        'issues': issues,
        'query_term': query_term,
        'comparison_term': comparison_term,
        'sector_present': sector_present,
        'prompt_profile': prompt_profile,
        'neutrality_risk': neutrality_risk
    }


def _audit_prompt_collection(prompts, brand: str, competitors=None, sector: str = None):
    audited = [_audit_single_prompt(prompt, brand, competitors=competitors, sector=sector) for prompt in (prompts or []) if _normalize_prompt_text(prompt)]
    if not audited:
        return {
            'average_quality_score': 0,
            'quality_distribution': {'Fort': 0, 'Correct': 0, 'Fragile': 0},
            'weak_prompt_count': 0,
            'top_intents': [],
            'coverage_average': 0,
            'prompts': []
        }

    distribution = {'Fort': 0, 'Correct': 0, 'Fragile': 0}
    intent_counts = {}
    profile_distribution = {'benchmark': 0, 'comparison': 0, 'brand-first': 0, 'discovery': 0}
    for item in audited:
        distribution[item['quality_label']] = distribution.get(item['quality_label'], 0) + 1
        intent_label = item['intent']['label']
        intent_counts[intent_label] = intent_counts.get(intent_label, 0) + 1
        profile_distribution[item['prompt_profile']] = profile_distribution.get(item['prompt_profile'], 0) + 1

    return {
        'average_quality_score': round(sum(item['quality_score'] for item in audited) / len(audited), 1),
        'quality_distribution': distribution,
        'weak_prompt_count': sum(1 for item in audited if item['quality_label'] == 'Fragile'),
        'brand_weighted_count': sum(1 for item in audited if item['prompt_profile'] == 'brand-first'),
        'neutral_prompt_count': sum(1 for item in audited if item['prompt_profile'] in ('benchmark', 'comparison')),
        'profile_distribution': profile_distribution,
        'top_intents': [
            {'label': label, 'count': count}
            for label, count in sorted(intent_counts.items(), key=lambda pair: pair[1], reverse=True)
        ][:4],
        'coverage_average': round(sum(item['competitor_coverage'] for item in audited) / len(audited), 1),
        'prompts': audited
    }


def _repair_prompt_text(prompt: str, brand: str, competitors=None, sector: str = None):
    repaired = _normalize_prompt_text(prompt)
    if not repaired:
        return repaired

    competitors = [item for item in (competitors or []) if item]
    audit = _audit_single_prompt(repaired, brand, competitors=competitors, sector=sector)

    if audit['quality_label'] != 'Fragile':
        return repaired

    working = repaired.rstrip(' ?!.')
    sector_suffix = f" en {sector.lower()}" if sector else ''
    competitor = audit['competitor_hits'][0] if audit['competitor_hits'] else (competitors[0] if competitors else None)

    if not audit['brand_present'] and brand:
        working = f"{working} : {brand}"

    if not audit['sector_present'] and sector:
        working = f"{working}{sector_suffix}"

    if not audit['comparison_term'] and competitor and brand:
        working = f"Comparatif {working} vs {competitor}"
    elif not audit['comparison_term']:
        working = f"Comparatif {working}"

    if not audit['query_term']:
        working = f"Quelles marques ressortent : {working}"

    return _normalize_prompt_text(f"{working} ?")


def _stabilize_generated_config(config: dict, brand: str, sector: str = None):
    next_config = dict(config or {})
    competitors = list(next_config.get('suggested_competitors', []) or [])
    repaired_count = 0
    normalized_products = []

    for product in next_config.get('products', []) or []:
        product_copy = dict(product)
        repaired_prompts = []
        for prompt in product.get('prompts', []) or []:
            normalized = _normalize_prompt_text(prompt)
            if not normalized:
                continue
            repaired = _repair_prompt_text(normalized, brand, competitors=competitors, sector=sector)
            if repaired != normalized:
                repaired_count += 1
            repaired_prompts.append(repaired)
        product_copy['prompts'] = repaired_prompts
        normalized_products.append(product_copy)

    next_config['products'] = normalized_products
    next_config['prompt_audit'] = _audit_prompt_collection(
        [prompt for product in normalized_products for prompt in product.get('prompts', [])],
        brand,
        competitors=competitors,
        sector=sector
    )
    return next_config, repaired_count


def _prompt_model_breakdown(response: dict, brand: str):
    per_model = []
    positions = []
    mention_flags = []

    for model, data in (response.get('llm_analyses') or {}).items():
        analysis = data.get('analysis', {})
        position = analysis.get('positions', {}).get(brand)
        mentioned = brand in analysis.get('brands_mentioned', [])
        mention_flags.append(mentioned)
        if position is not None:
            positions.append(position)
        per_model.append({
            'model': model,
            'brand_mentioned': mentioned,
            'position': position,
            'first_brand': analysis.get('first_brand')
        })

    total_models = len(per_model)
    if total_models == 0:
        return {'per_model': [], 'agreement_score': 0, 'position_spread': None, 'best_model': None}

    majority = max(sum(1 for item in mention_flags if item), sum(1 for item in mention_flags if not item))
    ranked_models = [item for item in per_model if item['position'] is not None]
    ranked_models.sort(key=lambda item: item['position'])

    return {
        'per_model': per_model,
        'agreement_score': round((majority / total_models) * 100, 1),
        'position_spread': round(max(positions) - min(positions), 1) if len(positions) > 1 else 0,
        'best_model': ranked_models[0]['model'] if ranked_models else None
    }


# ── Scheduler ─────────────────────────────────────────────────────────────────

def _build_risk_diagnostics(results: dict, metrics: dict, ranking: list):
    brand = results.get('brand') or results.get('main_brand', 'Marque')
    competitors = results.get('competitors', []) or []
    prompts = [
        _normalize_prompt_text(response.get('prompt'))
        for response in (results.get('responses') or [])
        if _normalize_prompt_text(response.get('prompt'))
    ]
    prompt_audit = _audit_prompt_collection(
        prompts,
        brand,
        competitors=competitors,
        sector=results.get('sector')
    )
    prompt_items = prompt_audit.get('prompts', [])
    models_used = results.get('llms_used', ['qwen3.5']) or ['qwen3.5']
    all_analyses = [
        data.get('analysis', {})
        for response in (results.get('responses') or [])
        for data in (response.get('llm_analyses') or {}).values()
    ]

    brand_explicit_ratio = round(
        (sum(1 for item in prompt_items if item.get('brand_present')) / len(prompt_items) * 100), 1
    ) if prompt_items else 0
    neutral_prompt_ratio = round(
        (
            sum(
                1 for item in prompt_items
                if not item.get('brand_present') and item.get('comparison_term')
            ) / len(prompt_items) * 100
        ), 1
    ) if prompt_items else 0
    brand_first_rate = round(
        (sum(1 for item in all_analyses if item.get('first_brand') == brand) / len(all_analyses) * 100), 1
    ) if all_analyses else 0

    leader = ranking[0] if ranking else None
    runner_up = next((item for item in ranking if item.get('brand') != brand), None)
    leader_gap = None
    if leader and runner_up:
        leader_gap = round((leader.get('global_score', 0) or 0) - (runner_up.get('global_score', 0) or 0), 1)

    risk_signals = []

    def push_risk(risk_id, level, title, detail, action):
        risk_signals.append({
            'id': risk_id,
            'level': level,
            'title': title,
            'detail': detail,
            'action': action
        })

    weak_prompt_count = prompt_audit.get('weak_prompt_count', 0)
    coverage_average = prompt_audit.get('coverage_average', 0)

    if weak_prompt_count > 0:
        push_risk(
            'weak_prompt_pack',
            'high' if weak_prompt_count >= max(2, len(prompt_items) // 3) else 'medium',
            'Pack de prompts fragile',
            f"{weak_prompt_count} prompt(s) restent fragiles sur {len(prompt_items) or 0}.",
            'Supprimer ou reformuler les prompts trop courts, trop orientés marque ou trop peu comparatifs.'
        )

    if competitors and coverage_average < 35:
        push_risk(
            'low_competitor_coverage',
            'high' if coverage_average < 20 else 'medium',
            'Couverture concurrentielle trop faible',
            f"Le pack couvre seulement {coverage_average}% des concurrents attendus.",
            'Ajouter des requêtes neutres et des comparatifs directs avec les concurrents prioritaires.'
        )

    if competitors and brand_explicit_ratio >= 80 and coverage_average < 55:
        push_risk(
            'brand_weighted_prompt_pack',
            'high',
            'Benchmark potentiellement trop favorable à la marque',
            f"{brand_explicit_ratio}% des prompts citent explicitement {brand} alors que la couverture concurrentielle reste basse.",
            'Rééquilibrer le benchmark avec plus de requêtes neutres, comparatives et sans formulation brand-first.'
        )

    if len(models_used) < 2:
        push_risk(
            'single_model_read',
            'medium',
            'Lecture limitée à un seul modèle',
            'La trajectoire actuelle repose sur un seul moteur LLM, donc la divergence inter-modèles reste non vérifiable.',
            'Ajouter au moins un second modèle avant d interpréter le classement comme stable.'
        )

    if len(competitors) < 2:
        push_risk(
            'thin_benchmark',
            'medium',
            'Benchmark trop étroit',
            f"Seulement {len(competitors)} concurrent(s) sont suivis dans ce projet.",
            'Élargir le benchmark à 3 concurrents ou plus pour rendre les écarts plus crédibles.'
        )

    if leader and leader.get('brand') == brand and brand_first_rate >= 85 and len(models_used) < 2:
        push_risk(
            'leadership_unverified',
            'high' if brand_first_rate >= 95 else 'medium',
            'Leadership à confirmer',
            f"{brand} ressort en tête sur {brand_first_rate}% des lectures alors que la vérification inter-modèles est insuffisante.",
            'Confirmer la position avec plus de modèles et des prompts moins centrés sur la marque.'
        )

    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    risk_signals.sort(key=lambda item: (severity_order.get(item.get('level'), 3), item.get('title', '')))

    bias_score = 0
    if competitors and brand_explicit_ratio >= 80:
        bias_score += 35
    if competitors and coverage_average < 35:
        bias_score += 25
    if len(models_used) < 2:
        bias_score += 15
    if len(competitors) < 2:
        bias_score += 10
    if brand_first_rate >= 85:
        bias_score += 15
    if leader_gap is not None and leader and leader.get('brand') == brand and leader_gap >= 35:
        bias_score += 10
    bias_score = min(100, bias_score)

    if bias_score >= 60:
        bias_status = 'warning'
        bias_summary = 'Le benchmark semble trop favorable à la marque suivie pour être considéré comme pleinement neutre.'
    elif bias_score >= 35:
        bias_status = 'watch'
        bias_summary = 'La lecture reste exploitable, mais plusieurs signaux invitent à vérifier la neutralité du pack.'
    else:
        bias_status = 'ok'
        bias_summary = 'Aucun biais structurel majeur ne ressort sur ce snapshot.'

    return {
        'risk_signals': risk_signals,
        'bias_monitor': {
            'status': bias_status,
            'score': bias_score,
            'summary': bias_summary,
            'brand_explicit_ratio': brand_explicit_ratio,
            'neutral_prompt_ratio': neutral_prompt_ratio,
            'coverage_average': coverage_average,
            'brand_first_rate': brand_first_rate,
            'model_count': len(models_used)
        },
        'prompt_audit_summary': prompt_audit
    }


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
            _save_and_alert(results, brand, user_id=project.get('user_id'), project_id=project.get('id'))
        except Exception as e:
            print(f"[SCHEDULER] {brand} : {e}")


def _scheduled_weekly_summary():
    projects = get_all_projects()
    for project in projects:
        brand = project.get('brand', 'Marque')
        user_id = project.get('user_id')
        project_id = project.get('id')
        results = _load_results(brand, user_id=user_id)
        if not results:
            continue

        preferences = get_alert_preferences(user_id=user_id, project_id=project_id) if user_id else None
        enabled_channels = [
            key for key, item in (preferences or {}).get('channels', {}).items()
            if item.get('enabled')
        ]
        weekly_rule = (preferences or {}).get('rules', {}).get('ALT-019', {})
        if preferences and (not weekly_rule.get('enabled', True) or not enabled_channels):
            continue

        competitors = results.get('competitors', [])
        az = BrandAnalyzer(brands=[brand] + competitors)
        all_analyses = [d['analysis'] for r in results['responses']
                        for d in r['llm_analyses'].values()]
        metrics = az.calculate_metrics(all_analyses)
        ranking = az.generate_ranking(metrics)
        brand_data = metrics.get(brand, {})
        brand_rank = next((r['rank'] for r in ranking if r['brand'] == brand), None)
        top_competitors = [r for r in ranking if r['brand'] != brand][:5]
        alert_weekly_summary(
            brand=brand,
            rank=brand_rank or 0,
            score=brand_data.get('global_score', 0),
            mention_rate=brand_data.get('mention_rate', 0),
            top_competitors=top_competitors,
            channel_settings=(preferences or {}).get('channels', {}),
            enabled_channels=enabled_channels
        )


def _scheduled_daily_alert():
    """Alerte quotidienne - compare avec la dernière analyse connue."""
    from models import get_history
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
    current_score = metrics.get(brand, {}).get('global_score', 0)
    current_rank = next((r['rank'] for r in ranking if r['brand'] == brand), 99)
    
    history = get_history(brand=brand, days=2)
    if len(history) < 2:
        print(f"[DAILY] Pas assez d'historique pour {brand}")
        return
    
    previous_score = history[-2].get(brand, current_score)
    
    changes = []
    score_drop = current_score - previous_score
    if score_drop < -5:
        changes.append(f"Score: {previous_score:.1f} → {current_score:.1f} ({score_drop:+.1f})")
    
    if changes:
        try:
            from alerts import send_alert
            send_alert(
                title=f"⚠️ Alerte Quotidienne - {brand}",
                message=f"Évolution: {' | '.join(changes)} | Rang: #{current_rank}",
                brand=brand
            )
            print(f"[DAILY] Alerte envoyée pour {brand}: {changes}")
        except Exception as e:
            print(f"[DAILY] Erreur envoi alerte: {e}")


def _scheduled_daily_alert_v2():
    """Alerte quotidienne - compare chaque projet avec sa precedente analyse."""
    from models import get_history

    projects = get_all_projects()
    for project in projects:
        brand = project.get('brand', 'Marque')
        user_id = project.get('user_id')
        project_id = project.get('id')
        results = _load_results(brand, user_id=user_id)
        if not results:
            continue

        preferences = get_alert_preferences(user_id=user_id, project_id=project_id) if user_id else None
        enabled_channels = [
            key for key, item in (preferences or {}).get('channels', {}).items()
            if item.get('enabled')
        ]
        score_drop_rule = (preferences or {}).get('rules', {}).get('ALT-004', {})
        if preferences and (not score_drop_rule.get('enabled', True) or not enabled_channels):
            continue

        competitors = results.get('competitors', [])
        az = BrandAnalyzer(brands=[brand] + competitors)
        all_analyses = [d['analysis'] for r in results['responses']
                        for d in r['llm_analyses'].values()]
        metrics = az.calculate_metrics(all_analyses)
        ranking = az.generate_ranking(metrics)
        current_score = metrics.get(brand, {}).get('global_score', 0)
        current_rank = next((r['rank'] for r in ranking if r['brand'] == brand), 99)

        history = get_history(brand=brand, days=2, user_id=user_id, project_id=project_id)
        if len(history) < 2:
            print(f"[DAILY] Pas assez d'historique pour {brand}")
            continue

        previous_score = history[-2].get(brand, current_score)
        score_drop = current_score - previous_score
        if score_drop >= -5:
            continue

        try:
            send_alert(
                message=f"Evolution: score {previous_score:.1f} -> {current_score:.1f} ({score_drop:+.1f}) | Rang actuel: #{current_rank}",
                subject=f"Alerte quotidienne - {brand}",
                channel_settings=(preferences or {}).get('channels', {}),
                enabled_channels=enabled_channels
            )
            print(f"[DAILY] Alerte envoyee pour {brand}: {score_drop:+.1f}")
        except Exception as e:
            print(f"[DAILY] Erreur envoi alerte: {e}")


def _start_scheduler():
    global scheduler

    if scheduler and getattr(scheduler, 'running', False):
        return scheduler

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(_scheduled_analysis, 'interval', hours=6, id='auto_analysis', replace_existing=True)
        scheduler.add_job(_scheduled_daily_alert_v2, 'cron',
                          hour=8, minute=0, id='daily_alert', replace_existing=True)
        scheduler.add_job(_scheduled_weekly_summary, 'cron',
                          day_of_week='mon', hour=9, minute=0, id='weekly_summary', replace_existing=True)
        scheduler.start()
        print("[SCHEDULER] Actif — analyse 6h + alerte quotidienne 08h + résumé hebdo lundi 09h")
        return scheduler
    except ImportError:
        print("[SCHEDULER] apscheduler non installé")
        scheduler = None
        return None
    except Exception as e:
        print(f"[SCHEDULER] Erreur : {e}")
        scheduler = None
        return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def _ensure_results_snapshots_dir():
    os.makedirs(RESULTS_SNAPSHOTS_DIR, exist_ok=True)

def _slugify(value: str) -> str:
    safe = ''.join(ch.lower() if ch.isalnum() else '-' for ch in (value or '').strip())
    while '--' in safe:
        safe = safe.replace('--', '-')
    return safe.strip('-') or 'unknown'

def _project_results_file(brand: str, user_id: int = None) -> str:
    prefix = f"user-{user_id}--" if user_id is not None else ""
    return os.path.join(RESULTS_SNAPSHOTS_DIR, f"{prefix}{_slugify(brand)}.json")

def _load_json_file(path: str):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def _load_results(brand: str = None, user_id: int = None):
    _ensure_data_dir()
    if brand:
        _ensure_results_snapshots_dir()
        snapshot_file = _project_results_file(brand, user_id=user_id)
        data = _load_json_file(snapshot_file)
        if data:
            owner = f" user={user_id}" if user_id is not None else ""
            print(f"[LOAD] snapshot {brand}{owner} lu : {data.get('total_prompts')} prompts, is_demo={data.get('is_demo')}")
            return data
        owner = f" user={user_id}" if user_id is not None else ""
        print(f"[LOAD] snapshot {brand}{owner} introuvable")
        return None

    data = _load_json_file(RESULTS_FILE)
    if data:
        print(f"[LOAD] results.json lu : {data.get('total_prompts')} prompts, is_demo={data.get('is_demo')}, brand={data.get('brand')}")
        return data

    print(f"[LOAD] results.json inexistant")
    return None

def _save_results(data, user_id: int = None):
    _ensure_data_dir()
    with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    if data.get('brand') and data.get('mode') != 'benchmark':
        _ensure_results_snapshots_dir()
        snapshot_file = _project_results_file(data['brand'], user_id=user_id)
        with open(snapshot_file, 'w', encoding='utf-8') as f:
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

def _build_metrics_payload(results):
    brand = results.get('brand') or results.get('main_brand', 'Marque')

    if results.get('brands') and len(results.get('brands', [])) > 0:
        all_brands = results.get('brands')
        competitors = results.get('brands', [])[1:] if len(results.get('brands', [])) > 1 else []
    elif results.get('mode') == 'benchmark':
        competitors = results.get('competitors', [])
        all_brands = [brand] + competitors
    else:
        competitors = results.get('competitors', [])
        all_brands = [brand] + competitors if competitors else None

    az = BrandAnalyzer(brands=all_brands)
    all_analyses = [d['analysis'] for r in results['responses']
                    for d in r['llm_analyses'].values()]
    metrics = az.calculate_metrics(all_analyses)
    ranking = az.generate_ranking(metrics)
    insights = az.generate_insights(metrics, ranking, main_brand=brand)

    cat_data = {}
    for response in results['responses']:
        cat = response.get('category', 'general')
        cat_data.setdefault(cat, [])
        for data in response['llm_analyses'].values():
            cat_data[cat].append(data['analysis'])

    category_data = {}
    for cat, analyses in cat_data.items():
        cm = az.calculate_metrics(analyses)
        category_data[cat] = {b: cm[b]['mention_rate'] for b in cm}

    diagnostics = _build_risk_diagnostics(results, metrics, ranking)

    return {
        'metrics': metrics,
        'ranking': ranking,
        'insights': insights,
        'category_data': category_data,
        'risk_signals': diagnostics['risk_signals'],
        'bias_monitor': diagnostics['bias_monitor'],
        'prompt_audit_summary': diagnostics['prompt_audit_summary'],
        'metadata': {
            'brand': brand,
            'competitors': competitors,
            'total_prompts': results['total_prompts'],
            'total_analyses': len(all_analyses),
            'timestamp': results['timestamp'],
            'is_demo': results.get('is_demo', False),
            'models_used': results.get('llms_used', ['qwen3.5']),
            'models': results.get('llms_used', ['qwen3.5'])
        }
    }


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


def _save_and_alert(results, brand, user_id: int = None, project_id: int = None):
    _save_results(results, user_id=user_id)
    save_analysis(results, user_id=user_id, project_id=project_id)
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
                                 'alerts': True, 'prompt_compare': True,
                                 'report_catalog': True, 'alert_catalog': True},
                    'scheduler': _scheduler_state(),
                    'security': {
                        'production_mode': IS_PRODUCTION,
                        'session_cookie_secure': bool(app.config.get('SESSION_COOKIE_SECURE')),
                        'default_secret_in_use': DEFAULT_SECRET_IN_USE,
                        'alert_settings_encrypted': True,
                        'warnings': _security_warnings()
                    }})

@app.route('/api/status', methods=['GET'])
def status():
    llm_status = {}
    try:
        llm_status = LLMClient().get_active_models()
    except Exception as e:
        llm_status = {'error': str(e)}
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat(),
                    'llm_status': llm_status,
                    'system_ready': bool(llm_status) and 'error' not in llm_status})


@app.route('/api/auth/signup', methods=['POST'])
def auth_signup():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = _normalize_email(data.get('email'))
    password = data.get('password') or ''

    if _is_rate_limited('signup', email):
        return _rate_limited_response()

    if not email or '@' not in email:
        _register_failed_attempt('signup', email)
        return jsonify({'error': 'Adresse email invalide'}), 400
    if len(password) < 8:
        _register_failed_attempt('signup', email)
        return jsonify({'error': 'Le mot de passe doit contenir au moins 8 caracteres'}), 400
    if get_user_by_email(email):
        _register_failed_attempt('signup', email)
        return jsonify({'error': 'Un compte existe deja pour cette adresse'}), 409

    user = create_user(
        name=name or email.split('@')[0],
        email=email,
        password_hash=generate_password_hash(password),
        auth_provider='password'
    )
    _clear_failed_attempts('signup', email)
    _set_user_session(user)
    return jsonify({'authenticated': True, 'user': _public_user(user)}), 201


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json() or {}
    email = _normalize_email(data.get('email'))
    password = data.get('password') or ''

    if _is_rate_limited('login', email):
        return _rate_limited_response()

    user = get_user_by_email(email)
    if not user or not user.get('password_hash') or not check_password_hash(user['password_hash'], password):
        _register_failed_attempt('login', email)
        return jsonify({'error': 'Identifiants invalides'}), 401

    update_user_login(user['id'])
    user = get_user_by_id(user['id'])
    _clear_failed_attempts('login', email)
    _set_user_session(user)
    return jsonify({'authenticated': True, 'user': _public_user(user)})


@app.route('/api/auth/google', methods=['POST'])
def auth_google():
    data = request.get_json() or {}
    credential = data.get('credential') or data.get('id_token')
    google_client_id = os.getenv('GOOGLE_CLIENT_ID') or os.getenv('VITE_GOOGLE_CLIENT_ID')
    email_hint = _normalize_email(data.get('email'))

    if _is_rate_limited('google', email_hint or _client_ip()):
        return _rate_limited_response()

    if not credential:
        _register_failed_attempt('google', email_hint or _client_ip())
        return jsonify({'error': 'Google credential manquante'}), 400
    if not google_client_id:
        return jsonify({'error': 'GOOGLE_CLIENT_ID non configure'}), 503

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError:
        return jsonify({'error': 'google-auth non installe'}), 503

    try:
        id_info = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id
        )
    except Exception as exc:
        _register_failed_attempt('google', email_hint or _client_ip())
        return jsonify({'error': f'Token Google invalide: {exc}'}), 401

    email = _normalize_email(id_info.get('email'))
    if not email:
        _register_failed_attempt('google', email_hint or _client_ip())
        return jsonify({'error': 'Compte Google sans email exploitable'}), 400

    google_sub = id_info.get('sub')
    name = id_info.get('name') or email.split('@')[0]
    avatar_url = id_info.get('picture')

    user = get_user_by_google_sub(google_sub) or get_user_by_email(email)
    if not user:
        user = create_user(
            name=name,
            email=email,
            google_sub=google_sub,
            auth_provider='google',
            avatar_url=avatar_url
        )
    elif user.get('google_sub') not in (None, google_sub):
        _register_failed_attempt('google', email)
        return jsonify({'error': 'Ce compte est deja lie a une autre identite Google'}), 409
    else:
        user = attach_google_identity(user['id'], google_sub, avatar_url=avatar_url)

    update_user_login(user['id'])
    user = get_user_by_id(user['id'])
    _clear_failed_attempts('google', email)
    _set_user_session(user)
    return jsonify({'authenticated': True, 'user': _public_user(user)})


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'authenticated': False})


@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    user = _current_user()
    if not user:
        return jsonify({'authenticated': False, 'user': None})
    return jsonify({'authenticated': True, 'user': _public_user(user)})

@app.route('/api/projects', methods=['GET'])
def list_projects():
    user = _current_user()
    if not user:
        return jsonify([])
    return jsonify(get_all_projects(user_id=user['id']))


@app.route('/api/projects/<int:project_id>/activate', methods=['POST'])
def activate_project(project_id: int):
    user, error_response = _require_auth()
    if error_response:
        return error_response

    project = get_project_by_id(project_id, user_id=user['id'])
    if not project:
        return jsonify({'error': 'Projet introuvable'}), 404

    session['active_project_id'] = project_id
    results = _load_results(project.get('brand'), user_id=user['id'])
    dashboard = _build_metrics_payload(results) if results else None

    return jsonify({
        'status': 'success',
        'project': project,
        'results': dashboard
    })

@app.route('/api/session', methods=['GET'])
def get_session():
    """Retourne la dernière session (projet + résultats) pour auto-load."""
    user = _current_user()
    if not user:
        return jsonify({'has_session': False, 'user': None})
    project = _active_or_latest_project(user['id'])
    if not project:
        return jsonify({'has_session': False, 'user': _public_user(user)})

    session['active_project_id'] = project.get('id')
    results = _load_results(project.get('brand'), user_id=user['id'])
    dashboard = _build_metrics_payload(results) if results else None
    
    return jsonify({
        'has_session': True,
        'user': _public_user(user),
        'active_project_id': project.get('id'),
        'project': project,
        'results': dashboard
    })

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
        client = LLMClient()
        if not client.api_key or not client.clients:
            raise Exception("Pas de clé API")

        # Appel direct avec think=False pour éviter le timeout
        import requests as req
        prompt_llm = (
            f'Tu prepares un benchmark GEO neutre pour la marque "{brand}" dans le secteur "{sector}".\n'
            f'Retourne un JSON strict avec:\n'
            f'- 3 a 4 produits ou cas d usage comparables\n'
            f'- 3 a 5 concurrents reels et credibles du meme marche\n'
            f'- 2 prompts maximum par produit\n\n'
            f'Contraintes obligatoires pour les prompts:\n'
            f'- formulations neutres, non promotionnelles\n'
            f'- ne pas ecrire des prompts centres sur "{brand}" du type "{brand} ou alternative"\n'
            f'- utiliser un terrain commun de comparaison: "quelles marques", "comparatif", "quels acteurs", "meilleur choix"\n'
            f'- produire majoritairement des prompts benchmark neutres ou comparatifs\n'
            f'- un seul prompt brand-first maximum sur l ensemble du pack\n'
            f'- mentionner "{brand}" et au moins 2 concurrents dans la plupart des prompts\n'
            f'- les prompts doivent pouvoir etre reuses sans avantager automatiquement la marque suivie\n\n'
            f'Format strict attendu:\n'
            f'{{"products":[{{"id":"p1","name":"...","description":"...","prompts":["...","..."]}}],"suggested_competitors":["C1","C2","C3"]}}\n'
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

        config, repaired_count = _stabilize_generated_config(config, brand, sector=sector)
        config['generation_notes'] = {
            'source': 'llm',
            'brand': brand,
            'sector': sector,
            'generated_at': datetime.now().isoformat(),
            'products_count': len(config.get('products', [])),
            'competitors_count': len(config.get('suggested_competitors', [])),
            'repaired_prompts_count': repaired_count
        }

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
            timeout=120
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

        _save_results(results, user_id=user_id)
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
    user         = _current_user()
    user_id      = user['id'] if user else None

    if use_demo or not prompts:
        results = generate_demo_data(brand, competitors, prompts)
        project_id = upsert_project(brand, data.get('sector', ''), competitors, prompts,
                                    results.get('llms_used', ['qwen3.5']), user_id=user_id)
        if user_id is not None:
            session['active_project_id'] = project_id
        _save_results(results, user_id=user_id)
        save_analysis(results, user_id=user_id, project_id=project_id)
        return jsonify({'status': 'success', 'is_demo': True,
                        'timestamp': results['timestamp'],
                        'duration': round(time.time() - start, 2)})

    results = _run_real_or_demo(brand, competitors, prompts, limit, use_parallel)
    project_id = None
    try:
        project_id = upsert_project(brand, data.get('sector', ''), competitors, prompts,
                                    results.get('llms_used', ['qwen3.5']), user_id=user_id)
        if user_id is not None and project_id is not None:
            session['active_project_id'] = project_id
    except Exception as e:
        print(f"[PROJECT] {e}")
    _save_and_alert(results, brand, user_id=user_id, project_id=project_id)

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
    user         = _current_user()
    user_id      = user['id'] if user else None
    
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
        project_id = None
        print(f"[STREAM] ✓ Sauvegarde terminée — {limit} prompts, is_demo={is_demo}")
        try:
            project_id = upsert_project(brand, sector, competitors, prompts, active_models, user_id=user_id)
            if user_id is not None and project_id is not None:
                session['active_project_id'] = project_id
        except Exception:
            pass
        _save_and_alert(results, brand, user_id=user_id, project_id=project_id)

        yield _sse('complete', {'timestamp': results['timestamp'],
                                'is_demo': is_demo, 'duration': round(time.time() - start, 2)})

    return Response(stream_with_context(generate_events()),
                    content_type='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no',
                             'Connection': 'keep-alive'})

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    print('[METRICS] Appel de /api/metrics')
    requested_brand = request.args.get('brand')
    benchmark_mode = request.args.get('benchmark', 'false').lower() == 'true'
    user = _current_user()
    user_id = user['id'] if user else None

    results = None
    if benchmark_mode:
        results = _load_results()
        if not results or results.get('mode') != 'benchmark':
            return jsonify({'error': 'Aucun benchmark disponible'}), 404
    elif requested_brand:
        results = _load_results(requested_brand, user_id=user_id)
        if results:
            print(f'[METRICS] snapshot trouve pour {requested_brand}')
    elif user_id is not None:
        project = _project_from_request(user_id)
        if project:
            results = _load_results(project.get('brand'), user_id=user_id)
            if results:
                print(f"[METRICS] snapshot utilisateur trouve pour projet {project.get('id')}")
    else:
        # Legacy guest fallback: wait briefly for the global snapshot before generating demo data.
        for attempt in range(5):
            results = _load_results()
            if results:
                print(f'[METRICS] results.json trouve apres {attempt + 1} tentative(s)')
                break
            print(f'[METRICS] results.json inexistant, attente 2s (tentative {attempt + 1}/5)')
            time.sleep(2)

    if not results:
        if benchmark_mode:
            return jsonify({'error': 'Aucun benchmark disponible'}), 404
        if requested_brand:
            return jsonify({'error': f'Aucune analyse trouvee pour {requested_brand}'}), 404
        if user_id is not None:
            return jsonify({'error': 'Aucune analyse trouvee pour cet utilisateur'}), 404
        print('[METRICS] results.json toujours vide, generation demo')
        results = generate_demo_data()
        _save_results(results, user_id=user_id)

    return jsonify(_build_metrics_payload(results))

@app.route('/api/metrics/by-model', methods=['GET'])
def get_metrics_by_model():
    requested_brand = request.args.get('brand')
    user = _current_user()
    user_id = user['id'] if user else None
    results = _resolve_results_for_request(requested_brand, user_id=user_id)
    if not results:
        target = f" pour {requested_brand}" if requested_brand else ''
        return jsonify({'error': f'Aucune donnée{target} — lancez une analyse'}), 404
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
    mention_rates = {
        model: metrics.get(brand, {}).get('mention_rate', 0)
        for model, metrics in report['by_model'].items()
    }
    strongest_model = max(mention_rates, key=mention_rates.get) if mention_rates else None
    weakest_model = min(mention_rates, key=mention_rates.get) if mention_rates else None
    spread = (max(mention_rates.values()) - min(mention_rates.values())) if mention_rates else 0
    main_brand_confidence = report['main_brand_confidence']
    return jsonify({'by_model': report['by_model'], 'rankings_by_model': rankings_by_model,
                    'confidence': report['confidence'],
                    'main_brand_confidence': main_brand_confidence,
                    'models': list(report['by_model'].keys()), 'brand': brand,
                    'summary': {
                        'strongest_model': strongest_model,
                        'weakest_model': weakest_model,
                        'mention_spread': round(spread, 1),
                        'agreement_score': main_brand_confidence.get('confidence'),
                        'divergence_level': main_brand_confidence.get('divergence_level'),
                        'model_count': len(report['by_model'])
                    },
                    'metadata': {'timestamp': results['timestamp'],
                                 'is_demo': results.get('is_demo', False),
                                 'total_prompts': results['total_prompts']}})

@app.route('/api/history', methods=['GET'])
def get_history_data():
    brand    = request.args.get('brand')
    model    = request.args.get('model')
    use_demo = request.args.get('demo', 'false').lower() == 'true'
    user = _current_user()
    user_id = user['id'] if user else None
    project = _project_from_request(user_id) if user_id is not None else None
    target_brand = brand or (project.get('brand') if project else None)
    target_project_id = project.get('id') if project else None
    if use_demo:
        results = _resolve_results_for_request(target_brand, user_id=user_id)
        b = results.get('brand', target_brand or 'Marque') if results else (target_brand or 'Marque')
        c = results.get('competitors', []) if results else []
        return jsonify(generate_demo_history(b, c))
    history = get_history(brand=target_brand, model=model, user_id=user_id, project_id=target_project_id)
    if not history:
        results = _resolve_results_for_request(target_brand, user_id=user_id)
        b = results.get('brand', target_brand or 'Marque') if results else (target_brand or 'Marque')
        c = results.get('competitors', []) if results else []
        return jsonify(generate_demo_history(b, c))
    return jsonify(history)

@app.route('/api/export', methods=['GET'])
def export_json():
    requested_brand = request.args.get('brand')
    user = _current_user()
    user_id = user['id'] if user else None
    results = _resolve_results_for_request(requested_brand, user_id=user_id)
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
    requested_brand = request.args.get('brand')
    user = _current_user()
    user_id = user['id'] if user else None
    results = _resolve_results_for_request(requested_brand, user_id=user_id)
    if not results:
        return jsonify({'error': 'Aucune donnée — lancez une analyse'}), 404
    brand       = results.get('brand', 'Marque')
    competitors = results.get('competitors', [])
    sector = results.get('sector', '')
    project = _project_from_request(user_id) if user_id is not None else None
    project_id = project.get('id') if project and (not requested_brand or project.get('brand') == brand) else None
    previous_run = get_previous_prompt_run(
        brand,
        results.get('timestamp', datetime.now().isoformat()),
        user_id=user_id,
        project_id=project_id
    )
    previous_snapshot = previous_run.get('snapshot', {})
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
        prompt_audit = _audit_single_prompt(prompt, brand, competitors=competitors, sector=sector)
        model_breakdown = _prompt_model_breakdown(response, brand)
        score = (mention_pct * 0.5 + (100 / avg_pos if avg_pos and avg_pos > 0 else 0) * 0.3 + top_of_mind * 0.2)
        prompt_stats.append({'prompt': prompt, 'mention_rate': mention_pct, 'avg_position': avg_pos,
                              'top_of_mind': top_of_mind, 'brand_mentioned': mentions > 0,
                              'brand_position': positions[0] if positions else None,
                              'competitors_mentioned': comps_list, 'models_count': total_models,
                              'score': round(score, 1),
                              'intent': prompt_audit['intent'],
                              'prompt_quality_score': prompt_audit['quality_score'],
                              'prompt_quality_label': prompt_audit['quality_label'],
                              'prompt_issues': prompt_audit['issues'],
                              'competitor_coverage': prompt_audit['competitor_coverage'],
                              'word_count': prompt_audit['word_count'],
                              'prompt_profile': prompt_audit['prompt_profile'],
                              'neutrality_risk': prompt_audit['neutrality_risk'],
                              'agreement_score': model_breakdown['agreement_score'],
                              'position_spread': model_breakdown['position_spread'],
                              'best_model': model_breakdown['best_model'],
                              'per_model': model_breakdown['per_model']})
    prompt_stats.sort(key=lambda x: -x['score'])
    for index, item in enumerate(prompt_stats, start=1):
        previous = previous_snapshot.get(item['prompt'])
        item['current_rank'] = index
        item['previous_rank_position'] = previous.get('rank_position') if previous else None
        item['rank_change'] = (
            previous['rank_position'] - index
            if previous and previous.get('rank_position') is not None else None
        )
        item['score_change'] = (
            round(item['score'] - previous.get('score', 0), 1)
            if previous and previous.get('score') is not None else None
        )
        item['mention_change'] = (
            round(item['mention_rate'] - previous.get('mention_rate', 0), 1)
            if previous and previous.get('mention_rate') is not None else None
        )
        if previous and previous.get('avg_position') is not None and item['avg_position'] is not None:
            item['position_change'] = round(previous['avg_position'] - item['avg_position'], 2)
        else:
            item['position_change'] = None
        item['has_history'] = previous is not None

    prompt_audit_summary = _audit_prompt_collection(
        [item['prompt'] for item in prompt_stats],
        brand,
        competitors=competitors,
        sector=sector
    )
    improved_prompt_count = sum(
        1 for item in prompt_stats
        if (item.get('rank_change') or 0) > 0 or (item.get('score_change') or 0) > 0
    )
    declined_prompt_count = sum(
        1 for item in prompt_stats
        if (item.get('rank_change') or 0) < 0 or (item.get('score_change') or 0) < 0
    )
    tracked_prompt_count = sum(1 for item in prompt_stats if item.get('has_history'))
    suspicious_prompt_count = sum(
        1 for item in prompt_stats
        if item.get('neutrality_risk') == 'high' or item.get('prompt_profile') == 'brand-first'
    )
    return jsonify({'brand': brand, 'prompts': prompt_stats,
                    'best_prompt':  prompt_stats[0]['prompt']  if prompt_stats else None,
                    'worst_prompt': prompt_stats[-1]['prompt'] if prompt_stats else None,
                    'total_prompts': len(prompt_stats),
                    'summary': {
                        'average_quality_score': prompt_audit_summary['average_quality_score'],
                        'quality_distribution': prompt_audit_summary['quality_distribution'],
                        'weak_prompt_count': prompt_audit_summary['weak_prompt_count'],
                        'top_intents': prompt_audit_summary['top_intents'],
                        'coverage_average': prompt_audit_summary['coverage_average'],
                        'brand_weighted_count': prompt_audit_summary['brand_weighted_count'],
                        'neutral_prompt_count': prompt_audit_summary['neutral_prompt_count'],
                        'profile_distribution': prompt_audit_summary['profile_distribution'],
                        'improved_prompt_count': improved_prompt_count,
                        'declined_prompt_count': declined_prompt_count,
                        'tracked_prompt_count': tracked_prompt_count,
                        'suspicious_prompt_count': suspicious_prompt_count
                    },
                    'metadata': {'timestamp': results['timestamp'],
                                 'previous_timestamp': previous_run.get('timestamp'),
                                 'is_demo': results.get('is_demo', False),
                                 'models': results.get('llms_used', ['qwen3.5'])}})

@app.route('/api/alerts/status', methods=['GET'])
def alerts_status():
    global_channels = {
        'slack': {
            'configured': bool(os.environ.get('SLACK_WEBHOOK_URL')),
            'channel': 'webhook'
        },
        'email': {
            'configured': all([os.environ.get(k) for k in ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'ALERT_EMAIL']]),
            'recipient': _mask_secret(os.environ.get('ALERT_EMAIL', '—')),
            'host': os.environ.get('SMTP_HOST', '—')
        },
        'telegram': {
            'configured': all([os.environ.get('TELEGRAM_BOT_TOKEN'), os.environ.get('TELEGRAM_CHAT_ID')]),
            'chat_id': _mask_secret(os.environ.get('TELEGRAM_CHAT_ID', '—'))
        }
    }
    user = _current_user()
    project = _project_from_request(user['id']) if user else None
    preferences = _serialize_alert_preferences(user['id'], project['id']) if user and project else None

    return jsonify({
        **global_channels,
        'summary': {
            **get_alert_summary(),
            'configured_channels': sum(1 for channel in global_channels.values() if channel.get('configured')),
            'enabled_project_channels': len((preferences or {}).get('enabled_channels', []))
        },
        'catalog': get_alert_catalog(),
        'preferences': preferences,
        'project': {
            'id': project.get('id'),
            'brand': project.get('brand')
        } if project else None
    })


@app.route('/api/alerts/preferences', methods=['GET'])
def get_alert_preferences_route():
    user, auth_error = _require_auth()
    if auth_error:
        return auth_error

    project = _project_from_request(user['id'])
    project_id = project.get('id') if project else None
    return jsonify(_serialize_alert_preferences(user['id'], project_id))


@app.route('/api/alerts/preferences', methods=['PUT'])
def update_alert_preferences_route():
    user, auth_error = _require_auth()
    if auth_error:
        return auth_error

    payload = request.get_json() or {}
    project = None
    project_id = payload.get('project_id')
    if project_id is not None:
        project = get_project_by_id(int(project_id), user_id=user['id'])
        if not project:
            return jsonify({'error': 'Project not found'}), 404
    else:
        project = _project_from_request(user['id'])
        project_id = project.get('id') if project else None

    if payload.get('channels'):
        for channel, settings in payload['channels'].items():
            config = settings.get('config') or {}
            filtered_config = {}
            if channel == 'slack':
                filtered_config['webhook_url'] = (config.get('webhook_url') or '').strip()
            elif channel == 'email':
                filtered_config = {
                    'recipient': (config.get('recipient') or '').strip(),
                    'host': (config.get('host') or '').strip(),
                    'port': str(config.get('port') or '').strip(),
                    'user': (config.get('user') or '').strip(),
                    'password': (config.get('password') or '').strip()
                }
            elif channel == 'telegram':
                filtered_config = {
                    'bot_token': (config.get('bot_token') or '').strip(),
                    'chat_id': (config.get('chat_id') or '').strip()
                }
            upsert_alert_channel_setting(
                user_id=user['id'],
                project_id=project_id,
                channel=channel,
                enabled=bool(settings.get('enabled')),
                config=filtered_config
            )

    if payload.get('rules'):
        for alert_id, settings in payload['rules'].items():
            upsert_alert_rule_setting(
                user_id=user['id'],
                project_id=project_id,
                alert_id=alert_id,
                enabled=bool(settings.get('enabled'))
            )

    return jsonify(_serialize_alert_preferences(user['id'], project_id))

@app.route('/api/catalog/alerts', methods=['GET'])
def alert_catalog():
    return jsonify({
        'summary': get_alert_summary(),
        'items': get_alert_catalog()
    })


@app.route('/api/catalog/reports', methods=['GET'])
def report_catalog():
    return jsonify({
        'count': len(get_report_catalog()),
        'items': get_report_catalog()
    })


@app.route('/api/alerts/test', methods=['POST'])
def test_alert():
    data    = request.get_json() or {}
    channel = data.get('channel', 'all')
    message = data.get('message', '🧪 Test GEO Monitor.')
    user = _current_user()
    project = _project_from_request(user['id']) if user else None
    preferences = get_alert_preferences(user['id'], project.get('id')) if user and project else {'channels': {}}

    enabled_channels = [channel] if channel != 'all' else [
        key for key, item in preferences.get('channels', {}).items() if item.get('enabled')
    ]
    if channel == 'all' and not enabled_channels:
        enabled_channels = ['slack', 'email', 'telegram']

    results = send_alert(
        message=message,
        subject='Test GEO Monitor',
        channel_settings=preferences.get('channels', {}),
        enabled_channels=enabled_channels
    )
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
    report_type = request.args.get('report_type', 'analysis_main')
    report_definition = get_report_definition(report_type)
    requested_brand = request.args.get('brand')
    user = _current_user()
    user_id = user['id'] if user else None
    results = _resolve_results_for_request(requested_brand, user_id=user_id)

    if not results:
        if requested_brand:
            return jsonify({'error': f'Aucune donnée pour {requested_brand}'}), 404
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
            output_format=fmt,
            report_definition=report_definition
        )

        date_str = datetime.now().strftime('%Y-%m-%d')
        report_slug = report_definition.get('slug', report_type)

        if content_type == 'application/pdf':
            filename = f"geo-{brand.lower().replace(' ','-')}-{report_slug}-{date_str}.pdf"
        else:
            filename = f"geo-{brand.lower().replace(' ','-')}-{report_slug}-{date_str}.html"

        return Response(
            content,
            content_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(content)),
                'X-Report-Type': report_definition.get('id', report_type)
            }
        )

    except Exception as e:
        print(f"[PDF] Erreur génération : {e}")
        return jsonify({'error': str(e), 'hint': 'pip install weasyprint --break-system-packages'}), 500


@app.route('/api/export/pdf/check', methods=['GET'])
def check_pdf_support():
    try:
        import weasyprint
        return jsonify({
            'available': True,
            'version': weasyprint.__version__,
            'supported_reports': get_report_catalog()
        })
    except ImportError:
        return jsonify({
            'available': False,
            'install': 'pip install weasyprint --break-system-packages',
            'fallback': 'Le format HTML est disponible via ?format=html',
            'supported_reports': get_report_catalog()
        })
# ── Démarrage ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    if not debug:
        os.environ.setdefault('SCHEDULER_ROLE', 'local')
        scheduler = _start_scheduler()
    print(f"\n[INFO] GEO Monitor v2.4 — Sprint 4 — http://localhost:{port}")
    print(f"   GET /api/export/pdf       → Rapport PDF (WeasyPrint)")
    print(f"   GET /api/export/pdf?format=html → Rapport HTML (fallback)")
    print(f"   GET /api/export/pdf/check → Vérifier WeasyPrint")
    print(f"   GET /api/health           → Health check enrichi")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
