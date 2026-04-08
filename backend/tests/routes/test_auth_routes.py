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

    previous_results = _make_multimodel_results(
        'Brand Prompt',
        ['Competitor One', 'Competitor Two'],
        ['Comparatif assurance Brand Prompt vs Competitor One', 'avis general assurance']
    )
    previous_results['timestamp'] = '2026-03-31T10:00:00'
    previous_results['responses'][0]['llm_analyses']['model-alpha']['analysis'] = {
        'brands_mentioned': ['Competitor One'],
        'positions': {'Competitor One': 1},
        'first_brand': 'Competitor One',
        'brand_mentioned': False,
        'brand_position': None
    }
    previous_results['responses'][0]['llm_analyses']['model-beta']['analysis'] = {
        'brands_mentioned': ['Competitor One', 'Competitor Two'],
        'positions': {'Competitor One': 1, 'Competitor Two': 2},
        'first_brand': 'Competitor One',
        'brand_mentioned': False,
        'brand_position': None
    }
    previous_results['responses'][1]['llm_analyses']['model-alpha']['analysis'] = {
        'brands_mentioned': ['Brand Prompt', 'Competitor One'],
        'positions': {'Brand Prompt': 1, 'Competitor One': 2},
        'first_brand': 'Brand Prompt',
        'brand_mentioned': True,
        'brand_position': 1
    }
    previous_results['responses'][1]['llm_analyses']['model-beta']['analysis'] = {
        'brands_mentioned': ['Competitor One', 'Brand Prompt'],
        'positions': {'Competitor One': 1, 'Brand Prompt': 2},
        'first_brand': 'Competitor One',
        'brand_mentioned': True,
        'brand_position': 2
    }

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
    app_module._save_results(previous_results, user_id=user_id)
    db_module.save_analysis(previous_results, user_id=user_id, project_id=project_id)
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
    assert 'prompt_profile' in first_prompt
    assert 'neutrality_risk' in first_prompt
    assert 'rank_change' in first_prompt
    assert 'score_change' in first_prompt
    assert payload['summary']['tracked_prompt_count'] >= 1
    assert 'suspicious_prompt_count' in payload['summary']
    assert payload['metadata']['previous_timestamp'] == '2026-03-31T10:00:00'


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


