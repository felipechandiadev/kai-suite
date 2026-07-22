/** Valores de `ProductType` en API / catálogo admin. */
export type CatalogProductType =
  | "PHYSICAL"
  | "SERVICE"
  | "DIGITAL"
  | "MANUFACTURADO"
  | "ELABORADO"
  | "PREPARADO"
  | "INSUMO";

import type { VariantTaxCategory } from "./variant-fiscal.types";

export type ProductPriceListItemRow = {
  priceListId: string;
  priceListName: string;
  currency: string;
  netPrice: number;
  grossPrice: number;
  taxIds?: string[];
  /** Máximo descuento autorizado (%). */
  maxDiscountPercent?: number | null;
  /** Precio neto mínimo derivado del tope. */
  minPrice?: number | null;
  /** Última modificación del ítem en lista (`price_list_items.updatedAt`). */
  updatedAt?: string | null;
};

export type ProductVariantMediaAsset = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
};

export type ProductVariantGridRow = {
  id: string;
  sku: string;
  productId?: string | null;
  unitId?: string | null;
  stockBaseUnitId?: string | null;
  saleUnitId?: string | null;
  purchaseUnitId?: string | null;
  /** Stock base (g, ml, m…) por 1 unidad de venta en conteo. */
  stockBaseQtyPerCountSaleUnit?: number | null;
  /** Stock base por 1 unidad de compra en conteo. */
  stockBaseQtyPerCountPurchaseUnit?: number | null;
  barcode?: string | null;
  /** Etiqueta legible unidad de venta (si API envía `saleUnit` / `unit`). */
  saleUnitLabel?: string | null;
  /** Etiqueta unidad base de inventario. */
  stockBaseUnitLabel?: string | null;
  /** Etiqueta unidad de compra. */
  purchaseUnitLabel?: string | null;
  unitOfMeasure?: string | null;
  isActive?: boolean;
  visibleInEShop?: boolean;
  basePrice?: number;
  baseCost?: number;
  /** Precio medio ponderado (inventario); 0 si no aplica. */
  pmp?: number | null;
  /** Nombre legible derivado de atributos (API). */
  displayName?: string | null;
  /** Mapa attributeId → valor de opción. */
  attributeValues?: Record<string, string>;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  minimumStock?: number;
  minimumStockEnabled?: boolean;
  maximumStock?: number;
  maximumStockEnabled?: boolean;
  reorderPoint?: number;
  reorderPointEnabled?: boolean;
  /** Peso neto producto (kg), sin embalaje. */
  netWeightKg?: number | null;
  /** Peso bruto con embalaje (kg), típico para courier. */
  grossWeightKg?: number | null;
  packageLengthCm?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  /** Divisor K en (L×W×H cm³)/K → kg volumétrico; null → default de aplicación (5000). */
  volumetricDivisorK?: number | null;
  primaryImageUrl?: string | null;
  mediaAssets?: ProductVariantMediaAsset[];
  priceListItems: ProductPriceListItemRow[];
  /** Impuestos de venta asignados a la variante (maestro fiscal; catálogo /accounting/taxes). */
  taxIds?: string[];
  taxCategory?: VariantTaxCategory;
  requiresDte?: boolean;
};

export type ProductGridRow = {
  id: string;
  name: string;
  productType?: CatalogProductType | string | null;
  /** Catálogo de marcas (FK); null si solo hay texto legacy en `brand`. */
  brandId: string | null;
  brand: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  visibleInEShop?: boolean;
  variantCount: number;
  variants: ProductVariantGridRow[];
  primaryImageUrl?: string | null;
  mediaAssets?: ProductVariantMediaAsset[];
};
