import sqlite3
import os
from datetime import datetime, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'history.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialise la base de données et la table historique"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    conn.execute('''
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

def save_analysis(results):
    """Sauvegarde les métriques d'une analyse pour toutes les marques"""
    if not results or 'metrics' not in results:
        return
    
    conn = get_db_connection()
    timestamp = results.get('timestamp', datetime.now().isoformat())
    
    for brand, metrics in results['metrics'].items():
        conn.execute('''
            INSERT INTO analysis_history 
            (timestamp, brand, share_of_voice, global_score, mention_rate, avg_position)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            timestamp,
            brand,
            metrics.get('share_of_voice', 0),
            metrics.get('global_score', 0),
            metrics.get('mention_rate', 0),
            metrics.get('avg_position', 0)
        ))
    
    conn.commit()
    conn.close()

def get_history(days=30):
    """Récupère l'historique agrégé pour les graphiques"""
    conn = get_db_connection()
    # On récupère les N derniers points de données (approximativement les N jours)
    # Pour simplifier, on prend tout et on filtrera/limitera si nécessaire
    cursor = conn.execute('''
        SELECT timestamp, brand, share_of_voice, global_score 
        FROM analysis_history 
        ORDER BY timestamp ASC
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    # Transformer en format compatible Recharts:
    # [ { date: '2023-01-01', Matmut: 12, AXA: 15 }, ... ]
    
    data_by_date = {}
    
    for row in rows:
        # Simplifier la date pour l'affichage (Jour/Mois)
        try:
            dt = datetime.fromisoformat(row['timestamp'])
            date_key = dt.strftime('%d/%m') # Ex: 12/02
        except:
            date_key = row['timestamp'][:10]
            
        if date_key not in data_by_date:
            data_by_date[date_key] = {'date': date_key, 'full_date': row['timestamp']}
        
        # On stocke le Global Score (ou SoV, au choix)
        # Ici on prend Global Score car c'est la métrique reine
        data_by_date[date_key][row['brand']] = row['global_score']
        
    return list(data_by_date.values())

def generate_demo_history(days=30):
    """Génère un historique fictif réaliste sur 30 jours pour le mode démo/développement"""
    history = []
    base_scores = {
        'Matmut': 40, 'MAIF': 55, 'AXA': 50, 'MACIF': 43
    }
    
    now = datetime.now()
    
    for i in range(days):
        date = now - timedelta(days=days-i)
        date_str = date.strftime('%d/%m')
        
        entry = {'date': date_str}
        
        # Simuler une évolution organique
        for brand, base in base_scores.items():
            # Random walk: on ajoute un petit delta aléatoire
            noise = random.uniform(-3, 3)
            # Tendance positive pour Matmut (scénario sympa)
            trend = 0.2 * i if brand == 'Matmut' else 0
            
            score = base + noise + trend
            entry[brand] = round(score, 1)
            
        history.append(entry)
        
    return history
