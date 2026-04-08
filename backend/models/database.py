"""
Database helpers for GEO Monitor.

- SQLite in local development
- PostgreSQL in production
- User accounts and session-backed project ownership
- Historical metrics per user/project/brand/model
"""
import base64
import hashlib
import json
import os
import random
import sqlite3
from datetime import datetime, timedelta

try:
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:  # pragma: no cover - dependency should exist in prod
    Fernet = None
    InvalidToken = Exception

DATABASE_URL = os.getenv('DATABASE_URL')
USE_POSTGRES = bool(DATABASE_URL)
ALERT_CHANNEL_KEYS = ('slack', 'email', 'telegram')

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


def _alert_settings_key():
    secret = (
        os.getenv('ALERT_SETTINGS_ENCRYPTION_KEY')
        or os.getenv('FLASK_SECRET_KEY')
        or os.getenv('SECRET_KEY')
        or 'geo-monitor-dev-secret'
    )
    if not secret or not Fernet:
        return None
    digest = hashlib.sha256(secret.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest)


def _encrypt_config_payload(payload: dict) -> str:
    raw = json.dumps(payload or {})
    key = _alert_settings_key()
    if not key:
        return raw
    return 'enc::' + Fernet(key).encrypt(raw.encode('utf-8')).decode('utf-8')


