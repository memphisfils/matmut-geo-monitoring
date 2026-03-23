"""
Liste de prompts pour tester la visibilité de Matmut
"""

PROMPTS = {
    "assurance_auto": [
        "Quelle est la meilleure assurance auto en France ?",
        "Comparatif des assurances auto les moins chères",
        "Top 5 des assureurs auto en 2026",
        "Quelle assurance auto pour jeune conducteur ?",
        "Assurance auto tous risques : laquelle choisir ?",
        "Avis sur les assurances auto mutualistes",
        "Quelle assurance auto pour voiture électrique ?",
        "Assurance auto sans franchise : qui propose ?",
        "Meilleur rapport qualité-prix assurance auto",
        "Assurance auto avec bonus écologique"
    ],
    
    "assurance_habitation": [
        "Meilleure assurance habitation 2026",
        "Comparatif assurance logement étudiant",
        "Assurance habitation multirisque : top 5",
        "Quelle assurance pour propriétaire ?",
        "Assurance locataire pas chère",
        "Assurance habitation avec garantie catastrophe naturelle",
        "Top assureurs habitation en France",
        "Assurance résidence secondaire",
        "Comparatif assurance maison",
        "Meilleure mutuelle habitation"
    ],
    
    "mutuelle_sante": [
        "Quelle est la meilleure mutuelle santé ?",
        "Comparatif mutuelles santé 2026",
        "Top 5 des mutuelles pour famille",
        "Mutuelle santé senior : laquelle choisir ?",
        "Meilleure mutuelle pour les soins dentaires",
        "Mutuelle santé avec tiers payant",
        "Comparatif mutuelles optique",
        "Mutuelle santé étudiant pas chère",
        "Top mutuelles hospitalisation",
        "Meilleur rapport qualité-prix mutuelle"
    ],
    
    "assurance_pro": [
        "Assurance professionnelle pour auto-entrepreneur",
        "RC Pro : quelle assurance choisir ?",
        "Top assureurs pour TPE/PME",
        "Assurance multirisque professionnelle",
        "Quelle assurance pour profession libérale ?",
        "Assurance local commercial",
        "Protection juridique professionnelle",
        "Assurance cyber-risques entreprise",
        "Comparatif assurances professionnelles",
        "Meilleure assurance pour freelance"
    ],
    
    "general": [
        "Top 10 des assureurs en France",
        "Quelle mutuelle choisir en 2026 ?",
        "Comparatif des grands groupes d'assurance",
        "Assurance mutualiste vs assurance classique",
        "Les assurances les plus fiables en France",
        "Quelle assurance offre le meilleur service client ?",
        "Avis sur les mutuelles françaises",
        "Comparatif prix assurances France",
        "Les assureurs préférés des Français",
        "Quelle assurance pour tous les besoins ?"
    ]
}

# Liste complète de tous les prompts
ALL_PROMPTS = []
for category, prompts in PROMPTS.items():
    for prompt in prompts:
        ALL_PROMPTS.append({
            "category": category,
            "prompt": prompt
        })

# Marques à tracker
BRANDS = [
    "Matmut",
    "MAIF",
    "MACSF",
    "GMF",
    "MACIF",
    "AXA",
    "Allianz",
    "Groupama",
    "MMA",
    "AG2R",
    "Generali",
    "APRIL"
]


# ── GEO System Prompt ───────────────────────────────────────────────────────────
# Prompt système pour l'analyse GEO - SANS forçage des marques
# Les {brands} sont injectées pourque le LLM sache quel est le benchmark
# mais il n'est PAS forcé de les mentionner

GEO_SYSTEM_PROMPT = """Tu es un analyste GEO (Generative Engine Optimization) expert en comparaison de marques.

## TON ROLE
Réponds à la question de l'utilisateur de manière HONNÊTE et OBJECTIVE, comme le ferait un expert SEO.
 Ensuite, EXTRAIT les marques mentionné dans ta réponse et fournis les métriques au format JSON demandé.

## RÈGLES

1. **Réponds honnêtement**
   - Base-toi sur tes connaissances factuelles
   - Ne force PAS la mention de marques spécifiques
   - Si une marque n'est pas pertinente, ne la mentionne pas

2. **Comparaison objective**
   - Compare les marques entre elles sur des critères objectifs (prix, qualité, innovation, service)
   - Sois factuel, pas promotionnel

3. **EXTRAIT les marques mentionné dans ta réponse -au format JSON STRICT**
   Après ta réponse, ajoute ce JSON avec les marques que tu as RÉELLEMENT mentionnées:
{{
  "mentions": ["Marque1", "Marque2"],  <- seulement les marques que tu as citees
  "classement": {{"Marque1": 1, "Marque2": 2}},
  "premier": "Marque1",
  "sentiments": {{"Marque1": "positif", "Marque2": "neutre"}},
  "resume": "ta conclusion courte"
}}

## EXEMPLE

Benchmark: [Nike, Puma, Adidas, Under Armour]
Question: "Meilleures chaussures de running?"

Réponse libre du LLM (non forcée):
Nike domine le marché grace a ses technologies ZoomX et Air Zoom...
Adidas est solide sur l'amorti avec Ultraboost...
Puma progresse mais reste en retrait...
Under Armour manque de reconnaissance dans le running...

JSON extrait:
{{
  "mentions": ["Nike", "Adidas", "Puma", "Under Armour"],
  "classement": {{"Nike": 1, "Adidas": 2, "Puma": 3, "Under Armour": 4}},
  "premier": "Nike",
  "sentiments": {{"Nike": "positif", "Adidas": "positif", "Puma": "neutre", "Under Armour": "neutre"}},
  "resume": "Nike leader, Adidas solide, Puma et UA en retrait."
}}"""


