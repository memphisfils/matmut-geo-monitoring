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


def _make_multimodel_results(brand, competitors, prompts):
    responses = []
    models = ['model-alpha', 'model-beta']

    for index, prompt in enumerate(prompts):
        if index == 0:
            llm_analyses = {
                'model-alpha': {
                    'response': 'alpha',
                    'analysis': {
                        'brands_mentioned': [brand, competitors[0]],
                        'positions': {brand: 1, competitors[0]: 2},
                        'first_brand': brand,
                        'brand_mentioned': True,
                        'brand_position': 1
                    }
                },
                'model-beta': {
                    'response': 'beta',
                    'analysis': {
                        'brands_mentioned': [competitors[0], brand],
                        'positions': {competitors[0]: 1, brand: 2},
                        'first_brand': competitors[0],
                        'brand_mentioned': True,
                        'brand_position': 2
                    }
                }
            }
        else:
            llm_analyses = {
                'model-alpha': {
                    'response': 'alpha',
                    'analysis': {
                        'brands_mentioned': [competitors[0]],
                        'positions': {competitors[0]: 1},
                        'first_brand': competitors[0],
                        'brand_mentioned': False,
                        'brand_position': None
                    }
                },
                'model-beta': {
                    'response': 'beta',
                    'analysis': {
                        'brands_mentioned': [competitors[0], competitors[1]],
                        'positions': {competitors[0]: 1, competitors[1]: 2},
                        'first_brand': competitors[0],
                        'brand_mentioned': False,
                        'brand_position': None
                    }
                }
            }

        responses.append({
            'category': 'general',
            'prompt': prompt,
            'llm_analyses': llm_analyses
        })

    return {
        'timestamp': '2026-04-01T10:00:00',
        'total_prompts': len(prompts),
        'llms_used': models,
        'brand': brand,
        'competitors': competitors,
        'responses': responses,
        'is_demo': False
    }


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


def test_prompt_compare_exposes_quality_and_model_breakdown(client):
    _signup(client, 'Alice', 'alice@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    user_id = me_payload['user']['id']

    results = _make_multimodel_results(
        'Brand Prompt',
        ['Competitor One', 'Competitor Two'],
        ['Comparatif assurance Brand Prompt vs Competitor One', 'avis general assurance']
    )
    project_id = db_module.upsert_project(
        'Brand Prompt', 'Assurance', ['Competitor One', 'Competitor Two'],
        ['Comparatif assurance Brand Prompt vs Competitor One', 'avis general assurance'],
        ['model-alpha', 'model-beta'], user_id=user_id
    )
    app_module._save_results(results, user_id=user_id)
    db_module.save_analysis(results, user_id=user_id, project_id=project_id)

    response = client.get('/api/prompts/compare')
    payload = response.get_json()

    assert response.status_code == 200
    assert 'summary' in payload
    assert 'average_quality_score' in payload['summary']
    assert payload['prompts']
    first_prompt = payload['prompts'][0]
    assert 'prompt_quality_score' in first_prompt
    assert 'agreement_score' in first_prompt
    assert 'intent' in first_prompt
    assert 'per_model' in first_prompt


def test_metrics_by_model_exposes_summary(client):
    _signup(client, 'Alice', 'alice@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    user_id = me_payload['user']['id']

    results = _make_multimodel_results(
        'Brand Multi',
        ['Competitor One', 'Competitor Two'],
        ['Comparatif assurance Brand Multi vs Competitor One', 'avis general assurance']
    )
    project_id = db_module.upsert_project(
        'Brand Multi', 'Assurance', ['Competitor One', 'Competitor Two'],
        ['Comparatif assurance Brand Multi vs Competitor One', 'avis general assurance'],
        ['model-alpha', 'model-beta'], user_id=user_id
    )
    app_module._save_results(results, user_id=user_id)
    db_module.save_analysis(results, user_id=user_id, project_id=project_id)

    response = client.get('/api/metrics/by-model')
    payload = response.get_json()

    assert response.status_code == 200
    assert 'summary' in payload
    assert payload['summary']['model_count'] == 2
    assert 'strongest_model' in payload['summary']
    assert 'mention_spread' in payload['summary']


def test_repair_prompt_text_adds_brand_and_comparison():
    repaired = app_module._repair_prompt_text(
        'avis general assurance',
        'Brand Repair',
        competitors=['Competitor One'],
        sector='Assurance'
    )

    assert 'Brand Repair' in repaired
    assert 'Competitor One' in repaired
    assert '?' in repaired
