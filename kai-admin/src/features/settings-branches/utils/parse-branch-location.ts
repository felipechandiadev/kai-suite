/**
 * Normaliza el JSON de `location` de una sucursal hacia { lat, lng }.
 */
export function parseBranchLocation(
  loc: unknown,
): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== "object") return null;
  const o = loc as Record<string, unknown>;
  const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
  const lng = typeof o.lng === "number" ? o.lng : Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
