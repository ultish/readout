import type { DepthReading, FlagReading } from "@readout/core";

export interface QuakeReading {
  status: "ok" | "no_data" | "error";
  probability: number | null;
  label: string;
  meshcode: string | null;
  version: string;
  title: string;
  caveats: string[];
}

export interface SoilReading {
  status: "ok" | "no_data";
  avs: string | null;
  arv: string | null;
  soilJa: string | null;
  soilEn: string | null;
  caveats: string[];
}

export interface Readout {
  lat: number;
  lon: number;
  placeName: string | null;
  quake: QuakeReading;
  flood: DepthReading & { scenario: string; caveat: string; zoom: number | null };
  tsunami: DepthReading & { zoom: number | null };
  landslide: {
    debrisFlow: FlagReading;
    steepSlope: FlagReading;
    landslide: FlagReading;
    inAny: boolean | null;
  };
  softGround: SoilReading;
  liquefaction: { nationalStatus: string; label: string; caveats: string[] };
  sources: Array<{ name: string; detail: string }>;
  disclaimer: string;
}

export interface GeocodeHit {
  label: string;
  lat: number;
  lon: number;
  zoom?: number;
}

export interface SavedPlace {
  id: string;
  label: string;
  address: string | null;
  lat: number;
  lon: number;
  year_built: number | null;
  quake_label: string | null;
  flood_label: string | null;
  tsunami_label: string | null;
  landslide_label: string | null;
  era: string | null;
  created_at: string;
}
