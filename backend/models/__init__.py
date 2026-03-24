# models - Re-exports
from models.database import (
    init_db, save_analysis, get_history,
    generate_demo_history, upsert_project, get_all_projects
)

__all__ = [
    'init_db', 'save_analysis', 'get_history',
    'generate_demo_history', 'upsert_project', 'get_all_projects'
]
