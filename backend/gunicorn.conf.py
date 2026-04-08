"""
Configuration Gunicorn pour Render + gevent
Force le binding explicite sur le port Render pour éviter le timeout
"""
import os
import multiprocessing

# Worker gevent pour coopératif pendant les appels LLM
worker_class = "gevent"

# Nombre de workers
workers = int(os.getenv("WEB_CONCURRENCY", 2))

# Timeout très long pour les appels LLM (5 minutes)
timeout = 300
keepalive = 300
graceful_timeout = 30

# Bind explicite sur le port Render (obligatoire pour détection)
bind = f"0.0.0.0:{os.getenv('PORT', 10000)}"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Preload app pour démarrage plus rapide
preload_app = True

# Headers pour Render
forwarded_allow_ips = "*"
