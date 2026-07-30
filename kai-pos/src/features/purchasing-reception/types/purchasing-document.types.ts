/** Fila devuelta por `GET /product-variants/purchasing-search`. */
export type PurchasingVariantStorageStock = {
  storageId: string;
  storageName: string;
  branchName: string | null;
  availableStock: number;
  hasStockAlert: boolean;
};

export type PurchasingVariantSearchItem = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string | null;
  sku: string;
  barcode: string | null;
  /** PMP por unidad base de stock (p. ej. ml). */
  pmp: number | null;
  /** Costo sugerido por unidad de compra (p. ej. L), derivado del PMP. */
  suggestedPurchaseUnitCost?: number | null;
  purchaseUnitLabel?: string | null;
  stockBaseUnitLabel?: string | null;
  /** Unidades de stock base por 1 unidad de compra. */
  stockQtyPerPurchaseUnit?: number;
  attributeValues: Record<string, string>;
  unitLabel: string | null;
  defaultTaxIds: string[];
  storageStocks: PurchasingVariantStorageStock[];
  hasStockAlert: boolean;
};

export type PurchasingVariantSearchResult = {
  items: PurchasingVariantSearchItem[];
  page: number;
  pageSize: number;
  total: number;
};
