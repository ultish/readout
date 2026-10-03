import { describe, expect, it } from "vitest";
import { eraFromYear } from "./era.js";
import {
  bestJapanesePlaces,
  chooseEnglishPlace,
  englishCity,
  municipalityScore,
} from "./geocode.js";
import { depthFromRgba, flagFromAlpha, flagFromRgba, nearestZoneClass } from "./flood.js";
import { parseLatLon } from "./place.js";
import { formatQuakeProbability } from "./quake.js";
import { soilEnglish } from "./soil.js";
import { metersPerPixel, rasterTileZoom, sampleZooms, tileAncestor, tilePixel, tileUrl } from "./tiles.js";
import { FLOOD_L2 } from "./sources.js";

describe("tilePixel", () => {
  it("lands on the Nakasu flood pixel checked against the live tile", () => {
    const tile = tilePixel(33.5935, 130.4065, 15);
    expect(tile).toEqual({ z: 15, x: 28253, y: 13134, px: 227, py: 78 });
    expect(tileUrl(FLOOD_L2, tile)).toBe(
      "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/15/28253/13134.png",
    );
  });
});

describe("depthFromRgba", () => {
  it("reads the exact 0.5–3 m legend colour", () => {
    const reading = depthFromRgba(255, 216, 192, 255);
    expect(reading.inZone).toBe(true);
    expect(reading.depthClass).toBe("0.5_3m");
    expect(reading.label).toBe("0.5–3 m");
  });

  it("treats a transparent pixel as not coloured", () => {
    const reading = depthFromRgba(255, 216, 192, 0);
    expect(reading.inZone).toBe(false);
    expect(reading.depthClass).toBeNull();
  });

  it("does not invent a depth for an unknown colour", () => {
    const reading = depthFromRgba(0, 0, 255, 255);
    expect(reading.inZone).toBe(true);
    expect(reading.depthClass).toBeNull();
  });
});

describe("tileAncestor", () => {
  it("names the quadrant a fine tile occupies in its parent", () => {
    expect(tileAncestor(16, 5, 7, 14)).toEqual({
      z: 14,
      x: 1,
      y: 1,
      span: 64,
      localX: 1,
      localY: 3,
    });
  });
});

describe("rasterTileZoom", () => {
  it("follows the 256px raster MapLibre draws for the camera zoom", () => {
    expect(rasterTileZoom(14)).toBe(15);
    expect(rasterTileZoom(14.4)).toBe(15);
    expect(rasterTileZoom(14.6)).toBe(16);
    expect(rasterTileZoom(16)).toBe(17);
    expect(rasterTileZoom(20)).toBe(17);
    expect(rasterTileZoom(0)).toBe(8);
  });
});

describe("sampleZooms", () => {
  it("starts at the tile on screen and walks coarser only", () => {
    expect(sampleZooms(15)).toEqual([15, 14, 13, 12, 11, 10, 9, 8]);
    expect(sampleZooms(17)).toEqual([17, 16, 15, 14, 13, 12, 11, 10, 9, 8]);
  });
});

describe("metersPerPixel", () => {
  it("matches the mercator scale at the Yokohama steep-slope tile", () => {
    expect(metersPerPixel(35.33928, 15)).toBeCloseTo(3.897, 2);
  });
});

describe("nearestZoneClass", () => {
  it("picks the closest legend fill and skips the blue border", () => {
    const pixels = new Map<string, { r: number; g: number; b: number; a: number }>([
      ["1,0", { r: 0, g: 0, b: 132, a: 255 }],
      ["3,4", { r: 250, g: 40, b: 0, a: 255 }],
      ["10,0", { r: 250, g: 230, b: 0, a: 255 }],
    ]);
    const found = nearestZoneClass(
      (dx, dy) => pixels.get(`${dx},${dy}`) ?? null,
      12,
      "steep",
    );
    expect(found).toEqual({ zoneClass: "special", dx: 3, dy: 4 });
  });

  it("ignores a fill past the radius", () => {
    const found = nearestZoneClass(
      (dx, dy) => (dx === 8 && dy === 0 ? { r: 250, g: 40, b: 0, a: 255 } : null),
      5,
      "steep",
    );
    expect(found).toBeNull();
  });
});

describe("flagFromAlpha", () => {
  it("says no tile when the zoom stack never returned one", () => {
    expect(flagFromAlpha(null).status).toBe("no_data");
    expect(flagFromAlpha(null).zoneClass).toBeNull();
  });

  it("marks an opaque caution-zone pixel as inside", () => {
    expect(flagFromAlpha(255).inZone).toBe(true);
  });
});

