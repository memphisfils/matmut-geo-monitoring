/**
 * API Service — GEO Monitor Sprint 2
 * Ajout : runAnalysisStream() — streaming SSE temps réel
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── seededRand (fix biais Sprint 1) ─────────────────────────────────────────

function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── DEMO_DATA_FACTORY ────────────────────────────────────────────────────────

export function DEMO_DATA_FACTORY(brand = 'Marque', competitors = []) {
  const allBrands = [brand, ...competitors];
  if (allBrands.length < 2) allBrands.push('Concurrent A', 'Concurrent B', 'Concurrent C');

  const metrics = {};

  allBrands.forEach((b) => {
    const brandSeed = b.split('').reduce((acc, c) => acc + c.charCodeAt(0) * 31, 0);
    const rand = seededRand(brandSeed);

    const mentionRate    = Math.round(30 + rand() * 55);
    const avgPosition    = parseFloat((1.2 + rand() * 4.5).toFixed(2));
    const topOfMind      = Math.round(rand() * 35);
    const sentimentScore = Math.round(-20 + rand() * 100);
    const mentionCount   = Math.round(mentionRate * 0.4);

    metrics[b] = {
      mention_count:        mentionCount,
      mention_rate:         mentionRate,
      avg_position:         avgPosition,
      top_of_mind:          topOfMind,
      first_position_count: Math.round(topOfMind * 0.04),
      sentiment_score:      sentimentScore,
      share_of_voice:       0,
      global_score:         0
    };
  });

  const totalMentions = Object.values(metrics).reduce((s, m) => s + m.mention_count, 0);
  Object.keys(metrics).forEach(b => {
    metrics[b].share_of_voice = parseFloat(
      (metrics[b].mention_count / (totalMentions || 1) * 100).toFixed(2)
    );
  });

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

  const ranking = Object.entries(metrics)
    .map(([b, d]) => ({ brand: b, ...d }))
    .sort((a, b) => b.global_score - a.global_score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const mainData = metrics[brand] || {};
  const mainRank = ranking.find(r => r.brand === brand)?.rank;
  const leader   = ranking[0];

  const insights = {
    rank: mainRank, main_brand: brand,
    strengths: [
      mainData.mention_rate > 60 ? `Bonne visibilité générale (${mainData.mention_rate}% de mention)` : null,
      mainData.avg_position <= 2 && mainData.avg_position > 0 ? `Excellente position moyenne (${mainData.avg_position})` : null,
      mainData.top_of_mind > 20 ? `Fort top-of-mind (${mainData.top_of_mind}%)` : null,
    ].filter(Boolean),
    weaknesses: [
      mainData.mention_rate <= 60 ? `Visibilité limitée (${mainData.mention_rate}% de mention)` : null,
      mainData.avg_position > 3 ? `Position moyenne perfectible (${mainData.avg_position})` : null,
      mainData.top_of_mind < 10 ? `Rarement citée en premier (${mainData.top_of_mind}%)` : null,
    ].filter(Boolean),
    recommendations: [
      leader && leader.brand !== brand ? `Réduire l'écart avec ${leader.brand} (-${(leader.global_score - (mainData.global_score || 0)).toFixed(1)} pts)` : null,
      'Renforcer le contenu expert sur le secteur',
      'Améliorer SEO/GEO sur requêtes génériques',
    ].filter(Boolean)
  };

  return {
    metrics, ranking, insights,
    category_data: {
      general: Object.fromEntries(Object.keys(metrics).map(b => [b, metrics[b].mention_rate]))
    },
    metadata: {
      brand, competitors, total_prompts: 20, total_analyses: 40,
      timestamp: new Date().toISOString(), is_demo: true
    }
  };
}

// ── SPRINT 2 — runAnalysisStream ─────────────────────────────────────────────

/**
 * Lance une analyse en streaming SSE et yield les événements un par un.
 *
 * Utilisation dans React :
 *
 *   for await (const event of runAnalysisStream(options)) {
 *     if (event.type === 'start')    { ... }
 *     if (event.type === 'progress') { setProgress(event); }
 *     if (event.type === 'complete') { loadMetrics(); }
 *   }
 *
 * En mode démo (backend injoignable) : simule le streaming avec des délais.
 */