def test_metrics_expose_risk_signals_and_bias_monitor(client):
    _signup(client, 'Alice', 'alice@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    user_id = me_payload['user']['id']

    brand = 'Brand Risk'
    competitors = ['Competitor One']
    prompts = [
        'Comparatif Brand Risk vs Competitor One',
        'Pourquoi Brand Risk est recommande',
        'Meilleur choix Brand Risk'
    ]
    results = {
        'timestamp': '2026-04-02T09:00:00',
        'total_prompts': len(prompts),
        'llms_used': ['model-alpha'],
        'brand': brand,
        'competitors': competitors,
        'responses': [
            {
                'category': 'general',
                'prompt': prompt,
                'llm_analyses': {
                    'model-alpha': {
                        'response': 'alpha',
                        'analysis': {
                            'brands_mentioned': [brand, competitors[0]],
                            'positions': {brand: 1, competitors[0]: 2},
                            'first_brand': brand,
                            'brand_mentioned': True,
                            'brand_position': 1
                        }
                    }
                }
            }
            for prompt in prompts
        ],
        'is_demo': False
    }

    project_id = db_module.upsert_project(
        brand,
        'Assurance',
        competitors,
        prompts,
        ['model-alpha'],
        user_id=user_id
    )
    app_module._save_results(results, user_id=user_id)
    db_module.save_analysis(results, user_id=user_id, project_id=project_id)

    response = client.get('/api/metrics')
    payload = response.get_json()

    assert response.status_code == 200
    assert 'risk_signals' in payload
    assert payload['risk_signals']
    assert 'bias_monitor' in payload
    assert payload['bias_monitor']['status'] in {'watch', 'warning', 'ok'}
    assert payload['bias_monitor']['score'] >= 0
    assert payload['prompt_audit_summary']['weak_prompt_count'] >= 0


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


def test_audit_single_prompt_marks_brand_first_as_high_risk():
    audit = app_module._audit_single_prompt(
        'Pourquoi Brand Repair est recommande',
        'Brand Repair',
        competitors=['Competitor One', 'Competitor Two'],
        sector='Assurance'
    )

    assert audit['prompt_profile'] == 'brand-first'
    assert audit['neutrality_risk'] == 'high'
    assert audit['quality_label'] in {'Correct', 'Fragile'}


def test_alert_preferences_are_scoped_to_project_and_exposed_in_status(client):
    _signup(client, 'Alice', 'alice@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    user_id = me_payload['user']['id']

    project_id = db_module.upsert_project(
        'Brand Alerts', 'Assurance', ['Competitor One'], ['prompt 1'], ['qwen3.5'], user_id=user_id
    )
    client.post(f'/api/projects/{project_id}/activate')

    update_response = client.put('/api/alerts/preferences', json={
        'project_id': project_id,
        'channels': {
            'email': {
                'enabled': True,
                'config': {
                    'recipient': 'alerts@example.com',
                    'host': 'smtp.example.com',
                    'port': '587',
                    'user': 'smtp-user',
                    'password': 'smtp-pass'
                }
            },
            'slack': {
                'enabled': False,
                'config': {
                    'webhook_url': 'https://hooks.slack.example/test'
                }
            }
        },
        'rules': {
            'ALT-019': {'enabled': True},
            'ALT-004': {'enabled': False}
        }
    })

    assert update_response.status_code == 200
    payload = update_response.get_json()
    assert payload['project_id'] == project_id
    assert payload['channels']['email']['enabled'] is True
    assert payload['channels']['email']['configured'] is True
    assert payload['channels']['slack']['enabled'] is False
    assert payload['enabled_rules_count'] >= 1

    preferences_response = client.get('/api/alerts/preferences')
    preferences_payload = preferences_response.get_json()
    assert preferences_response.status_code == 200
    assert preferences_payload['channels']['email']['source'] == 'project'
    assert preferences_payload['channels']['email']['config']['recipient'].startswith('ale')
    assert any(rule['id'] == 'ALT-004' and rule['enabled'] is False for rule in preferences_payload['rules'])

    status_response = client.get('/api/alerts/status')
    status_payload = status_response.get_json()
    assert status_response.status_code == 200
    assert status_payload['preferences']['project_id'] == project_id
    assert status_payload['summary']['enabled_project_channels'] == 1


def test_auth_rejects_untrusted_origin(client):
    response = client.post('/api/auth/signup', json={
        'name': 'Mallory',
        'email': 'mallory@example.com',
        'password': 'password123'
    }, headers={'Origin': 'https://evil.example.com'})

    assert response.status_code == 403
    assert response.get_json()['error'] == 'Origin non autorisee'


def test_login_rate_limit_blocks_repeated_invalid_attempts(client):
    _signup(client, 'Alice', 'alice-rate@example.com')
    client.post('/api/auth/logout')

    for _ in range(8):
        response = client.post('/api/auth/login', json={
            'email': 'alice-rate@example.com',
            'password': 'wrong-password'
        })
        assert response.status_code == 401

    blocked = client.post('/api/auth/login', json={
        'email': 'alice-rate@example.com',
        'password': 'wrong-password'
    })

    assert blocked.status_code == 429
    assert blocked.get_json()['retry_after_seconds'] >= 1


def test_alert_channel_config_is_encrypted_at_rest(client):
    _signup(client, 'Alice', 'alice-encryption@example.com')
    me_payload = client.get('/api/auth/me').get_json()
    user_id = me_payload['user']['id']

    project_id = db_module.upsert_project(
        'Brand Secure', 'Assurance', ['Competitor One'], ['prompt 1'], ['qwen3.5'], user_id=user_id
    )

    response = client.put('/api/alerts/preferences', json={
        'project_id': project_id,
        'channels': {
            'slack': {
                'enabled': True,
                'config': {
                    'webhook_url': 'https://hooks.slack.example/services/T000/B000/SECRET'
                }
            }
        }
    })

    assert response.status_code == 200

    conn = db_module.get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT config FROM alert_channel_settings WHERE user_id = ? AND project_id = ? AND channel = ?',
                (user_id, project_id, 'slack'))
    row = cur.fetchone()
    conn.close()

    stored = row['config'] if hasattr(row, 'keys') else row[0]
    assert stored.startswith('enc::')
    assert 'hooks.slack.example' not in stored
