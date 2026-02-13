"""
Client pour interroger multiple LLMs
"""
import os
from typing import Dict, List
import openai
from anthropic import Anthropic
import google.generativeai as genai
from dotenv import load_dotenv
import time

load_dotenv()

class LLMClient:
    """Client unifié pour ChatGPT, Claude, Gemini et DeepSeek"""
    
    def __init__(self):
        self.clients = {}
        
        # OpenAI
        openai_key = os.getenv('OPENAI_API_KEY')
        if openai_key:
            self.openai_client = openai.OpenAI(api_key=openai_key)
            self.clients['chatgpt'] = True
        
        # DeepSeek (OpenAI-compatible)
        deepseek_key = os.getenv('DEEPSEEK_API_KEY')
        if deepseek_key:
            self.deepseek_client = openai.OpenAI(
                api_key=deepseek_key,
                base_url="https://api.deepseek.com"
            )
            self.clients['deepseek'] = True

        # Anthropic
        anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        if anthropic_key:
            try:
                self.anthropic_client = Anthropic(api_key=anthropic_key)
                self.clients['claude'] = True
            except Exception as e:
                print(f"Failed to init Claude: {e}")
        
        # Google Gemini
        google_key = os.getenv('GOOGLE_API_KEY')
        if google_key:
            try:
                genai.configure(api_key=google_key)
                self.gemini_model = genai.GenerativeModel('gemini-pro')
                self.clients['gemini'] = True
            except Exception as e:
                print(f"Failed to init Gemini: {e}")
                
        print(f"Initialized LLM Client. Available models: {list(self.clients.keys())}")
    
    def query_chatgpt(self, prompt: str) -> str:
        """Interroge ChatGPT (GPT-4)"""
        if 'chatgpt' not in self.clients: return ""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=800
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Erreur ChatGPT: {e}")
            return ""

    def query_deepseek(self, prompt: str) -> str:
        """Interroge DeepSeek (DeepSeek-V3/R1)"""
        if 'deepseek' not in self.clients: return ""
        try:
            # Utiliser deepseek-chat (ou deepseek-reasoner pour R1)
            response = self.deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=800,
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Erreur DeepSeek: {e}")
            return ""
    
    def query_claude(self, prompt: str) -> str:
        """Interroge Claude (Sonnet)"""
        if 'claude' not in self.clients: return ""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=800,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            print(f"Erreur Claude: {e}")
            return ""
    
    def query_gemini(self, prompt: str) -> str:
        """Interroge Google Gemini"""
        if 'gemini' not in self.clients: return ""
        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Erreur Gemini: {e}")
            return ""
    
    def query_all(self, prompt: str) -> Dict[str, str]:
        """Interroge tous les LLMs disponibles et retourne les résultats"""
        results = {}
        
        if 'chatgpt' in self.clients:
            print(f"Querying ChatGPT...")
            results['chatgpt'] = self.query_chatgpt(prompt)
            
        if 'deepseek' in self.clients:
            print(f"Querying DeepSeek...")
            results['deepseek'] = self.query_deepseek(prompt)

        if 'claude' in self.clients:
            print(f"Querying Claude...")
            results['claude'] = self.query_claude(prompt)
        
        if 'gemini' in self.clients:
            print(f"Querying Gemini...")
            results['gemini'] = self.query_gemini(prompt)
        
        return results
