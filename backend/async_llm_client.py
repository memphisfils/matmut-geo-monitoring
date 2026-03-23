"""
Async LLM Client — GEO Monitor Option 1 (Backend Asynchrone)
Utilise aiohttp pour des appels HTTP non-bloquants vers Ollama Cloud.
Permet de gérer plusieurs requêtes en parallèle sans bloquer le worker.
"""
import os
import aiohttp
import asyncio
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()


class AsyncLLMClient:
    """Client asynchrone pour Ollama Cloud — supporte N modèles avec une seule clé API."""

    def __init__(self):
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'https://ollama.com/api')
        self.api_key = os.getenv('OLLAMA_API_KEY')
        # Timeout plus long pour async : 60s par requête
        self.timeout = int(os.getenv('OLLAMA_TIMEOUT', '60'))
        self.cache: Dict[str, str] = {}

        # Chargement des modèles depuis .env
        raw_models = os.getenv('OLLAMA_MODELS', 'qwen3.5')
        self.models: List[str] = [m.strip() for m in raw_models.split(',') if m.strip()]
        self.clients: Dict[str, bool] = {}

        if self.api_key:
            for model in self.models:
                self.clients[model] = True
            print(f"[AsyncLLMClient] Ollama Cloud — modèles actifs : {self.models} (timeout={self.timeout}s)")
        else:
            print("[AsyncLLMClient] OLLAMA_API_KEY manquante — mode démo activé")

    async def query_model(self, prompt: str, model: str, use_cache: bool = True, session: Optional[aiohttp.ClientSession] = None) -> str:
        """Interroge un modèle Ollama Cloud de manière asynchrone. Retourne '' si échec."""
        if not self.api_key:
            return ""

        cache_key = f"{model}:{prompt[:120]}"
        if use_cache and cache_key in self.cache:
            print(f"  [CACHE] {model[:20]}")
            return self.cache[cache_key]

        # Créer une session si non fournie
        close_session = False
        if session is None:
            session = aiohttp.ClientSession()
            close_session = True

        try:
            print(f"  [{model}] requête async (timeout={self.timeout}s)…")
            
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            async with session.post(
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
                timeout=timeout
            ) as resp:
                if resp.status != 200:
                    print(f"  [{model}] ✗ HTTP {resp.status}")
                    return ""
                
                data = await resp.json()
                content = data.get('message', {}).get('content', '')
                print(f"  [{model}] ✓ {len(content)} chars")
                
                if use_cache and content:
                    self.cache[cache_key] = content
                return content

        except asyncio.TimeoutError:
            print(f"  [{model}] ✗ timeout ({self.timeout}s)")
            return ""
        except aiohttp.ClientError as e:
            print(f"  [{model}] ✗ {type(e).__name__}: {e}")
            return ""
        finally:
            if close_session:
                await session.close()

    async def query_all(self, prompt: str) -> Dict[str, str]:
        """Interroge tous les modèles configurés en parallèle."""
        results = {}
        async with aiohttp.ClientSession() as session:
            tasks = [self.query_model(prompt, model, session=session) for model in self.models]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            for model, response in zip(self.models, responses):
                results[model] = response if isinstance(response, str) else ""
        return results

    async def query_all_parallel(self, prompts: List[str], max_workers: int = 3) -> Dict[str, str]:
        """
        Interroge le(s) modèle(s) en parallèle pour une liste de prompts.
        Utilise un semaphore pour limiter le nombre de requêtes concurrentes.
        """
        if not self.models:
            return {}

        primary_model = self.models[0]
        results: Dict[str, str] = {}
        semaphore = asyncio.Semaphore(max_workers)

        async def limited_query(prompt: str) -> str:
            async with semaphore:
                return await self.query_model(prompt, primary_model)

        tasks = [limited_query(prompt) for prompt in prompts]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        for prompt, response in zip(prompts, responses):
            results[prompt] = response if isinstance(response, str) else ""

        return results

    async def query_all_models_for_prompt(self, prompt: str) -> Dict[str, str]:
        """Interroge TOUS les modèles pour un seul prompt en parallèle via asyncio.gather."""
        if len(self.models) <= 1:
            return await self.query_all(prompt)

        results: Dict[str, str] = {}
        async with aiohttp.ClientSession() as session:
            tasks = [self.query_model(prompt, model, session=session) for model in self.models]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            for model, response in zip(self.models, responses):
                results[model] = response if isinstance(response, str) else ""
        return results

    def get_active_models(self) -> Dict[str, bool]:
        return self.clients

    def get_cache_stats(self) -> dict:
        return {'size': len(self.cache), 'keys': list(self.cache.keys())[:5]}

    def clear_cache(self) -> None:
        self.cache = {}
        print("[CACHE] vidé")

    # Alias legacy pour compatibilité
    def query_ollama(self, prompt: str, model: str = None, use_cache: bool = True) -> str:
        """Alias legacy — bloquant, à éviter en production."""
        import requests
        if not self.api_key:
            return ""
        
        model = model or (self.models[0] if self.models else 'qwen3.5')
        try:
            resp = requests.post(
                f"{self.base_url}/chat",
                headers={'Authorization': f'Bearer {self.api_key}'},
                json={'model': model, 'messages': [{'role': 'user', 'content': prompt}]},
                timeout=self.timeout
            )
            return resp.json().get('message', {}).get('content', '')
        except Exception:
            return ""
