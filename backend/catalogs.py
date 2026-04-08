"""
Static production catalogs for report and alert types.

Aligned with the user-provided GEO Monitor report PDF and alert XLSX.
"""

REPORT_CATALOG = {
    "analysis_main": {
        "id": "RPT-MAIN",
        "slug": "analysis_main",
        "name": "Rapport d'analyse principal",
        "frequency": "on_demand",
        "audience": ["direction", "marketing", "ops", "client"],
        "criticality": "standard",
        "pages": "8-12",
        "description": "Rapport complet de pilotage: resume, kpis, benchmark, prompts, llm et recommandations.",
        "sections": [
            "Couverture",
            "Resume executif",
            "KPIs de pilotage",
            "Benchmark competitif",
            "Analyse prompt par prompt",
            "Accord inter-modeles",
            "Recommandations prioritaires",
            "Annexe methodologique",
        ],
    },
    "executive_weekly": {
        "id": "RPT-001",
        "slug": "executive_weekly",
        "name": "Rapport executif hebdomadaire",
        "frequency": "weekly_monday_09h",
        "audience": ["direction", "client"],
        "criticality": "standard",
        "pages": "3-5",
        "description": "Synthese hebdomadaire pour decideurs non techniques.",
    },
    "benchmark_competitive": {
        "id": "RPT-002",
        "slug": "benchmark_competitive",
        "name": "Rapport benchmark competitif",
        "frequency": "on_demand",
        "audience": ["marketing", "seo_geo"],
        "criticality": "standard",
        "pages": "6-10",
        "description": "Comparatif multi-marques sur un set identique de prompts.",
    },
    "prompt_analysis": {
        "id": "RPT-003",
        "slug": "prompt_analysis",
        "name": "Rapport analyse des prompts",
        "frequency": "on_demand",
        "audience": ["seo_geo", "content"],
        "criticality": "standard",
        "pages": "4-7",
        "description": "Analyse detaillee prompt par prompt avec scores, verbatims et prompts fragiles.",
    },
    "incident_report": {
        "id": "RPT-004",
        "slug": "incident_report",
        "name": "Rapport d'incident",
        "frequency": "critical_alert",
        "audience": ["ops", "direction"],
        "criticality": "urgent",
        "pages": "2-4",
        "description": "Rapport d'urgence genere lors d'une degradation critique.",
    },
    "trends_digest": {
        "id": "RPT-005",
        "slug": "trends_digest",
        "name": "Digest de tendances",
        "frequency": "weekly_or_monthly",
        "audience": ["product", "marketing", "direction"],
        "criticality": "info",
        "pages": "4-6",
        "description": "Lecture 7j, 30j et 90j des mouvements de marche.",
    },
    "multi_llm_coverage": {
        "id": "RPT-006",
        "slug": "multi_llm_coverage",
        "name": "Rapport couverture multi-LLM",
        "frequency": "on_demand_or_divergence",
        "audience": ["product_ia", "direction", "tech"],
        "criticality": "analysis",
        "pages": "5-8",
        "description": "Analyse des divergences entre modeles et identification du modele leader.",
    },
}


