import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { isSaleTaxType } from "../lib/sale-taxes";
import {
  forcesNetEqualsGross,
  normalizeVariantTaxCategory,
  type VariantTaxCategory,
} from "../types/variant-fiscal.types";

/** Normaliza montos a entero (CLP / catálogo sin decimales). */
export function roundMoneyInt(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(n);
}

/**
 * Factor multiplicador neto → bruto: 1 + suma(tasas % / 100) para impuestos
 * de venta seleccionados (IVA, SPECIFIC, EXEMPT). Sin impuestos → 1.
 */
export function effectiveGrossFactor(
  catalogTaxes: readonly TaxListItem[],
  selectedTaxIds: readonly string[],
): number {
  const idSet = new Set(selectedTaxIds);
  let sumRates = 0;
  for (const t of catalogTaxes) {
    if (!t.isActive || !idSet.has(t.id) || !isSaleTaxType(t.taxType)) {
      continue;
    }
    const r = Number(t.rate);
    if (Number.isFinite(r) && r > 0) {
      sumRates += r;
    }
  }
  return 1 + sumRates / 100;
}

/** @deprecated Use effectiveGrossFactor — alias por compatibilidad. */
export function effectiveIvaFactor(
  catalogTaxes: readonly TaxListItem[],
  selectedTaxIds: readonly string[],
): number {
  return effectiveGrossFactor(catalogTaxes, selectedTaxIds);
}

/** Factor neto→bruto según tratamiento SII de la variante. */
export function resolvePricingGrossFactor(
  taxCategory: VariantTaxCategory | unknown,
  catalogTaxes: readonly TaxListItem[],
  selectedTaxIds: readonly string[],
): number {
  const category = normalizeVariantTaxCategory(taxCategory);
  if (forcesNetEqualsGross(category)) {
    return 1;
  }
  return effectiveGrossFactor(catalogTaxes, selectedTaxIds);
}

export function netToGross(net: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(net * f);
}

export function grossToNet(gross: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(gross / f);
}

/**
 * Interpreta entrada de usuario como entero no negativo (solo dígitos).
 * Vacío → null (campo incompleto).
 */
export function parseIntegerMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convierte un % (0–99.99) a factor (1 − p/100).
 * ≥ 100 → 0 (denominador inválido).
 */
export function percentToComplementFactor(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) {
    return 1;
  }
  if (percent >= 100) {
    return 0;
  }
  return 1 - percent / 100;
}

/**
 * Precio neto desde costo y margen de utilidad sobre la venta.
 * `neto = costo / (1 − margen)`. El descuento máximo NO infla el precio.
 */
export function netFromCostAndMargin(cost: number, marginPercent: number): number {
  const c = Number.isFinite(cost) && cost >= 0 ? cost : 0;
  const denom = percentToComplementFactor(marginPercent);
  if (denom <= 0) {
    return 0;
  }
  return roundMoneyInt(c / denom);
}

/** @deprecated Use netFromCostAndMargin — alias. */
export function netFromCostMarginAndDiscount(
  cost: number,
  marginPercent: number,
  _discountPercent = 0,
): number {
  return netFromCostAndMargin(cost, marginPercent);
}

/**
 * Precio neto desde PMP y margen de utilidad % sobre la venta.
 */
export function netFromPmpAndUtilityPercent(
  pmp: number,
  marginPercent: number,
  _discountPercent = 0,
): number {
  return netFromCostAndMargin(pmp, marginPercent);
}

/** Neto tras aplicar un descuento % sobre el precio de lista. */
export function netAfterDiscount(net: number, discountPercent: number): number {
  const n = Number.isFinite(net) && net >= 0 ? net : 0;
  const f = percentToComplementFactor(discountPercent);
  if (f <= 0) {
    return 0;
  }
  return roundMoneyInt(n * f);
}

/**
 * Margen efectivo % sobre el neto cobrado: (neto − costo) / neto × 100.
 * Si neto ≤ 0, retorna null.
 */
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

/**
 * Evalúa el impacto del máximo descuento autorizado sobre el neto de lista
 * (sin modificar el precio sugerido).
 */
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

/** Piso de precio neto derivado del tope de descuento. */
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
