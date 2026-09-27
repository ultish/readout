import { describe, expect, it } from "vitest";
import { eraFromYear } from "./era.js";
import {
  bestJapanesePlaces,
  chooseEnglishPlace,
  englishCity,
  municipalityScore,
} from "./geocode.js";
import { depthFromRgba, flagFromAlpha } from "./flood.js";
import { parseLatLon } from "./place.js";
import { formatQuakeProbability } from "./quake.js";
import { soilEnglish } from "./soil.js";
import { tilePixel, tileUrl } from "./tiles.js";
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

describe("flagFromAlpha", () => {
  it("says no tile when the zoom stack never returned one", () => {
    expect(flagFromAlpha(null).status).toBe("no_data");
  });

  it("marks an opaque caution-zone pixel as inside", () => {
    expect(flagFromAlpha(255).inZone).toBe(true);
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
