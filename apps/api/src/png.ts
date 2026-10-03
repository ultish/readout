import { unzlibSync } from "fflate";

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function readU32(data: Uint8Array, pos: number): number {
  return (
    data[pos]! * 0x1000000 +
    data[pos + 1]! * 0x10000 +
    data[pos + 2]! * 0x100 +
    data[pos + 3]!
  );
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export interface PngImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** Full RGBA image. GSI hazard tiles are non-interlaced 8-bit PNG. */
export function pngImage(data: Uint8Array): PngImage {
  if (!PNG_SIG.every((byte, i) => data[i] === byte)) {
    throw new Error("Not a PNG");
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let color = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= data.length) {
    const length = readU32(data, pos);
    const ctype = String.fromCharCode(
      data[pos + 4]!,
      data[pos + 5]!,
      data[pos + 6]!,
      data[pos + 7]!,
    );
    const chunk = data.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (ctype === "IHDR") {
      width = readU32(chunk, 0);
      height = readU32(chunk, 4);
      color = chunk[9] ?? 0;
      if (chunk[10] !== 0) throw new Error("Interlaced PNG");
    } else if (ctype === "IDAT") {
      idat.push(chunk);
    } else if (ctype === "IEND") {
      break;
    }
  }
  const bpp = color === 6 ? 4 : color === 2 ? 3 : 0;
  if (!bpp) throw new Error(`PNG colour type ${color}`);
  const merged = new Uint8Array(idat.reduce((n, chunk) => n + chunk.length, 0));
  let offset = 0;
  for (const chunk of idat) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = unzlibSync(merged);
  const stride = width * bpp;
  const out = new Uint8Array(width * height * 4);
  let i = 0;
  let prev = new Uint8Array(stride);
  let row = new Uint8Array(stride);
  for (let yy = 0; yy < height; yy++) {
    const filter = raw[i] ?? 0;
    i += 1;
    row = raw.subarray(i, i + stride);
    i += stride;
    const next = new Uint8Array(stride);
    next.set(row);
    row = next;
    if (filter === 1) {
      for (let k = 0; k < row.length; k++) {
        const left = k >= bpp ? (row[k - bpp] ?? 0) : 0;
        row[k] = ((row[k] ?? 0) + left) & 255;
      }
    } else if (filter === 2) {
      for (let k = 0; k < row.length; k++) {
        row[k] = ((row[k] ?? 0) + (prev[k] ?? 0)) & 255;
      }
    } else if (filter === 3) {
      for (let k = 0; k < row.length; k++) {
        const left = k >= bpp ? (row[k - bpp] ?? 0) : 0;
        row[k] = ((row[k] ?? 0) + Math.floor((left + (prev[k] ?? 0)) / 2)) & 255;
      }
    } else if (filter === 4) {
      for (let k = 0; k < row.length; k++) {
        const a = k >= bpp ? (row[k - bpp] ?? 0) : 0;
        const b = prev[k] ?? 0;
        const c = k >= bpp ? (prev[k - bpp] ?? 0) : 0;
        row[k] = ((row[k] ?? 0) + paeth(a, b, c)) & 255;
      }
    } else if (filter !== 0) {
      throw new Error(`PNG filter ${filter}`);
    }
    prev = row;
    for (let x = 0; x < width; x++) {
      const source = x * bpp;
      const target = (yy * width + x) * 4;
      out[target] = row[source] ?? 0;
      out[target + 1] = row[source + 1] ?? 0;
      out[target + 2] = row[source + 2] ?? 0;
      out[target + 3] = bpp === 4 ? (row[source + 3] ?? 0) : 255;
    }
  }
  return { width, height, rgba: out };
}

/** RGBA at one pixel. GSI hazard tiles are non-interlaced 8-bit PNG. */
export function pngPixel(data: Uint8Array, x: number, y: number): Rgba {
  const image = pngImage(data);
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    throw new Error("Pixel outside tile");
  }
  const o = (y * image.width + x) * 4;
  return {
    r: image.rgba[o] ?? 0,
    g: image.rgba[o + 1] ?? 0,
    b: image.rgba[o + 2] ?? 0,
    a: image.rgba[o + 3] ?? 0,
  };
}
