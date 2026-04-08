# External References - GEO Dashboard

## GitHub Repository
- **URL**: https://github.com/memphisfils/matmut-geo-monitoring
- **Backend deploy**: Render (check Render dashboard for status)
- **Frontend deploy**: Vercel (check Vercel dashboard for status)

## External Services
| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Ollama Cloud | LLM API (qwen3.5) | https://ollama.com/api |
| Render | Backend hosting | https://render.com/dashboard |
| Vercel | Frontend hosting | https://vercel.com/dashboard |
| PostgreSQL | Production DB (via Render) | Render dashboard |

## Monitoring
- **Backend health**: `GET /api/health`
- **LLM status**: `GET /api/status`
- **Error tracking**: Check Render logs for backend errors

## Deployment URLs
- **Production Backend**: https://geo-monitor.onrender.com
- **Production Frontend**: https://matmut-geo-monitoring.vercel.app (or similar)