describe("flagFromRgba", () => {
  it("reads the Atami debris yellow as caution and the steep red as special caution", () => {
    expect(flagFromRgba(230, 200, 50, 255, "debris")).toMatchObject({
      inZone: true,
      zoneClass: "caution",
      label: "Caution",
    });
    expect(flagFromRgba(250, 40, 0, 255, "steep")).toMatchObject({
      inZone: true,
      zoneClass: "special",
      label: "Special caution",
    });
  });

  it("reads a blended Tokyo steep edge as special caution", () => {
    expect(flagFromRgba(251, 61, 0, 255, "steep").zoneClass).toBe("special");
  });

  it("keeps designated and planned fills distinct", () => {
    expect(flagFromRgba(165, 0, 33, 255, "debris").zoneClass).toBe("special");
    expect(flagFromRgba(183, 51, 77, 255, "debris").zoneClass).toBe("planned_special");
    expect(flagFromRgba(255, 153, 0, 255, "slide").zoneClass).toBe("caution");
    expect(flagFromRgba(255, 173, 51, 255, "slide").zoneClass).toBe("planned_caution");
  });

  it("does not invent a class for a blend that sits between swatches", () => {
    const reading = flagFromRgba(250, 166, 0, 255, "steep");
    expect(reading.inZone).toBe(true);
    expect(reading.zoneClass).toBeNull();
  });

  it("does not treat the blue legend border as a class", () => {
    const reading = flagFromRgba(0, 0, 132, 255, "steep");
    expect(reading.inZone).toBe(true);
    expect(reading.zoneClass).toBeNull();
  });

  it("keeps a clear pixel out of the zone", () => {
    expect(flagFromRgba(230, 200, 50, 0, "debris").inZone).toBe(false);
    expect(flagFromRgba(230, 200, 50, 0, "debris").zoneClass).toBeNull();
  });
});

describe("formatQuakeProbability", () => {
  it("prints the Hakata mesh as 9.5%", () => {
    expect(formatQuakeProbability(0.095286)).toBe("9.5%");
  });
});

describe("eraFromYear", () => {
  it("splits the codes on the years we can know", () => {
    expect(eraFromYear(1980).era).toBe("pre_1981");
    expect(eraFromYear(1990).era).toBe("shin_taishin_1981_2000");
    expect(eraFromYear(2005).era).toBe("post_2000");
  });

  it("keeps the June cutoff visible on a boundary year", () => {
    expect(eraFromYear(1981).caveats[0]).toMatch(/June 1981/);
  });

  it("explains what each code was for", () => {
    expect(eraFromYear(1978).description).toMatch(/moderate earthquake/);
    expect(eraFromYear(1990).description).toMatch(/should not collapse/);
    expect(eraFromYear(2005).description).toMatch(/Wooden houses/);
  });
});

describe("soilEnglish", () => {
  it("translates the Hakata class and leaves unknown names alone", () => {
    expect(soilEnglish("三角州・海岸低地")).toBe("Delta or coastal lowland");
    expect(soilEnglish("見知らぬ地形")).toBeNull();
  });
});

describe("city search", () => {
  it("knows Sapporo by its English name", () => {
    const city = englishCity(" Sapporo ");
    expect(city?.label).toBe("Sapporo");
    expect(city?.lat).toBeCloseTo(43.06, 1);
    expect(city?.lon).toBeCloseTo(141.35, 1);
  });

  it("ranks the real city above a same-named town", () => {
    expect(municipalityScore("神奈川県横浜市", "横浜")).toBe(100);
    expect(municipalityScore("青森県横浜", "横浜")).toBeLessThan(80);
    expect(municipalityScore("福岡県福岡市", "福岡")).toBe(100);
    expect(municipalityScore("岩手県二戸市福岡", "福岡")).toBe(0);
    expect(municipalityScore("東京都", "東京")).toBe(100);
    expect(municipalityScore("東京", "東京")).toBeLessThan(80);
    expect(municipalityScore("北海道札幌市", "札幌")).toBe(100);
  });

  it("returns only the winning city", () => {
    const places = bestJapanesePlaces("横浜", [
      { title: "青森県横浜", lat: 41.08, lon: 141.25 },
      { title: "神奈川県横浜市", lat: 35.45, lon: 139.63 },
    ]);
    expect(places.map((place) => place.label)).toEqual(["神奈川県横浜市"]);
    const fukuoka = bestJapanesePlaces("福岡", [
      { title: "福岡町", lat: 36.45, lon: 136.47 },
      { title: "福岡県福岡市", lat: 33.59, lon: 130.4 },
    ]);
    expect(fukuoka.map((place) => place.label)).toEqual(["福岡県福岡市"]);
  });

  it("picks the city when the prefecture is listed first", () => {
    const chosen = chooseEnglishPlace([
      { label: "Fukuoka Prefecture", lat: 33.6, lon: 130.6, kind: "province" },
      { label: "Fukuoka", lat: 33.59, lon: 130.4, kind: "city" },
    ]);
    expect(chosen?.label).toBe("Fukuoka");
  });
});

describe("parseLatLon", () => {
  it("accepts latitude first or longitude first inside Japan", () => {
    expect(parseLatLon("33.59, 130.42")).toEqual({ lat: 33.59, lon: 130.42 });
    expect(parseLatLon("130.42 33.59")).toEqual({ lat: 33.59, lon: 130.42 });
    expect(parseLatLon("福岡")).toBeNull();
  });
});
