# GEO Dashboard - Project Architecture

## Stack
- **Backend**: Flask/Python with Gunicorn + UvicornWorker
- **Frontend**: React 19 + Vite + Recharts + Framer Motion
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **LLM**: Ollama Cloud API (qwen3.5 model)
- **Deploy**: Render (backend) + Vercel (frontend)

## Directory Structure
```
backend/
  app.py              # Main Flask app (~1000+ lines)
  analyzer.py         # NLP + metric scoring (~335 lines)
  llm_client.py       # Sync Ollama client
  async_llm_client.py # Async variant
  database.py         # SQLite/PostgreSQL (~277 lines)
  alerts.py           # Slack/Email/Telegram (~294 lines)
  pdf_report.py       # WeasyPrint PDF (~767 lines)
  prompts.py          # GEO system prompt + benchmark prompts
  requirements.txt    # Python dependencies
  .env                # Local env (not committed)

frontend/
  src/
    App.jsx           # Main component, 4 tabs (Dashboard/Benchmark/Prompts/Alertes)
    services/api.js   # API layer + SSE streaming
    components/
      Onboarding.jsx          # 3-step wizard
      Benchmark.jsx           # Multi-brand benchmark UI (NEW)
      TopNavbar.jsx           # Header
      KpiCards.jsx            # 4 KPI cards
      RankingTable.jsx        # Sortable ranking
      Charts.jsx              # 4 charts (Mention, Sov, Radar, Heatmap)
      TrendChart.jsx          # 30-day historical
      SentimentChart.jsx      # Sentiment viz
      DuelCard.jsx            # Head-to-head
      InsightsPanel.jsx       # Strengths/weaknesses
      AnalysisProgress.jsx    # Real-time streaming progress
      LLMBreakdown.jsx        # Per-model metrics
      PromptComparator.jsx    # Prompt performance
      AlertsPanel.jsx         # Alert channel config
      ExportButton.jsx        # PDF/HTML export
      Header.jsx, Sidebar.jsx, SystemStatus.jsx
  package.json

data/
  results.json        # Latest analysis results
  history.db           # SQLite history

render.yaml          # Render deployment
CLAUDE.md           # Project instructions
README.md
```

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

## Data Flow
```
# Single Brand Analysis
Onboarding → runAnalysisStream() → SSE → results.json → 5s delay → /api/metrics → Dashboard

# Multi-Brand Benchmark
Benchmark tab → POST /api/benchmark → AI generates products/prompts
→ runBenchmarkStream() → ALL brands analyzed on SAME prompts → comparable results
```

## Global Score Formula
```
global_score = mention_rate * 0.4 +
               (100 / avg_position) * 0.3 +
               share_of_voice * 0.2 +
               top_of_mind * 0.1 +
               max(sentiment_score, 0) * 0.1
```

## Scheduler (APScheduler)
- Every 6 hours: Auto-run analysis for all projects
- Monday 9h: Weekly summary alert

## Environment Variables (backend/.env)
```
OLLAMA_API_KEY=<key>
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODELS=qwen3.5
OLLAMA_TIMEOUT=40
FLASK_PORT=5000
FLASK_DEBUG=False
GUNICORN_TIMEOUT=120
# Alerts (optional)
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

## Critical Fixes (Session 2026-03-23)
1. **LLM timeout (0 chars)**: qwen3.5 `think` parameter defaults to true → timeout. Fixed by adding `'think': False` to Ollama API calls
2. **100% mention rate**: System prompt forced brand mentions. Fixed with neutral `GEO_SYSTEM_PROMPT`
3. **JSON extraction bias**: `extract_brands()` searched JSON blocks. Fixed with `_extract_json_from_response()` separating narrative from JSON
4. **Benchmark incomparability**: Each brand analyzed on different prompts. Fixed with `/api/benchmark` + `/api/run-benchmark/stream` analyzing all brands together
5. **UnicodeEncodeError on Windows**: Replaced ✓/✗ with ASCII OK/X
