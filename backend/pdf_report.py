"""
Générateur de rapport PDF — GEO Monitor Sprint 4
Utilise WeasyPrint pour produire un PDF professionnel depuis HTML/CSS.

Dépendance : weasyprint>=60.0
Install    : pip install weasyprint --break-system-packages
             (sur Ubuntu/Debian : sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0)

Fallback   : si WeasyPrint absent → génère HTML téléchargeable
"""
from __future__ import annotations
import io
import json
import os
from datetime import datetime
from typing import Dict, List, Optional


# ── Constantes design ─────────────────────────────────────────────────────────

ACCENT  = "#58BCFF"
INK     = "#102435"
DARK    = "#173247"
SURFACE = "#173247"
BORDER  = "#2B4A61"
WHITE   = "#FFFFFF"
MUTED   = "#8CA3B6"
GREEN   = "#1E9E66"
RED     = "#D1644A"
AMBER   = "#E39A2D"


# ── HTML complet du rapport ───────────────────────────────────────────────────

def build_report_html(
    brand: str,
    ranking: List[Dict],
    metrics: Dict,
    insights: Dict,
    prompt_stats: Optional[List[Dict]] = None,
    confidence: Optional[Dict] = None,
    metadata: Optional[Dict] = None,
    report_definition: Optional[Dict] = None
) -> str:
    """
    Génère le HTML complet du rapport PDF GEO Monitor.

    Sections :
      1. Cover page (marque, date, score global)
      2. Résumé exécutif (KPIs, forces/faiblesses)
      3. Classement compétitif (tableau)
      4. Analyse par prompt (si fourni)
      5. Score de confiance LLM (si fourni)
      6. Recommandations
    """
    ts        = metadata.get('timestamp', datetime.now().isoformat()) if metadata else datetime.now().isoformat()
    is_demo   = metadata.get('is_demo', False) if metadata else False
    models    = metadata.get('models_used', ['qwen3.5']) if metadata else ['qwen3.5']
    date_str  = datetime.fromisoformat(ts[:19]).strftime('%d %B %Y')
    report_definition = report_definition or {}
    report_title = report_definition.get('name', "Rapport d'analyse principal")
    report_description = report_definition.get(
        'description',
        "Analyse de presence dans les reponses des modeles de langage"
    )
    report_code = report_definition.get('id', 'RPT-MAIN')

    brand_data   = metrics.get(brand, {})
    brand_rank   = next((r['rank'] for r in ranking if r['brand'] == brand), '—')
    global_score = brand_data.get('global_score', 0)
    mention_rate = brand_data.get('mention_rate', 0)
    avg_position = brand_data.get('avg_position', 0)
    top_of_mind  = brand_data.get('top_of_mind', 0)
    sov          = brand_data.get('share_of_voice', 0)

    strengths       = insights.get('strengths', [])
    weaknesses      = insights.get('weaknesses', [])
    recommendations = insights.get('recommendations', [])

    # ── CSS ──────────────────────────────────────────────────────────────────
    css = f"""
* {{ margin:0; padding:0; box-sizing:border-box; }}

@page {{
  size: A4;
  margin: 0;
}}

body {{
  font-family: Arial, Helvetica, sans-serif;
  background: {INK};
  color: {WHITE};
  font-size: 11px;
  line-height: 1.5;
}}

/* ── Cover ── */
.cover {{
  width: 210mm;
  height: 297mm;
  background: {INK};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
  padding: 48px;
  border-left: 6px solid {ACCENT};
  position: relative;
}}

.cover-logo {{
  font-family: 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 4px;
  color: {ACCENT};
  text-transform: uppercase;
  font-weight: 700;
}}

.cover-main {{
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}}

.cover-tag {{
  font-family: 'Courier New', monospace;
  font-size: 9px;
  letter-spacing: 3px;
  color: {MUTED};
  text-transform: uppercase;
  margin-bottom: 16px;
}}

.cover-brand {{
  font-size: 52px;
  font-weight: 700;
  color: {WHITE};
  letter-spacing: -1px;
  line-height: 1.1;
  margin-bottom: 12px;
}}

.cover-subtitle {{
  font-size: 14px;
  color: {MUTED};
  margin-bottom: 40px;
}}

.cover-score-block {{
  display: flex;
  gap: 24px;
  align-items: flex-end;
  margin-top: 32px;
}}

.cover-kpi {{
  display: flex;
  flex-direction: column;
  gap: 4px;
}}

.cover-kpi-val {{
  font-family: 'Courier New', monospace;
  font-size: 36px;
  font-weight: 700;
  color: {ACCENT};
  line-height: 1;
}}

.cover-kpi-label {{
  font-family: 'Courier New', monospace;
  font-size: 8px;
  letter-spacing: 2px;
  color: {MUTED};
  text-transform: uppercase;
}}

.cover-sep {{ width: 1px; height: 60px; background: {BORDER}; }}

.cover-kpi-white .cover-kpi-val {{ color: {WHITE}; font-size: 28px; }}

.cover-footer {{
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid {BORDER};
  padding-top: 20px;
}}

.cover-date {{
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: {MUTED};
}}

.cover-demo-badge {{
  font-family: 'Courier New', monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 4px 12px;
  border: 1px solid {ACCENT};
  color: {ACCENT};
  letter-spacing: 1px;
}}

/* ── Sections ── */
.section {{
  padding: 40px 48px;
  border-bottom: 1px solid {BORDER};
  page-break-inside: avoid;
}}

.section-header {{
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid {BORDER};
}}

.section-num {{
  font-family: 'Courier New', monospace;
  font-size: 9px;
  color: {MUTED};
  letter-spacing: 1px;
  min-width: 24px;
}}

.section-title {{
  font-family: 'Courier New', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: {WHITE};
}}

/* ── KPI Grid ── */
.kpi-grid {{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}}

.kpi-card {{
  background: {SURFACE};
  border: 1px solid {BORDER};
  padding: 16px;
  border-top: 2px solid {BORDER};
}}

.kpi-card.highlight {{ border-top-color: {ACCENT}; }}
.kpi-card.good      {{ border-top-color: {GREEN}; }}
.kpi-card.warning   {{ border-top-color: {RED}; }}

.kpi-val {{
  font-family: 'Courier New', monospace;
  font-size: 24px;
  font-weight: 700;
  color: {WHITE};
  line-height: 1.1;
  margin-bottom: 4px;
}}

.kpi-card.highlight .kpi-val {{ color: {ACCENT}; }}
.kpi-card.good      .kpi-val {{ color: {GREEN}; }}

.kpi-label {{
  font-family: 'Courier New', monospace;
  font-size: 8px;
  letter-spacing: 1.5px;
  color: {MUTED};
  text-transform: uppercase;
}}

/* ── Listes forces/faiblesses ── */
.two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}

.insight-block {{ background: {SURFACE}; border: 1px solid {BORDER}; padding: 16px; }}

.insight-block-title {{
  font-family: 'Courier New', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 10px;
}}

.insight-block.strengths .insight-block-title  {{ color: {GREEN}; }}
.insight-block.weaknesses .insight-block-title {{ color: {RED}; }}

.insight-item {{
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 10px;
  color: #cccccc;
  line-height: 1.4;
}}

.insight-dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}}

.strengths  .insight-dot {{ background: {GREEN}; }}
.weaknesses .insight-dot {{ background: {RED}; }}

/* ── Tableau Ranking ── */
.ranking-table {{
  width: 100%;
  border-collapse: collapse;
  font-family: 'Courier New', monospace;
  font-size: 10px;
}}

.ranking-table th {{
  padding: 8px 12px;
  text-align: left;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: {MUTED};
  border-bottom: 2px solid {BORDER};
  background: {SURFACE};
}}

.ranking-table th:not(:first-child) {{ text-align: right; }}

.ranking-table td {{
  padding: 10px 12px;
  border-bottom: 1px solid {BORDER};
  color: #cccccc;
}}

.ranking-table td:not(:first-child) {{ text-align: right; }}

.ranking-table tr.target-row {{
  background: rgba(88,188,255,0.08);
  border-left: 3px solid {ACCENT};
}}

.ranking-table tr.target-row td {{
  color: {WHITE};
}}

.rank-badge {{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 10px;
  font-weight: 700;
  color: {MUTED};
}}

.rank-badge.first {{
  background: {ACCENT};
  color: #000;
}}

.brand-name {{ font-weight: 600; }}
.target-row .brand-name {{ color: {ACCENT}; }}

.bar-cell {{ display: flex; align-items: center; gap: 6px; justify-content: flex-end; }}
.bar-track {{ width: 60px; height: 3px; background: {BORDER}; }}
.bar-fill  {{ height: 100%; background: {ACCENT}; }}
.target-row .bar-fill {{ background: {ACCENT}; }}
.other-row  .bar-fill {{ background: #444; }}

/* ── Prompts table ── */
.prompt-table {{
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5px;
}}

.prompt-table th {{
  padding: 7px 10px;
  font-family: 'Courier New', monospace;
  font-size: 7.5px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: {MUTED};
  border-bottom: 2px solid {BORDER};
  background: {SURFACE};
  text-align: left;
}}

.prompt-table th:not(:first-child) {{ text-align: right; }}

.prompt-table td {{
  padding: 9px 10px;
  border-bottom: 1px solid {BORDER};
  line-height: 1.4;
  vertical-align: top;
}}

.prompt-table td:not(:first-child) {{ text-align: right; font-family: 'Courier New', monospace; }}

.prompt-table tr.best-prompt {{ border-left: 3px solid {GREEN}; background: rgba(30,158,102,0.08); }}
.prompt-table tr.worst-prompt {{ border-left: 3px solid {BORDER}; }}

.mention-yes {{ color: {GREEN}; font-weight: 700; }}
.mention-no  {{ color: {MUTED}; }}

/* ── Confiance LLM ── */
.confidence-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }}

.conf-card {{
  background: {SURFACE};
  border: 1px solid {BORDER};
  padding: 14px 16px;
}}

.conf-brand {{ font-weight: 700; font-size: 11px; margin-bottom: 8px; color: {WHITE}; }}
.conf-val   {{ font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; }}
.conf-val.high {{ color: {GREEN}; }}
.conf-val.mid  {{ color: {AMBER}; }}
.conf-val.low  {{ color: {RED}; }}
.conf-val.na   {{ color: {MUTED}; font-size: 13px; }}
.conf-label    {{ font-family: 'Courier New', monospace; font-size: 8px; color: {MUTED}; letter-spacing: 1px; margin-top: 2px; }}

/* ── Recommandations ── */
.reco-list {{ display: flex; flex-direction: column; gap: 10px; }}

.reco-item {{
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: {SURFACE};
  border: 1px solid {BORDER};
  padding: 14px 16px;
  border-left: 3px solid {ACCENT};
}}

.reco-num {{
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  color: {ACCENT};
  line-height: 1;
  min-width: 24px;
}}

.reco-text {{
  font-size: 11px;
  color: #cccccc;
  line-height: 1.5;
}}

/* ── Footer page ── */
.page-footer {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 48px;
  border-top: 1px solid {BORDER};
  font-family: 'Courier New', monospace;
  font-size: 8px;
  color: {MUTED};
  letter-spacing: 0.5px;
}}
"""

    # ── Cover ────────────────────────────────────────────────────────────────
    score_color = GREEN if global_score >= 60 else (AMBER if global_score >= 35 else RED)
    rank_suffix = {1: 'ER', 2: 'ÈME', 3: 'ÈME'}.get(brand_rank if isinstance(brand_rank, int) else 0, 'ÈME')

    cover = f"""
<div class="cover">
  <div class="cover-logo">GEO Monitor</div>
  <div class="cover-main">
    <div class="cover-tag">{report_code} · {report_title}</div>
    <div class="cover-brand">{brand}</div>
    <div class="cover-subtitle">{report_description}</div>
    <div class="cover-score-block">
      <div class="cover-kpi">
        <div class="cover-kpi-val" style="color:{score_color};">{global_score:.1f}</div>
        <div class="cover-kpi-label">Score global / 100</div>
      </div>
      <div class="cover-sep"></div>
      <div class="cover-kpi cover-kpi-white">
        <div class="cover-kpi-val">#{brand_rank}</div>
        <div class="cover-kpi-label">Rang compétitif</div>
      </div>
      <div class="cover-sep"></div>
      <div class="cover-kpi cover-kpi-white">
        <div class="cover-kpi-val">{mention_rate:.0f}%</div>
        <div class="cover-kpi-label">Taux de mention</div>
      </div>
    </div>
  </div>
  <div class="cover-footer">
    <div class="cover-date">Généré le {date_str} · Modèles : {', '.join(models)}</div>
    {'<div class="cover-demo-badge">DONNÉES DÉMO</div>' if is_demo else ''}
  </div>
</div>
"""

    # ── Section 1 : Résumé exécutif ──────────────────────────────────────────
    rank_class = 'highlight' if brand_rank == 1 else ('good' if isinstance(brand_rank, int) and brand_rank <= 3 else 'warning')

    section_exec = f"""
<div class="section">
  <div class="section-header">
    <span class="section-num">01</span>
    <span class="section-title">Résumé exécutif</span>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card {rank_class}">
      <div class="kpi-val">#{brand_rank}</div>
      <div class="kpi-label">Rang compétitif</div>
    </div>
    <div class="kpi-card {'good' if mention_rate >= 60 else 'highlight'}">
      <div class="kpi-val">{mention_rate:.0f}%</div>
      <div class="kpi-label">Taux de mention</div>
    </div>
    <div class="kpi-card {'good' if avg_position <= 2 and avg_position > 0 else 'highlight'}">
      <div class="kpi-val">#{avg_position:.1f}</div>
      <div class="kpi-label">Position moyenne</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-val">{top_of_mind:.0f}%</div>
      <div class="kpi-label">Top of mind</div>
    </div>
  </div>

  <div class="two-col">
    <div class="insight-block strengths">
      <div class="insight-block-title">Forces</div>
      {''.join(f'<div class="insight-item"><span class="insight-dot"></span><span>{s}</span></div>' for s in (strengths or ['Analyse en cours…'])) }
    </div>
    <div class="insight-block weaknesses">
      <div class="insight-block-title">Points d'amélioration</div>
      {''.join(f'<div class="insight-item"><span class="insight-dot"></span><span>{w}</span></div>' for w in (weaknesses or ['Analyse en cours…']))}
    </div>
  </div>
</div>
"""

    # ── Section 2 : Classement ────────────────────────────────────────────────
    max_score = max((r.get('global_score', 0) for r in ranking), default=1)

    ranking_rows = ''
    for r in ranking:
        is_target = r['brand'] == brand
        cls       = 'target-row' if is_target else 'other-row'
        rank_cls  = 'first' if r['rank'] == 1 else ''
        bar_w     = int(r.get('global_score', 0) / max_score * 60) if max_score > 0 else 0
        ranking_rows += f"""
<tr class="{cls}">
  <td><span class="rank-badge {rank_cls}">#{r['rank']}</span></td>
  <td><span class="brand-name">{r['brand']}</span></td>
  <td>{r.get('global_score', 0):.1f}</td>
  <td>
    <div class="bar-cell">
      <span>{r.get('mention_rate', 0):.0f}%</span>
      <div class="bar-track"><div class="bar-fill" style="width:{bar_w}px"></div></div>
    </div>
  </td>
  <td>#{r.get('avg_position', 0):.1f}</td>
  <td>{r.get('top_of_mind', 0):.0f}%</td>
  <td>{r.get('share_of_voice', 0):.0f}%</td>
</tr>"""

    section_ranking = f"""
<div class="section">
  <div class="section-header">
    <span class="section-num">02</span>
    <span class="section-title">Classement compétitif</span>
  </div>
  <table class="ranking-table">
    <thead>
      <tr>
        <th>Rang</th><th>Marque</th><th>Score</th>
        <th>Mentions</th><th>Position moy.</th><th>Top of mind</th><th>Part de voix</th>
      </tr>
    </thead>
    <tbody>{ranking_rows}</tbody>
  </table>
</div>
"""

    # ── Section 3 : Analyse par prompt ───────────────────────────────────────
    section_prompts = ''
    if prompt_stats:
        best_score  = prompt_stats[0]['score'] if prompt_stats else 0
        worst_score = prompt_stats[-1]['score'] if prompt_stats else 0
        prompt_rows = ''
        for p in prompt_stats[:15]:   # max 15 prompts
            cls = 'best-prompt' if p['score'] == best_score else ('worst-prompt' if p['score'] == worst_score else '')
            mention_cls = 'mention-yes' if p.get('brand_mentioned') else 'mention-no'
            pos_str     = f"#{p['avg_position']}" if p.get('avg_position') else '—'
            prompt_rows += f"""
<tr class="{cls}">
  <td style="max-width:240px;word-break:break-word;">{p.get('prompt','')}</td>
  <td><span class="{mention_cls}">{'✓' if p.get('brand_mentioned') else '—'}</span></td>
  <td>{p.get('mention_rate', 0):.0f}%</td>
  <td>{pos_str}</td>
  <td>{p.get('top_of_mind', 0):.0f}%</td>
  <td style="font-weight:700;">{p.get('score', 0):.1f}</td>
</tr>"""

        section_prompts = f"""
<div class="section">
  <div class="section-header">
    <span class="section-num">03</span>
    <span class="section-title">Analyse par prompt</span>
  </div>
  <table class="prompt-table">
    <thead>
      <tr>
        <th>Prompt</th><th>Mentionné</th><th>Mention %</th>
        <th>Position</th><th>Top mind</th><th>Score</th>
      </tr>
    </thead>
    <tbody>{prompt_rows}</tbody>
  </table>
</div>
"""

    # ── Section 4 : Score de confiance ───────────────────────────────────────
    section_confidence = ''
    if confidence:
        conf_cards = ''
        for b, conf_data in list(confidence.items())[:6]:
            conf_val = conf_data.get('confidence')
            std_dev  = conf_data.get('std_dev', 0)
            level    = conf_data.get('divergence_level', 'N/A')
            if conf_val is None:
                cls, val_str = 'na', 'N/A'
            elif conf_val >= 75:
                cls, val_str = 'high', f"{conf_val:.0f}%"
            elif conf_val >= 45:
                cls, val_str = 'mid', f"{conf_val:.0f}%"
            else:
                cls, val_str = 'low', f"{conf_val:.0f}%"

            conf_cards += f"""
<div class="conf-card">
  <div class="conf-brand">{b}</div>
  <div class="conf-val {cls}">{val_str}</div>
  <div class="conf-label">Confiance · divergence {level}</div>
  {f'<div class="conf-label" style="margin-top:4px;">σ = {std_dev:.1f}%</div>' if std_dev else ''}
</div>"""

        section_num = '04' if prompt_stats else '03'
        section_confidence = f"""
<div class="section">
  <div class="section-header">
    <span class="section-num">{section_num}</span>
    <span class="section-title">Score de confiance inter-modèles</span>
  </div>
  <div class="confidence-grid">{conf_cards}</div>
</div>
"""

    # ── Section 5 : Recommandations ───────────────────────────────────────────
    reco_num = '0' + str(
        2 +
        bool(prompt_stats) +
        bool(confidence) +
        1
    )
    reco_items = ''
    for i, reco in enumerate(recommendations or ['Renforcer le contenu expert sur le secteur',
                                                  'Améliorer SEO/GEO sur requêtes génériques',
                                                  'Activer plusieurs modèles LLM pour mesurer la confiance'], 1):
        reco_items += f"""
<div class="reco-item">
  <span class="reco-num">{i:02d}</span>
  <span class="reco-text">{reco}</span>
</div>"""

    section_recos = f"""
<div class="section">
  <div class="section-header">
    <span class="section-num">{reco_num}</span>
    <span class="section-title">Recommandations</span>
  </div>
  <div class="reco-list">{reco_items}</div>
</div>
"""

    # ── Footer ────────────────────────────────────────────────────────────────
    footer = f"""
<div class="page-footer">
  <span>GEO Monitor — Rapport {brand}</span>
  <span>Généré le {date_str}</span>
  <span>Confidentiel</span>
</div>
"""

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO Monitor — Rapport {brand}</title>
  <style>{css}</style>
