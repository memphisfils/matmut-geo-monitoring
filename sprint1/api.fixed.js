/**
 * API Service — GEO Monitor v2.0
 * FIX: Demo data no longer biased toward the entered brand
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Seeded pseudo-random — reproductible mais non biaisé
function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function DEMO_DATA_FACTORY(brand = 'Marque', competitors = []) {
  const allBrands = [brand, ...competitors];
  if (allBrands.length < 2) allBrands.push('Concurrent A', 'Concurrent B', 'Concurrent C');

  const metrics = {};

  allBrands.forEach((b) => {
    // Seed basé sur le NOM de la marque — pas sa position
    // Résultat : Nike bat toujours Adidas avec les mêmes scores, peu importe qui est "entré"
    const brandSeed = b.split('').reduce((acc, c) => acc + c.charCodeAt(0) * 31, 0);
    const rand = seededRand(brandSeed);

    const mentionRate   = Math.round(30 + rand() * 55);          // 30–85%
    const avgPosition   = parseFloat((1.2 + rand() * 4.5).toFixed(2)); // 1.2–5.7
    const topOfMind     = Math.round(rand() * 35);               // 0–35%
    const sentimentScore = Math.round(-20 + rand() * 100);       // -20 à 80
    const mentionCount  = Math.round(mentionRate * 0.4);

    metrics[b] = {
      mention_count:   mentionCount,
      mention_rate:    mentionRate,
      avg_position:    avgPosition,
      top_of_mind:     topOfMind,
      first_position_count: Math.round(topOfMind * 0.04),
      sentiment_score: sentimentScore,
      share_of_voice:  0,
      global_score:    0
    };
  });

  // Share of voice
  const totalMentions = Object.values(metrics).reduce((s, m) => s + m.mention_count, 0);
  Object.keys(metrics).forEach(b => {
    metrics[b].share_of_voice = parseFloat(
      (metrics[b].mention_count / (totalMentions || 1) * 100).toFixed(2)
    );
  });

  // Score global pondéré
  Object.keys(metrics).forEach(b => {
    const m = metrics[b];
    const score =
      m.mention_rate * 0.4 +
      (m.avg_position > 0 ? 100 / m.avg_position : 0) * 0.3 +
      m.share_of_voice * 0.2 +
      m.top_of_mind * 0.1 +
      Math.max(m.sentiment_score, 0) * 0.1;
    metrics[b].global_score = parseFloat(score.toFixed(2));
  });

  // Ranking trié par score réel
  const ranking = Object.entries(metrics)
    .map(([b, d]) => ({ brand: b, ...d }))
    .sort((a, b) => b.global_score - a.global_score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const mainData  = metrics[brand] || {};
  const mainRank  = ranking.find(r => r.brand === brand)?.rank;
  const leader    = ranking[0];

  const insights = {
    rank: mainRank,
    main_brand: brand,
    strengths: [
      mainData.mention_rate > 60
        ? `Bonne visibilité générale (${mainData.mention_rate}% de mention)` : null,
      mainData.avg_position <= 2 && mainData.avg_position > 0
        ? `Excellente position moyenne (${mainData.avg_position})` : null,
      mainData.top_of_mind > 20
        ? `Fort top-of-mind (${mainData.top_of_mind}%)` : null,
    ].filter(Boolean),
    weaknesses: [
      mainData.mention_rate <= 60
        ? `Visibilité limitée (${mainData.mention_rate}% de mention)` : null,
      mainData.avg_position > 3
        ? `Position moyenne perfectible (${mainData.avg_position})` : null,
      mainData.top_of_mind < 10
        ? `Rarement citée en premier (${mainData.top_of_mind}%)` : null,
    ].filter(Boolean),
    recommendations: [
      leader && leader.brand !== brand
        ? `Réduire l'écart avec ${leader.brand} (-${(leader.global_score - (mainData.global_score || 0)).toFixed(1)} pts)`
        : null,
      'Renforcer le contenu expert sur le secteur',
      'Améliorer SEO/GEO sur requêtes génériques',
    ].filter(Boolean)
  };

  const categoryData = {
    general: Object.fromEntries(
      Object.keys(metrics).map(b => [b, metrics[b].mention_rate])
    )
  };

  return {
    metrics,
    ranking,
    insights,
    category_data: categoryData,
    metadata: {
      brand,
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
    return { status: 'demo' };
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

export async function fetchHistory() {
  try {
    const response = await fetch(`${API_URL}/history`);
    if (!response.ok) throw new Error('History not available');
    return await response.json();
  } catch {
    return [];
  }
}

export function generateTrendHistory(ranking, brand, days = 30) {
  if (!ranking || !brand) return [];

  const today = new Date();
  const history = [];
  const competitors = ranking.filter(r => r.brand !== brand).slice(0, 3);
  const brandData = ranking.find(r => r.brand === brand);
  if (!brandData) return [];

  // Seed par marque pour stabilité
  const makeSeed = (b) => b.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    const point = { date: dateStr };

    // Variation sinusoïdale + bruit — basée sur le nom de la marque, pas sa position
    const brandRand = seededRand(makeSeed(brand) + i);
    const noise = (brandRand() - 0.5) * 6;
    const trend = (i / days) * -3; // légère tendance montante vers aujourd'hui
    point[brand] = parseFloat(Math.min(100, Math.max(0, brandData.global_score + noise + trend)).toFixed(1));

    competitors.forEach(comp => {
      const compRand = seededRand(makeSeed(comp.brand) + i);
      const compNoise = (compRand() - 0.5) * 5;
      point[comp.brand] = parseFloat(Math.min(100, Math.max(0, comp.global_score + compNoise)).toFixed(1));
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
