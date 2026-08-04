import type { CreateProductVariantPriceListItemInput } from "../actions/product.action";

export type BulkProductRowError = {
  rowNumber: number;
  message: string;
};

export type BulkProductPreparedRow = {
  rowNumber: number;
  nombre: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  visibleInEShop: boolean;
  onMenu: boolean;
  basePrice: number;
  unitId: string;
  priceListItems: CreateProductVariantPriceListItemInput[];
};

export type BulkProductPrepareResult =
  | {
      success: true;
      rows: BulkProductPreparedRow[];
      rowErrors: BulkProductRowError[];
      blocked: boolean;
    }
  | { success: false; error: string };
