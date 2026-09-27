import type { GeocodeHit, Readout, SavedPlace } from "./types";

export async function searchAddress(q: string): Promise<GeocodeHit[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
  const body = (await res.json()) as { results?: GeocodeHit[]; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Search failed");
  return body.results ?? [];
}

export async function fetchReadout(lat: number, lon: number): Promise<Readout> {
  const res = await fetch(`/api/readout?lat=${lat}&lon=${lon}`);
  const body = (await res.json()) as Readout & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Readout failed");
  return body;
}

export async function fetchPlaces(): Promise<SavedPlace[]> {
  const res = await fetch("/api/places");
  const body = (await res.json()) as { places: SavedPlace[] };
  return body.places;
}

export async function savePlace(input: {
  label: string;
  address: string | null;
  lat: number;
  lon: number;
  yearBuilt: number | null;
  quakeLabel: string;
  floodLabel: string;
  tsunamiLabel: string;
  landslideLabel: string;
  report: Readout;
}): Promise<void> {
  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Could not save");
}

export async function deletePlace(id: string): Promise<void> {
  const res = await fetch(`/api/places/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not delete");
}
