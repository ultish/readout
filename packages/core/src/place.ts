/** "33.59, 130.42" when the first number is a Japan latitude. */
export function parseLatLon(
  text: string,
): { lat: number; lon: number } | null {
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  const latFirst = a >= 20 && a <= 50 && b >= 120 && b <= 155;
  const lonFirst = b >= 20 && b <= 50 && a >= 120 && a <= 155;
  if (latFirst) return { lat: a, lon: b };
  if (lonFirst) return { lat: b, lon: a };
  return null;
}
