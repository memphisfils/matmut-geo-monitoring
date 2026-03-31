# DevOps

## Docker local

Lancer l'application complete:

```bash
docker compose up --build
```

Acces:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000/api/health`

Lancer aussi le scheduler:

```bash
docker compose --profile scheduler up --build
```

## Images

- Backend: `backend/Dockerfile`
- Frontend: `frontend/Dockerfile`

Le frontend est servi par Nginx et proxifie `/api` vers le backend.

## Workflows GitHub Actions

- `CI`: tests backend, lint frontend, tests frontend, build frontend, build des images Docker
- `CD`: publication vers `ghcr.io` sur `main`, sur tag `v*`, ou via declenchement manuel

## Images GHCR publiees

- `ghcr.io/<owner>/geo-backend`
- `ghcr.io/<owner>/geo-frontend`
