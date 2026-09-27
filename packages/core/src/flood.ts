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

export interface FlagReading {
  status: SampleStatus;
  inZone: boolean | null;
  label: string;
  caveats: string[];
}

export function flagFromAlpha(a: number | null): FlagReading {
  if (a == null) {
    return {
      status: "no_data",
      inZone: null,
      label: "No tile published here",
      caveats: [],
    };
  }
  if (a < 16) {
    return {
      status: "ok",
      inZone: false,
      label: "Not coloured on this tile",
      caveats: [],
    };
  }
  return {
    status: "ok",
    inZone: true,
    label: "In the published caution zone",
    caveats: [],
  };
}
