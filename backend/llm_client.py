"""
Client pour interroger Ollama Cloud API
Format natif Ollama (pas OpenAI-compatible)
"""
import os
import requests
from typing import Dict
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

class LLMClient:
    """Client pour Ollama Cloud API - Format natif"""

    def __init__(self):
        self.clients = {}
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'https://ollama.com/api')
        self.api_key = os.getenv('OLLAMA_API_KEY')
        self.model = os.getenv('OLLAMA_MODEL', 'llama3.2:8b')
        self.cache = {}  # Cache mémoire simple
        
        if self.api_key:
            print(f"Using Ollama Cloud URL: {self.base_url}")
            print(f"Using model: {self.model}")
            self.clients['ollama'] = True
            print(f"Initialized Ollama Cloud Client.")
        else:
            print("Warning: OLLAMA_API_KEY not configured in .env")

        print(f"Available models: {list(self.clients.keys())}")

    def query_ollama(self, prompt: str, model: str = None, use_cache: bool = True) -> str:
        """Interroge Ollama Cloud avec le format natif"""
        if 'ollama' not in self.clients:
            return ""
        
        # Check cache
        cache_key = f"{model or self.model}:{prompt[:100]}"
        if use_cache and cache_key in self.cache:
            print(f"  [CACHE HIT] Using cached response")
            return self.cache[cache_key]
        
        use_model = model or self.model
        
        # Optimisé: timeout 30s, 1 retry max
        max_retries = 1
        timeout = 30  # secondes
        
        for attempt in range(max_retries + 1):
            try:
                url = f"{self.base_url}/chat"
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                }
                payload = {
                    'model': use_model,
                    'messages': [
                        {'role': 'user', 'content': prompt}
                    ],
                    'stream': False
                }
                
                if attempt == 0:
                    print(f"  Attempt {attempt + 1}/{max_retries + 1} (timeout: {timeout}s)...")
                else:
                    print(f"  Retry {attempt}/{max_retries}...")
                    
                response = requests.post(url, headers=headers, json=payload, timeout=timeout)
                response.raise_for_status()
                
                result = response.json()
                message = result.get('message', {})
                content = message.get('content', '')
                print(f"  [OK] Response received ({len(content)} chars)")
                
                # Store in cache
                if use_cache:
                    self.cache[cache_key] = content
                
                return content
                
            except requests.exceptions.Timeout:
                print(f"  [TIMEOUT] ({timeout}s)")
                if attempt == max_retries:
                    print(f"  [ERROR] Max retries reached")
                    return ""
            except requests.exceptions.HTTPError as e:
                print(f"  [HTTP ERROR] {e}")
                if hasattr(e, 'response'):
                    print(f"     Response: {e.response.text[:200]}")
                return ""
            except requests.exceptions.RequestException as e:
                print(f"  [CONNECTION ERROR] {e}")
                return ""
            except Exception as e:
                print(f"  [ERROR] {e}")
                return ""
        
        return ""

    def query_all_parallel(self, prompts: list, max_workers: int = 3) -> Dict[str, str]:
        """Interroge Ollama en parallèle pour plusieurs prompts"""
        results = {}
        
        if 'ollama' not in self.clients:
            return results
        
        print(f"\n[PARALLEL] Processing {len(prompts)} prompts with {max_workers} workers...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_prompt = {
                executor.submit(self.query_ollama, prompt, None, True): prompt 
                for prompt in prompts
            }
            
            for i, future in enumerate(as_completed(future_to_prompt), 1):
                prompt = future_to_prompt[future]
                try:
                    result = future.result()
                    results[prompt] = result
                    print(f"[{i}/{len(prompts)}] Completed: {prompt[:50]}...")
                except Exception as e:
                    print(f"[{i}/{len(prompts)}] Error: {prompt[:50]}... - {e}")
                    results[prompt] = ""
        
        return results

    def query_all(self, prompt: str) -> Dict[str, str]:
        """Interroge Ollama et retourne les résultats"""
        results = {}

        if 'ollama' in self.clients:
            print(f"Querying Ollama (model: {self.model})...")
            results['ollama'] = self.query_ollama(prompt)

        return results

    def get_active_models(self) -> Dict[str, bool]:
        """Retourne la liste des modèles actifs"""
        return self.clients

    def clear_cache(self):
        """Vide le cache"""
        self.cache = {}
        print("[CACHE] Cleared")

    def get_cache_stats(self) -> dict:
        """Retourne les statistiques du cache"""
        return {
            'size': len(self.cache),
            'keys': list(self.cache.keys())[:5]
        }
