import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import app as app_module
import models.database as db_module


@pytest.fixture
def auth_app(tmp_path, monkeypatch):
    data_dir = tmp_path / 'data'
    db_path = data_dir / 'history.db'

    monkeypatch.setattr(db_module, 'DATA_DIR', str(data_dir))
    monkeypatch.setattr(db_module, 'DB_PATH', str(db_path))
    monkeypatch.setattr(app_module, 'DATA_DIR', str(data_dir))
    monkeypatch.setattr(app_module, 'RESULTS_FILE', str(data_dir / 'results.json'))
    monkeypatch.setattr(app_module, 'RESULTS_SNAPSHOTS_DIR', str(data_dir / 'results_by_brand'))

    app_module.app.config['TESTING'] = True
    app_module.app.config['SECRET_KEY'] = 'test-secret'
    db_module.init_db()
    return app_module.app


@pytest.fixture
def client(auth_app):
    return auth_app.test_client()


def _signup(client, name, email, password='password123'):
    return client.post('/api/auth/signup', json={
        'name': name,
        'email': email,
        'password': password
    })


def test_signup_sets_session_and_me(client):
    response = _signup(client, 'Alice', 'alice@example.com')

    assert response.status_code == 201
    payload = response.get_json()
    assert payload['authenticated'] is True
    assert payload['user']['email'] == 'alice@example.com'

    me = client.get('/api/auth/me')
    me_payload = me.get_json()
    assert me.status_code == 200
    assert me_payload['authenticated'] is True
    assert me_payload['user']['email'] == 'alice@example.com'


def test_guest_cannot_restore_or_list_private_projects(client):
    projects = client.get('/api/projects')
    session_response = client.get('/api/session')

    assert projects.status_code == 200
    assert projects.get_json() == []
    assert session_response.status_code == 200
    assert session_response.get_json()['has_session'] is False


def test_login_reuses_existing_account(client):
    _signup(client, 'Alice', 'alice@example.com')
    client.post('/api/auth/logout')

    response = client.post('/api/auth/login', json={
        'email': 'alice@example.com',
        'password': 'password123'
    })

    assert response.status_code == 200
    assert response.get_json()['authenticated'] is True


def test_projects_and_session_are_scoped_to_logged_user(client):
    _signup(client, 'Alice', 'alice@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    alice_id = me_payload['user']['id']
    alice_results = app_module.generate_demo_data('Brand Alice', ['Competitor One'], ['prompt 1'])
    db_module.upsert_project('Brand Alice', 'Assurance', ['Competitor One'], ['prompt 1'], ['demo'], user_id=alice_id)
    app_module._save_results(alice_results, user_id=alice_id)
    db_module.save_analysis(alice_results, user_id=alice_id)

    client.post('/api/auth/logout')

    _signup(client, 'Bob', 'bob@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    bob_id = me_payload['user']['id']
    bob_results = app_module.generate_demo_data('Brand Bob', ['Competitor Two'], ['prompt 1'])
    db_module.upsert_project('Brand Bob', 'Banque', ['Competitor Two'], ['prompt 1'], ['demo'], user_id=bob_id)
    app_module._save_results(bob_results, user_id=bob_id)
    db_module.save_analysis(bob_results, user_id=bob_id)

    projects = client.get('/api/projects')
    projects_payload = projects.get_json()
    assert projects.status_code == 200
    assert len(projects_payload) == 1
    assert projects_payload[0]['brand'] == 'Brand Bob'

    session_response = client.get('/api/session')
    session_payload = session_response.get_json()
    assert session_response.status_code == 200
    assert session_payload['has_session'] is True
    assert session_payload['project']['brand'] == 'Brand Bob'
    assert session_payload['results']['metadata']['brand'] == 'Brand Bob'


def test_google_login_creates_user_with_verified_token(client, monkeypatch):
    monkeypatch.setenv('GOOGLE_CLIENT_ID', 'test-google-client')

    fake_id_info = {
      'sub': 'google-user-123',
      'email': 'google@example.com',
      'name': 'Google User',
      'picture': 'https://example.com/avatar.png'
    }

    import google.oauth2.id_token as google_id_token
    monkeypatch.setattr(google_id_token, 'verify_oauth2_token', lambda token, req, aud: fake_id_info)

    response = client.post('/api/auth/google', json={'credential': 'fake-token'})

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['authenticated'] is True
    assert payload['user']['email'] == 'google@example.com'


def test_active_project_drives_metrics_and_history(client):
    _signup(client, 'Alice', 'alice@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    user_id = me_payload['user']['id']

    alpha_results = app_module.generate_demo_data('Brand Alpha', ['Competitor One'], ['prompt 1'])
    alpha_project_id = db_module.upsert_project(
        'Brand Alpha', 'Assurance', ['Competitor One'], ['prompt 1'], ['demo'], user_id=user_id
    )
    app_module._save_results(alpha_results, user_id=user_id)
    db_module.save_analysis(alpha_results, user_id=user_id, project_id=alpha_project_id)

    beta_results = app_module.generate_demo_data('Brand Beta', ['Competitor Two'], ['prompt 1'])
    beta_project_id = db_module.upsert_project(
        'Brand Beta', 'Banque', ['Competitor Two'], ['prompt 1'], ['demo'], user_id=user_id
    )
    app_module._save_results(beta_results, user_id=user_id)
    db_module.save_analysis(beta_results, user_id=user_id, project_id=beta_project_id)

    activate_response = client.post(f'/api/projects/{alpha_project_id}/activate')
    assert activate_response.status_code == 200
    activate_payload = activate_response.get_json()
    assert activate_payload['project']['id'] == alpha_project_id

    session_response = client.get('/api/session')
    session_payload = session_response.get_json()
    assert session_response.status_code == 200
    assert session_payload['active_project_id'] == alpha_project_id
    assert session_payload['project']['brand'] == 'Brand Alpha'

    metrics_response = client.get('/api/metrics')
    metrics_payload = metrics_response.get_json()
    assert metrics_response.status_code == 200
    assert metrics_payload['metadata']['brand'] == 'Brand Alpha'

    history_response = client.get('/api/history')
    history_payload = history_response.get_json()
    assert history_response.status_code == 200
    assert history_payload
    assert all('Brand Alpha' in item for item in history_payload)
    assert all('Brand Beta' not in item for item in history_payload)

    beta_metrics_response = client.get(f'/api/metrics?project_id={beta_project_id}')
    beta_metrics_payload = beta_metrics_response.get_json()
    assert beta_metrics_response.status_code == 200
    assert beta_metrics_payload['metadata']['brand'] == 'Brand Beta'