ALERT_CATALOG = [
    {
        "id": "ALT-001",
        "name": "Chute de rang critique",
        "severity": "critical",
        "trigger": "La marque perd 3 positions ou plus en moins de 24h.",
        "frequency": "immediate",
        "channels": ["email", "telegram", "slack", "in_app"],
    },
    {
        "id": "ALT-002",
        "name": "Disparition totale",
        "severity": "critical",
        "trigger": "Score de mention nul sur l'ensemble des prompts.",
        "frequency": "immediate",
        "channels": ["email", "telegram", "slack", "in_app"],
    },
    {
        "id": "ALT-003",
        "name": "Concurrent depasse la marque",
        "severity": "critical",
        "trigger": "Perte de la premiere place benchmark.",
        "frequency": "immediate",
        "channels": ["email", "telegram", "slack", "in_app"],
    },
    {
        "id": "ALT-004",
        "name": "Baisse de score significative",
        "severity": "high",
        "trigger": "Baisse de plus de 5 points versus moyenne 7 jours.",
        "frequency": "every_6h",
        "channels": ["email", "telegram", "in_app"],
    },
    {
        "id": "ALT-005",
        "name": "Mention negative detectee",
        "severity": "high",
        "trigger": "Sentiment d'une reponse LLM sous 30/100.",
        "frequency": "immediate_if_critical",
        "channels": ["email", "slack", "in_app"],
    },
    {
        "id": "ALT-006",
        "name": "LLM principal degrade",
        "severity": "high",
        "trigger": "Timeout ou erreur sur plus de deux prompts consecutifs.",
        "frequency": "immediate",
        "channels": ["email", "slack", "in_app"],
    },
    {
        "id": "ALT-007",
        "name": "Seuil de score franchi",
        "severity": "high",
        "trigger": "Le score passe sous un seuil configure.",
        "frequency": "every_6h",
        "channels": ["email", "telegram", "in_app"],
    },
    {
        "id": "ALT-008",
        "name": "Taux de mention inferieur a 50%",
        "severity": "high",
        "trigger": "Moins de la moitie des prompts citent la marque.",
        "frequency": "next_analysis",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-009",
        "name": "Divergence inter-LLM elevee",
        "severity": "high",
        "trigger": "Spread inter-modeles superieur a 25 points.",
        "frequency": "daily_08h",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-010",
        "name": "Nouveau concurrent detecte",
        "severity": "high",
        "trigger": "Nouvel acteur au-dessus de 40% de mention.",
        "frequency": "weekly",
        "channels": ["email", "slack", "in_app"],
    },
    {
        "id": "ALT-011",
        "name": "Tendance baisse 7 jours",
        "severity": "medium",
        "trigger": "Trois analyses consecutives en declin.",
        "frequency": "monday_09h",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-012",
        "name": "Position moyenne degradee",
        "severity": "medium",
        "trigger": "Position moyenne au-dessus de 3.0.",
        "frequency": "daily_08h",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-013",
        "name": "Share of voice sous 20%",
        "severity": "medium",
        "trigger": "Part de voix benchmark inferieure a 20%.",
        "frequency": "weekly",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-014",
        "name": "Top of mind sous 30%",
        "severity": "medium",
        "trigger": "La marque est citee premiere sur moins de 30% des prompts.",
        "frequency": "weekly",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-015",
        "name": "Prompt sans mention",
        "severity": "medium",
        "trigger": "Prompt sans mention sur trois analyses consecutives.",
        "frequency": "weekly",
        "channels": ["email"],
    },
    {
        "id": "ALT-016",
        "name": "Analyse automatique echouee",
        "severity": "medium",
        "trigger": "Aucune donnee fraiche depuis plus de 12 heures.",
        "frequency": "immediate_if_failure",
        "channels": ["email", "slack", "in_app"],
    },
    {
        "id": "ALT-017",
        "name": "Sentiment global en baisse",
        "severity": "medium",
        "trigger": "Sentiment moyen sous 50/100.",
        "frequency": "daily_08h",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-018",
        "name": "Concurrent en forte hausse",
        "severity": "medium",
        "trigger": "Concurrent a plus de 8 points de hausse sur 7 jours.",
        "frequency": "weekly",
        "channels": ["email", "in_app"],
    },
    {
        "id": "ALT-019",
        "name": "Rapport executif hebdomadaire",
        "severity": "info",
        "trigger": "Resume hebdomadaire programme.",
        "frequency": "monday_09h",
        "channels": ["email"],
    },
    {
        "id": "ALT-020",
        "name": "Digest de tendances mensuel",
        "severity": "info",
        "trigger": "Resume mensuel 30j / 90j.",
        "frequency": "monthly",
        "channels": ["email"],
    },
    {
        "id": "ALT-021",
        "name": "Confirmation analyse reussie",
        "severity": "info",
        "trigger": "Notification de fin d'analyse.",
        "frequency": "after_analysis",
        "channels": ["in_app", "email_optional"],
    },
    {
        "id": "ALT-022",
        "name": "Rapport multi-LLM",
        "severity": "info",
        "trigger": "Accord inter-LLM sous 85%.",
        "frequency": "weekly",
        "channels": ["email", "in_app_optional"],
    },
]


def get_report_catalog():
    return dict(REPORT_CATALOG)


def get_report_definition(report_type: str):
    return REPORT_CATALOG.get(report_type) or REPORT_CATALOG["analysis_main"]


def get_alert_catalog():
    return ALERT_CATALOG


def get_alert_summary():
    summary = {}
    for alert in ALERT_CATALOG:
        severity = alert["severity"]
        summary[severity] = summary.get(severity, 0) + 1
    return {
        "total": len(ALERT_CATALOG),
        "by_severity": summary,
    }