</head>
<body>
  {cover}
  {section_exec}
  {section_ranking}
  {section_prompts}
  {section_confidence}
  {section_recos}
  {footer}
</body>
</html>"""


# ── Génération PDF ────────────────────────────────────────────────────────────

def generate_pdf_bytes(html: str) -> bytes:
    """
    Convertit le HTML en PDF via WeasyPrint.
    Lève ImportError si WeasyPrint n'est pas installé.
    """
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        font_config = FontConfiguration()
        pdf_bytes = HTML(string=html).write_pdf(font_config=font_config)
        return pdf_bytes
    except ImportError:
        raise ImportError(
            "WeasyPrint non installé. "
            "Exécutez : pip install weasyprint --break-system-packages"
        )


def generate_report(
    brand: str,
    ranking: List[Dict],
    metrics: Dict,
    insights: Dict,
    prompt_stats: Optional[List[Dict]] = None,
    confidence: Optional[Dict] = None,
    metadata: Optional[Dict] = None,
    output_format: str = 'pdf',   # 'pdf' | 'html'
    report_definition: Optional[Dict] = None
) -> tuple[bytes, str]:
    """
    Point d'entrée principal.

    Returns:
        (content_bytes, content_type)
        content_type = 'application/pdf' | 'text/html'
    """
    html = build_report_html(
        brand,
        ranking,
        metrics,
        insights,
        prompt_stats,
        confidence,
        metadata,
        report_definition
    )

    if output_format == 'html':
        return html.encode('utf-8'), 'text/html; charset=utf-8'

    try:
        pdf_bytes = generate_pdf_bytes(html)
        return pdf_bytes, 'application/pdf'
    except ImportError:
        # Fallback HTML si WeasyPrint absent
        print("[PDF] WeasyPrint non dispo — fallback HTML")
        return html.encode('utf-8'), 'text/html; charset=utf-8'
