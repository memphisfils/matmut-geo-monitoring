"""
Fixtures partagées pour les tests backend
"""
import os
import sys
import pytest
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_env():
    """Fixture pour variables d'environnement mockées"""
    old_env = os.environ.copy()
    os.environ['DATABASE_URL'] = ''
    os.environ['OLLAMA_API_KEY'] = 'test_key'
    os.environ['OLLAMA_MODEL'] = 'qwen3.5'
    yield os.environ
    os.environ.clear()
    os.environ.update(old_env)


@pytest.fixture
def sample_brand():
    """Fixture pour une marque de test"""
    return "Tesla"


@pytest.fixture
def sample_brands():
    """Fixture pour plusieurs marques"""
    return ["Tesla", "BMW", "Mercedes", "Audi"]


@pytest.fixture
def sample_competitors():
    """Fixture pour les concurrents"""
    return ["BMW", "Mercedes", "Audi", "Volkswagen", "Porsche"]


@pytest.fixture
def sample_prompts():
    """Fixture pour les prompts de test"""
    return [
        "Quelle est la meilleure voiture électrique en 2024 ?",
        "Comparatif Tesla vs BMW",
        "Meilleur rapport qualité-prix voiture allemande",
    ]


@pytest.fixture
def sample_analysis_result():
    """Fixture pour un résultat d'analyse"""
    return {
        'brand': 'Tesla',
        'competitors': ['BMW', 'Mercedes'],
        'responses': [
            {
                'prompt': 'Quelle est la meilleure voiture électrique ?',
                'llm_analyses': {
                    'qwen3.5': {
                        'response': 'Tesla est la meilleure marque...',
                        'analysis': {
                            'brands_mentioned': ['Tesla', 'BMW'],
                            'positions': {'Tesla': 1, 'BMW': 2},
                            'first_brand': 'Tesla',
                            'brand_mentioned': True,
                            'brand_position': 1,
                            'sentiment': 'positive'
                        }
                    }
                }
            }
        ],
        'timestamp': '2024-01-15T10:00:00',
        'is_demo': False
    }


@pytest.fixture
def sample_metrics():
    """Fixture pour les métriques calculées"""
    return {
        'Tesla': {
            'mention_rate': 80.0,
            'avg_position': 1.5,
            'share_of_voice': 40.0,
            'top_of_mind': 60.0,
            'sentiment_score': 0.8,
            'global_score': 72.5
        },
        'BMW': {
            'mention_rate': 60.0,
            'avg_position': 2.0,
            'share_of_voice': 30.0,
            'top_of_mind': 30.0,
            'sentiment_score': 0.6,
            'global_score': 54.0
        }
    }


@pytest.fixture
def temp_results_file():
    """Fixture pour un fichier results.json temporaire"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name
    yield temp_path
    if os.path.exists(temp_path):
        os.remove(temp_path)
