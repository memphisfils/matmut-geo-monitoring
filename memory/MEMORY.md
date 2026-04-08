# MEMORY.md - GEO Dashboard Project

## Project Overview
**GEO Dashboard** — AI visibility monitoring platform (LLM brand perception)
- Stack: Flask/Python backend + React/Vite frontend
- Deployment: Render (backend) + Vercel (frontend)
- Last session: 2026-03-23

## Key Files
- `backend/app.py` (~1000+ lines): Main API, SSE streaming, scheduler
- `backend/analyzer.py` (~335 lines): NLP extraction + metric scoring
- `backend/llm_client.py`: Sync Ollama Cloud client
- `backend/async_llm_client.py`: Async variant
- `backend/database.py` (~277 lines): SQLite/PostgreSQL persistence
- `backend/alerts.py` (~294 lines): Slack/Email/Telegram notifications
- `backend/pdf_report.py` (~767 lines): WeasyPrint PDF generation
- `backend/prompts.py`: GEO system prompt + benchmark prompts
- `frontend/src/App.jsx`: Main React component, 4 tabs
- `frontend/src/services/api.js`: API layer + SSE streaming
- `frontend/src/components/Benchmark.jsx` (NEW): Multi-brand benchmark UI

## Key Endpoints (Updated)
- `POST /api/benchmark` - Generate multi-brand benchmark config
- `POST /api/run-benchmark/stream` - SSE streaming benchmark (multi-brand)

## Critical Timeouts
- OLLAMA_TIMEOUT: 40s per LLM call
- MAX_TIME_PER_PROMPT: 50s
- Global SSE timeout: 300s (6 prompts × 50s)
- Gunicorn timeout: 180s

## Data Flow
1. Single Brand: Streaming → results.json → 5s delay → GET /api/metrics → Dashboard
2. Multi-Brand Benchmark: POST /api/benchmark → runBenchmarkStream() → ALL brands on SAME prompts
3. Backend logs: [STREAM], [SAVE], [LOAD], [METRICS]

## Critical Fixes (Session 2026-03-23)
1. LLM timeout (0 chars): Added `'think': False` to Ollama API calls
2. 100% mention rate: Neutral GEO_SYSTEM_PROMPT (no forced mentions)
3. JSON extraction bias: _extract_json_from_response() separates narrative from JSON
4. Benchmark incomparability: /api/benchmark + /api/run-benchmark/stream analyze all brands together
5. UnicodeEncodeError: Replaced OK/X with ASCII OK/X

## Debugging Tips
- Backend: [STREAM], [SAVE], [LOAD], [METRICS] in app.py
- Frontend: handleOnboardingComplete, loadDashboardData in App.jsx
- Delete data/results.json before testing clean onboarding

## Detailed Docs
- memory/project.md — Full project architecture
- memory/debugging.md — Debugging patterns and tips
- memory/feedback.md — User preferences (terse, French speaker)
- memory/reference.md — External services and deployment URLs
