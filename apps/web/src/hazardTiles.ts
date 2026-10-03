import { tileAncestor } from "@readout/core";
import { addProtocol } from "maplibre-gl";

const MIN_ZOOM = 8;

/** 1×1 transparent PNG. An empty tile, not a load error. */
const TRANSPARENT_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);

const tiles = new Map<string, Promise<ArrayBuffer | null>>();

export function gsiTileUrl(httpsUrl: string): string {
  if (!httpsUrl.startsWith("https://")) {
    throw new Error(`Expected an https tile template, got ${httpsUrl}`);
  }
  return `gsi://${httpsUrl.slice("https://".length)}`;
}

function httpsTile(gsiUrl: string): string {
  const clean = gsiUrl.split("?")[0] ?? gsiUrl;
  return `https://${clean.slice("gsi://".length)}`;
}

function parseXyz(url: string): { prefix: string; z: number; x: number; y: number } | null {
  const match = url.match(/^(.*\/)(\d+)\/(\d+)\/(\d+)\.png$/);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) return null;
  return {
    prefix: match[1],
    z: Number(match[2]),
    x: Number(match[3]),
    y: Number(match[4]),
  };
}

function load(url: string): Promise<ArrayBuffer | null> {
  const cached = tiles.get(url);
  if (cached) return cached;
  const pending = fetch(url).then(async (res) => {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.arrayBuffer();
  });
  tiles.set(url, pending);
  // A network error must not stick, or the map never retries that tile.
  void pending.catch(() => {
    tiles.delete(url);
  });
  return pending;
}

function aborted(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new DOMException("Aborted", "AbortError");
}

async function cropped(
  bytes: ArrayBuffer,
  z: number,
  x: number,
  y: number,
  ancestorZ: number,
): Promise<ImageBitmap> {
  const parent = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
  const part = tileAncestor(z, x, y, ancestorZ);
  const canvas = new OffscreenCanvas(256, 256);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw a landslide tile");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    parent,
    part.localX * part.span,
    part.localY * part.span,
    part.span,
    part.span,
    0,
    0,
    256,
    256,
  );
  parent.close();
  return canvas.transferToImageBitmap();
}

export function registerHazardTiles(): void {
  addProtocol("gsi", async (params, abort) => {
    const https = httpsTile(params.url);
    const tile = parseXyz(https);
    if (!tile) {
      const res = await fetch(https, { signal: abort.signal });
      if (!res.ok) throw new Error(`${res.status} ${https}`);
      return { data: await res.arrayBuffer() };
    }
    const direct = await load(`${tile.prefix}${tile.z}/${tile.x}/${tile.y}.png`);
    if (abort.signal.aborted) throw aborted(abort.signal);
    if (direct) return { data: direct };

    // A parent more than 8 levels up is smaller than one pixel of this tile.
    const floor = Math.max(MIN_ZOOM, tile.z - 8);
    for (let ancestorZ = tile.z - 1; ancestorZ >= floor; ancestorZ -= 1) {
      const ancestor = tileAncestor(tile.z, tile.x, tile.y, ancestorZ);
      const bytes = await load(`${tile.prefix}${ancestor.z}/${ancestor.x}/${ancestor.y}.png`);
      if (abort.signal.aborted) throw aborted(abort.signal);
      if (!bytes) continue;
      const bitmap = await cropped(bytes, tile.z, tile.x, tile.y, ancestorZ);
      if (abort.signal.aborted) {
        bitmap.close();
        throw aborted(abort.signal);
      }
      return { data: bitmap };
    }
    return { data: TRANSPARENT_PNG.slice().buffer };
  });
}
