/** Saldo por almacén (misma idea que el desglose del grid de stock). */
export type PurchasingVariantStorageStock = {
  storageId: string;
  storageName: string;
  branchName: string | null;
  availableStock: number;
  /** Alerta de umbral en ese almacén (mín / máx / reposición). */
  hasStockAlert: boolean;
};

/** Fila devuelta por `GET /product-variants/purchasing-search`. */
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
  /** Unidades de stock base por 1 unidad de compra (p. ej. 12 si compra es docena y stock es unidad). */
  stockQtyPerPurchaseUnit?: number;
  attributeValues: Record<string, string>;
  unitLabel: string | null;
  defaultTaxIds: string[];
  storageStocks: PurchasingVariantStorageStock[];
  /** True si la variante tiene alerta en al menos un almacén (misma lógica que el grid de stock). */
  hasStockAlert: boolean;
};

export type PurchasingVariantSearchResult = {
  items: PurchasingVariantSearchItem[];
  page: number;
  pageSize: number;
  total: number;
};

/** `GET /product-variants/:id/purchase-insights` */
export type VariantPurchaseInsightsPmpPoint = {
  at: string;
  pmp: number;
};

export type VariantPurchaseInsightsPurchaseRow = {
  transactionId: string | null;
  documentNumber: string | null;
  date: string | null;
  quantity: number;
  /** Cantidad convertida a unidad base de stock de la variante. */
  quantityInStockBase?: number;
  unitLabel: string | null;
  supplierName: string | null;
  destinationName: string | null;
  unitCost: number | null;
};

export type VariantPurchaseInsights = {
  variant: {
    id: string;
    productName: string;
    sku: string;
    attributeValues: Record<string, string>;
    pmp: number | null;
    stockBaseUnitLabel: string | null;
    purchaseUnitLabel: string | null;
  };
  pmpSeries: VariantPurchaseInsightsPmpPoint[];
  recentPurchases: VariantPurchaseInsightsPurchaseRow[];
};
