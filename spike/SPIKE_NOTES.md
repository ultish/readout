# Spike notes — 2026-09-27

Live calls, not guesses. These are the values the app is built on.

## Quake

`GET https://www.j-shis.bosai.go.jp/map/api/pshm/Y2024/AVR/TTL_MTTL/meshinfo.geojson?position={lon},{lat}&epsg=4326&attr=T30_I55_PS`

`T30_I55_PS` is the 30-year probability of JMA intensity 6-lower or higher. The response is a 250 m polygon plus `meshcode`.

| Place | Lon, lat | Probability | Mesh |
| --- | --- | --- | --- |
| Hakata | 130.4207, 33.5902 | 0.095286 (9.5%) | 5030330343 |
| Fukuoka hill | 130.376, 33.584 | 0.086037 (8.6%) | 5030330011 |
| Yokohama | 139.638, 35.454 | 0.406220 (40.6%) | 5339154113 |
| Sapporo station | 141.3508, 43.0686 | 0.024075 (2.4%) | 6441428811 |

The painted layer is the official WMS, five-class render of the same attribute:

`https://www.j-shis.bosai.go.jp/map/wms/pshm/Y2024?SERVICE=WMS&REQUEST=GetMap&LAYERS=P-Y2024-MAP-AVR-TTL_MTTL-T30_I55_PD&...`

A Fukuoka bbox returned a real PNG (three colours: yellow, orange, red). Clicking a point still uses the mesh API so the number is the published probability, not a guess from the colour.

## Soft ground

`GET https://www.j-shis.bosai.go.jp/map/api/sstrct/V4/meshinfo.geojson?position={lon},{lat}&epsg=4326`

Hakata: AVS 195.9, ARV 1.84, JNAME 三角州・海岸低地 (delta or coastal lowland).

## Flood L2

Tile `https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png`

Legend colours matched with distance 0 at zoom 15:

| Place | Pixel | Reading |
| --- | --- | --- |
| Nakasu 33.5935, 130.4065 | 255,216,192 | 0.5–3 m |
| Fukuoka hill 33.584, 130.376 | transparent | not coloured |
| Himeji river 34.828, 134.690 | 255,216,192 | 0.5–3 m |
| Himeji castle 34.8394, 134.6939 | transparent | not coloured |

Yokohama 35.454, 139.638 is HTTP 404 at zoom 15 and 16, and HTTP 200 at zoom 14. A missing tile is `no_data`. The sampler uses the finest zoom that actually returns a tile, and stops there. A transparent pixel on a tile that exists is "not coloured", which is not the same sentence as "safe".

## Address search

HeartRails `method=suggest&matching=like&keyword=福岡市博多区中洲` returned town 中洲 at 130.406752, 33.592427.

## Attribution

- Geospatial Information Authority of Japan tiles, including the hazard rasters on disaportaldata.gsi.go.jp
- National Research Institute for Earth Science and Disaster Resilience, J-SHIS
- HeartRails Geo API for address search
