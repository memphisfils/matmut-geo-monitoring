# Step 2 - Auth and Data Architecture

## Objective

Mettre en place une authentification claire, une session persistante et une isolation stricte des donnees par utilisateur et par projet.

## Target Stack

### Frontend

- React existing app
- Login form natif
- Google sign-in via Google Identity Services

### Backend

- Flask existing API
- Session utilisateur en cookie HTTP-only
- Verification du token Google cote serveur
- Persistance utilisateurs et projets en base

## Recommended Libraries

### Backend

- `google-auth` pour verifier les ID tokens Google
- `Werkzeug.security` pour hasher les mots de passe
- `Flask` session cookie pour commencer

### Optional later

- `Authlib` si on veut un vrai flow OAuth serveur plus avance
- `Flask-Login` si on veut une couche user-session plus structuree

## Decision

Phase 1 simple et robuste:

- Login email/password gere par le backend
- Login Google avec token Google Identity Services envoye au backend
- Backend cree la session utilisateur
- Frontend interroge `/api/auth/me` au chargement

## Auth Flows

### Flow A - Form Login

1. Frontend affiche formulaire
2. POST `/api/auth/login`
3. Backend verifie email + password hash
4. Backend pose une session
5. Frontend appelle `/api/auth/me`
6. Redirect dashboard

### Flow B - Signup

1. Frontend affiche formulaire create account
2. POST `/api/auth/signup`
3. Backend cree user
4. Backend cree session
5. Frontend appelle `/api/auth/me`
6. Redirect onboarding projet ou dashboard

### Flow C - Google Login

1. Frontend recupere ID token via Google Identity Services
2. POST `/api/auth/google`
3. Backend verifie le token
4. Si user absent, creation auto
5. Backend cree session
6. Frontend appelle `/api/auth/me`
7. Redirect dashboard

### Flow D - Session Restore

1. App load
2. GET `/api/auth/me`
3. Si session valide:
- charger user
- charger projets user
- redirect direct dashboard
4. Sinon:
- afficher landing/login

### Flow E - Logout

1. POST `/api/auth/logout`
2. Backend supprime session
3. Frontend reset state
4. Retour login ou landing

## Session Strategy

## Cookie Session

- HTTP-only
- SameSite=Lax au minimum
- Secure=true en production
- Duree initiale recommande: 7 jours

## Session Payload Minimal

- `user_id`
- `email`
- `auth_provider`

Ne pas stocker les projets dans la session.

## Data Model

## Users

Table `users`

- `id`
- `name`
- `email`
- `password_hash` nullable for Google-only accounts
- `google_sub` nullable
- `auth_provider`
- `avatar_url` nullable
- `created_at`
- `last_login_at`

Constraints:

- unique `email`
- unique `google_sub` when not null

## Projects

Table `projects`

- `id`
- `user_id`
- `brand`
- `sector`
- `competitors`
- `prompts`
- `models`
- `created_at`
- `last_run`

Constraint:

- foreign key `user_id -> users.id`

## Analysis History

Table `analysis_history`

- `id`
- `project_id`
- `user_id`
- `timestamp`
- `brand`
- `model`
- `share_of_voice`
- `global_score`
- `mention_rate`
- `avg_position`
- `top_of_mind`
- `sentiment_score`

Constraints:

- foreign key `project_id -> projects.id`
- foreign key `user_id -> users.id`

## Results Snapshots

Option retenue pour transition:

- Conserver les snapshots fichiers a court terme
- Les faire evoluer vers des snapshots par projet ou enregistrement base plus tard

Phase immediate:

- snapshots par marque et utilisateur ou par projet
- aucune lecture globale d'un dernier `results.json` commun

## Ownership Rules

- un user ne voit que ses propres projets
- un user ne voit que son historique
- un user ne peut exporter que ses analyses
- les endpoints benchmark/metrics/history/export doivent verifier le proprietaire

## API Endpoints To Add

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### User data

- `GET /api/projects`
- retourne seulement les projets du user connecte

- `GET /api/projects/:id`
- retourne un projet du user connecte

- `GET /api/projects/:id/metrics`
- `GET /api/projects/:id/history`
- `GET /api/projects/:id/prompts/compare`
- `GET /api/projects/:id/export`

## Transition Plan

Pour limiter la casse, on fera en 2 temps.

### Phase 2A

- ajouter users
- ajouter auth
- ajouter user_id a projects
- filtrer `/api/projects` par session user
- conserver certains endpoints legacy mais avec verification user

### Phase 2B

- passer a des endpoints par `project_id`
- faire lire dashboard, export, history et prompt compare depuis le projet actif
- retirer les usages de resultat global legacy

## Frontend State Model

## Public State

- `authStatus`: unknown | guest | authenticated
- `user`
- `activeProjectId`

## After Login

- charger `me`
- charger `projects`
- si projet actif connu, le restaurer
- sinon prendre le dernier projet du user

## Redirect Rules

- guest -> landing/login
- authenticated + no project -> onboarding projet
- authenticated + projects -> dashboard

## Security Rules

- hash des mots de passe, jamais en clair
- verification server-side du token Google
- toutes les routes privees verifient la session
- ne jamais faire confiance a `user_id` venant du frontend

## Step 2 Deliverables

- schema de donnees cible
- liste des endpoints auth
- flux de session
- regles d'isolation des donnees
- strategie de transition depuis l'existant
