"""
Tests pour database (models/database.py)
"""
import pytest
import os
import tempfile
from models.database import init_db, get_all_projects, generate_demo_history


class TestDatabase:
    """Tests pour les fonctions database"""

    def test_init_db(self, tmp_path, monkeypatch):
        """Test initialisation database"""
        test_db = tmp_path / "test.db"
        monkeypatch.setattr('models.database.DB_PATH', str(test_db))
        
        init_db()
        
        assert os.path.exists(test_db)

    def test_get_all_projects_empty(self, tmp_path, monkeypatch):
        """Test get_all_projects sans données"""
        test_db = tmp_path / "test.db"
        monkeypatch.setattr('models.database.DB_PATH', str(test_db))
        
        init_db()
        projects = get_all_projects()
        
        assert isinstance(projects, list)

    def test_generate_demo_history(self, sample_brand, sample_competitors):
        """Test génération historique démo"""
        history = generate_demo_history(sample_brand, sample_competitors, days=7)
        
        assert isinstance(history, list)
        assert len(history) <= 7

    def test_generate_demo_history_default(self):
        """Test génération historique par défaut"""
        history = generate_demo_history()
        
        assert isinstance(history, list)
        assert len(history) > 0
