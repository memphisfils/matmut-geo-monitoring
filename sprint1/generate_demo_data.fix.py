def generate_demo_data(brand='Marque', competitors=None, prompts=None):
    """
    Génère des données de démo NEUTRES — le score de chaque marque
    dépend de son NOM, pas du fait d'être 'la marque entrée'.
    Nike bat toujours Adidas avec les mêmes chiffres, peu importe
    lequel est entré en premier.
    """
    import random

    if not competitors:
        competitors = ['Concurrent A', 'Concurrent B', 'Concurrent C', 'Concurrent D']
    if not prompts:
        prompts = [
            f"Meilleur service {brand.lower()} ?",
            f"Comparatif {brand.lower()} vs concurrents"
        ]

    all_brands = [brand] + competitors
    demo_responses = []

    def brand_seed(b):
        """Seed reproductible basé uniquement sur le nom — pas sur la position."""
        return abs(hash(b)) % (2**31)

    def seeded_prob(b):
        """Probabilité de mention stable par nom de marque."""
        rng = random.Random(brand_seed(b))
        return 0.35 + rng.random() * 0.55   # 35–90%, neutre pour toutes les marques

    for i, prompt in enumerate(prompts[:20]):
        llm_analyses = {}
        for llm_name in ['ollama']:
            brands_in_response = []
            for b in all_brands:
                prob = seeded_prob(b)
                # Légère variation par prompt pour que ce ne soit pas identique à chaque fois
                rng = random.Random(brand_seed(b) + i * 997)
                adjusted = prob + (rng.random() - 0.5) * 0.15
                if random.Random(brand_seed(b) + i * 13).random() < adjusted:
                    brands_in_response.append(b)

            # Ordre d'apparition : basé sur le nom de la marque, stable
            brands_in_response.sort(key=lambda b: brand_seed(b))

            positions = {b: idx + 1 for idx, b in enumerate(brands_in_response)}
            first_brand = brands_in_response[0] if brands_in_response else None

            analysis = {
                'brands_mentioned': brands_in_response,
                'positions': positions,
                'first_brand': first_brand,
                'matmut_mentioned': brand in brands_in_response,
                'brand_mentioned': brand in brands_in_response,
                'brand_position': positions.get(brand, None),
                'matmut_position': positions.get(brand, None)
            }
            llm_analyses[llm_name] = {
                'response': f'[Réponse simulée {llm_name} — prompt {i+1}]',
                'analysis': analysis
            }

        demo_responses.append({
            'category': 'general',
            'prompt': prompt,
            'llm_analyses': llm_analyses
        })

    return {
        'timestamp': __import__('datetime').datetime.now().isoformat(),
        'total_prompts': len(demo_responses),
        'llms_used': ['ollama'],
        'brand': brand,
        'competitors': competitors,
        'responses': demo_responses,
        'is_demo': True
    }
