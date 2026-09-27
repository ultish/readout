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

export function tileUrl(template: string, tile: TilePixel): string {
  return template
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}
