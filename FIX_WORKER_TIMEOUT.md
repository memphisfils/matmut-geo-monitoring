# Fix: Worker Timeout Render

## Problème

Les logs Render montraient :
```
[2026-03-19 19:43:07 +0000] [60] [CRITICAL] WORKER TIMEOUT (pid:63)
```

**Cause :** Le timeout par défaut de Gunicorn sur Render est de **30 secondes**, mais l'analyse LLM avec `OLLAMA_TIMEOUT=40s` prend plus de temps que le timeout du worker.

## Solution

Ajouter la variable d'environnement `GUNICORN_TIMEOUT=120` pour permettre aux workers de rester actifs jusqu'à 120 secondes pendant l'analyse LLM.

## Fichiers modifiés

### 1. `render.yaml`
```yaml
envVars:
  - key: GUNICORN_TIMEOUT
    value: "120"
```

### 2. `backend/.env.render`
```env
# Timeout Gunicorn (120s pour éviter worker timeout pendant analyse LLM)
GUNICORN_TIMEOUT=120
```

### 3. `backend/.env.example`
```env
# Gunicorn timeout (Render) — éviter worker timeout pendant analyse LLM
GUNICORN_TIMEOUT=120
```

## Déploiement

1. Push les changements sur GitHub
2. Render redéploiera automatiquement le backend
3. Le nouveau timeout sera actif immédiatement

## Vérification

Après déploiement, les logs devraient montrer :
- Plus de `[CRITICAL] WORKER TIMEOUT`
- Les analyses LLM complètes sans interruption
- Temps de réponse > 30s acceptés par Gunicorn

## Notes techniques

- **OLLAMA_TIMEOUT = 40s** : temps max pour une réponse Ollama Cloud
- **GUNICORN_TIMEOUT = 120s** : temps max avant kill du worker
- Marge de sécurité : 120s > 40s × 2 (pour 2 modèles en séquentiel)
