# Fix: Worker Timeout Render

## Problème

Les logs Render montraient :
```
[2026-03-19 19:43:07 +0000] [60] [CRITICAL] WORKER TIMEOUT (pid:63)
```

**Cause :** Le timeout par défaut de Gunicorn sur Render est de **30 secondes**, mais l'analyse LLM avec `OLLAMA_TIMEOUT=40s` prend plus de temps que le timeout du worker.

## Solution

Utiliser **Gunicorn avec workers Uvicorn** et un timeout explicite de 120 secondes.

### Commande de démarrage

```bash
gunicorn app:app \
  --bind 0.0.0.0:$PORT \
  --workers 2 \
  --threads 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --timeout 120 \
  --keep-alive 120
```

**Pourquoi cette configuration :**
- `--worker-class uvicorn.workers.UvicornWorker` : Support async pour Flask
- `--workers 2` : 2 workers pour gérer 2 requêtes simultanées
- `--threads 4` : 4 threads par worker pour le streaming SSE
- `--timeout 120` : Timeout worker à 120s (>> 40s Ollama)
- `--keep-alive 120` : Keep-alive à 120s

## Fichiers modifiés

### 1. `render.yaml`
```yaml
startCommand: "cd backend && gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class uvicorn.workers.UvicornWorker --timeout 120 --keep-alive 120"
```

### 2. `backend/.env.render`
```env
# Timeout Ollama (40s pour réponses LLM)
OLLAMA_TIMEOUT=40
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
- Workers avec `UvicornWorker` dans les logs

## Notes techniques

- **OLLAMA_TIMEOUT = 40s** : temps max pour une réponse Ollama Cloud
- **GUNICORN_TIMEOUT = 120s** : temps max avant kill du worker
- Marge de sécurité : 120s > 40s × 2 (pour 2 modèles en séquentiel)
- **uvicorn.workers.UvicornWorker** : requis pour le streaming SSE et l'async
