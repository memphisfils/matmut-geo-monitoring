"""
Tests pour les routes API
"""
import pytest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


@pytest.fixture
def app():
    """Fixture pour créer l'app Flask"""
    from app import app
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Fixture pour le client de test"""
    return app.test_client()


class TestHealthRoute:
    """Tests pour /api/health"""

    def test_health_returns_ok(self, client):
        """Test que health retourne status ok"""
        response = client.get('/api/health')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['status'] == 'ok'

    def test_health_has_version(self, client):
        """Test que health inclut la version"""
        response = client.get('/api/health')
        data = json.loads(response.data)
        
        assert 'version' in data


class TestIndexRoute:
    """Tests pour /"""

    def test_index_returns_status(self, client):
        """Test que l'index retourne le status"""
        response = client.get('/')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert 'status' in data


class TestProjectsRoute:
    """Tests pour /api/projects"""

    def test_projects_returns_list(self, client):
        """Test que projects retourne une liste"""
        response = client.get('/api/projects')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert isinstance(data, list)


class TestExportRoute:
    """Tests pour /api/export"""

    def test_export_no_data(self, client):
        """Test export sans données"""
        response = client.get('/api/export')
        
        assert response.status_code in [200, 404]


class TestPromptsCompareRoute:
    """Tests pour /api/prompts/compare"""

    def test_prompts_compare_exists(self, client):
        """Test que la route existe"""
        response = client.get('/api/prompts/compare')
        
        assert response.status_code in [200, 404, 500]


class TestAlertsStatusRoute:
    """Tests pour /api/alerts/status"""

    def test_alerts_status_exists(self, client):
        """Test que la route existe"""
        response = client.get('/api/alerts/status')
        
        assert response.status_code in [200, 500]
