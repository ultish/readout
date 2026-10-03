import type { GeocodeHit, Readout, SavedPlace } from "./types";

export async function searchAddress(q: string): Promise<GeocodeHit[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
  const body = (await res.json()) as { results?: GeocodeHit[]; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Search failed");
  return body.results ?? [];
}

export async function fetchReadout(lat: number, lon: number, cameraZoom?: number): Promise<Readout> {
  const zoom = cameraZoom == null ? "" : `&zoom=${cameraZoom}`;
  const res = await fetch(`/api/readout?lat=${lat}&lon=${lon}${zoom}`);
  const body = (await res.json()) as Readout & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Readout failed");
  return body;
}

export async function fetchPlaces(): Promise<SavedPlace[]> {
  const res = await fetch("/api/places", { credentials: "include" });
  if (res.status === 401) return [];
  const body = (await res.json()) as { places: SavedPlace[] };
  return body.places;
}

export async function currentUser(): Promise<{ email: string } | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  const body = (await res.json()) as { user: { email: string } | null };
  return body.user;
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
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 401) throw new Error("sign-in");
  if (!res.ok) throw new Error("Could not save");
}

export async function deletePlace(id: string): Promise<void> {
  const res = await fetch(`/api/places/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Could not delete");
}

async function authPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
  return data;
}

export function registerOptions(email: string) {
  return authPost<Record<string, unknown>>("/api/auth/register/options", { email });
}

export function registerVerify(response: unknown) {
  return authPost<{ user: { email: string } }>("/api/auth/register/verify", response);
}

export function loginOptions() {
  return authPost<Record<string, unknown>>("/api/auth/login/options");
}

export function loginVerify(response: unknown) {
  return authPost<{ user: { email: string } }>("/api/auth/login/verify", response);
}

export function logout() {
  return authPost<{ ok: boolean }>("/api/auth/logout");
}
