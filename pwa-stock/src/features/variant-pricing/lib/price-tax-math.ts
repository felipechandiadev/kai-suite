import type { TaxListItem } from "../types/tax.types";

export function roundMoneyInt(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(n);
}

export function effectiveIvaFactor(
  catalogTaxes: readonly TaxListItem[],
  selectedTaxIds: readonly string[],
): number {
  const idSet = new Set(selectedTaxIds);
  let sumRates = 0;
  for (const t of catalogTaxes) {
    if (!t.isActive || !idSet.has(t.id) || t.taxType !== "IVA") {
      continue;
    }
    const r = Number(t.rate);
    if (Number.isFinite(r) && r > 0) {
      sumRates += r;
    }
  }
  return 1 + sumRates / 100;
}

export function netToGross(net: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(net * f);
}

export function grossToNet(gross: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(gross / f);
}

export function percentToComplementFactor(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) {
    return 1;
  }
  if (percent >= 100) {
    return 0;
  }
  return 1 - percent / 100;
}

/** Neto = costo / (1 − margen). El descuento máximo no infla el precio. */
export function netFromCostAndMargin(cost: number, marginPercent: number): number {
  const c = Number.isFinite(cost) && cost >= 0 ? cost : 0;
  const denom = percentToComplementFactor(marginPercent);
  if (denom <= 0) {
    return 0;
  }
  return roundMoneyInt(c / denom);
}

export function netFromPmpAndUtilityPercent(
  pmp: number,
  marginPercent: number,
  _discountPercent = 0,
): number {
  return netFromCostAndMargin(pmp, marginPercent);
}

export function netAfterDiscount(net: number, discountPercent: number): number {
  const n = Number.isFinite(net) && net >= 0 ? net : 0;
  const f = percentToComplementFactor(discountPercent);
  if (f <= 0) {
    return 0;
  }
  return roundMoneyInt(n * f);
}

export function effectiveMarginPercent(cost: number, net: number): number | null {
  const c = Number.isFinite(cost) ? cost : 0;
  const n = Number.isFinite(net) ? net : 0;
  if (n <= 0) {
    return null;
  }
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

export function minPriceFromMaxDiscount(
  listNet: number,
  maxDiscountPercent: number,
): number {
  return netAfterDiscount(listNet, maxDiscountPercent);
}

export function deriveBasePriceFromPriceRows(
  rows: readonly { priceListId: string | null; net: number }[],
): number | null {
  for (const r of rows) {
    if (r.priceListId && Number.isFinite(r.net) && r.net >= 0) {
      return roundMoneyInt(r.net);
    }
  }
  return null;
}
