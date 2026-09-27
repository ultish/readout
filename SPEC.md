# Readout — Product Spec

**Status:** Draft for Jimmy review (spec only — do not implement until approved)  
**Name:** Readout  
**Owner:** Jimmy Hui / Grok Build  
**Date:** 2026-09-27 (AEST)  
**Related:** `HANDOFF.md` (unchanged source brief)

---

## 1. Problem / user / thesis

**Problem.** Official Japanese hazard sources (重ねるハザードマップ, J-SHIS) are accurate but Japanese-only and awkward for a remote buyer. Commercial PRS API (propriskapi.com) shut down September 2026. No drop-in English “address → risk one-pager” remains.

**User.** Jimmy Hui — Melbourne-based, exploring urban Japan property as a second home / family base (wife Japanese). Cities of interest: Fukuoka, Sapporo, Himeji, Kanagawa. Constraints: prefer lower relative quake risk; avoid floodplains, tsunami zones, soft fill, liquefaction; prefer post-1981 seismic code (ideally post-2000). Urban only.

**Thesis.** Do not invent hazard science. Package existing public Japanese data in a modern English UX.

---

## 2. In-scope MVP vs out of scope

### In scope (MVP core)

1. Full-screen map. Pan and zoom. Overlays paint where it is riskier to buy:
   - Flood, tsunami, landslide — GSI 重ねるハザードマップ raster tiles
   - Quake — coloured 250 m mesh from J-SHIS, drawn as its own layer (not a click-only number)
2. Address search flies the camera to that place. A click opens the English readout for that point:
   - Flood / tsunami / landslide class at the point
   - J-SHIS 30-year probability of seismic intensity 6-lower (6弱) or higher
   - Soft-ground / surface-soil note if available (J-SHIS shallow structure)
   - Liquefaction / municipal ground-damage pointer when a public source exists
   - Optional building year → seismic-era label (pre-1981 / 1981–2000 / post-2000)
3. Save / compare a shortlist of candidate lots (SQLite on hana).
4. Later slice: SUUMO / HOMES listing URL → extract address → geocode.

### Out of scope (explicit non-goals)

- Insurance pricing or premium estimates
- Portfolio / ESG scoring
- Japanese agent CRM
- Rural / akiya countryside focus
- Hawthorn (AU) land track — separate product
- Invented or proprietary hazard models
- Day-one multi-tenant SaaS, billing, or agent white-label

---

## 3. Primary user journey (screens)

| Screen | Purpose |
| --- | --- |
| **Map** | Primary screen. Pan, zoom, toggle overlays. Address box flies the camera. Optional building year on the point you click. |
| **Readout** | Click a point. English one-pager for that spot: risk cards + sources/disclaimer. Save to shortlist. |
| **Shortlist** | Table/cards of saved lots; side-by-side compare on key fields (flood depth class, tsunami, landslide flags, J-SHIS 30y % of 6弱+, seismic era). |
| **URL import** (Phase 3) | Paste SUUMO/HOMES URL → parse address → fly the map there. |

---

## 4. Report contents

| Block | Content |
| --- | --- |
| Location | Normalised address (if any), lat/lon, mesh code, map snapshot |
| Flood | In/out of flood assumed-max inundation; depth class from legend if in zone; link to official tile source |
| Tsunami | In/out of prefectural tsunami inundation assumption; depth class if available |
| Landslide | Flags for debris-flow / steep-slope / landslide caution zones (警戒区域) |
| Earthquake | Same number as the map layer: J-SHIS 30-year probability of JMA intensity 6-lower (6弱) or higher, average case, latest published version. Mesh code + version cited. Soft-ground / AVS30-style note if returned |
| Liquefaction / soft fill | Best-effort: J-SHIS surface structure + link to municipal 地盤被害（液状化） map via わがまちハザードマップ when available; else “not available nationally — check municipality” |
| Building (optional) | User-entered year → era: pre-新耐震 (before Jun 1981), 新耐震 (1981–2000), 2000 criteria (post-2000) |
| Sources | Attribution lines for every layer used |
| Disclaimer | Not insurance or legal advice; verify with agent’s 重要事項説明 and municipal maps |

