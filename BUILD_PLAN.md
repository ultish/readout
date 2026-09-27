# Readout — Build Plan

**Status:** Draft for Jimmy review — **do not start large implementation until approved**  
**Date:** 2026-09-27 (AEST)  
**Companion:** `SPEC.md`, `HANDOFF.md`

Thin slices. Prove data access before UX polish. Prefer simple stack.

---

## Research findings (API readiness)

Honest classification after 2026-09-27 checks:

### 1. J-SHIS — **Official API** (ready for Phase 0)

- Public HTTP GET: `https://www.j-shis.bosai.go.jp/map/api/...`
- **No API key / auth** documented on the English API list.
- English docs: https://www.j-shis.bosai.go.jp/en/api-list
- Useful endpoints: `pshm` (probabilistic seismic hazard, 250 m mesh, position or meshcode), `sstrct` (shallow structure / soft ground), `landslide/isContaining`, search APIs, URL builder.
- Formats: GeoJSON / JSON / GML / XML.
- Pain: Japanese attribute codes; must lock one `version` + `eqcode`/`attr` + English label in the spike. Rate limits / ToS not loud on the map pages — treat politely (cache, low QPS).

### 2. GSI / disaportal — **Documented tiles** (ready; not scrape)

- Open data XYZ rasters: `https://disaportaldata.gsi.go.jp/raster/{dataset}/{z}/{x}/{y}.png`
- Flood L2 example: `01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png` (z 2–17)
- Also: tsunami, landslide caution zones, storm surge, inland flood (partial), etc.
- WMTS metadata XML published; commercial **and** non-commercial use allowed with required attribution (利用規約 updated 2024-12-09 — re-read before public launch).
- Pain: **no official point JSON**. MVP must (a) overlay tiles on a map and/or (b) sample the PNG pixel at lat/lon and map colour → legend class. Pref-managed river coverage is incomplete in places. Some layers paused for corrections (e.g. noted Osaka duration tile issues historically).

### 3. Geocoding — mixed

| Option | Class | Notes |
| --- | --- | --- |
| HeartRails Geo API | Official API (3rd party) | Free commercial/non-commercial; credit required; town-block (大字・町丁目) precision — OK for hazard screening, not cadastral |
| Google Geocoding | Official API (paid) | High accuracy; ~US$200/mo free credit; caching restrictions — awkward for “save shortlist forever” |
| abr-geocoder / jageocoder | Self-host OSS | Free, JP-strong; ops cost (data download) |
| GSI geocoding / position refs | Official / open data | Good for JP; confirm endpoint ToS for app use |

**Recommendation for personal MVP:** HeartRails first; fall back to map-pin-only if address fails.

### 4. After PRS shutdown — **no drop-in English commercial API found**

- propriskapi.com homepage confirms: service discontinued September 2026.
- Path = DIY packaging of J-SHIS + GSI (+ municipal links). That *is* the product.
- わがまちハザードマップ CSV links help for liquefaction / ground-damage maps (municipal PDFs/pages — not a unified API).

### Pain summary

| Task | Pain level | Why |
| --- | --- | --- |
| Quake 30y layer | Med | Official mesh API, but a pan-able layer means many 250 m cells, cached. One point is easy; the layer is the work |
| Soft ground proxy | Low–med | `sstrct` API; English labelling |
| Flood/tsunami/landslide **map** | Low | Drop XYZ tiles on MapLibre |
| Flood/tsunami **numeric one-pager** | Med–high | Pixel→legend decode; transparent = outside zone |
| Liquefaction | High | No national equivalent of flood tiles as point API |
| Listing URL → address | Med | HTML parsers break; ToS / robots |
| Building year auto | High | Not open nationally — user input for MVP |

---

## Stack (decided)

Same shape as risu, tanuki, and kura. See SPEC §9.

- **UI:** Vite + React. Map is MapLibre through react-map-gl. No Leaflet, no Google Maps.
- **API:** Hono on Node. Proxies J-SHIS and samples GSI tiles. Geocodes with HeartRails.
- **Core:** `packages/core` — legend decode, 6弱+ probability, seismic-era label. Vitest.
- **Storage:** SQLite from the start (`better-sqlite3`), shortlist included.
- **Host:** hana, next to the other apps. No multi-tenant auth.

---

## Phase 0 — Spike data access

**Goal.** Prove J-SHIS + one flood layer for **one** city (suggest Fukuoka or Yokohama) without building the product UI.

### Deliverable

- Folder `spike/` with:
  - Script: lat/lon → J-SHIS mesh probability JSON printed
  - Script or notebook: lat/lon → flood L2 tile fetch → colour → depth class (or “outside”)
  - 1-page `SPIKE_NOTES.md`: URLs used, version/eqcode chosen, legend mapping table, failures
- Screenshot or GeoJSON dump comparing spike result to official map for 2–3 known points (in-zone + out-of-zone)

### Tech sketch

- Node or Python + `curl`/`fetch`; no frontend required
- Optional: QGIS/WMTS only for human verification

