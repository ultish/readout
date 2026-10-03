export interface TilePixel {
  z: number;
  x: number;
  y: number;
  px: number;
  py: number;
}

/** Web-mercator tile pixel. GSI rasters are 256px XYZ. */
export function tilePixel(lat: number, lon: number, z: number): TilePixel {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const fx = ((lon + 180) / 360) * n * 256;
  const fy =
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n * 256;
  return {
    z,
    x: Math.floor(fx / 256),
    y: Math.floor(fy / 256),
    px: Math.floor(fx) % 256,
    py: Math.floor(fy) % 256,
  };
}

export interface TileAncestor {
  z: number;
  x: number;
  y: number;
  /** Width of this child inside the ancestor tile, in ancestor pixels. */
  span: number;
  localX: number;
  localY: number;
}

/** Where a finer tile sits inside a coarser one. `ancestorZ` must be less than `z`. */
export function tileAncestor(
  z: number,
  x: number,
  y: number,
  ancestorZ: number,
): TileAncestor {
  const scale = 2 ** (z - ancestorZ);
  return {
    z: ancestorZ,
    x: Math.floor(x / scale),
    y: Math.floor(y / scale),
    span: 256 / scale,
    localX: x % scale,
    localY: y % scale,
  };
}

export function tileUrl(template: string, tile: TilePixel): string {
  return template
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

const TILE_ZOOM_MIN = 8;
const TILE_ZOOM_MAX = 17;

/**
 * MapLibre draws a 256px raster one level finer than the camera zoom,
 * because the map tile size is 512. Clamped to the published GSI range.
 */
export function rasterTileZoom(cameraZoom: number): number {
  return Math.min(TILE_ZOOM_MAX, Math.max(TILE_ZOOM_MIN, Math.round(cameraZoom + 1)));
}

/** Finest tile first. Coarser zooms are only for a 404 at the tile the map is drawing. */
export function sampleZooms(tileZoom: number): number[] {
  const start = Math.min(TILE_ZOOM_MAX, Math.max(TILE_ZOOM_MIN, Math.round(tileZoom)));
  const zooms: number[] = [];
  for (let z = start; z >= TILE_ZOOM_MIN; z -= 1) zooms.push(z);
  return zooms;
}

/** Ground metres covered by one 256px tile pixel at this latitude. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}
