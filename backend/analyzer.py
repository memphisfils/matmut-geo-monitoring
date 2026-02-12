"""
Analyseur de mentions de marques dans les réponses LLM
"""
import re
from typing import List, Dict, Tuple
from prompts import BRANDS

class BrandAnalyzer:
    """Analyse les mentions de marques dans les réponses"""
    
    def __init__(self):
        self.brands = BRANDS
    
    def extract_brands(self, text: str) -> List[Tuple[str, int]]:
        """
        Extrait les marques mentionnées avec leur position
        
        Returns:
            Liste de (brand_name, position)
        """
        if not text:
            return []
        
        mentions = []
        text_lower = text.lower()
        
        for brand in self.brands:
            # Chercher toutes les occurrences
            pattern = r'\b' + re.escape(brand.lower()) + r'\b'
            matches = list(re.finditer(pattern, text_lower))
            
            if matches:
                # Position = premier caractère de première occurrence
                first_position = matches[0].start()
                mentions.append((brand, first_position))
        
        # Trier par position d'apparition
        mentions.sort(key=lambda x: x[1])
        
        return mentions
    
    def analyze_response(self, response: str) -> Dict:
        """
        Analyse une réponse complète
        
        Returns:
            {
                'brands_mentioned': ['Matmut', 'MAIF', ...],
                'positions': {
                    'Matmut': 1,
                    'MAIF': 2,
                    ...
                },
                'first_brand': 'MAIF',
                'matmut_mentioned': True/False,
                'matmut_position': 3 or None
            }
        """
        mentions = self.extract_brands(response)
        
        result = {
            'brands_mentioned': [brand for brand, _ in mentions],
            'positions': {brand: idx + 1 for idx, (brand, _) in enumerate(mentions)},
            'first_brand': mentions[0][0] if mentions else None,
            'matmut_mentioned': any(brand == 'Matmut' for brand, _ in mentions),
            'matmut_position': None
        }
        
        # Position de Matmut
        for idx, (brand, _) in enumerate(mentions):
            if brand == 'Matmut':
                result['matmut_position'] = idx + 1
                break
        
        return result
    
    def calculate_metrics(self, all_results: List[Dict]) -> Dict:
        """
        Calcule les métriques globales pour chaque marque
        
        Args:
            all_results: Liste des résultats d'analyse pour tous les prompts
            
        Returns:
            Métriques par marque
        """
        metrics = {}
        total_prompts = len(all_results)
        
        for brand in self.brands:
            mentions_count = 0
            positions_sum = 0
            first_position_count = 0
            
            for result in all_results:
                if brand in result['brands_mentioned']:
                    mentions_count += 1
                    positions_sum += result['positions'][brand]
                    
                    if result['first_brand'] == brand:
                        first_position_count += 1
            
            # Calculs
            mention_rate = (mentions_count / total_prompts * 100) if total_prompts > 0 else 0
            avg_position = (positions_sum / mentions_count) if mentions_count > 0 else 0
            top_of_mind = (first_position_count / total_prompts * 100) if total_prompts > 0 else 0
            
            metrics[brand] = {
                'mention_count': mentions_count,
                'mention_rate': round(mention_rate, 2),
                'avg_position': round(avg_position, 2),
                'top_of_mind': round(top_of_mind, 2),
                'first_position_count': first_position_count
            }
        
        # Share of Voice
        total_mentions = sum(m['mention_count'] for m in metrics.values())
        for brand in metrics:
            sov = (metrics[brand]['mention_count'] / total_mentions * 100) if total_mentions > 0 else 0
            metrics[brand]['share_of_voice'] = round(sov, 2)
        
        # Score global (pondéré)
        for brand in metrics:
            score = (
                metrics[brand]['mention_rate'] * 0.4 +
                (100 / metrics[brand]['avg_position'] if metrics[brand]['avg_position'] > 0 else 0) * 0.3 +
                metrics[brand]['share_of_voice'] * 0.2 +
                metrics[brand]['top_of_mind'] * 0.1
            )
            metrics[brand]['global_score'] = round(score, 2)
        
        return metrics
    
    def generate_ranking(self, metrics: Dict) -> List[Dict]:
        """
        Génère le classement des marques
        
        Returns:
            Liste triée par score décroissant
        """
        ranking = []
        
        for brand, data in metrics.items():
            ranking.append({
                'brand': brand,
                **data
            })
        
        # Trier par score global
        ranking.sort(key=lambda x: x['global_score'], reverse=True)
        
        # Ajouter le rang
        for idx, item in enumerate(ranking):
            item['rank'] = idx + 1
        
        return ranking
    
    def generate_insights(self, metrics: Dict, ranking: List[Dict]) -> Dict:
        """Génère des insights pour Matmut"""
        matmut_data = metrics.get('Matmut', {})
        matmut_rank = next((r['rank'] for r in ranking if r['brand'] == 'Matmut'), None)
        
        # Trouver les forces et faiblesses
        strengths = []
        weaknesses = []
        recommendations = []
        
        # Analyse
        if matmut_data.get('mention_rate', 0) > 60:
            strengths.append(f"Bonne visibilité générale ({matmut_data['mention_rate']}% de mention)")
        else:
            weaknesses.append(f"Visibilité limitée ({matmut_data['mention_rate']}% de mention)")
        
        if matmut_data.get('avg_position', 0) > 0 and matmut_data['avg_position'] <= 2:
            strengths.append(f"Excellente position moyenne ({matmut_data['avg_position']})")
        elif matmut_data.get('avg_position', 0) > 3:
            weaknesses.append(f"Position moyenne perfectible ({matmut_data['avg_position']})")
        
        if matmut_data.get('top_of_mind', 0) < 10:
            weaknesses.append(f"Rarement citée en premier ({matmut_data['top_of_mind']}%)")
            recommendations.append("Renforcer la notoriété spontanée")
        
        # Comparaison vs leader
        leader = ranking[0] if ranking else None
        if leader and leader['brand'] != 'Matmut':
            gap = leader['global_score'] - matmut_data.get('global_score', 0)
            recommendations.append(f"Réduire l'écart avec {leader['brand']} (-{gap:.1f} points)")
        
        recommendations.append("Renforcer contenu assurance professionnelle")
        recommendations.append("Améliorer SEO/GEO sur requêtes génériques")
        
        return {
            'rank': matmut_rank,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'recommendations': recommendations
        }
