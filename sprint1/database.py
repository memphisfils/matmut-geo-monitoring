"""
Database — GEO Monitor Sprint 1
- SQLite pour dev, PostgreSQL pour prod (Render)
- Table projects : stocke chaque marque analysée avec ses concurrents/prompts
- Table analysis_history : historique des scores par marque, par modèle
"""
import os
import sqlite3
from datetime import datetime, timedelta
import random

DATABASE_URL = os.getenv('DATABASE_URL')
USE_POSTGRES  = DATABASE_URL is not None

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
DB_PATH  = os.path.join(DATA_DIR, 'history.db')

if USE_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor


def get_db_connection():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ph():
    """Placeholder : ? pour SQLite, %s pour PostgreSQL."""
    return '%s' if USE_POSTGRES else '?'


def init_db():
    """Crée toutes les tables si elles n'existent pas."""
    conn = get_db_connection()
    cur  = conn.cursor()

    # ── Projets (une entrée par marque configurée) ─────────────────────────
    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS projects (
            id          {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            brand       TEXT NOT NULL,
            sector      TEXT,
            competitors TEXT,
            prompts     TEXT,
            models      TEXT,
            created_at  TEXT NOT NULL,
            last_run    TEXT
        )
    '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT'))

    # ── Historique des analyses ────────────────────────────────────────────
    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id              {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            timestamp       TEXT NOT NULL,
            brand           TEXT NOT NULL,
            model           TEXT DEFAULT 'qwen3.5',
            share_of_voice  REAL,
            global_score    REAL,
            mention_rate    REAL,
            avg_position    REAL,
            top_of_mind     REAL,
            sentiment_score REAL
        )
    '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT'))

    conn.commit()
    conn.close()
    print(f"[DATABASE] Initialisée ({'PostgreSQL' if USE_POSTGRES else 'SQLite'})")


# ── Projets ────────────────────────────────────────────────────────────────

def upsert_project(brand: str, sector: str = '', competitors: list = None,
                   prompts: list = None, models: list = None) -> int:
    """
    Crée ou met à jour un projet pour une marque donnée.
    Retourne l'id du projet.
    """
    import json
    conn = get_db_connection()
    cur  = conn.cursor()
    ph   = _ph()

    now = datetime.now().isoformat()
    comp_json   = json.dumps(competitors or [])
    prompt_json = json.dumps(prompts or [])
    model_json  = json.dumps(models or ['qwen3.5'])

    cur.execute(f'SELECT id FROM projects WHERE brand = {ph}', (brand,))
    row = cur.fetchone()

    if row:
        project_id = row[0] if USE_POSTGRES else row['id']
        cur.execute(f'''
            UPDATE projects
            SET sector={ph}, competitors={ph}, prompts={ph}, models={ph}, last_run={ph}
            WHERE brand={ph}
        ''', (sector, comp_json, prompt_json, model_json, now, brand))
    else:
        cur.execute(f'''
            INSERT INTO projects (brand, sector, competitors, prompts, models, created_at, last_run)
            VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph})
        ''', (brand, sector, comp_json, prompt_json, model_json, now, now))
        if USE_POSTGRES:
            cur.execute('SELECT lastval()')
        else:
            cur.execute('SELECT last_insert_rowid()')
        project_id = cur.fetchone()[0]

    conn.commit()
    conn.close()
    return project_id


def get_all_projects() -> list:
    """Retourne tous les projets enregistrés."""
    import json
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute('SELECT * FROM projects ORDER BY last_run DESC')
    rows = cur.fetchall()
    conn.close()

    projects = []
    for row in rows:
        r = dict(row)
        for field in ('competitors', 'prompts', 'models'):
            try:
                r[field] = json.loads(r[field] or '[]')
            except Exception:
                r[field] = []
        projects.append(r)
    return projects


# ── Historique ─────────────────────────────────────────────────────────────

