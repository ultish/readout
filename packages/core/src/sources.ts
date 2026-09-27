/** Published tile and API addresses. Spike locked these on 2026-09-27. */
export const GSI_PALE =
  "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";

export const FLOOD_L2 =
  "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png";

export const TSUNAMI =
  "https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png";

export const DEBRIS_FLOW =
  "https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png";

export const STEEP_SLOPE =
  "https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png";

export const LANDSLIDE_ZONE =
  "https://disaportaldata.gsi.go.jp/raster/05_jisuberikeikaikuiki/{z}/{x}/{y}.png";

export const JSHIS_VERSION = "Y2024";
export const JSHIS_CASE = "AVR";
export const JSHIS_EQCODE = "TTL_MTTL";
/** 30-year probability of JMA intensity 6-lower or higher. */
export const JSHIS_ATTR = "T30_I55_PS";
/** Five-class painting of that same probability, for the map layer. */
export const JSHIS_WMS_LAYER = "P-Y2024-MAP-AVR-TTL_MTTL-T30_I55_PD";
export const JSHIS_SSTRCT = "V4";

export const JSHIS_MESH_URL =
  "https://www.j-shis.bosai.go.jp/map/api/pshm/Y2024/AVR/TTL_MTTL/meshinfo.geojson";

export const JSHIS_SOIL_URL =
  "https://www.j-shis.bosai.go.jp/map/api/sstrct/V4/meshinfo.geojson";

export const JSHIS_WMS =
  "https://www.j-shis.bosai.go.jp/map/wms/pshm/Y2024";

export const HEART_RAILS = "https://geoapi.heartrails.com/api/json";

export const SAMPLE_ZOOMS = [16, 15, 14, 13, 12, 11, 10, 9, 8] as const;
