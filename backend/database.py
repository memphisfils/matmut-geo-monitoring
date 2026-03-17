"""
Database module - Supporte SQLite (dev) et PostgreSQL (prod)
"""
import os
import sqlite3
from datetime import datetime, timedelta

# Détection automatique de la base de données
DATABASE_URL = os.getenv('DATABASE_URL')
USE_POSTGRES = DATABASE_URL is not None

if USE_POSTGRES:
    # PostgreSQL pour production
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    def get_db_connection():
        return psycopg2.connect(DATABASE_URL)
else:
    # SQLite pour développement
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
    DB_PATH = os.path.join(DATA_DIR, 'history.db')
    
    def get_db_connection():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    """Initialise la base de données"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            brand TEXT NOT NULL,
            share_of_voice REAL,
            global_score REAL,
            mention_rate REAL,
            avg_position REAL
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"[DATABASE] Initialized ({'PostgreSQL' if USE_POSTGRES else 'SQLite'})")

def save_analysis(results):
    """Sauvegarde les résultats d'une analyse"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    brand = results.get('brand', 'Unknown')
    timestamp = results.get('timestamp', datetime.now().isoformat())
    
    # Calcul des métriques globales
    all_analyses = []
    for response in results['responses']:
        for llm_name, data in response['llm_analyses'].items():
            all_analyses.append(data['analysis'])
    
    from analyzer import BrandAnalyzer
    analyzer = BrandAnalyzer(brands=[brand] + results.get('competitors', []))
    metrics = analyzer.calculate_metrics(all_analyses)
    
    for brand_name, data in metrics.items():
        cursor.execute('''
            INSERT INTO analysis_history 
            (timestamp, brand, share_of_voice, global_score, mention_rate, avg_position)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            timestamp,
            brand_name,
            data.get('share_of_voice', 0),
            data.get('global_score', 0),
            data.get('mention_rate', 0),
            data.get('avg_position', 99)
        ))
    
    conn.commit()
    conn.close()
    print(f"[DATABASE] Saved analysis for {brand}")

def get_history(days=30):
    """Récupère l'historique des analyses"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    cursor.execute('''
        SELECT timestamp, brand, global_score 
        FROM analysis_history 
        WHERE timestamp > ?
        ORDER BY timestamp ASC
    ''', (cutoff_date,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Format pour le frontend
    history = {}
    for row in rows:
        date = row['timestamp'][:10]  # YYYY-MM-DD
        brand = row['brand']
        score = row['global_score']
        
        if date not in history:
            history[date] = {'date': date}
        history[date][brand] = round(score, 2)
    
    return list(history.values())

def generate_demo_history():
    """Génère un historique démo"""
    import random
    today = datetime.now()
    history = []
    
    for i in range(30):
        date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        history.append({
            'date': date,
            'Marque': round(60 + random.uniform(-10, 10), 2),
            'Concurrent A': round(55 + random.uniform(-10, 10), 2),
            'Concurrent B': round(50 + random.uniform(-10, 10), 2),
        })
    
    return list(reversed(history))
