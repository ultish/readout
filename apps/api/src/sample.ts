import {
  NEARBY_ZONE_METERS,
  depthFromRgba,
  depthMissing,
  flagFromAlpha,
  flagFromRgba,
  metersPerPixel,
  nearestZoneClass,
  sampleZooms,
  tilePixel,
  tileUrl,
  type DepthReading,
  type FlagReading,
  type LandslideLayer,
  type TilePixel,
} from "@readout/core";
import { pngImage, type PngImage, type Rgba } from "./png.js";

const UA = "readout/0.1 (personal hazard map)";

function rgbaAt(image: PngImage, x: number, y: number): Rgba {
  const o = (y * image.width + x) * 4;
  return {
    r: image.rgba[o] ?? 0,
    g: image.rgba[o + 1] ?? 0,
    b: image.rgba[o + 2] ?? 0,
    a: image.rgba[o + 3] ?? 0,
  };
}

async function loadPng(template: string, tile: TilePixel): Promise<PngImage | null> {
  const url = tileUrl(template, tile);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return pngImage(new Uint8Array(await res.arrayBuffer()));
}

async function fetchTile(template: string, lat: number, lon: number, tileZoom: number) {
  for (const z of sampleZooms(tileZoom)) {
    const tile = tilePixel(lat, lon, z);
    const image = await loadPng(template, tile);
    if (image) return { image, tile };
  }
  return null;
}

export async function sampleDepth(
  template: string,
  lat: number,
  lon: number,
  tileZoom: number,
): Promise<DepthReading & { zoom: number | null }> {
  const requested = sampleZooms(tileZoom)[0] ?? tileZoom;
  try {
    const hit = await fetchTile(template, lat, lon, tileZoom);
    if (!hit) {
      return { ...depthMissing(`No tile from zoom ${requested} down to 8.`), zoom: null };
    }
    const px = rgbaAt(hit.image, hit.tile.px, hit.tile.py);
    const reading = depthFromRgba(px.r, px.g, px.b, px.a);
    if (hit.tile.z < requested) {
      reading.caveats = [
        ...reading.caveats,
        `Finest published tile here is zoom ${hit.tile.z}.`,
      ];
    }
    return { ...reading, zoom: hit.tile.z };
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
  layer: LandslideLayer,
  tileZoom: number,
): Promise<FlagReading> {
  const requested = sampleZooms(tileZoom)[0] ?? tileZoom;
  try {
    const hit = await fetchTile(template, lat, lon, tileZoom);
    if (!hit) return flagFromAlpha(null);
    const px = rgbaAt(hit.image, hit.tile.px, hit.tile.py);
    const reading = flagFromRgba(px.r, px.g, px.b, px.a, layer);
    if (hit.tile.z < requested) {
      reading.caveats = [`Finest published tile here is zoom ${hit.tile.z}.`];
    }
    if (!reading.inZone) {
      const nearby = await nearbyZone(template, hit.image, hit.tile, lat, layer);
      if (nearby) {
        reading.nearbyClass = nearby.zoneClass;
        reading.nearbyMeters = nearby.meters;
      }
    }
    return reading;
  } catch (err) {
    return {
      status: "error",
      inZone: null,
      zoneClass: null,
      label: err instanceof Error ? err.message : "Tile request failed",
      caveats: [],
      nearbyClass: null,
      nearbyMeters: null,
    };
  }
}

async function nearbyZone(
  template: string,
  image: PngImage,
  tile: TilePixel,
  lat: number,
  layer: LandslideLayer,
): Promise<{ zoneClass: FlagReading["nearbyClass"]; meters: number } | null> {
  const metresPerPx = metersPerPixel(lat, tile.z);
  const radiusPx = NEARBY_ZONE_METERS / metresPerPx;
  const reach = Math.ceil(radiusPx);
  const originX = tile.x * 256 + tile.px;
  const originY = tile.y * 256 + tile.py;
  const images = new Map<string, PngImage | null>([[`${tile.x}/${tile.y}`, image]]);
  const loads: Promise<void>[] = [];
  for (let ty = Math.floor((originY - reach) / 256); ty <= Math.floor((originY + reach) / 256); ty += 1) {
    for (let tx = Math.floor((originX - reach) / 256); tx <= Math.floor((originX + reach) / 256); tx += 1) {
      if (tx === tile.x && ty === tile.y) continue;
      loads.push(
        loadPng(template, { z: tile.z, x: tx, y: ty, px: 0, py: 0 }).then((neighbor) => {
          images.set(`${tx}/${ty}`, neighbor);
        }),
      );
    }
  }
  await Promise.all(loads);
  const found = nearestZoneClass(
    (dx, dy) => {
      const worldX = originX + dx;
      const worldY = originY + dy;
      const tx = Math.floor(worldX / 256);
      const ty = Math.floor(worldY / 256);
      const sheet = images.get(`${tx}/${ty}`);
      if (!sheet) return null;
      const x = worldX - tx * 256;
      const y = worldY - ty * 256;
      if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) return null;
      return rgbaAt(sheet, x, y);
    },
    radiusPx,
    layer,
  );
  if (!found?.zoneClass) return null;
  return {
    zoneClass: found.zoneClass,
    meters: Math.max(1, Math.round(Math.hypot(found.dx, found.dy) * metresPerPx)),
  };
}