export async function* runAnalysisStream(options = {}) {
  const { brand, competitors = [], prompts = [], demo = false } = options;
  const limit = Math.min(prompts.length || 6, 6);

  // ── Mode démo simulé (backend absent) ────────────────────────────────────
  const tryReal = async function* () {
    const response = await fetch(`${API_URL}/run-analysis/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(options),
      // Timeout : 300s (5 minutes) pour 6 prompts × 40s max = 240s
      signal:  AbortSignal.timeout(300000)
    });

    if (!response.ok || !response.body) throw new Error('stream unavailable');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6));
          } catch {
            // ligne malformée, on l'ignore
          }
        }
      }
    }
  };

  if (!demo && prompts.length > 0) {
    try {
      yield* tryReal();
      return;
    } catch (err) {
      console.warn('[STREAM] Fallback démo —', err.message);
    }
  }

  // ── Fallback démo ─────────────────────────────────────────────────────────
  const allBrands = [brand, ...competitors];

  yield {
    type: 'start', brand, total_prompts: limit,
    models: ['demo'], is_demo: true
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  function brandSeed(b) {
    return b.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 0);
  }

  for (let i = 0; i < limit; i++) {
    await delay(400 + Math.random() * 300);

    const prompt = prompts[i] || `Prompt démo ${i + 1}`;

    const brandsFound = allBrands.filter(b => {
      const r = seededRand(brandSeed(b) + i * 997);
      return r() > 0.4;
    });

    const brandPos = brandsFound.indexOf(brand);

    yield {
      type:           'progress',
      current:        i + 1,
      total:          limit,
      prompt,
      brands_found:   brandsFound,
      brand_mentioned: brandsFound.includes(brand),
      brand_position: brandPos >= 0 ? brandPos + 1 : null,
      duration_ms:    Math.round(400 + Math.random() * 300)
    };
  }

  yield {
    type:      'complete',
    timestamp: new Date().toISOString(),
    is_demo:   true,
    duration:  limit * 0.5
  };
}

// ── API standard ──────────────────────────────────────────────────────────────

export async function fetchMetrics(options = {}) {
  try {
    const r = await fetch(`${API_URL}/metrics`);
    if (!r.ok) throw new Error('Backend not available');
    return await r.json();
  } catch {
    return DEMO_DATA_FACTORY(options.brand, options.competitors);
  }
}

export async function runAnalysis(options = {}) {
  try {
    const r = await fetch(`${API_URL}/run-analysis`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(options)
    });
    return await r.json();
  } catch {
    return { status: 'demo' };
  }
}

export async function fetchExport() {
  try {
    const r = await fetch(`${API_URL}/export`);
    if (!r.ok) throw new Error();
    return await r.json();
  } catch {
    return { error: 'Backend not available' };
  }
}

// ── Benchmark Multi-Marques ────────────────────────────────────────────────────

export async function createBenchmark(brands = []) {
  try {
    const r = await fetch(`${API_URL}/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brands })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Benchmark creation failed');
    return data;
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

export async function* runBenchmarkStream(options = {}) {
  const { name, brands = [], prompts = [], demo = false } = options;
  const limit = Math.min(prompts.length || 6, 6);

  const tryReal = async function* () {
    const response = await fetch(`${API_URL}/run-benchmark/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brands, prompts, limit }),
      signal: AbortSignal.timeout(300000)
    });

    if (!response.ok || !response.body) throw new Error('stream unavailable');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6));
          } catch {
            // ignore malformed
          }
        }
      }
    }
  };

  if (!demo && prompts.length > 0) {
    try {
      yield* tryReal();
      return;
    } catch (err) {
      console.warn('[BENCHMARK] Fallback démo —', err.message);
    }
  }

  // Fallback démo
  yield {
    type: 'start', name, brands, total_prompts: limit,
    models: ['demo'], is_demo: true, mode: 'benchmark'
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < limit; i++) {
    await delay(400 + Math.random() * 300);
    yield {
      type: 'progress', current: i + 1, total: limit,
      prompt: prompts[i] || `Benchmark démo ${i + 1}`,
      brands_mentioned: brands.slice(0, 3),
      elapsed: i * 0.5, is_demo: true
    };
  }

  yield {
    type: 'complete', timestamp: new Date().toISOString(),
    total_prompts: limit, is_demo: true, duration: limit * 0.5
  };
}

export async function fetchHistory({ brand } = {}) {
  try {
    const url = brand ? `${API_URL}/history?brand=${encodeURIComponent(brand)}` : `${API_URL}/history`;
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const data = await r.json();
    // Si la réponse est un array vide ou n'a pas de données réelles, retourner []
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function generateTrendHistory(ranking, brand, days = 30) {
  if (!ranking || !brand) return [];
  const today       = new Date();
  const history     = [];
  const competitors = ranking.filter(r => r.brand !== brand).slice(0, 3);
  const brandData   = ranking.find(r => r.brand === brand);
  if (!brandData) return [];
  const makeSeed = (b) => b.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 0);
  for (let i = days - 1; i >= 0; i--) {
    const date    = new Date(today);
    date.setDate(date.getDate() - i);
    const point   = { date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) };
    const br = seededRand(makeSeed(brand) + i);
    point[brand] = parseFloat(Math.min(100, Math.max(0, brandData.global_score + (br() - 0.5) * 6 + (i / days) * -3)).toFixed(1));
    competitors.forEach(comp => {
      const cr = seededRand(makeSeed(comp.brand) + i);
      point[comp.brand] = parseFloat(Math.min(100, Math.max(0, comp.global_score + (cr() - 0.5) * 5)).toFixed(1));
    });
    history.push(point);
  }
  return history;
}

export async function checkStatus() {
  try {
    const r = await fetch(`${API_URL}/status`);
    return await r.json();
  } catch {
    return { status: 'offline' };
  }
}

export async function fetchSession() {
  try {
    const r = await fetch(`${API_URL}/session`);
    return await r.json();
  } catch {
    return { has_session: false };
  }
}
