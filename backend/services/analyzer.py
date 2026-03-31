"""
Analyseur de mentions de marques dans les réponses LLM
Version 2.0 — Support dynamique de n'importe quelle marque
Sprint 2   — Score de confiance par modèle (divergence inter-LLM)
"""
import re
import unicodedata
import json
from typing import List, Dict, Tuple, Optional
from utils.prompts import BRANDS


class BrandAnalyzer:
    """Analyse les mentions de marques dans les réponses — générique"""

    def __init__(self, brands: Optional[List[str]] = None):
        if brands:
            self.brands = brands
        else:
            self.brands = BRANDS

    # ── Extraction ──────────────────────────────────────────────────────────

    def _normalize(self, text: str) -> str:
        """Normalise un texte: minuscules + suppression des accents."""
        return unicodedata.normalize('NFD', text.lower()).encode('ascii', 'ignore').decode('ascii')

    def _extract_json_from_response(self, text: str) -> tuple:
        """
        Extrait le JSON de la réponse LLM et retourne (narrative, json_data).
        Le JSON est détecté entre ```json...``` ou entre ```...``` ou entre {...}.
        """
        if not text:
            return text, None

        import re as re_mod, json as json_mod

        # Chercher un bloc JSON (```json ... ``` ou ``` ... ```)
        json_patterns = [
            r'```json\s*(\{[\s\S]*?\})\s*```',  # ```json { ... } ```
            r'```\s*(\{[\s\S]*?\})\s*```',       # ```{ ... } ```
        ]

        for pattern in json_patterns:
            match = re_mod.search(pattern, text, re_mod.DOTALL)
            if match:
                json_str = match.group(1)
                narrative = text[:match.start()].strip()
                try:
                    json_data = json_mod.loads(json_str)
                    return narrative, json_data
                except Exception:
                    pass

        # Chercher le dernier {...} comme fallback
        last_brace = text.rfind('{')
        last_brace_end = text.rfind('}')
        if last_brace != -1 and last_brace_end > last_brace:
            json_candidate = text[last_brace:last_brace_end+1]
            narrative = text[:last_brace].strip()
            try:
                json_data = json_mod.loads(json_candidate)
                return narrative, json_data
            except Exception:
                pass

        return text, None

    def extract_brands(self, text: str) -> List[Tuple[str, int]]:
        if not text:
            return []
        mentions = []
        # N'extraire que de la partie narrative (pas du JSON)
        narrative, _ = self._extract_json_from_response(text)
        text_lower = self._normalize(narrative)
        for brand in self.brands:
            pattern = r'\b' + re.escape(self._normalize(brand)) + r'\b'
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                mentions.append((brand, matches[0].start()))
        mentions.sort(key=lambda x: x[1])
        return mentions

    def analyze_response(self, response: str) -> Dict:
        mentions = self.extract_brands(response)
        result = {
            'brands_mentioned': [brand for brand, _ in mentions],
            'positions':        {brand: idx + 1 for idx, (brand, _) in enumerate(mentions)},
            'first_brand':      mentions[0][0] if mentions else None,
        }
        main_brand = self.brands[0] if self.brands else None
        if main_brand:
            result['matmut_mentioned'] = any(b == main_brand for b, _ in mentions)
            result['matmut_position']  = None
            result['brand_mentioned']  = result['matmut_mentioned']
            result['brand_position']   = None
            for idx, (brand, _) in enumerate(mentions):
                if brand == main_brand:
                    result['matmut_position'] = idx + 1
                    result['brand_position']  = idx + 1
                    break
        return result

    def calculate_sentiment(self, text: str, brand: str) -> float:
        if not text or brand.lower() not in text.lower():
            return 0
        positive_words = ['excellent', 'bon', 'meilleur', 'rapide', 'efficace', 'fiable',
                          'top', 'recommande', 'super', 'génial', 'economique', 'qualité',
                          'best', 'great', 'amazing', 'trusted', 'reliable']
        negative_words = ['mauvais', 'lent', 'cher', 'pire', 'déçu', 'problème',
                          'fuir', 'arnaque', 'compliqué', 'inutile', 'bad', 'avoid',
                          'poor', 'terrible', 'worst']
        score = 0
        text_lower = text.lower()
        for word in positive_words:
            if word in text_lower: score += 15
        for word in negative_words:
            if word in text_lower: score -= 15
        return max(min(score, 100), -100)

    # ── Métriques globales ───────────────────────────────────────────────────

    def calculate_metrics(self, all_results: List[Dict]) -> Dict:
        metrics = {}
        total_prompts = len(all_results)

        for brand in self.brands:
            mentions_count      = 0
            positions_sum       = 0
            first_position_count = 0

            for result in all_results:
                if brand in result.get('brands_mentioned', []):
                    mentions_count += 1
                    positions_sum  += result['positions'].get(brand, 0)
                    if result.get('first_brand') == brand:
                        first_position_count += 1

            mention_rate = (mentions_count / total_prompts * 100) if total_prompts > 0 else 0
            avg_position = (positions_sum / mentions_count) if mentions_count > 0 else 0
            top_of_mind  = (first_position_count / total_prompts * 100) if total_prompts > 0 else 0
            avg_sentiment = max(100 - (avg_position * 20), -20) if mentions_count > 0 else 0

            metrics[brand] = {
                'mention_count':       mentions_count,
                'mention_rate':        round(mention_rate, 2),
                'avg_position':        round(avg_position, 2),
                'top_of_mind':         round(top_of_mind, 2),
                'first_position_count': first_position_count,
                'sentiment_score':     round(avg_sentiment, 1)
            }

        total_mentions = sum(m['mention_count'] for m in metrics.values())
        for brand in metrics:
            sov = (metrics[brand]['mention_count'] / total_mentions * 100) if total_mentions > 0 else 0
            metrics[brand]['share_of_voice'] = round(sov, 2)

        for brand in metrics:
            score = (
                metrics[brand]['mention_rate'] * 0.4 +
                (100 / metrics[brand]['avg_position'] if metrics[brand]['avg_position'] > 0 else 0) * 0.3 +
                metrics[brand]['share_of_voice'] * 0.2 +
                metrics[brand]['top_of_mind'] * 0.1 +
                max(metrics[brand]['sentiment_score'], 0) * 0.1
            )
            metrics[brand]['global_score'] = round(score, 2)

        return metrics

    # ── SPRINT 2 — Métriques par modèle ─────────────────────────────────────

    def calculate_metrics_by_model(self, responses: List[Dict]) -> Dict:
        """
        Calcule les métriques séparément pour chaque modèle LLM.

        Args:
            responses: liste des réponses brutes (chaque item a 'llm_analyses')

        Returns:
            {
              'qwen3.5':  {brand: {mention_rate, global_score, ...}},
              'llama3.2': {brand: {...}}
            }
        """
        by_model: Dict[str, List[Dict]] = {}

        for response in responses:
            for model, data in response.get('llm_analyses', {}).items():
                by_model.setdefault(model, [])
                by_model[model].append(data.get('analysis', {}))

        return {
            model: self.calculate_metrics(analyses)
            for model, analyses in by_model.items()
            if analyses
        }

    def calculate_confidence_score(self, metrics_by_model: Dict, brand: str) -> Dict:
        """
        Calcule le score de confiance d'une marque = cohérence entre les modèles.

        Un score élevé = les modèles s'accordent → résultat fiable.
        Un score faible = forte divergence → résultat à interpréter avec précaution.

        Returns:
            {
              'confidence':       float (0-100),
              'divergence_level': 'faible' | 'modérée' | 'élevée',
              'std_dev':          float,
              'avg_mention_rate': float,
              'per_model': {model: mention_rate}
            }
        """
        if not metrics_by_model:
            return {'confidence': None, 'divergence_level': 'N/A', 'std_dev': 0,
                    'avg_mention_rate': 0, 'per_model': {}}

        if len(metrics_by_model) == 1:
            model = list(metrics_by_model.keys())[0]
            rate  = metrics_by_model[model].get(brand, {}).get('mention_rate', 0)
            return {
                'confidence':       None,
                'divergence_level': 'N/A — modèle unique',
                'std_dev':          0,
                'avg_mention_rate': round(rate, 1),
                'per_model':        {model: round(rate, 1)},
                'note':             'Activez plusieurs modèles (OLLAMA_MODELS) pour calculer la confiance'
            }

        rates = [
            m.get(brand, {}).get('mention_rate', 0)
            for m in metrics_by_model.values()
        ]
        avg     = sum(rates) / len(rates)
        variance = sum((r - avg) ** 2 for r in rates) / len(rates)
        std_dev  = variance ** 0.5

        # Confiance : std_dev faible = haute confiance
        confidence = max(0.0, 100.0 - std_dev * 2.5)

        if std_dev < 10:
            level = 'faible'       # bonne cohérence
        elif std_dev < 25:
            level = 'modérée'
        else:
            level = 'élevée'       # les modèles ne s'accordent pas

        return {
            'confidence':       round(confidence, 1),
            'divergence_level': level,
            'std_dev':          round(std_dev, 1),
            'avg_mention_rate': round(avg, 1),
            'per_model': {
                model: round(m.get(brand, {}).get('mention_rate', 0), 1)
                for model, m in metrics_by_model.items()
            }
        }

    def get_full_confidence_report(self, responses: List[Dict], main_brand: str) -> Dict:
        """
        Rapport complet de confiance pour toutes les marques.

        Returns:
            {
              'by_model': {model: {brand: metrics}},
              'confidence': {brand: confidence_score},
              'main_brand_confidence': {...}
            }
        """
        by_model = self.calculate_metrics_by_model(responses)

        confidence_by_brand = {}
        for brand in self.brands:
            confidence_by_brand[brand] = self.calculate_confidence_score(by_model, brand)

        return {
            'by_model':              by_model,
            'confidence':            confidence_by_brand,
            'main_brand_confidence': confidence_by_brand.get(main_brand, {})
        }

    # ── Ranking + Insights ───────────────────────────────────────────────────

    def generate_ranking(self, metrics: Dict) -> List[Dict]:
        ranking = [{'brand': brand, **data} for brand, data in metrics.items()]
        ranking.sort(key=lambda x: x['global_score'], reverse=True)
        for idx, item in enumerate(ranking):
            item['rank'] = idx + 1
        return ranking

    def generate_insights(self, metrics: Dict, ranking: List[Dict],
                          main_brand: Optional[str] = None) -> Dict:
        if not main_brand:
            main_brand = self.brands[0] if self.brands else None

        if not main_brand or main_brand not in metrics:
            return {'rank': None, 'strengths': [], 'weaknesses': [], 'recommendations': []}

        brand_data = metrics[main_brand]
        brand_rank = next((r['rank'] for r in ranking if r['brand'] == main_brand), None)

        strengths       = []
        weaknesses      = []
        recommendations = []

        if brand_data.get('mention_rate', 0) > 60:
            strengths.append(f"Bonne visibilité générale ({brand_data['mention_rate']}% de mention)")
        else:
            weaknesses.append(f"Visibilité limitée ({brand_data['mention_rate']}% de mention)")

        if brand_data.get('avg_position', 0) > 0 and brand_data['avg_position'] <= 2:
            strengths.append(f"Excellente position moyenne ({brand_data['avg_position']})")
        elif brand_data.get('avg_position', 0) > 3:
            weaknesses.append(f"Position moyenne perfectible ({brand_data['avg_position']})")

        if brand_data.get('top_of_mind', 0) < 10:
            weaknesses.append(f"Rarement citée en premier ({brand_data['top_of_mind']}%)")
            recommendations.append("Renforcer la notoriété spontanée")

        leader = ranking[0] if ranking else None
        if leader and leader['brand'] != main_brand:
            gap = leader['global_score'] - brand_data.get('global_score', 0)
            recommendations.append(f"Réduire l'écart avec {leader['brand']} (-{gap:.1f} pts)")

        recommendations.append("Renforcer le contenu expert sur le secteur")
        recommendations.append("Améliorer SEO/GEO sur requêtes génériques")

        return {
            'rank':            brand_rank,
            'main_brand':      main_brand,
            'strengths':       strengths,
            'weaknesses':      weaknesses,
            'recommendations': recommendations
        }
