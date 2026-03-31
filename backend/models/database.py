"""
Database helpers for GEO Monitor.

- SQLite in local development
- PostgreSQL in production
- User accounts and session-backed project ownership
- Historical metrics per user/project/brand/model
"""
import json
import os
import random
import sqlite3
from datetime import datetime, timedelta

DATABASE_URL = os.getenv('DATABASE_URL')
USE_POSTGRES = bool(DATABASE_URL)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
DB_PATH = os.path.join(DATA_DIR, 'history.db')

if USE_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor


def get_db_connection():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def _ph():
    return '%s' if USE_POSTGRES else '?'


def _row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def _parse_json_fields(record, *fields):
    if not record:
        return record

    for field in fields:
        try:
            record[field] = json.loads(record.get(field) or '[]')
        except Exception:
            record[field] = []
    return record


def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        f'''
        CREATE TABLE IF NOT EXISTS users (
            id            {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            name          TEXT,
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            google_sub    TEXT UNIQUE,
            auth_provider TEXT NOT NULL DEFAULT 'password',
            avatar_url    TEXT,
            created_at    TEXT NOT NULL,
            last_login_at TEXT
        )
        '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    )

    cur.execute(
        f'''
        CREATE TABLE IF NOT EXISTS projects (
            id          {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            user_id     INTEGER,
            brand       TEXT NOT NULL,
            sector      TEXT,
            competitors TEXT,
            prompts     TEXT,
            models      TEXT,
            created_at  TEXT NOT NULL,
            last_run    TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    )

    cur.execute(
        f'''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id              {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            project_id      INTEGER,
            user_id         INTEGER,
            timestamp       TEXT NOT NULL,
            brand           TEXT NOT NULL,
            model           TEXT DEFAULT 'qwen3.5',
            share_of_voice  REAL,
            global_score    REAL,
            mention_rate    REAL,
            avg_position    REAL,
            top_of_mind     REAL,
            sentiment_score REAL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    )

    for statement in (
        "ALTER TABLE analysis_history ADD COLUMN model TEXT DEFAULT 'qwen3.5'",
        "ALTER TABLE projects ADD COLUMN user_id INTEGER",
        "ALTER TABLE analysis_history ADD COLUMN user_id INTEGER",
        "ALTER TABLE analysis_history ADD COLUMN project_id INTEGER",
        "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'password'",
        "ALTER TABLE users ADD COLUMN avatar_url TEXT",
        "ALTER TABLE users ADD COLUMN last_login_at TEXT",
    ):
        try:
            cur.execute(statement)
            conn.commit()
        except Exception:
            pass

    conn.commit()
    conn.close()
    print(f"[DATABASE] Initialized ({'PostgreSQL' if USE_POSTGRES else 'SQLite'})")


def create_user(name: str, email: str, password_hash: str = None, google_sub: str = None,
                auth_provider: str = 'password', avatar_url: str = None) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    now = datetime.now().isoformat()

    cur.execute(
        f'''
        INSERT INTO users (name, email, password_hash, google_sub, auth_provider, avatar_url, created_at, last_login_at)
        VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
        ''',
        (name, email, password_hash, google_sub, auth_provider, avatar_url, now, now)
    )

    if USE_POSTGRES:
        cur.execute('SELECT currval(pg_get_serial_sequence(\'users\', \'id\')) AS id')
        user_id = cur.fetchone()['id']
    else:
        cur.execute('SELECT last_insert_rowid()')
        user_id = cur.fetchone()[0]

    conn.commit()
    conn.close()
    return get_user_by_id(user_id)


def get_user_by_id(user_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    cur.execute(f'SELECT * FROM users WHERE id = {ph}', (user_id,))
    row = cur.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_user_by_email(email: str):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    cur.execute(f'SELECT * FROM users WHERE lower(email) = lower({ph})', (email,))
    row = cur.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_user_by_google_sub(google_sub: str):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    cur.execute(f'SELECT * FROM users WHERE google_sub = {ph}', (google_sub,))
    row = cur.fetchone()
    conn.close()
    return _row_to_dict(row)


def update_user_login(user_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    now = datetime.now().isoformat()
    cur.execute(f'UPDATE users SET last_login_at = {ph} WHERE id = {ph}', (now, user_id))
    conn.commit()
    conn.close()


def attach_google_identity(user_id: int, google_sub: str, avatar_url: str = None):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    user = get_user_by_id(user_id) or {}
    provider = 'hybrid' if user.get('password_hash') else 'google'
    cur.execute(
        f'''
        UPDATE users
        SET google_sub = {ph}, avatar_url = {ph}, auth_provider = {ph}, last_login_at = {ph}
        WHERE id = {ph}
        ''',
        (google_sub, avatar_url, provider, datetime.now().isoformat(), user_id)
    )
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)


def upsert_project(brand: str, sector: str = '', competitors: list = None,
                   prompts: list = None, models: list = None, user_id: int = None) -> int:
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    now = datetime.now().isoformat()
    comp_json = json.dumps(competitors or [])
    prompt_json = json.dumps(prompts or [])
    model_json = json.dumps(models or ['qwen3.5'])

    if user_id is None:
        cur.execute(f'SELECT id FROM projects WHERE brand = {ph} AND user_id IS NULL', (brand,))
    else:
        cur.execute(f'SELECT id FROM projects WHERE brand = {ph} AND user_id = {ph}', (brand, user_id))

    row = cur.fetchone()

    if row:
        project_id = row['id'] if isinstance(row, dict) else row[0] if USE_POSTGRES else row['id']
        if user_id is None:
            cur.execute(
                f'''
                UPDATE projects
                SET sector = {ph}, competitors = {ph}, prompts = {ph}, models = {ph}, last_run = {ph}
                WHERE brand = {ph} AND user_id IS NULL
                ''',
                (sector, comp_json, prompt_json, model_json, now, brand)
            )
        else:
            cur.execute(
                f'''
                UPDATE projects
                SET sector = {ph}, competitors = {ph}, prompts = {ph}, models = {ph}, last_run = {ph}
                WHERE brand = {ph} AND user_id = {ph}
                ''',
                (sector, comp_json, prompt_json, model_json, now, brand, user_id)
            )
    else:
        cur.execute(
            f'''
            INSERT INTO projects (user_id, brand, sector, competitors, prompts, models, created_at, last_run)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            ''',
            (user_id, brand, sector, comp_json, prompt_json, model_json, now, now)
        )
        if USE_POSTGRES:
            cur.execute('SELECT currval(pg_get_serial_sequence(\'projects\', \'id\')) AS id')
            project_id = cur.fetchone()['id']
        else:
            cur.execute('SELECT last_insert_rowid()')
            project_id = cur.fetchone()[0]

    conn.commit()
    conn.close()
    return project_id


def get_all_projects(user_id: int = None) -> list:
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    if user_id is None:
        cur.execute('SELECT * FROM projects ORDER BY last_run DESC')
    else:
        cur.execute(f'SELECT * FROM projects WHERE user_id = {ph} ORDER BY last_run DESC', (user_id,))

    rows = cur.fetchall()
    conn.close()

    projects = []
    for row in rows:
        project = _row_to_dict(row)
        projects.append(_parse_json_fields(project, 'competitors', 'prompts', 'models'))
    return projects


def get_project_by_id(project_id: int, user_id: int = None):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    if user_id is None:
        cur.execute(f'SELECT * FROM projects WHERE id = {ph}', (project_id,))
    else:
        cur.execute(f'SELECT * FROM projects WHERE id = {ph} AND user_id = {ph}', (project_id, user_id))

    row = cur.fetchone()
    conn.close()
    project = _row_to_dict(row)
    return _parse_json_fields(project, 'competitors', 'prompts', 'models')


def save_analysis(results: dict, user_id: int = None, project_id: int = None):
    if not results or 'responses' not in results:
        return

    from services.analyzer import BrandAnalyzer

    brand = results.get('brand', 'Unknown')
    competitors = results.get('competitors', [])
    all_brands = [brand] + competitors
    timestamp = results.get('timestamp', datetime.now().isoformat())
    llms_used = results.get('llms_used', ['qwen3.5'])

    analyses_by_model = {model: [] for model in llms_used}
    for response in results['responses']:
        for llm_name, data in response.get('llm_analyses', {}).items():
            if llm_name in analyses_by_model:
                analyses_by_model[llm_name].append(data['analysis'])

    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    for model, analyses in analyses_by_model.items():
        if not analyses:
            continue

        analyzer = BrandAnalyzer(brands=all_brands)
        metrics = analyzer.calculate_metrics(analyses)

        for metric_brand, metric in metrics.items():
            cur.execute(
                f'''
                INSERT INTO analysis_history
                (project_id, user_id, timestamp, brand, model, share_of_voice, global_score,
                 mention_rate, avg_position, top_of_mind, sentiment_score)
                VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
                ''',
                (
                    project_id, user_id, timestamp, metric_brand, model,
                    metric.get('share_of_voice', 0),
                    metric.get('global_score', 0),
                    metric.get('mention_rate', 0),
                    metric.get('avg_position', 99),
                    metric.get('top_of_mind', 0),
                    metric.get('sentiment_score', 0)
                )
            )

    conn.commit()
    conn.close()
    print(f"[DATABASE] Analysis saved - {brand} / {llms_used}")

    try:
        upsert_project(brand, user_id=user_id)
    except Exception:
        pass


def get_history(brand: str = None, days: int = 30, model: str = None,
                user_id: int = None, project_id: int = None) -> list:
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    query = f'SELECT timestamp, brand, model, global_score FROM analysis_history WHERE timestamp > {ph}'
    params = [cutoff]

    if brand:
        query += f' AND brand = {ph}'
        params.append(brand)
    if model:
        query += f' AND model = {ph}'
        params.append(model)
    if user_id is not None:
        query += f' AND user_id = {ph}'
        params.append(user_id)
    if project_id is not None:
        query += f' AND project_id = {ph}'
        params.append(project_id)

    query += ' ORDER BY timestamp ASC'
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    history = {}
    for row in rows:
        record = _row_to_dict(row)
        try:
            date_key = datetime.fromisoformat(record['timestamp']).strftime('%d/%m')
        except Exception:
            date_key = record['timestamp'][:10]

        if date_key not in history:
            history[date_key] = {'date': date_key}
        history[date_key][record['brand']] = round(record['global_score'], 2)

    return list(history.values())


def generate_demo_history(brand: str = 'Marque', competitors: list = None, days: int = 30) -> list:
    competitors = competitors or ['Concurrent A', 'Concurrent B', 'Concurrent C']
    all_brands = [brand] + competitors
    today = datetime.now()
    history = []

    def base_score(current_brand):
        seed = abs(hash(current_brand)) % 10000
        rng = random.Random(seed)
        return 30 + rng.random() * 55

    bases = {brand_name: base_score(brand_name) for brand_name in all_brands}

    for i in range(days):
        date = today - timedelta(days=days - i)
        entry = {'date': date.strftime('%d/%m')}
        for brand_name in all_brands:
            rng = random.Random(abs(hash(brand_name + str(i))) % 10000)
            noise = (rng.random() - 0.5) * 6
            trend = (i / days) * 3 if brand_name == brand else 0
            entry[brand_name] = round(max(0, min(100, bases[brand_name] + noise + trend)), 1)
        history.append(entry)

    return history
