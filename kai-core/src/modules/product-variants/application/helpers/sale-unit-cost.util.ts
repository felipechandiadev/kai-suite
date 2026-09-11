/**
 * Costo congelado al vender: PMP vigente (costo directo) antes que baseCost estático.
 */
export function resolveFrozenSaleUnitCost(variant: {
  pmp?: number | null;
  baseCost?: number | null;
}): number {
  const pmp = Number(variant.pmp);
  if (Number.isFinite(pmp) && pmp > 0) {
    return Number(pmp.toFixed(2));
  }
  const base = Number(variant.baseCost);
  if (Number.isFinite(base) && base > 0) {
    return Number(base.toFixed(2));
  }
  return 0;
}

export function resolveSaleLineUnitCost(
  lineUnitCost: number | null | undefined,
  variant: { pmp?: number | null; baseCost?: number | null },
): number {
  const explicit = Number(lineUnitCost);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Number(explicit.toFixed(2));
  }
  return resolveFrozenSaleUnitCost(variant);
}
