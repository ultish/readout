export interface RankedPlace {
  label: string;
  lat: number;
  lon: number;
  score: number;
}

export interface EnglishPlace {
  label: string;
  lat: number;
  lon: number;
  kind: string;
}

const PREFECTURE = /^(北海道|東京都|京都府|大阪府|.{2,3}県)/;

/** City centres a person is likely to type in English. Coordinates are the published city point. */
const ENGLISH_CITIES: Record<string, { label: string; lat: number; lon: number }> = {
  tokyo: { label: "Tokyo", lat: 35.681, lon: 139.767 },
  sapporo: { label: "Sapporo", lat: 43.062077, lon: 141.354401 },
  fukuoka: { label: "Fukuoka", lat: 33.59, lon: 130.401672 },
  himeji: { label: "Himeji", lat: 34.815277, lon: 134.685562 },
  yokohama: { label: "Yokohama", lat: 35.450336, lon: 139.634216 },
  osaka: { label: "Osaka", lat: 34.69389, lon: 135.502228 },
  kyoto: { label: "Kyoto", lat: 35.011575, lon: 135.768144 },
  kobe: { label: "Kobe", lat: 34.693238, lon: 135.194376 },
  naha: { label: "Naha", lat: 26.212235, lon: 127.679145 },
  kanazawa: { label: "Kanazawa", lat: 36.561627, lon: 136.656882 },
};

export function englishCity(query: string): { label: string; lat: number; lon: number } | null {
  const key = query.trim().toLowerCase().replace(/[\s-]+/g, "");
  return ENGLISH_CITIES[key] ?? null;
}

export function isLatinPlaceQuery(query: string): boolean {
  return /^[a-z0-9 .,'-]+$/i.test(query.trim());
}

/** 100 when the title is that city or prefecture, lower for a same-named town inside another city. */
export function municipalityScore(title: string, query: string): number {
  const q = query.trim();
  if (!q) return 0;
  if (
    title === `${q}都` ||
    title === `${q}道` ||
    title === `${q}府` ||
    title === `${q}県`
  ) {
    return 100;
  }
  const rest = title.replace(PREFECTURE, "");
  if (rest === `${q}市`) return 100;
  if (rest === `${q}区`) return 90;
  if (rest === `${q}町` || rest === `${q}村`) return 70;
  if (rest === q) return 40;
  return 0;
}

export function bestJapanesePlaces(
  query: string,
  places: Array<{ title: string; lat: number; lon: number }>,
): RankedPlace[] {
  const seen = new Set<string>();
  const ranked: RankedPlace[] = [];
  for (const place of places) {
    if (seen.has(place.title)) continue;
    seen.add(place.title);
    ranked.push({
      label: place.title,
      lat: place.lat,
      lon: place.lon,
      score: municipalityScore(place.title, query),
    });
  }
  for (const minimum of [80, 70]) {
    const group = ranked.filter((place) => place.score >= minimum);
    if (group.length === 0) continue;
    const top = Math.max(...group.map((place) => place.score));
    return group.filter((place) => place.score === top).slice(0, 5);
  }
  return ranked.filter((place) => place.label.includes(query.trim())).slice(0, 5);
}

const CITY_KINDS = new Set(["city", "town", "municipality", "borough"]);

/** Prefer the city when a prefecture of the same name is listed first. */
export function chooseEnglishPlace(hits: EnglishPlace[]): EnglishPlace | null {
  return hits.find((hit) => CITY_KINDS.has(hit.kind)) ?? hits[0] ?? null;
}

export function zoomForPlaceKind(kind: string): number {
  if (CITY_KINDS.has(kind)) return 12;
  if (kind === "state" || kind === "province" || kind === "administrative") return 8;
  return 15;
}
