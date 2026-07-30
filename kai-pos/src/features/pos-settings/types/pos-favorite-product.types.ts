import type { PosProductAttribute } from "@/features/pos-products/types/pos-product.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

/** Variante favorita guardada por punto de venta (localStorage). */
export type PosFavoriteProductEntry = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  attributes: PosProductAttribute[];
  unitPriceWithTax: number;
  saleUnitSymbol?: string | null;
  addedAt: string;
};

export type PosFavoriteProductsSnapshotV1 = {
  version: 1;
  pointOfSaleId: string;
  items: PosFavoriteProductEntry[];
  updatedAt: string;
};

export function posFavoriteFromSearchItem(
  item: PosProductSearchItem,
): PosFavoriteProductEntry {
  return {
    variantId: item.variantId,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    barcode: item.barcode,
    attributes: item.attributes ?? [],
    unitPriceWithTax: item.unitPriceWithTax,
    saleUnitSymbol: item.saleUnitSymbol ?? item.unitSymbol ?? null,
    addedAt: new Date().toISOString(),
  };
}
