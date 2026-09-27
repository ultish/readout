import {
  bestJapanesePlaces,
  chooseEnglishPlace,
  englishCity,
  formatQuakeProbability,
  HEART_RAILS,
  isLatinPlaceQuery,
  JSHIS_ATTR,
  JSHIS_MESH_URL,
  JSHIS_SOIL_URL,
  JSHIS_VERSION,
  JSHIS_WMS,
  JSHIS_WMS_LAYER,
  QUAKE_TITLE,
  soilEnglish,
  zoomForPlaceKind,
} from "@readout/core";

const UA = "readout/0.1 (personal hazard map)";

export interface GeocodeHit {
  label: string;
  lat: number;
  lon: number;
  zoom: number;
  prefecture: string;
  city: string;
  town: string;
}

async function gsiPlaces(keyword: string): Promise<Array<{ title: string; lat: number; lon: number }>> {
  const url = new URL("https://msearch.gsi.go.jp/address-search/AddressSearch");
  url.searchParams.set("q", keyword);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const body = (await res.json()) as Array<{
    geometry?: { coordinates?: number[] };
    properties?: { title?: string };
  }>;
  return body.flatMap((feature) => {
    const title = feature.properties?.title;
    const coords = feature.geometry?.coordinates;
    if (!title || !coords || coords.length < 2) return [];
    const lon = coords[0];
    const lat = coords[1];
    if (lon == null || lat == null) return [];
    return [{ title, lon, lat }];
  });
}

async function nominatim(keyword: string): Promise<GeocodeHit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", keyword);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("limit", "5");
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as Array<{
    name?: string;
    display_name?: string;
    lat?: string;
    lon?: string;
    addresstype?: string;
  }>;
  const chosen = chooseEnglishPlace(
    body.flatMap((row) => {
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
      return [{
        label: row.name || row.display_name || keyword,
        lat,
        lon,
        kind: row.addresstype ?? "",
      }];
    }),
  );
  if (!chosen) return null;
  return {
    label: chosen.label,
    lat: chosen.lat,
    lon: chosen.lon,
    zoom: zoomForPlaceKind(chosen.kind),
    prefecture: "",
    city: chosen.label,
    town: "",
  };
}

async function heartRails(keyword: string): Promise<GeocodeHit[]> {
  const url = new URL(HEART_RAILS);
  url.searchParams.set("method", "suggest");
  url.searchParams.set("matching", "like");
  url.searchParams.set("keyword", keyword);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HeartRails ${res.status}`);
  const body = (await res.json()) as {
    response?: {
      error?: string;
      location?: Array<Record<string, string>>;
    };
  };
  const rows = body.response?.location ?? [];
  return rows.slice(0, 8).map((row) => ({
    label: [row.prefecture, row.city, row.town].filter(Boolean).join(""),
    lat: Number(row.y),
    lon: Number(row.x),
    zoom: 14,
    prefecture: row.prefecture ?? "",
    city: row.city ?? "",
    town: row.town ?? "",
  }));
}

export async function geocode(keyword: string): Promise<GeocodeHit[]> {
  const known = englishCity(keyword);
  if (known) {
    return [{ ...known, zoom: 12, prefecture: "", city: known.label, town: "" }];
  }
  if (isLatinPlaceQuery(keyword)) {
    const place = await nominatim(keyword);
    if (place) return [place];
  }
  const suffixes = /[市区町村都道府県]$/.test(keyword) ? [keyword] : [keyword, `${keyword}市`, `${keyword}都`];
  const batches = await Promise.all(suffixes.map((query) => gsiPlaces(query)));
  const ranked = bestJapanesePlaces(keyword, batches.flat());
  if (ranked.length > 0) {
    return ranked.map((place) => ({
      label: place.label,
      lat: place.lat,
      lon: place.lon,
      zoom: place.score >= 80 ? 12 : 15,
      prefecture: "",
      city: place.label,
      town: "",
    }));
  }
  return heartRails(keyword);
}

export async function reverseTown(
  lat: number,
  lon: number,
): Promise<string | null> {
  const url = new URL(HEART_RAILS);
  url.searchParams.set("method", "searchByGeoLocation");
  url.searchParams.set("x", String(lon));
  url.searchParams.set("y", String(lat));
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    response?: { location?: Array<Record<string, string>> };
  };
  const row = body.response?.location?.[0];
  if (!row) return null;
  return [row.prefecture, row.city, row.town].filter(Boolean).join("");
}

interface MeshFeature {
  properties?: Record<string, string>;
}

async function mesh(
  base: string,
  lat: number,
  lon: number,
): Promise<Record<string, string> | null> {
  const url = new URL(base);
  url.searchParams.set("position", `${lon},${lat}`);
  url.searchParams.set("epsg", "4326");
  if (base === JSHIS_MESH_URL) url.searchParams.set("attr", JSHIS_ATTR);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`J-SHIS ${res.status}`);
  const body = (await res.json()) as { features?: MeshFeature[] };
  return body.features?.[0]?.properties ?? null;
}

export async function quakeAt(lat: number, lon: number) {
  const props = await mesh(JSHIS_MESH_URL, lat, lon);
  const raw = props?.[JSHIS_ATTR];
  const probability = raw == null ? null : Number(raw);
  if (probability == null || Number.isNaN(probability)) {
    return {
      status: "no_data" as const,
      probability: null,
      label: "No mesh published here",
      meshcode: props?.meshcode ?? null,
      version: JSHIS_VERSION,
      title: QUAKE_TITLE,
      caveats: [],
    };
  }
  return {
    status: "ok" as const,
    probability,
    label: formatQuakeProbability(probability),
    meshcode: props?.meshcode ?? null,
    version: JSHIS_VERSION,
    title: QUAKE_TITLE,
    caveats: [],
  };
}

export async function soilAt(lat: number, lon: number) {
  const props = await mesh(JSHIS_SOIL_URL, lat, lon);
  if (!props) {
    return {
      status: "no_data" as const,
      avs: null,
      arv: null,
      soilJa: null,
      soilEn: null,
      caveats: ["No shallow-structure mesh published here."],
    };
  }
  const soilJa = props.JNAME ?? null;
  const soilEn = soilEnglish(soilJa);
  const caveats = [
    "Soft ground is not a liquefaction map.",
  ];
  if (soilJa && !soilEn) caveats.push(`Landform name not translated: ${soilJa}`);
  return {
    status: "ok" as const,
    avs: props.AVS ?? null,
    arv: props.ARV ?? null,
    soilJa,
    soilEn,
    caveats,
  };
}

export function quakeOverlayUrl(
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
): string {
  const url = new URL(JSHIS_WMS);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetMap");
  url.searchParams.set("BBOX", `${south},${west},${north},${east}`);
  url.searchParams.set("CRS", "EPSG:4326");
  url.searchParams.set("WIDTH", String(width));
  url.searchParams.set("HEIGHT", String(height));
  url.searchParams.set("LAYERS", JSHIS_WMS_LAYER);
  url.searchParams.set("FORMAT", "image/png");
  url.searchParams.set("TRANSPARENT", "TRUE");
  return url.toString();
}
