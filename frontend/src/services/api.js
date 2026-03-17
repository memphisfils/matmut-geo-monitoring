/**
 * API Service — GEO Monitor v2.0
 * Communication avec le backend Flask — compatible toute marque
 */

// URL de l'API (dynamique selon l'environnement)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ========== DEMO DATA FACTORY — génère du démo pour n'importe quelle marque ==========
export function DEMO_DATA_FACTORY(brand = 'Marque', competitors = []) {
  const allBrands = [brand, ...competitors];
  if (allBrands.length < 2) allBrands.push('Concurrent A', 'Concurrent B', 'Concurrent C');

  // Scores de base aléatoires mais reproductibles
  const seed = brand.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min, max, offset = 0) => min + ((seed + offset) % (max - min));

  const metrics = {};
  allBrands.forEach((b, i) => {
    const base = i === 0 ? rand(55, 80) : rand(30, 75, i * 17);
    metrics[b] = {
      mention_count: Math.round(base * 0.4),
      mention_rate: base,
      avg_position: parseFloat((1 + i * 0.8 + (seed % 10) * 0.1).toFixed(2)),
      top_of_mind: Math.max(0, base - 40 - i * 8),
      first_position_count: Math.max(0, Math.round(base * 0.04) - i),
      share_of_voice: 0,
      sentiment_score: Math.round(base * 0.6),
      global_score: 0
    };
  });

  // Share of voice
  const totalMentions = Object.values(metrics).reduce((s, m) => s + m.mention_count, 0);
  Object.keys(metrics).forEach(b => {
    metrics[b].share_of_voice = parseFloat((metrics[b].mention_count / (totalMentions || 1) * 100).toFixed(2));
  });

  // Score global
  Object.keys(metrics).forEach(b => {
    const m = metrics[b];
    const score = m.mention_rate * 0.4 +
      (m.avg_position > 0 ? 100 / m.avg_position : 0) * 0.3 +
      m.share_of_voice * 0.2 +
      m.top_of_mind * 0.1 +
      Math.max(m.sentiment_score, 0) * 0.1;
    metrics[b].global_score = parseFloat(score.toFixed(2));
  });

  // Ranking
  const ranking = Object.entries(metrics)
    .map(([b, d]) => ({ brand: b, ...d }))
    .sort((a, b) => b.global_score - a.global_score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const mainBrand = allBrands[0];
  const mainData = metrics[mainBrand] || {};
  const mainRank = ranking.find(r => r.brand === mainBrand)?.rank;
  const leader = ranking[0];

  const insights = {
    rank: mainRank,
    main_brand: mainBrand,
    strengths: [
      mainData.mention_rate > 60
        ? `Bonne visibilité générale (${mainData.mention_rate}% de mention)`
        : null,
      mainData.avg_position <= 2 && mainData.avg_position > 0
        ? `Excellente position moyenne (${mainData.avg_position})`
        : null,
    ].filter(Boolean),
    weaknesses: [
      mainData.mention_rate <= 60
        ? `Visibilité limitée (${mainData.mention_rate}% de mention)`
        : null,
      mainData.avg_position > 3
        ? `Position moyenne perfectible (${mainData.avg_position})`
        : null,
    ].filter(Boolean),
    recommendations: [
      leader && leader.brand !== mainBrand
        ? `Réduire l'écart avec ${leader.brand} (-${(leader.global_score - (mainData.global_score || 0)).toFixed(1)} pts)`
        : null,
      'Renforcer le contenu expert sur le secteur',
      'Améliorer SEO/GEO sur requêtes génériques',
    ].filter(Boolean)
  };

  const categoryData = {
    general: Object.fromEntries(allBrands.map((b) => [b, metrics[b]?.mention_rate || 0]))
  };

  return {
    metrics,
    ranking,
    insights,
    category_data: categoryData,
    metadata: {
      brand: mainBrand,
      competitors,
      total_prompts: 20,
      total_analyses: 40,
      timestamp: new Date().toISOString(),
      is_demo: true
    }
  };
}

// ========== API FUNCTIONS ==========

export async function fetchMetrics(options = {}) {
  try {
    const response = await fetch(`${API_URL}/metrics`);
    if (!response.ok) throw new Error('Backend not available');
    return await response.json();
  } catch {
    console.warn('Backend not available, using demo data');
    return DEMO_DATA_FACTORY(options.brand, options.competitors);
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
  } catch {
    console.warn('Backend not available, using demo mode');
    return { status: 'demo', message: 'Using demo data' };
  }
}

export async function fetchExport() {
  try {
    const response = await fetch(`${API_URL}/export`);
    if (!response.ok) throw new Error('Export not available');
    return await response.json();
  } catch {
    return { error: 'Backend not available' };
  }
}

export async function fetchHistory(brand = null, ranking = null) {
  try {
    const response = await fetch(`${API_URL}/history`);
    if (!response.ok) throw new Error('History not available');
    const historyData = await response.json();
    
    // Si on a des données réelles avec la bonne marque, les utiliser
    if (historyData && historyData.length > 0 && brand) {
      // Vérifier si l'historique contient cette marque
      const hasBrand = historyData.some(h => h.brand === brand);
      if (hasBrand) {
        return historyData;
      }
    }
    
    return historyData;
  } catch {
    return [];
  }
}

// Génère un historique fictif basé sur le ranking actuel pour le TrendChart
export function generateTrendHistory(ranking, brand, days = 30) {
  if (!ranking || !brand) return [];
  
  const today = new Date();
  const history = [];
  
  // Get brand data and competitors
  const brandData = ranking.find(r => r.brand === brand);
  const competitors = ranking.filter(r => r.brand !== brand).slice(0, 3);
  
  if (!brandData) return [];
  
  // Generate historical data points
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    
    const point = { date: dateStr };
    
    // Brand score with slight variation
    const brandVariation = (Math.sin(i * 0.3) * 5) + (Math.random() * 3);
    point[brand] = Math.min(100, Math.max(0, brandData.global_score + brandVariation));
    
    // Competitors scores
    competitors.forEach((comp, idx) => {
      const compVariation = (Math.sin(i * 0.4 + idx) * 4) + (Math.random() * 2);
      point[comp.brand] = Math.min(100, Math.max(0, comp.global_score + compVariation));
    });
    
    history.push(point);
  }
  
  return history;
}

export async function checkStatus() {
  try {
    const response = await fetch(`${API_URL}/status`);
    return await response.json();
  } catch {
    return { status: 'offline' };
  }
}