def save_analysis(results: dict):
    """
    Sauvegarde les métriques d'une analyse pour toutes les marques.
    Compatible multi-modèles : stocke un enregistrement par marque par modèle.
    """
    if not results or 'responses' not in results:
        return

    from analyzer import BrandAnalyzer
    brand       = results.get('brand', 'Unknown')
    competitors = results.get('competitors', [])
    all_brands  = [brand] + competitors
    timestamp   = results.get('timestamp', datetime.now().isoformat())
    llms_used   = results.get('llms_used', ['qwen3.5'])

    # Regrouper les analyses par modèle
    analyses_by_model: dict = {m: [] for m in llms_used}
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            if llm_name in analyses_by_model:
                analyses_by_model[llm_name].append(data['analysis'])

    conn = get_db_connection()
    cur  = conn.cursor()
    ph   = _ph()

    for model, analyses in analyses_by_model.items():
        if not analyses:
            continue
        analyzer = BrandAnalyzer(brands=all_brands)
        metrics  = analyzer.calculate_metrics(analyses)

        for b, m in metrics.items():
            cur.execute(f'''
                INSERT INTO analysis_history
                (timestamp, brand, model, share_of_voice, global_score,
                 mention_rate, avg_position, top_of_mind, sentiment_score)
                VALUES ({ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph},{ph})
            ''', (
                timestamp, b, model,
                m.get('share_of_voice', 0),
                m.get('global_score', 0),
                m.get('mention_rate', 0),
                m.get('avg_position', 99),
                m.get('top_of_mind', 0),
                m.get('sentiment_score', 0)
            ))

    conn.commit()
    conn.close()
    print(f"[DATABASE] Analyse sauvegardée — {brand} / {llms_used}")

    # Met à jour last_run du projet
    try:
        upsert_project(brand)
    except Exception:
        pass


def get_history(brand: str = None, days: int = 30, model: str = None) -> list:
    """
    Retourne l'historique formaté pour le TrendChart.
    Filtrable par marque et/ou modèle.
    """
    conn = get_db_connection()
    cur  = conn.cursor()
    ph   = _ph()

    cutoff = (datetime.now() - timedelta(days=days)).isoformat()

    query  = f'SELECT timestamp, brand, model, global_score FROM analysis_history WHERE timestamp > {ph}'
    params = [cutoff]

    if brand:
        query += f' AND brand = {ph}'
        params.append(brand)
    if model:
        query += f' AND model = {ph}'
        params.append(model)

    query += ' ORDER BY timestamp ASC'
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    history = {}
    for row in rows:
        r = dict(row)
        try:
            date_key = datetime.fromisoformat(r['timestamp']).strftime('%d/%m')
        except Exception:
            date_key = r['timestamp'][:10]

        if date_key not in history:
            history[date_key] = {'date': date_key}
        history[date_key][r['brand']] = round(r['global_score'], 2)

    return list(history.values())


def generate_demo_history(brand: str = 'Marque', competitors: list = None, days: int = 30) -> list:
    """Historique fictif pour le mode démo — scores stables basés sur le nom."""
    competitors = competitors or ['Concurrent A', 'Concurrent B', 'Concurrent C']
    all_brands  = [brand] + competitors
    today       = datetime.now()
    history     = []

    def base_score(b):
        seed = abs(hash(b)) % 10000
        rng  = random.Random(seed)
        return 30 + rng.random() * 55

    bases = {b: base_score(b) for b in all_brands}

    for i in range(days):
        date   = today - timedelta(days=days - i)
        entry  = {'date': date.strftime('%d/%m')}
        for b in all_brands:
            rng   = random.Random(abs(hash(b + str(i))) % 10000)
            noise = (rng.random() - 0.5) * 6
            trend = (i / days) * 3 if b == brand else 0
            entry[b] = round(max(0, min(100, bases[b] + noise + trend)), 1)
        history.append(entry)

    return history
