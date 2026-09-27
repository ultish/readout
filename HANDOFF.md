# Handoff: Japan property hazard risk tool (English UX)

From: Chief → Grok Build  
For: Jimmy Hui  
Date: 2026-09-27

## Why

Jimmy is exploring buying urban property in Japan (wife is Japanese). Official hazard sites (重ねるハザードマップ, J-SHIS) are powerful but Japanese-only and not modern UX. Commercial PRS API (propriskapi.com) discontinued development/service in September 2026.

He wants a modern English “address → risk package” for remote buyers who lack local gut feel. Also sees a possible small niche product (foreigners / diaspora / returnees).

## Personal constraints (buyer)

- Urban only (not rural/akiya countryside)
- Cities of interest: Fukuoka, Sapporo, Himeji, Kanagawa (Tokyo not required)
- Prefer lower relative earthquake risk; avoid floodplains / tsunami zones / soft fill / liquefaction
- Prefer post-1981 seismic code; ideally post-2000
- Lives primarily in Melbourne; Japan = second home / family base

## Product thesis

Don’t invent hazard science. Package existing public Japanese data in English with clean UX.

MVP:
1. Paste address or drop map pin
2. English one-pager: flood / tsunami / landslide overlays, quake 30-year odds (J-SHIS), liquefaction/soft-ground note if available, optional building-year / seismic-era field
3. Save/compare shortlist of candidate lots
4. Later: listing URL (SUUMO/HOMES) → auto-geocode

Not day one: insurance pricing, portfolio ESG, Japanese agent CRM.

## Known data sources

- MLIT/GSI 重ねるハザードマップ: https://disaportal.gsi.go.jp/ (flood, landslide, storm surge, tsunami, land character)
- J-SHIS + API: https://www.j-shis.bosai.go.jp/ (probabilistic seismic hazard by mesh)
- Municipal hazard maps via わがまちハザードマップ
- Agents legally must show flood hazard map location at important-matters explanation (since 2020)

## Ask of Grok Build

1. Draft a concise product spec + build plan Jimmy can sketch against (screens, data contracts, API readiness vs scrape pain, personal-tool vs small-market path).
2. Keep work on the box under `/workspace/japan-hazard-tool/`.
3. Do not start a large implementation until Jimmy reviews the plan — spec/plan first.
4. Relay questions and the draft plan back to Chief.

## Related context (Aussie side — separate)

Jimmy also watches Hawthorn-area small land / tear-down sites for a Japanese-inspired narrow multi-storey (ground garage + floors above; basement optional/dropped). That is a different track; this handoff is the Japan hazard product only.
