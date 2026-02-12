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
    """Client unifié pour ChatGPT, Claude et Gemini"""
    
    def __init__(self):
        # OpenAI
        openai.api_key = os.getenv('OPENAI_API_KEY')
        self.openai_client = openai
        
        # Anthropic
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        
        # Google Gemini
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.gemini_model = genai.GenerativeModel('gemini-pro')
    
    def query_chatgpt(self, prompt: str) -> str:
        """Interroge ChatGPT (GPT-4)"""
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
    
    def query_claude(self, prompt: str) -> str:
        """Interroge Claude (Sonnet)"""
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
        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Erreur Gemini: {e}")
            return ""
    
    def query_all(self, prompt: str) -> Dict[str, str]:
        """Interroge tous les LLMs et retourne les résultats"""
        results = {}
        
        print(f"Querying ChatGPT...")
        results['chatgpt'] = self.query_chatgpt(prompt)
        time.sleep(1)  # Rate limiting
        
        print(f"Querying Claude...")
        results['claude'] = self.query_claude(prompt)
        time.sleep(1)
        
        print(f"Querying Gemini...")
        results['gemini'] = self.query_gemini(prompt)
        time.sleep(1)
        
        return results