### Risks

- Legend colour drift if GSI updates palette
- Pref tile missing → false “safe”
- J-SHIS parameter wrong → nonsense probability

### Exit criteria

- [ ] J-SHIS call returns 200 with probability for a Kanagawa or Fukuoka point
- [ ] Flood L2 sample distinguishes in-zone vs out-of-zone for at least one verified pair
- [ ] Attribution strings drafted
- [ ] Jimmy reviews spike notes → go/no-go Phase 1

**API readiness:** J-SHIS = official API OK. Flood = documented tiles OK with decode pain. **Do not proceed to Phase 1 if spike fails.**

---

## Phase 1 — Personal MVP (address/pin → English one-pager)

**Goal.** Jimmy can pin or paste an address and get the SPEC report locally.

### Deliverable

- Running personal web app, hana when deployed
- Screens: Map (primary) + click Readout
- Layers on the map: flood L2, tsunami, landslide rasters; quake as a coloured 250 m mesh (30-year chance of intensity 6弱 or higher). Soft-ground on the readout if the spike proved it. Optional building year. Disclaimer + sources
- SQLite save of reports (shortlist UI can still be thin in this phase)

### Tech sketch

- Vite + React + MapLibre (`react-map-gl/maplibre`); Hono proxies J-SHIS mesh fetches for the quake layer and caches them
- Geocode: HeartRails (credit in footer). Town-block precision; pin fallback
- GSI raster overlays from documented tile URLs; sample endpoint for readout numbers

### Risks

- CORS / rate limits on free geocoder
- Over-trusting “outside zone” when data absent (`status: no_data` must show)
- Scope creep into insurance language

### Exit criteria

- [ ] End-to-end: address **or** pin → English report &lt; 30s for target cities
- [ ] Eye-check vs official maps for 3 properties Jimmy cares about
- [ ] Disclaimer + attributions visible
- [ ] Jimmy using it for real shortlisting → unlock Phase 2

**Explicit:** still personal-tool quality; no marketing site.

---

## Phase 2 — Shortlist compare

**Goal.** Save candidates and compare key risk fields side-by-side.

### Deliverable

- Shortlist screen (table + optional dual map)
- Export/import JSON for backup between machines
- Diff highlights: any flood/tsunami/landslide flag; quake %; building era

### Tech sketch

- Same app; SQLite; no accounts yet

### Risks

- Stale reports if GSI/J-SHIS update — store `accessed_at` + versions; “refresh” button

### Exit criteria

- [ ] ≥ 5 lots saved and compared in one view
- [ ] Export works Melbourne ↔ travel laptop

---

## Phase 3 — Listing URL → geocode

**Goal.** Paste SUUMO / HOMES URL → address → same Report flow.

### Deliverable

- URL paste field; best-effort address extraction; hand-confirm step before report
- Document which sites work; graceful failure

### Tech sketch

- Server-side fetch + HTML parse (fragile) **or** bookmarklet that copies address from the page
- Prefer bookmarklet / manual confirm over brittle scrapers if ToS is unclear

### Risks

- **High:** listing site HTML changes; robots/ToS; blocks
- Classification: closer to **undocumented scrape** unless site offers an API (they generally do not)

### Exit criteria

- [ ] Works for Jimmy’s real listing URLs ≥ 80% with confirm step
- [ ] Clear “could not parse — paste address” fallback

---

## Cross-cutting rules

1. **Do not start large implementation until Jimmy reviews this plan** (and ideally Phase 0 spike notes).
2. Never invent hazard science; English is packaging only.
3. Every layer must carry `status` / `confidence` / `caveats` (see SPEC data contracts).
4. Prefer overlay + honest “unknown” over a fake green score.
5. Personal vs niche fork: keep contracts clean; delay auth/billing.

---

## Suggested sequence & timebox (indicative)

| Phase | Focus | Indicative effort |
| --- | --- | --- |
| 0 | Spike J-SHIS + flood sample | 0.5–2 days |
| 1 | Personal MVP one-pager | 3–7 days after spike OK |
| 2 | Shortlist | 1–3 days |
| 3 | Listing URL | 2–5 days (or bookmarklet shortcut) |

Times assume one builder; slip if tile decode is nastier than expected.

---

## Blockers / watchouts for Jimmy

- Quake layer is in scope: coloured 250 m meshes for the 30-year chance of intensity 6弱 or higher. Spike must show a viewport, not only one point.
- Liquefaction stays a municipal link for MVP unless that default is rejected.
- Geocoder is HeartRails. Host is hana.
- Re-read GSI terms before any public niche launch.
- No PRS replacement API — DIY is the plan.

---

## Sign-off

| Role | Action |
| --- | --- |
| Jimmy | Approve / amend SPEC + this plan. Open questions are now decisions in SPEC §9 |
| Grok Build | Run Phase 0 only after approval; then Phase 1 |
| Chief | Relay Q&A; do not treat this as shipped product |

**Stop here until Jimmy reviews.**
