"""
Analyseur de mentions de marques dans les réponses LLM
Version 2.0 — Support dynamique de n'importe quelle marque
"""
import re
from typing import List, Dict, Tuple, Optional


class BrandAnalyzer:
    """Analyse les mentions de marques dans les réponses — générique"""

    def __init__(self, brands: Optional[List[str]] = None):
        # Support dynamique : on peut passer n'importe quelle liste de marques
        if brands:
            self.brands = brands
        else:
            # Fallback legacy Matmut pour compatibilité
            from prompts import BRANDS
            self.brands = BRANDS

    def extract_brands(self, text: str) -> List[Tuple[str, int]]:
        if not text:
            return []

        mentions = []
        text_lower = text.lower()

        for brand in self.brands:
            pattern = r'\b' + re.escape(brand.lower()) + r'\b'
            matches = list(re.finditer(pattern, text_lower))
            if matches:
                mentions.append((brand, matches[0].start()))

        mentions.sort(key=lambda x: x[1])
        return mentions

    def analyze_response(self, response: str) -> Dict:
        mentions = self.extract_brands(response)

        result = {
            'brands_mentioned': [brand for brand, _ in mentions],
            'positions': {brand: idx + 1 for idx, (brand, _) in enumerate(mentions)},
            'first_brand': mentions[0][0] if mentions else None,
        }

        # Compat legacy (Matmut) + générique
        main_brand = self.brands[0] if self.brands else None
        if main_brand:
            result['matmut_mentioned'] = any(b == main_brand for b, _ in mentions)
            result['matmut_position'] = None
            result['brand_mentioned'] = result['matmut_mentioned']
            result['brand_position'] = None
            for idx, (brand, _) in enumerate(mentions):
                if brand == main_brand:
                    result['matmut_position'] = idx + 1
                    result['brand_position'] = idx + 1
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

    def calculate_metrics(self, all_results: List[Dict]) -> Dict:
        metrics = {}
        total_prompts = len(all_results)

        for brand in self.brands:
            mentions_count = 0
            positions_sum = 0
            first_position_count = 0

            for result in all_results:
                if brand in result.get('brands_mentioned', []):
                    mentions_count += 1
                    positions_sum += result['positions'].get(brand, 0)
                    if result.get('first_brand') == brand:
                        first_position_count += 1

            mention_rate = (mentions_count / total_prompts * 100) if total_prompts > 0 else 0
            avg_position = (positions_sum / mentions_count) if mentions_count > 0 else 0
            top_of_mind = (first_position_count / total_prompts * 100) if total_prompts > 0 else 0
            avg_sentiment = max(100 - (avg_position * 20), -20) if mentions_count > 0 else 0

            metrics[brand] = {
                'mention_count': mentions_count,
                'mention_rate': round(mention_rate, 2),
                'avg_position': round(avg_position, 2),
                'top_of_mind': round(top_of_mind, 2),
                'first_position_count': first_position_count,
                'sentiment_score': round(avg_sentiment, 1)
            }

        # Share of Voice
        total_mentions = sum(m['mention_count'] for m in metrics.values())
        for brand in metrics:
            sov = (metrics[brand]['mention_count'] / total_mentions * 100) if total_mentions > 0 else 0
            metrics[brand]['share_of_voice'] = round(sov, 2)

        # Score global pondéré
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

    def generate_ranking(self, metrics: Dict) -> List[Dict]:
        ranking = [{'brand': brand, **data} for brand, data in metrics.items()]
        ranking.sort(key=lambda x: x['global_score'], reverse=True)
        for idx, item in enumerate(ranking):
            item['rank'] = idx + 1
        return ranking

    def generate_insights(self, metrics: Dict, ranking: List[Dict], main_brand: Optional[str] = None) -> Dict:
        # Utilise la première marque de la liste si non spécifiée
        if not main_brand:
            main_brand = self.brands[0] if self.brands else None

        if not main_brand or main_brand not in metrics:
            return {'rank': None, 'strengths': [], 'weaknesses': [], 'recommendations': []}

        brand_data = metrics[main_brand]
        brand_rank = next((r['rank'] for r in ranking if r['brand'] == main_brand), None)

        strengths = []
        weaknesses = []
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
            'rank': brand_rank,
            'main_brand': main_brand,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'recommendations': recommendations
        }
