# Debugging Guide - GEO Dashboard

## Backend Logging
Search for these prefixes in `backend/app.py`:
- `[STREAM]` — SSE streaming events
- `[SAVE]` — Writing results.json
- `[LOAD]` — Loading results.json
- `[METRICS]` — /api/metrics computation

## Common Issues

### results.json Race Condition
**Symptom**: Dashboard shows old data after analysis completes
**Cause**: Frontend fetches /api/metrics before results.json is written
**Fix**: 5s delay in App.jsx `loadDashboardData()` (increased from 500ms for safety)

### LLM Timeout
**Symptom**: Analysis falls back to demo mode
**Cause**: Ollama Cloud timeout (40s) or MAX_TIME_PER_PROMPT (50s)
**Fix**: Check OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_TIMEOUT

### Worker Timeout (Render)
**Symptom**: gunicorn worker killed
**Cause**: Global SSE timeout (300s) or gunicorn timeout (180s) exceeded
**Fix**: Monitor prompt count, check OLLAMA_TIMEOUT settings

### CORS Issues
**Symptom**: Frontend can't reach backend
**Cause**: CORS not configured for production domain
**Fix**: `CORS(app)` with appropriate origins in app.py

## Testing
```bash
# Backend
cd backend
python app.py  # http://localhost:5000

# Frontend
cd frontend
npm run dev    # http://localhost:5173

# Clean test (delete results first)
rm data/results.json
```

## Key Code Locations
- SSE streaming: `backend/app.py` lines ~379-570
- BrandAnalyzer: `backend/analyzer.py`
- Metrics calculation: `backend/analyzer.py` `calculate_metrics()`
- Frontend streaming: `frontend/src/services/api.js` `runAnalysisStream()`
- Dashboard load: `frontend/src/App.jsx` `loadDashboardData()`
- Benchmark endpoint: `backend/app.py` `/api/benchmark`
- Benchmark streaming: `backend/app.py` `/api/run-benchmark/stream`
- Benchmark UI: `frontend/src/components/Benchmark.jsx`
