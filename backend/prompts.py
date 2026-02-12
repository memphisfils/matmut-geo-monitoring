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
