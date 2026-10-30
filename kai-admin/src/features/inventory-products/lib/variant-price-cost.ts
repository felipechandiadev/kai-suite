import type { ProductGridRow, ProductVariantGridRow } from "../types/product-grid.types";

/** Precio neto de venta de una variante: primera lista con monto; si no, `basePrice`. */
export function variantSaleNet(v: ProductVariantGridRow): number | null {
  const item = (v.priceListItems ?? []).find((p) => p.netPrice > 0);
  if (item) return item.netPrice;
  return v.basePrice != null && v.basePrice > 0 ? v.basePrice : null;
}

/** Precio de venta con impuestos (bruto) de una variante: primera lista con monto; `null` si no hay lista. */
export function variantSaleGross(v: ProductVariantGridRow): number | null {
  const item = (v.priceListItems ?? []).find((p) => p.netPrice > 0 && p.grossPrice > 0);
  return item ? item.grossPrice : null;
}

/** Costo de una variante: PMP si existe, si no costo base. */
export function variantCost(v: ProductVariantGridRow): number | null {
  if (v.pmp != null && v.pmp > 0) return v.pmp;
  return v.baseCost != null && v.baseCost > 0 ? v.baseCost : null;
}

/** El producto tiene precio de venta si al menos una variante lo tiene. */
export function productHasSalePrice(row: ProductGridRow): boolean {
  return (row.variants ?? []).some((v) => variantSaleNet(v) != null);
}

/** El producto tiene costo si al menos una variante lo tiene. */
export function productHasCost(row: ProductGridRow): boolean {
  return (row.variants ?? []).some((v) => variantCost(v) != null);
}

export type VariantMargin = {
  /** Precio neto de venta (sin impuestos) y costo, ambos por unidad de venta. */
  net: number;
  cost: number;
  /** Utilidad por unidad (neto − costo). */
  amount: number;
  /** Margen sobre el precio neto, en % (puede ser negativo). */
  percent: number;
};

/**
 * Unidades de stock base por 1 unidad de venta (p. ej. 1000 si se vende en kg y el stock va en g).
 * El costo (PMP / costo base) está en unidad de stock, así que se multiplica por este factor
 * para compararlo con el precio, que está en unidad de venta.
 */
export function variantSaleUnitFactor(v: ProductVariantGridRow): number {
  const f = v.stockBaseQtyPerCountSaleUnit;
  return f != null && Number.isFinite(f) && f > 0 ? f : 1;
}

/** Margen de una variante sobre precio neto; `null` si falta precio o costo. */
export function variantMargin(v: ProductVariantGridRow): VariantMargin | null {
  const net = variantSaleNet(v);
  const stockCost = variantCost(v);
  if (net == null || stockCost == null) return null;
  const cost = stockCost * variantSaleUnitFactor(v);
  const amount = net - cost;
  return { net, cost, amount, percent: (amount / net) * 100 };
}

/** El producto se vende bajo su costo si alguna variante tiene margen negativo. */
export function productSoldBelowCost(row: ProductGridRow): boolean {
  return (row.variants ?? []).some((v) => {
    const m = variantMargin(v);
    return m != null && m.amount < 0;
  });
}
