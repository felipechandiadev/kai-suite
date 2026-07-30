import type { MetalPriceRow } from "../types/metal-price.types";

/** Último precio CLP/gramo registrado para un metal. */
export function latestMetalPriceByMetal(
  rows: readonly MetalPriceRow[],
  metal: string,
): number | null {
  const matches = rows.filter((r) => r.metal === metal);
  if (matches.length === 0) {
    return null;
  }
  const sorted = [...matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const v = sorted[0]?.valueCLP;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}
