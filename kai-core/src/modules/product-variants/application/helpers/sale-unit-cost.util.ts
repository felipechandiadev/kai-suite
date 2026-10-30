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

/**
 * Convierte un costo por unidad de stock base (PMP / costo base) al costo por la unidad
 * de la línea (p. ej. por kg si el stock va en g), que es el que guarda `unitCost`:
 * `unitCost × quantity` = costo de la línea (invariante de `inventory-cost-from-line.ts`).
 */
export function costPerLineUnit(
  costPerBaseUnit: number,
  quantity: number | null | undefined,
  quantityInBase: number | null | undefined,
): number {
  const cost = Number(costPerBaseUnit);
  const q = Number(quantity);
  const qb = Number(quantityInBase);
  if (!(cost > 0) || !(q > 0) || !(qb > 0)) return cost > 0 ? cost : 0;
  return Number(((cost * qb) / q).toFixed(2));
}
