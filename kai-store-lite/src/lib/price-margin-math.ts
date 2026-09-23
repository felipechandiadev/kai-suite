/** Margen sobre venta: precio = costo ÷ (1 − margen). Misma lógica que Suite. */

export function roundMoneyInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function percentToComplementFactor(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 1;
  if (percent >= 100) return 0;
  return 1 - percent / 100;
}

export function netFromCostAndMargin(cost: number, marginPercent: number): number {
  const c = Number.isFinite(cost) && cost >= 0 ? cost : 0;
  const denom = percentToComplementFactor(marginPercent);
  if (denom <= 0) return 0;
  return roundMoneyInt(c / denom);
}

/** IVA Chile 19% (factor bruto = 1.19). */
export const LITE_IVA_RATE = 0.19;
export const LITE_IVA_GROSS_FACTOR = 1 + LITE_IVA_RATE;

/** Neto → bruto con IVA (CLP enteros). */
export function netToGrossWithIva(net: number, rate = LITE_IVA_RATE): number {
  const n = Number.isFinite(net) && net >= 0 ? net : 0;
  return roundMoneyInt(n * (1 + rate));
}

export function netAfterDiscount(net: number, discountPercent: number): number {
  const n = Number.isFinite(net) && net >= 0 ? net : 0;
  const f = percentToComplementFactor(discountPercent);
  if (f <= 0) return 0;
  return roundMoneyInt(n * f);
}

export function effectiveMarginPercent(cost: number, net: number): number | null {
  const c = Number.isFinite(cost) ? cost : 0;
  const n = Number.isFinite(net) ? net : 0;
  if (n <= 0) return null;
  return ((n - c) / n) * 100;
}

export type MarginDiscountPreview = {
  netAfterMaxDiscount: number;
  effectiveMarginPercent: number | null;
  isBelowCost: boolean;
  isMarginEroded: boolean;
};

export function evaluateMaxDiscountImpact(
  cost: number,
  listNet: number,
  expectedMarginPercent: number,
  maxDiscountPercent: number,
): MarginDiscountPreview {
  const netAfter = netAfterDiscount(listNet, maxDiscountPercent);
  const effective = effectiveMarginPercent(cost, netAfter);
  const isBelowCost = netAfter < cost - 1e-9;
  const expected = Number.isFinite(expectedMarginPercent) ? expectedMarginPercent : 0;
  const isMarginEroded =
    effective == null || isBelowCost || effective + 1e-6 < expected;
  return {
    netAfterMaxDiscount: netAfter,
    effectiveMarginPercent: effective,
    isBelowCost,
    isMarginEroded,
  };
}