---

## 5. Data contracts

Each layer returns a normalised JSON shape for the report/shortlist. Caveats are first-class fields — never hide “unknown”.

### Common envelope

```json
{
  "layer": "flood_l2 | tsunami | landslide | jshis_pshm | soft_ground | liquefaction_hint | building_era",
  "status": "ok | no_data | partial | error",
  "lat": 0, "lon": 0,
  "source": { "name": "", "url": "", "attribution": "", "accessed_at": "" },
  "confidence": "high | medium | low | unknown",
  "caveats": []
}
```

### Flood (GSI raster sample)

| Field | Type | Notes |
| --- | --- | --- |
| `in_zone` | bool \| null | null if tile missing / transparent |
| `depth_class` | string \| null | Legend bucket (e.g. `0.5-1m`, `1-2m`, `>5m`) — mapped from palette colour |
| `scenario` | string | Default `assumed_maximum` (L2 想定最大規模) |
| `units` | string | metres inundation depth (class, not continuous) |
| `confidence` | | **medium** for palette decode; **low** if pref tile absent |

**Access type:** documented XYZ tiles (not a point JSON API). Pain: colour→legend mapping; pref coverage gaps.

### Tsunami

| Field | Type | Notes |
| --- | --- | --- |
| `in_zone` | bool \| null | |
| `depth_class` | string \| null | From tsunami legend where published |
| `coverage` | string | Pref-dependent; some prefs not tiled |

### Landslide

| Field | Type | Notes |
| --- | --- | --- |
| `debris_flow` | bool \| null | 土石流 警戒区域 |
| `steep_slope` | bool \| null | 急傾斜地 |
| `landslide` | bool \| null | 地すべり |
| `special_caution` | bool \| null | 特別警戒 if distinguishable |

### J-SHIS quake (official HTTP API)

| Field | Type | Notes |
| --- | --- | --- |
| `version` | string | e.g. `Y2024` (latest NIED at spike time) |
| `case` | string | `AVR` (average). `MAX` is not the default |
| `period` | string | 30-year |
| `intensity` | string | JMA 6-lower or higher (6弱以上). Spike locks the J-SHIS attribute code that means this; the English label does not change |
| `layer` | | Viewport of coloured 250 m meshes, not only a point sample. Cache meshes. Missing mesh is `no_data`, never a quiet green |
| `probability` | number \| null | 0–1 or % — store both `value` and `unit` |
| `meshcode` | string | 250 m mesh |
| `confidence` | | **high** when API 200 + attribute present |

### Soft ground (J-SHIS `sstrct`)

| Field | Type | Notes |
| --- | --- | --- |
| `avs30_or_proxy` | number \| null | As published by API |
| `soil_class_label_en` | string \| null | English paraphrase of official class — not a new model |
| `caveats` | | Soft ground ≠ certified liquefaction map |

### Liquefaction hint

| Field | Type | Notes |
| --- | --- | --- |
| `national_status` | string | Usually `no_national_tile` |
| `municipal_map_url` | string \| null | From わがまちハザードマップ CSV if city matched |
| `confidence` | | **low** unless municipal source loaded |

### Building era (user input)

| Field | Type | Notes |
| --- | --- | --- |
| `year_built` | number \| null | User-entered |
| `era` | enum | `pre_1981` \| `shin_taishin_1981_2000` \| `post_2000` \| `unknown` |
| `confidence` | | **user_asserted** — not verified against registry |

---

## 6. Personal-tool vs niche-product fork

Same MVP core (search → report → shortlist). Diverges later:

