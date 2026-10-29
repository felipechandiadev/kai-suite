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
