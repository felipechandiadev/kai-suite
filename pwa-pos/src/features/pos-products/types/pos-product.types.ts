export type PosProductAttribute = {
  attributeId: string;
  attributeName: string;
  attributeValue: string;
};

export type PosProductSearchItem = {
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  variantId: string;
  sku: string | null;
  barcode: string | null;
  unitSymbol: string | null;
  /** Símbolo de la unidad de venta (preferir sobre `unitSymbol` en UI). */
  saleUnitSymbol?: string | null;
  unitId: string | null;
  stockBaseUnitId?: string | null;
  stockBaseUnitSymbol?: string | null;
  saleUnitId?: string | null;
  purchaseUnitId?: string | null;
  unitAllowDecimals: boolean;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
  trackInventory: boolean;
  availableStock: number | null;
  availableStockBase: number | null;
  /** Tipo de producto (PHYSICAL, PREPARADO, …). */
  productType?: string | null;
  /** Base de stock por 1 unidad de venta (conteo); para recalcular stock en UI. */
  stockBaseQtyPerCountSaleUnit?: number | null;
  attributes: PosProductAttribute[];
  metadata: Record<string, unknown> | null;
  /** Perfil fiscal de la variante (catálogo POS / offline). */
  taxCategory: string;
  requiresDte: boolean;
  taxIds: string[];
};

export type PosProductSearchPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PosProductSearchResponse =
  | {
      success: true;
      query: string;
      pagination: PosProductSearchPagination;
      products: PosProductSearchItem[];
    }
  | { success: false; message: string; statusCode?: number };

export type PosVariantsLookupResponse =
  | { success: true; products: PosProductSearchItem[] }
  | { success: false; message: string; statusCode?: number };

export type PosVariantStockByStorageRow = {
  storageId: string;
  storageName: string;
  branchName: string | null;
  physicalStock: number | null;
  physicalStockBase: number | null;
  /** Reservado/comprometido (committed) */
  reservedStock: number | null;
  reservedStockBase: number | null;
  availableStock: number | null;
  availableStockBase: number | null;
  isPosStorage: boolean;
};

export type PosVariantStockBreakdownResponse =
  | {
      success: true;
      variantId: string;
      sku: string | null;
      trackInventory: boolean;
      posStorageId: string | null;
      breakdown: PosVariantStockByStorageRow[];
    }
  | { success: false; message: string; statusCode?: number };
