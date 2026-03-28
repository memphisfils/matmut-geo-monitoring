# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GEO Dashboard — AI visibility monitoring platform that analyzes how LLMs (ChatGPT, Claude, Gemini, etc.) perceive a brand versus competitors. Measures metrics like mention rate, average position, share of voice, and top-of-mind brand presence.

**Stack**: Flask/Python backend + React/Vite frontend
**Deployment**: Render (backend) + Vercel (frontend)

## User Preferences

- **Language**: French (responds in French)
- **Style**: Terse, direct responses
- **Code**: No over-engineering, avoid premature abstractions
- **Commit**: Bundle related changes, focus on "why" not "what"
- **Avoid**: Unnecessary docstrings, emojis, summaries at end

## Development Commands

### Backend
```bash
cd backend
python -m venv venv           # First time: create virtual environment
venv\Scripts\activate         # Windows
# source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
python app.py                 # Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                   # Runs on http://localhost:5173
npm run build                 # Production build → dist/
npm run lint                  # ESLint check
```

### Production Deploy (Render)
Uses `render.yaml` — backend deployed with gunicorn + UvicornWorker for async support.

## Architecture

### Backend (Flask)
- **app.py** (~1000+ lines): Main API, SSE streaming, scheduler
- **analyzer.py** (~335 lines): NLP extraction + metric scoring
- **llm_client.py**: Ollama Cloud API client (sync)
- **async_llm_client.py**: Async variant for parallel LLM calls
- **database.py** (~277 lines): SQLite (local dev) / PostgreSQL (production)
- **alerts.py** (~294 lines): Slack, Email, Telegram notifications
- **pdf_report.py** (~767 lines): PDF generation
- **prompts.py**: GEO system prompt + benchmark prompts

### Frontend (React 19)
- **App.jsx**: Main component with 4 tabs (Dashboard/Benchmark/Prompts/Alertes)
- **src/components/**: Onboarding, Benchmark, KpiCards, TrendChart, DuelCard, RankingTable, Charts, InsightsPanel, etc.
- **src/services/api.js**: API layer with 300s timeout for SSE endpoints

### Data Flow (Critical)
1. Streaming completes → results.json written with `is_demo` flag
2. Frontend waits 5s then fetches /api/metrics
3. /api/metrics reads results.json → calculates metrics → returns ranking

**Single Brand**: Onboarding → runAnalysisStream() → SSE → results.json → 5s delay → /api/metrics → Dashboard

**Multi-Brand Benchmark**: Benchmark tab → POST /api/benchmark → ALL brands analyzed on SAME prompts → comparable results

## Key Configuration

### Environment Variables (backend/.env)
```
OLLAMA_API_KEY=<key>
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=qwen3.5
OLLAMA_TIMEOUT=40
FLASK_PORT=5000
FLASK_DEBUG=False
GUNICORN_TIMEOUT=120
SLACK_WEBHOOK_URL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password
ALERT_EMAIL=recipient@example.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DATABASE_URL=postgresql://...  # Production
```

### Frontend → Backend URL
Production: `VITE_API_URL` env var points to Render backend

## Critical Timeouts
- **OLLAMA_TIMEOUT**: 40s per LLM call
- **MAX_TIME_PER_PROMPT**: 50s (app.py)
- **Global SSE timeout**: 300s (6 prompts × 50s)
- **Gunicorn timeout**: 180s (render.yaml)
- **Frontend SSE EventSource**: 300s timeout

## Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/status | LLM connection status |
| POST | /api/generate-config | AI generates products/competitors |
| POST | /api/benchmark | Generate multi-brand benchmark config |
| POST | /api/run-analysis/stream | SSE streaming analysis (single brand) |
| POST | /api/run-benchmark/stream | SSE streaming benchmark (multi-brand) |
| GET | /api/metrics | Computed rankings from results.json |
| GET | /api/metrics/by-model | Per-model metrics + confidence |
| GET | /api/history | 30-day historical data |
| GET | /api/export | JSON export |
| GET | /api/export/pdf | PDF report |

## Scheduler (APScheduler)
- **Every 6 hours**: Auto-run analysis for all projects
- **Monday 9h**: Weekly summary alert

## Critical Fixes (Session 2026-03-23)

1. **LLM timeout (0 chars)**: qwen3.5 `think` parameter defaults to true → timeout. Fixed by adding `'think': False` to Ollama API calls
2. **100% mention rate**: System prompt forced brand mentions. Fixed with neutral `GEO_SYSTEM_PROMPT`
3. **JSON extraction bias**: `_extract_json_from_response()` separates narrative from JSON
4. **Benchmark incomparability**: `/api/benchmark` + `/api/run-benchmark/stream` analyze all brands together
5. **UnicodeEncodeError on Windows**: Replaced ✓/✗ with ASCII OK/X

## Global Score Formula
```
global_score = mention_rate * 0.4 +
               (100 / avg_position) * 0.3 +
               share_of_voice * 0.2 +
               top_of_mind * 0.1 +
               max(sentiment_score, 0) * 0.1
```

## Debugging Tips
- Delete `data/results.json` before testing clean onboarding
- Backend logs: `[STREAM]`, `[SAVE]`, `[LOAD]`, `[METRICS]` for tracing data flow
- Frontend logs: `handleOnboardingComplete`, `loadDashboardData` in App.jsx

## Detailed Docs
- `memory/MEMORY.md` — Session overview
- `memory/project.md` — Full architecture
- `memory/debugging.md` — Debugging patterns
- `memory/feedback.md` — User preferences
- `memory/reference.md` — External URLs (GitHub, Render, Vercel)