def _decrypt_config_payload(value: str) -> dict:
    raw = value or '{}'
    if not raw:
        return {}
    if raw.startswith('enc::'):
        key = _alert_settings_key()
        if not key:
            return {}
        try:
            decrypted = Fernet(key).decrypt(raw[5:].encode('utf-8')).decode('utf-8')
            return json.loads(decrypted or '{}')
        except (InvalidToken, ValueError, TypeError, json.JSONDecodeError):
            return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}


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

    cur.execute(
        f'''
        CREATE TABLE IF NOT EXISTS prompt_history (
            id              {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            project_id      INTEGER,
            user_id         INTEGER,
            timestamp       TEXT NOT NULL,
            brand           TEXT NOT NULL,
            prompt          TEXT NOT NULL,
            mention_rate    REAL,
            avg_position    REAL,
            top_of_mind     REAL,
            score           REAL,
            models_count    INTEGER,
            brand_mentioned INTEGER DEFAULT 0,
            rank_position   INTEGER,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    )

    cur.execute(
        f'''
        CREATE TABLE IF NOT EXISTS alert_channel_settings (
            id          {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            user_id     INTEGER NOT NULL,
            project_id  INTEGER,
            channel     TEXT NOT NULL,
            enabled     INTEGER DEFAULT 0,
            config      TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(user_id, project_id, channel)
        )
        '''.replace('INTEGER  PRIMARY KEY AUTOINCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    )

    cur.execute(
        f'''
        CREATE TABLE IF NOT EXISTS alert_rule_settings (
            id          {'SERIAL' if USE_POSTGRES else 'INTEGER'} PRIMARY KEY {'AUTOINCREMENT' if not USE_POSTGRES else ''},
            user_id     INTEGER NOT NULL,
            project_id  INTEGER,
            alert_id    TEXT NOT NULL,
            enabled     INTEGER DEFAULT 1,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(user_id, project_id, alert_id)
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


def _load_alert_scope_rows(table: str, key_field: str, user_id: int, project_id: int = None) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    merged = {}

    cur.execute(
        f'SELECT * FROM {table} WHERE user_id = {ph} AND project_id IS NULL',
        (user_id,)
    )
    for row in cur.fetchall():
        record = _row_to_dict(row)
        merged[record[key_field]] = record

    if project_id is not None:
        cur.execute(
            f'SELECT * FROM {table} WHERE user_id = {ph} AND project_id = {ph}',
            (user_id, project_id)
        )
        for row in cur.fetchall():
            record = _row_to_dict(row)
            merged[record[key_field]] = record

    conn.close()
    return merged


def upsert_alert_channel_setting(user_id: int, channel: str, enabled: bool = False,
                                 config: dict = None, project_id: int = None):
    if channel not in ALERT_CHANNEL_KEYS:
        raise ValueError(f'Unsupported alert channel: {channel}')

    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    now = datetime.now().isoformat()
    config_json = _encrypt_config_payload(config or {})

    if project_id is None:
        cur.execute(
            f'SELECT id FROM alert_channel_settings WHERE user_id = {ph} AND project_id IS NULL AND channel = {ph}',
            (user_id, channel)
        )
    else:
        cur.execute(
            f'SELECT id FROM alert_channel_settings WHERE user_id = {ph} AND project_id = {ph} AND channel = {ph}',
            (user_id, project_id, channel)
        )

    row = cur.fetchone()
    if row:
        row_id = _row_to_dict(row)['id']
        cur.execute(
            f'''
            UPDATE alert_channel_settings
            SET enabled = {ph}, config = {ph}, updated_at = {ph}
            WHERE id = {ph}
            ''',
            (1 if enabled else 0, config_json, now, row_id)
        )
    else:
        cur.execute(
            f'''
            INSERT INTO alert_channel_settings (user_id, project_id, channel, enabled, config, created_at, updated_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            ''',
            (user_id, project_id, channel, 1 if enabled else 0, config_json, now, now)
        )

    conn.commit()
    conn.close()


def upsert_alert_rule_setting(user_id: int, alert_id: str, enabled: bool = True, project_id: int = None):
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()
    now = datetime.now().isoformat()

    if project_id is None:
        cur.execute(
            f'SELECT id FROM alert_rule_settings WHERE user_id = {ph} AND project_id IS NULL AND alert_id = {ph}',
            (user_id, alert_id)
        )
    else:
        cur.execute(
            f'SELECT id FROM alert_rule_settings WHERE user_id = {ph} AND project_id = {ph} AND alert_id = {ph}',
            (user_id, project_id, alert_id)
        )

    row = cur.fetchone()
    if row:
        row_id = _row_to_dict(row)['id']
        cur.execute(
            f'''
            UPDATE alert_rule_settings
            SET enabled = {ph}, updated_at = {ph}
            WHERE id = {ph}
            ''',
            (1 if enabled else 0, now, row_id)
        )
    else:
        cur.execute(
            f'''
            INSERT INTO alert_rule_settings (user_id, project_id, alert_id, enabled, created_at, updated_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            ''',
            (user_id, project_id, alert_id, 1 if enabled else 0, now, now)
        )

    conn.commit()
    conn.close()


def get_alert_preferences(user_id: int, project_id: int = None) -> dict:
    from catalogs import get_alert_catalog

    raw_channels = _load_alert_scope_rows('alert_channel_settings', 'channel', user_id, project_id)
    raw_rules = _load_alert_scope_rows('alert_rule_settings', 'alert_id', user_id, project_id)

    channels = {}
    for channel in ALERT_CHANNEL_KEYS:
        record = raw_channels.get(channel) or {}
        config = _decrypt_config_payload(record.get('config'))
        channels[channel] = {
            'enabled': bool(record.get('enabled', 0)),
            'config': config,
            'source': 'project' if record.get('project_id') is not None else ('user' if record else 'default')
        }

    rules = {}
    for alert in get_alert_catalog():
        alert_id = alert['id']
        record = raw_rules.get(alert_id) or {}
        default_enabled = alert.get('severity') in ('critical', 'high')
        rules[alert_id] = {
            **alert,
            'enabled': bool(record.get('enabled', default_enabled)),
            'source': 'project' if record.get('project_id') is not None else ('user' if record else 'default')
        }

    return {
        'project_id': project_id,
        'channels': channels,
        'rules': rules
    }


def _extract_prompt_metrics(results: dict, brand: str) -> list:
    prompt_metrics = []

    for response in results.get('responses', []):
        prompt = (response.get('prompt') or '').strip()
        if not prompt:
            continue

        analyses_for_prompt = [
            data.get('analysis', {})
            for data in response.get('llm_analyses', {}).values()
            if data.get('analysis')
        ]
        total_models = len(analyses_for_prompt)
        if total_models == 0:
            continue

        mentions = sum(1 for analysis in analyses_for_prompt if brand in analysis.get('brands_mentioned', []))
        mention_rate = round(mentions / total_models * 100, 1)
        positions = [
            analysis.get('positions', {}).get(brand)
            for analysis in analyses_for_prompt
            if analysis.get('positions', {}).get(brand) is not None
        ]
        avg_position = round(sum(positions) / len(positions), 2) if positions else None
        first_counts = sum(1 for analysis in analyses_for_prompt if analysis.get('first_brand') == brand)
        top_of_mind = round(first_counts / total_models * 100, 1)
        score = round(
            mention_rate * 0.5 +
            ((100 / avg_position) if avg_position and avg_position > 0 else 0) * 0.3 +
            top_of_mind * 0.2,
            1
        )

        prompt_metrics.append({
            'prompt': prompt,
            'mention_rate': mention_rate,
            'avg_position': avg_position,
            'top_of_mind': top_of_mind,
            'score': score,
            'models_count': total_models,
            'brand_mentioned': mentions > 0
        })

    prompt_metrics.sort(key=lambda item: (-item['score'], item['prompt']))
    for index, item in enumerate(prompt_metrics, start=1):
        item['rank_position'] = index

    return prompt_metrics


def save_analysis(results: dict, user_id: int = None, project_id: int = None):
    if not results or 'responses' not in results:
        return

    from services.analyzer import BrandAnalyzer

    brand = results.get('brand') or results.get('main_brand', 'Unknown')
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

    for prompt_metric in _extract_prompt_metrics(results, brand):
        cur.execute(
            f'''
            INSERT INTO prompt_history
            (project_id, user_id, timestamp, brand, prompt, mention_rate, avg_position,
             top_of_mind, score, models_count, brand_mentioned, rank_position)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            ''',
            (
                project_id, user_id, timestamp, brand,
                prompt_metric['prompt'],
                prompt_metric['mention_rate'],
                prompt_metric['avg_position'],
                prompt_metric['top_of_mind'],
                prompt_metric['score'],
                prompt_metric['models_count'],
                1 if prompt_metric['brand_mentioned'] else 0,
                prompt_metric['rank_position']
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


def get_previous_prompt_run(brand: str, current_timestamp: str,
                            user_id: int = None, project_id: int = None) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    ph = _ph()

    timestamp_query = f'SELECT DISTINCT timestamp FROM prompt_history WHERE brand = {ph} AND timestamp < {ph}'
    timestamp_params = [brand, current_timestamp]

    if user_id is not None:
        timestamp_query += f' AND user_id = {ph}'
        timestamp_params.append(user_id)
    if project_id is not None:
        timestamp_query += f' AND project_id = {ph}'
        timestamp_params.append(project_id)

    timestamp_query += ' ORDER BY timestamp DESC LIMIT 1'
    cur.execute(timestamp_query, timestamp_params)
    timestamp_row = cur.fetchone()

    if not timestamp_row:
        conn.close()
        return {'timestamp': None, 'snapshot': {}}

    previous_timestamp = timestamp_row['timestamp'] if isinstance(timestamp_row, dict) else timestamp_row[0]

    snapshot_query = f'''
        SELECT prompt, mention_rate, avg_position, top_of_mind, score, models_count,
               brand_mentioned, rank_position
        FROM prompt_history
        WHERE brand = {ph} AND timestamp = {ph}
    '''
    snapshot_params = [brand, previous_timestamp]

    if user_id is not None:
        snapshot_query += f' AND user_id = {ph}'
        snapshot_params.append(user_id)
    if project_id is not None:
        snapshot_query += f' AND project_id = {ph}'
        snapshot_params.append(project_id)

    cur.execute(snapshot_query, snapshot_params)
    rows = cur.fetchall()
    conn.close()

    snapshot = {}
    for row in rows:
        record = _row_to_dict(row)
        snapshot[record['prompt']] = record

    return {'timestamp': previous_timestamp, 'snapshot': snapshot}


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
