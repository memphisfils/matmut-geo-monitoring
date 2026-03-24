"""
Tests pour les prompts (utils/prompts.py)
"""
import pytest
from utils.prompts import build_geo_prompt, GEO_SYSTEM_PROMPT, generate_benchmark_prompt


class TestBuildGeoPrompt:
    """Tests pour build_geo_prompt"""

    def test_build_geo_prompt_single_brand(self):
        """Test avec une seule marque"""
        brands = ["Tesla"]
        result = build_geo_prompt(brands)
        # Prompt contient les instructions GEO
        assert "GEO" in result
        assert "expert" in result.lower()

    def test_build_geo_prompt_multiple_brands(self):
        """Test avec plusieurs marques"""
        brands = ["Tesla", "BMW", "Mercedes"]
        result = build_geo_prompt(brands)
        # Prompt contient les instructions GEO
        assert "GEO" in result
        assert "expert" in result.lower()


class TestGeoSystemPrompt:
    """Tests pour GEO_SYSTEM_PROMPT"""

    def test_geo_system_prompt_exists(self):
        """Test que le prompt système existe"""
        assert GEO_SYSTEM_PROMPT is not None
        assert len(GEO_SYSTEM_PROMPT) > 0

    def test_geo_system_prompt_is_string(self):
        """Test que c'est une chaîne"""
        assert isinstance(GEO_SYSTEM_PROMPT, str)


class TestGenerateBenchmarkPrompt:
    """Tests pour generate_benchmark_prompt"""

    def test_generate_benchmark_prompt_two_brands(self):
        """Test avec 2 marques"""
        brands = ["Tesla", "BMW"]
        result = generate_benchmark_prompt(brands)
        assert "Tesla" in result
        assert "BMW" in result

    def test_generate_benchmark_prompt_multiple_brands(self):
        """Test avec plusieurs marques"""
        brands = ["Tesla", "BMW", "Mercedes", "Audi"]
        result = generate_benchmark_prompt(brands)
        assert all(brand in result for brand in brands)
