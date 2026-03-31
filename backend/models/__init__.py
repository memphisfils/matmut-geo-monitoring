# models - Re-exports
from models.database import (
    init_db, save_analysis, get_history,
    generate_demo_history, upsert_project, get_all_projects,
    get_project_by_id,
    create_user, get_user_by_id, get_user_by_email, get_user_by_google_sub,
    update_user_login, attach_google_identity
)

__all__ = [
    'init_db', 'save_analysis', 'get_history',
    'generate_demo_history', 'upsert_project', 'get_all_projects',
    'get_project_by_id',
    'create_user', 'get_user_by_id', 'get_user_by_email', 'get_user_by_google_sub',
    'update_user_login', 'attach_google_identity'
]
