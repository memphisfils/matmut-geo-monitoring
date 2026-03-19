"""
LLM Client — GEO Monitor Sprint 1 + FIX timeout
TIMEOUT réduit à 10s : fail fast → fallback démo immédiat
Au lieu d'attendre 30-90s et tuer le worker Gunicorn.
"""
import os
import requests
from typing import Dict, List
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()


class LLMClient:
    """Client unifié pour Ollama Cloud — supporte N modèles avec une seule clé API."""

    def __init__(self):
        self.base_url  = os.getenv('OLLAMA_BASE_URL', 'https://ollama.com/api')
        self.api_key   = os.getenv('OLLAMA_API_KEY')
        # FIX : timeout court → fail fast → fallback démo immédiat
        # Si OLLAMA_TIMEOUT non défini, utilise 10s (était 30s)
        self.timeout   = int(os.getenv('OLLAMA_TIMEOUT', '10'))
        self.cache: Dict[str, str] = {}

        # ── Chargement des modèles depuis .env ──────────────────────────────
        # Aujourd'hui : OLLAMA_MODELS=qwen3.5
        # Demain :      OLLAMA_MODELS=qwen3.5,llama3.2:8b,deepseek-v3.1
        raw_models = os.getenv('OLLAMA_MODELS', 'qwen3.5')
        self.models: List[str] = [m.strip() for m in raw_models.split(',') if m.strip()]

        # clients = dict {model_name: True} pour compat legacy
        self.clients: Dict[str, bool] = {}

        if self.api_key:
            for model in self.models:
                self.clients[model] = True
            print(f"[LLMClient] Ollama Cloud — modèles actifs : {self.models} (timeout={self.timeout}s)")
        else:
            print("[LLMClient] OLLAMA_API_KEY manquante — mode démo activé")

    # ── Requête vers un modèle spécifique ───────────────────────────────────

    def query_model(self, prompt: str, model: str, use_cache: bool = True) -> str:
        """Interroge un modèle Ollama Cloud précis. Retourne '' si échec."""
        if not self.api_key:
            return ""

        cache_key = f"{model}:{prompt[:120]}"
        if use_cache and cache_key in self.cache:
            print(f"  [CACHE] {model[:20]}")
            return self.cache[cache_key]

        # UNE seule tentative (pas de retry) pour fail fast
        try:
            print(f"  [{model}] tentative unique (timeout={self.timeout}s)…")
            resp = requests.post(
                f"{self.base_url}/chat",
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': prompt}],
                    'stream': False
                },
                timeout=self.timeout
            )
            resp.raise_for_status()
            content = resp.json().get('message', {}).get('content', '')
            print(f"  [{model}] ✓ {len(content)} chars")
            if use_cache and content:
                self.cache[cache_key] = content
            return content

        except requests.exceptions.Timeout:
            print(f"  [{model}] ✗ timeout ({self.timeout}s)")
            return ""
        except requests.exceptions.HTTPError as e:
            code = e.response.status_code if e.response else '?'
            print(f"  [{model}] ✗ HTTP {code}")
            return ""
        except Exception as e:
            print(f"  [{model}] ✗ {type(e).__name__}: {e}")
            return ""

    # ── Requêtes multiples ───────────────────────────────────────────────────

    def query_all(self, prompt: str) -> Dict[str, str]:
        """
        Interroge tous les modèles configurés SÉQUENTIELLEMENT.
        Retourne {model_name: response_text}.
        """
        results = {}
        for model in self.models:
            results[model] = self.query_model(prompt, model)
        return results

    def query_all_parallel(self, prompts: List[str], max_workers: int = 3) -> Dict[str, str]:
        """
        Interroge le(s) modèle(s) en parallèle pour une liste de prompts.
        Retourne {prompt: response_text} (avec le modèle principal).
        """
        if not self.models:
            return {}

        primary_model = self.models[0]
        results: Dict[str, str] = {}

        print(f"\n[PARALLEL] {len(prompts)} prompts × modèle={primary_model} ({max_workers} workers)…")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {
                executor.submit(self.query_model, prompt, primary_model): prompt
                for prompt in prompts
            }
            for i, future in enumerate(as_completed(future_map), 1):
                prompt = future_map[future]
                try:
                    results[prompt] = future.result()
                    print(f"  [{i}/{len(prompts)}] ✓ {prompt[:50]}…")
                except Exception as e:
                    print(f"  [{i}/{len(prompts)}] ✗ {e}")
                    results[prompt] = ""

        return results

    def query_all_models_for_prompt(self, prompt: str) -> Dict[str, str]:
        """
        Interroge TOUS les modèles configurés pour un seul prompt.
        Utilisé par le score de confiance (Sprint 2).
        Retourne {model_name: response_text}.
        """
        if len(self.models) <= 1:
            return self.query_all(prompt)

        results: Dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=len(self.models)) as executor:
            future_map = {
                executor.submit(self.query_model, prompt, model): model
                for model in self.models
            }
            for future in as_completed(future_map):
                model = future_map[future]
                try:
                    results[model] = future.result()
                except Exception as e:
                    print(f"  [{model}] ✗ {e}")
                    results[model] = ""
        return results

    # ── Helpers ─────────────────────────────────────────────────────────────

    def get_active_models(self) -> Dict[str, bool]:
        return self.clients

    def get_cache_stats(self) -> dict:
        return {'size': len(self.cache), 'keys': list(self.cache.keys())[:5]}

    def clear_cache(self) -> None:
        self.cache = {}
        print("[CACHE] vidé")

    # ── Alias legacy (gardé pour compat avec app.py existant) ───────────────

    def query_ollama(self, prompt: str, model: str = None, use_cache: bool = True) -> str:
        """Alias legacy — utilise le modèle principal si non spécifié."""
        return self.query_model(prompt, model or (self.models[0] if self.models else 'qwen3.5'), use_cache)