| | Personal tool | Niche product (foreigners / diaspora) |
| --- | --- | --- |
| Hosting | Local or single-user private deploy | Multi-user + auth |
| Storage | Browser / local JSON / private DB | Account-backed shortlists |
| Geocoding | Free HeartRails / self-host fine | Paid SLA (Google etc.) + ToS review |
| Attribution UX | Footer is enough | Per-layer legal copy + rate limits |
| Monetisation | None | Freemium later — **not day one** |
| Support / liability | Personal use disclaimer | Stronger legal review before public launch |

**Decision:** Build personal MVP first; keep data contracts product-ready so a niche fork is a packaging change, not a rewrite.

---

## 7. Non-goals and legal / disclaimer stance

- **Not** insurance advice, structural engineering, or a substitute for 重要事項説明.
- Always cite official sources (GSI / MLIT, NIED J-SHIS, municipalities).
- Show data vintage / API version on the report.
- Agents have been required to show flood hazard at important-matters explanation since 2020 — tool complements that, does not replace it.
- Commercial reuse of GSI tiles is allowed with required attribution; confirm current 利用規約 before any public product.

**Suggested disclaimer (report footer):**  
“This tool repackages public Japanese government hazard data for personal screening. It is not insurance, legal, or engineering advice. Confirm with municipal maps and your agent’s important-matters explanation before purchase.”

---

## 8. Success criteria (Jimmy’s personal use)

1. For a Fukuoka / Sapporo / Himeji / Kanagawa urban address, produce an English one-pager in &lt; 30 seconds after pin/address.
2. Correctly flag “clearly in flood / tsunami / landslide caution zone” vs “not in published zone” for spiked sample points, matching the official map eye-check.
3. Quake layer and the click readout both show the J-SHIS 30-year probability of intensity 6-lower or higher, with mesh + version cited.
4. Save ≥ 5 candidates and compare them on one screen.
5. Jimmy can iterate shortlists from Melbourne without reading Japanese UIs for the core layers.

---

## 9. Decisions

Confirmed:

1. **Name.** Readout.
2. **Personal tool on hana** for now. Same shape as risu, tanuki, and kura: pnpm monorepo, Vite + React, Hono, better-sqlite3, a `packages/core` for the pure report logic. No Google Maps account, no serverless host, no login beyond the box's LAN and Tailscale.
3. **Map.** MapLibre via react-map-gl. The map is the primary screen.
4. **Quake is a layer.** Coloured 250 m meshes while you pan, plus the same number on the click readout.
5. **Quake number.** 30-year chance of JMA intensity 6-lower (6弱) or higher.
6. **Geocoder.** HeartRails. Town-block (丁目) accuracy is enough to fly the camera. The pin picks the spot.
7. **Map extent.** All of Japan. Fukuoka, Sapporo, Himeji, and Kanagawa are where he looks, not a data clip.

Defaults, unless he says otherwise:

8. **Flood overlay** opens on assumed-maximum (L2). Planned-scale (L1) is a later toggle.
9. **Liquefaction** is a note and a municipal-map link, not a painted layer.
10. **Building year** is typed. Listing-page scrape waits for the URL slice.
11. **Copy** is Australian English.

---

## 10. Research snapshot (API readiness)

See `BUILD_PLAN.md` § Research findings for full notes. Summary:

| Source | Readiness | Classification |
| --- | --- | --- |
| J-SHIS Web API | Public HTTP GET; **no API key**; English docs; mesh + position queries | **Official API** |
| GSI 重ねるハザードマップ | Documented XYZ raster tiles + WMTS metadata; commercial OK w/ attribution | **Documented tiles** |
| Point flood/tsunami values | No official point JSON — sample tile pixels or overlay only | **Documented tiles** (decode pain) |
| HeartRails Geo API | Free geocode; credit required; town-block precision | **Official API** (third-party) |
| PRS / propriskapi.com | Confirmed discontinued Sep 2026 | **Unavailable** |
| Liquefaction national layer | No clean national point API equivalent to flood tiles | **Partial / municipal links** |

**Do not start large implementation until Jimmy reviews this spec and `BUILD_PLAN.md`.**
