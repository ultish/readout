import {
  SAMPLE_ZOOMS,
  depthFromRgba,
  depthMissing,
  flagFromAlpha,
  tilePixel,
  tileUrl,
  type DepthReading,
  type FlagReading,
} from "@readout/core";
import { pngPixel } from "./png.js";

const UA = "readout/0.1 (personal hazard map)";

async function fetchTile(
  template: string,
  lat: number,
  lon: number,
): Promise<{ r: number; g: number; b: number; a: number; z: number } | null> {
  for (const z of SAMPLE_ZOOMS) {
    const tile = tilePixel(lat, lon, z);
    const url = tileUrl(template, tile);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 404) continue;
    if (!res.ok) {
      throw new Error(`${res.status} ${url}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const px = pngPixel(buf, tile.px, tile.py);
    return { ...px, z };
  }
  return null;
}

export async function sampleDepth(
  template: string,
  lat: number,
  lon: number,
): Promise<DepthReading & { zoom: number | null }> {
  try {
    const hit = await fetchTile(template, lat, lon);
    if (!hit) {
      return { ...depthMissing("No tile from zoom 16 down to 8."), zoom: null };
    }
    const reading = depthFromRgba(hit.r, hit.g, hit.b, hit.a);
    if (hit.z < 15) {
      reading.caveats = [
        ...reading.caveats,
        `Finest published tile here is zoom ${hit.z}.`,
      ];
    }
    return { ...reading, zoom: hit.z };
  } catch (err) {
    return {
      status: "error",
      inZone: null,
      depthClass: null,
      label: "Tile could not be read",
      caveats: [err instanceof Error ? err.message : "Tile request failed"],
      zoom: null,
    };
  }
}

export async function sampleFlag(
  template: string,
  lat: number,
  lon: number,
): Promise<FlagReading> {
  try {
    const hit = await fetchTile(template, lat, lon);
    if (!hit) return flagFromAlpha(null);
    const reading = flagFromAlpha(hit.a);
    if (hit.z < 14) {
      reading.caveats = [`Finest published tile here is zoom ${hit.z}.`];
    }
    return reading;
  } catch (err) {
    return {
      status: "error",
      inZone: null,
      label: err instanceof Error ? err.message : "Tile request failed",
      caveats: [],
    };
  }
}