def build_geo_prompt(benchmark_brands: list) -> str:
    """Construit le system prompt GEO avec le benchmark de marques."""
    brands_str = ", ".join(f'"{b}"' for b in benchmark_brands)
    return GEO_SYSTEM_PROMPT.format(brands=brands_str)


# ── Benchmark Generation Prompt ───────────────────────────────────────────────────

BENCHMARK_GENERATION_PROMPT = """Tu es un expert en analyse concurrentielle et SEO.

Génère une configuration de benchmark complète pour comparer des marques sur un secteur spécifique.

## RÈGLES

1. **Un seul secteur** - Choisis le secteur le plus pertinent pour les marques fournies
2. **3 à 5 produits directement comparables** - Chaque produit doit exister chez TOUTES les marques
3. **5-6 prompts SEO comparatifs** - Chaque prompt compare les mêmes produits entre marques
4. **Les prompts doivent mentionner EXPLICITEMENT les noms de produits avec les marques**

## FORMAT JSON STRICT

{{
  "sector": "Nom du secteur",
  "products": [
    {{
      "id": "p1",
      "name": "Nom du produit (doit exister chez toutes les marques)",
      "description": "Description courte",
      "prompts": [
        "Comparatif [produit] : [Marque1] vs [Marque2] vs [Marque3]",
        "Meilleur [produit] : [Marque1] ou [Marque2] ?"
      ]
    }}
  ],
  "brands": ["Marque1", "Marque2", "Marque3"],
  "seo_prompts": [
    "Comparatif smartphone 2024 : iPhone 15 vs Galaxy S24 vs Xiaomi 14",
    "Meilleur smartphone haut de gamme : Apple ou Samsung ?"
  ]
}}

## EXEMPLE

Marques: Xiaomi, Samsung, Apple

JSON:
{{
  "sector": "Smartphones",
  "products": [
    {{
      "id": "p1",
      "name": "Smartphone haut de gamme",
      "description": "Flagship des marques",
      "prompts": [
        "Comparatif smartphone haut de gamme : iPhone 15 Pro vs Samsung Galaxy S24 Ultra vs Xiaomi 14 Pro",
        "Meilleur smartphone 2024 : iPhone ou Galaxy ou Xiaomi ?"
      ]
    }},
    {{
      "id": "p2",
      "name": "Ecouteurs sans fil",
      "description": "AirPods, Galaxy Buds, Xiaomi Buds",
      "prompts": [
        "Comparatif écouteurs Bluetooth : AirPods Pro vs Galaxy Buds2 Pro vs Xiaomi Buds 4 Pro",
        "Meilleurs écouteurs sans fil : Apple ou Samsung ou Xiaomi ?"
      ]
    }}
  ],
  "brands": ["Apple", "Samsung", "Xiaomi"],
  "seo_prompts": [
    "Comparatif smartphone 2024 : iPhone 15 vs Galaxy S24 vs Xiaomi 14",
    "Meilleur smartphone haut de gamme : Apple ou Samsung ?",
    "Comparatif écouteurs Bluetooth : AirPods Pro vs Galaxy Buds vs Xiaomi Buds",
    "Meilleur smartphone pour photo : iPhone ou Galaxy ou Xiaomi ?"
  ]
}}

Réponds EXCLUSIVEMENT avec ce JSON."""


def generate_benchmark_prompt(brands: list) -> str:
    """Génère le prompt pour créer un benchmark multi-marques."""
    brands_str = ", ".join(brands)
    return f'Marques à comparer: {brands_str}\n\n{BENCHMARK_GENERATION_PROMPT}'
