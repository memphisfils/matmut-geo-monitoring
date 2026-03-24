"""
Tests pour BrandAnalyzer (services/analyzer.py)
"""
import pytest
from services.analyzer import BrandAnalyzer


class TestBrandAnalyzer:
    """Tests unitaires pour BrandAnalyzer"""

    def test_init_default_brands(self):
        """Test initialization avec marques par défaut"""
        analyzer = BrandAnalyzer()
        assert analyzer.brands is not None

    def test_init_custom_brands(self, sample_brands):
        """Test initialization avec marques personnalisées"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        assert analyzer.brands == sample_brands

    def test_normalize(self):
        """Test normalisation du texte"""
        analyzer = BrandAnalyzer(brands=["Test"])
        result = analyzer._normalize("École")
        assert result == "ecole"

    def test_normalize_uppercase(self):
        """Test normalisation avec majuscules"""
        analyzer = BrandAnalyzer(brands=["Test"])
        result = analyzer._normalize("TÉLA")
        assert result == "tela"

    def test_normalize_empty(self):
        """Test normalisation chaîne vide"""
        analyzer = BrandAnalyzer(brands=["Test"])
        result = analyzer._normalize("")
        assert result == ""


class TestExtractBrands:
    """Tests pour l'extraction de marques"""

    def test_extract_brand_mentioned(self, sample_brands):
        """Test extraction marque mentionnée"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        text = "Tesla est la meilleure marque de voitures électriques."
        result = analyzer.extract_brands(text)
        # Returns list of tuples [(brand, position), ...]
        brands_found = [b[0] for b in result]
        assert "Tesla" in brands_found

    def test_extract_multiple_brands(self, sample_brands):
        """Test extraction de plusieurs marques"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        text = "Tesla et BMW sont les leaders du marché électrique."
        result = analyzer.extract_brands(text)
        brands_found = [b[0] for b in result]
        assert "Tesla" in brands_found
        assert "BMW" in brands_found

    def test_extract_no_brand(self, sample_brands):
        """Test extraction sans marque"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        text = "Les voitures sont pratiques."
        result = analyzer.extract_brands(text)
        assert len(result) == 0

    def test_extract_with_accent(self, sample_brands):
        """Test extraction avec accents"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        text = "Mercedes propose des véhicules de qualité."
        result = analyzer.extract_brands(text)
        brands_found = [b[0] for b in result]
        assert "Mercedes" in brands_found


class TestCalculateMetrics:
    """Tests pour le calcul des métriques"""

    def test_calculate_metrics_basic(self, sample_brands):
        """Test calcul métriques basique"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        analyses = [
            {
                'brands_mentioned': ['Tesla', 'BMW'],
                'positions': {'Tesla': 1, 'BMW': 2},
                'first_brand': 'Tesla',
                'brand_mentioned': True,
                'brand_position': 1,
                'sentiment': 'positive'
            },
            {
                'brands_mentioned': ['Tesla'],
                'positions': {'Tesla': 1},
                'first_brand': 'Tesla',
                'brand_mentioned': True,
                'brand_position': 1,
                'sentiment': 'positive'
            }
        ]
        metrics = analyzer.calculate_metrics(analyses)
        
        assert 'Tesla' in metrics
        assert metrics['Tesla']['mention_rate'] == 100.0
        assert metrics['Tesla']['top_of_mind'] == 100.0

    def test_calculate_metrics_empty(self, sample_brands):
        """Test avec analyses vides - retourne metrics pour toutes les marques"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        metrics = analyzer.calculate_metrics([])
        # Retourne metrics pour toutes les brands (zéro)
        assert len(metrics) == len(sample_brands)
        assert all(m['mention_count'] == 0 for m in metrics.values())


class TestGenerateRanking:
    """Tests pour le génération du classement"""

    def test_generate_ranking_sorted(self, sample_brands, sample_metrics):
        """Test que le ranking est trié par score"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        ranking = analyzer.generate_ranking(sample_metrics)
        
        assert ranking[0]['brand'] == 'Tesla'
        assert ranking[0]['rank'] == 1
        assert ranking[1]['brand'] == 'BMW'
        assert ranking[1]['rank'] == 2

    def test_generate_ranking_empty(self, sample_brands):
        """Test ranking vide"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        ranking = analyzer.generate_ranking({})
        assert ranking == []


class TestGenerateInsights:
    """Tests pour la génération d'insights"""

    def test_generate_insights_main_brand(self, sample_brands, sample_metrics):
        """Test insights pour marque principale"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        ranking = analyzer.generate_ranking(sample_metrics)
        insights = analyzer.generate_insights(sample_metrics, ranking, main_brand='Tesla')
        
        assert insights['rank'] == 1
        assert 'strengths' in insights
        assert 'weaknesses' in insights

    def test_generate_insights_unknown_brand(self, sample_brands, sample_metrics):
        """Test insights marque inconnue"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        ranking = analyzer.generate_ranking(sample_metrics)
        insights = analyzer.generate_insights(sample_metrics, ranking, main_brand='Inconnu')
        
        assert insights['rank'] is None


class TestConfidenceScore:
    """Tests pour le score de confiance"""

    def test_confidence_single_model(self, sample_brands):
        """Test confiance avec un seul modèle"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        metrics_by_model = {
            'qwen3.5': {
                'Tesla': {'mention_rate': 80.0}
            }
        }
        result = analyzer.calculate_confidence_score(metrics_by_model, 'Tesla')
        
        assert result['confidence'] is None
        assert 'N/A' in result['divergence_level']

    def test_confidence_multiple_models(self, sample_brands):
        """Test confiance avec plusieurs modèles"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        metrics_by_model = {
            'qwen3.5': {'Tesla': {'mention_rate': 80.0}},
            'llama3.2': {'Tesla': {'mention_rate': 85.0}},
        }
        result = analyzer.calculate_confidence_score(metrics_by_model, 'Tesla')
        
        assert result['confidence'] is not None
        assert result['std_dev'] > 0

    def test_confidence_empty(self, sample_brands):
        """Test confiance vide"""
        analyzer = BrandAnalyzer(brands=sample_brands)
        result = analyzer.calculate_confidence_score({}, 'Tesla')
        
        assert result['confidence'] is None
