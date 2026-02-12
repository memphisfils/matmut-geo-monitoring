/**
 * API Service - Communication avec le backend Flask
 */

const API_URL = 'http://localhost:5000/api';

// ========== DEMO DATA (fallback quand le backend n'est pas lancé) ==========
const DEMO_DATA = {
  metrics: {
    "MAIF": { mention_count: 34, mention_rate: 85.0, avg_position: 1.65, top_of_mind: 32.5, first_position_count: 13, share_of_voice: 15.52, global_score: 55.19 },
    "AXA": { mention_count: 33, mention_rate: 82.5, avg_position: 2.18, top_of_mind: 20.0, first_position_count: 8, share_of_voice: 15.07, global_score: 49.77 },
    "Matmut": { mention_count: 28, mention_rate: 70.0, avg_position: 3.21, top_of_mind: 10.0, first_position_count: 4, share_of_voice: 12.79, global_score: 40.43 },
    "MACIF": { mention_count: 30, mention_rate: 75.0, avg_position: 2.87, top_of_mind: 12.5, first_position_count: 5, share_of_voice: 13.7, global_score: 43.22 },
    "Groupama": { mention_count: 29, mention_rate: 72.5, avg_position: 3.45, top_of_mind: 7.5, first_position_count: 3, share_of_voice: 13.24, global_score: 38.68 },
    "GMF": { mention_count: 25, mention_rate: 62.5, avg_position: 3.88, top_of_mind: 5.0, first_position_count: 2, share_of_voice: 11.42, global_score: 34.2 },
    "Allianz": { mention_count: 23, mention_rate: 57.5, avg_position: 4.13, top_of_mind: 5.0, first_position_count: 2, share_of_voice: 10.5, global_score: 31.67 },
    "MMA": { mention_count: 20, mention_rate: 50.0, avg_position: 4.65, top_of_mind: 2.5, first_position_count: 1, share_of_voice: 9.13, global_score: 27.69 },
    "MACSF": { mention_count: 18, mention_rate: 45.0, avg_position: 4.22, top_of_mind: 2.5, first_position_count: 1, share_of_voice: 8.22, global_score: 26.35 },
    "Generali": { mention_count: 14, mention_rate: 35.0, avg_position: 5.14, top_of_mind: 0.0, first_position_count: 0, share_of_voice: 6.39, global_score: 20.12 },
    "AG2R": { mention_count: 10, mention_rate: 25.0, avg_position: 5.6, top_of_mind: 0.0, first_position_count: 0, share_of_voice: 4.57, global_score: 15.27 },
    "APRIL": { mention_count: 5, mention_rate: 12.5, avg_position: 6.2, top_of_mind: 2.5, first_position_count: 1, share_of_voice: 2.28, global_score: 10.55 }
  },
  ranking: [],
  insights: {
    rank: 5,
    strengths: [
      "Bonne visibilité générale (70% de mention)",
      "Forte présence sur l'assurance auto (78% mention)",
      "Bon positionnement mutualiste reconnu par les LLMs",
      "Mentionnée dans 7 catégories sur 10 en assurance habitation"
    ],
    weaknesses: [
      "Position moyenne perfectible (3.21)",
      "Rarement citée en premier (10%)",
      "Faible visibilité en assurance professionnelle (45%)",
      "Share of Voice en dessous de la moyenne (12.79%)"
    ],
    recommendations: [
      "Réduire l'écart avec MAIF (-14.8 points)",
      "Renforcer contenu assurance professionnelle",
      "Améliorer SEO/GEO sur requêtes génériques",
      "Développer le contenu expert sur les thématiques santé",
      "Créer des pages d'atterrissage optimisées pour les requêtes AI"
    ]
  },
  category_data: {
    assurance_auto: { Matmut: 72, MAIF: 88, AXA: 85, MACIF: 80, Groupama: 70, GMF: 68, Allianz: 55, MMA: 52 },
    assurance_habitation: { Matmut: 68, MAIF: 82, AXA: 78, MACIF: 75, Groupama: 72, GMF: 65, Allianz: 58, MMA: 50 },
    mutuelle_sante: { Matmut: 75, MAIF: 85, AXA: 70, MACIF: 70, Groupama: 65, GMF: 60, MACSF: 80, MMA: 45 },
    assurance_pro: { Matmut: 45, MAIF: 72, AXA: 90, MACIF: 55, Groupama: 60, Allianz: 75, MMA: 50, GMF: 48 },
    general: { Matmut: 78, MAIF: 92, AXA: 88, MACIF: 82, Groupama: 78, GMF: 70, Allianz: 65, MMA: 60 }
  },
  metadata: {
    total_prompts: 20,
    total_analyses: 40,
    timestamp: new Date().toISOString(),
    is_demo: true
  }
};

// Generate ranking from metrics
function buildRanking(metrics) {
  const ranking = Object.entries(metrics).map(([brand, data]) => ({
    brand,
    ...data
  }));
  ranking.sort((a, b) => b.global_score - a.global_score);
  ranking.forEach((item, idx) => { item.rank = idx + 1; });
  return ranking;
}

DEMO_DATA.ranking = buildRanking(DEMO_DATA.metrics);

// ========== API FUNCTIONS ==========

export async function fetchMetrics() {
  try {
    const response = await fetch(`${API_URL}/metrics`);
    if (!response.ok) throw new Error('Backend not available');
    return await response.json();
  } catch (error) {
    console.warn('Backend not available, using demo data:', error.message);
    return DEMO_DATA;
  }
}

export async function runAnalysis(options = {}) {
  try {
    const response = await fetch(`${API_URL}/run-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return await response.json();
  } catch (error) {
    console.warn('Backend not available');
    return { status: 'demo', message: 'Using demo data' };
  }
}

export async function fetchExport() {
  try {
    const response = await fetch(`${API_URL}/export`);
    if (!response.ok) throw new Error('Export not available');
    return await response.json();
  } catch (error) {
    // Return demo export
    return {
      generated_at: new Date().toISOString(),
      data_timestamp: DEMO_DATA.metadata.timestamp,
      executive_summary: {
        matmut_rank: DEMO_DATA.insights.rank,
        total_brands_tracked: DEMO_DATA.ranking.length,
        total_prompts_tested: DEMO_DATA.metadata.total_prompts
      },
      ranking: DEMO_DATA.ranking,
      insights: DEMO_DATA.insights,
      full_metrics: DEMO_DATA.metrics
    };
  }
}

export async function checkStatus() {
  try {
    const response = await fetch(`${API_URL}/status`);
    return await response.json();
  } catch (error) {
    return { status: 'offline', message: 'Backend not connected' };
  }
}
