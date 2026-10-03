export type DepthClass =
  | "under_0.5m"
  | "0.5_3m"
  | "3_5m"
  | "5_10m"
  | "10_20m"
  | "over_20m";

export interface DepthSwatch {
  r: number;
  g: number;
  b: number;
  depthClass: DepthClass;
  label: string;
}

/** Official assumed-maximum inundation colours. Distance 0 on the 2026-09-27 tiles. */
export const DEPTH_SWATCHES: DepthSwatch[] = [
  { r: 247, g: 245, b: 169, depthClass: "under_0.5m", label: "under 0.5 m" },
  { r: 255, g: 216, b: 192, depthClass: "0.5_3m", label: "0.5–3 m" },
  { r: 255, g: 183, b: 183, depthClass: "3_5m", label: "3–5 m" },
  { r: 255, g: 145, b: 145, depthClass: "5_10m", label: "5–10 m" },
  { r: 242, g: 133, b: 201, depthClass: "10_20m", label: "10–20 m" },
  { r: 220, g: 122, b: 220, depthClass: "over_20m", label: "over 20 m" },
];

const MATCH_DISTANCE = 30 * 30 * 3;

export type SampleStatus = "ok" | "no_data" | "error";

export interface DepthReading {
  status: SampleStatus;
  inZone: boolean | null;
  depthClass: DepthClass | null;
  label: string;
  caveats: string[];
}

export function depthFromRgba(
  r: number,
  g: number,
  b: number,
  a: number,
): DepthReading {
  if (a < 16) {
    return {
      status: "ok",
      inZone: false,
      depthClass: null,
      label: "Not coloured on this tile",
      caveats: [],
    };
  }
  let best = DEPTH_SWATCHES[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const swatch of DEPTH_SWATCHES) {
    const d = (r - swatch.r) ** 2 + (g - swatch.g) ** 2 + (b - swatch.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = swatch;
    }
  }
  if (!best || bestD > MATCH_DISTANCE) {
    return {
      status: "ok",
      inZone: true,
      depthClass: null,
      label: "In a coloured zone, depth not in the legend",
      caveats: [`Pixel ${r},${g},${b} is not a published depth colour.`],
    };
  }
  return {
    status: "ok",
    inZone: true,
    depthClass: best.depthClass,
    label: best.label,
    caveats: [],
  };
}

export function depthMissing(reason: string): DepthReading {
  return {
    status: "no_data",
    inZone: null,
    depthClass: null,
    label: "No tile published here",
    caveats: [reason],
  };
}

export type ZoneClass =
  | "special"
  | "caution"
  | "planned_special"
  | "planned_caution";

export type LandslideLayer = "debris" | "steep" | "slide";

/** A painted fill this close is the colour next to the pin, not a zone across town. */
export const NEARBY_ZONE_METERS = 50;

export interface FlagReading {
  status: SampleStatus;
  inZone: boolean | null;
  /** Legend class when the pixel matched a published swatch. Null when clear, missing, or an unknown colour. */
  zoneClass: ZoneClass | null;
  label: string;
  caveats: string[];
  /** Nearest legend fill when this pixel itself is clear, within NEARBY_ZONE_METERS. */
  nearbyClass: ZoneClass | null;
  nearbyMeters: number | null;
}

interface ZoneSwatch {
  r: number;
  g: number;
  b: number;
  zoneClass: ZoneClass;
}

/**
 * Official 土砂災害 fills, measured on the 2026 tiles.
 * Designated zones are the solid colour. 指定予定 is the same hue, lighter.
 * The blue dotted border is not a fill, so it is not a swatch.
 */
const ZONE_SWATCHES: Record<LandslideLayer, ZoneSwatch[]> = {
  debris: [
    { r: 165, g: 0, b: 33, zoneClass: "special" },
    { r: 230, g: 200, b: 50, zoneClass: "caution" },
    { r: 183, g: 51, b: 77, zoneClass: "planned_special" },
    { r: 235, g: 211, b: 91, zoneClass: "planned_caution" },
  ],
  steep: [
    { r: 250, g: 40, b: 0, zoneClass: "special" },
    { r: 250, g: 230, b: 0, zoneClass: "caution" },
    { r: 251, g: 83, b: 51, zoneClass: "planned_special" },
    { r: 251, g: 235, b: 51, zoneClass: "planned_caution" },
  ],
  slide: [
    { r: 180, g: 0, b: 40, zoneClass: "special" },
    { r: 255, g: 153, b: 0, zoneClass: "caution" },
    { r: 195, g: 51, b: 83, zoneClass: "planned_special" },
    { r: 255, g: 173, b: 51, zoneClass: "planned_caution" },
  ],
};

const ZONE_LABEL: Record<ZoneClass, string> = {
  special: "Special caution",
  caution: "Caution",
  planned_special: "Special caution, planned",
  planned_caution: "Caution, planned",
};

export function flagFromAlpha(a: number | null): FlagReading {
  if (a == null) {
    return {
      status: "no_data",
      inZone: null,
      zoneClass: null,
      label: "No tile published here",
      caveats: [],
      nearbyClass: null,
      nearbyMeters: null,
    };
  }
  if (a < 16) {
    return {
      status: "ok",
      inZone: false,
      zoneClass: null,
      label: "Not coloured on this tile",
      caveats: [],
      nearbyClass: null,
      nearbyMeters: null,
    };
  }
  return {
    status: "ok",
    inZone: true,
    zoneClass: null,
    label: "In the published caution zone",
    caveats: [],
    nearbyClass: null,
    nearbyMeters: null,
  };
}

export function flagFromRgba(
  r: number,
  g: number,
  b: number,
  a: number,
  layer: LandslideLayer,
): FlagReading {
  if (a < 16) return flagFromAlpha(a);
  let best = ZONE_SWATCHES[layer][0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const swatch of ZONE_SWATCHES[layer]) {
    const d = (r - swatch.r) ** 2 + (g - swatch.g) ** 2 + (b - swatch.b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = swatch;
    }
  }
  if (!best || bestD > MATCH_DISTANCE) {
    return {
      status: "ok",
      inZone: true,
      zoneClass: null,
      label: "In the published caution zone",
      caveats: [],
      nearbyClass: null,
      nearbyMeters: null,
    };
  }
  return {
    status: "ok",
    inZone: true,
    zoneClass: best.zoneClass,
    label: ZONE_LABEL[best.zoneClass],
    caveats: [],
    nearbyClass: null,
    nearbyMeters: null,
  };
}

/** Nearest legend fill around a clear pixel. `read(0, 0)` is the clicked pixel and is skipped. */
export function nearestZoneClass(
  read: (dx: number, dy: number) => { r: number; g: number; b: number; a: number } | null,
  radiusPx: number,
  layer: LandslideLayer,
): { zoneClass: ZoneClass; dx: number; dy: number } | null {
  const reach = Math.ceil(radiusPx);
  let best: { distance: number; zoneClass: ZoneClass; dx: number; dy: number } | null = null;
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const distance = dx * dx + dy * dy;
      if (distance > radiusPx * radiusPx) continue;
      if (best && distance >= best.distance) continue;
      const pixel = read(dx, dy);
      if (!pixel) continue;
      const zoneClass = flagFromRgba(pixel.r, pixel.g, pixel.b, pixel.a, layer).zoneClass;
      if (!zoneClass) continue;
      best = { distance, zoneClass, dx, dy };
    }
  }
  return best ? { zoneClass: best.zoneClass, dx: best.dx, dy: best.dy } : null;
}
