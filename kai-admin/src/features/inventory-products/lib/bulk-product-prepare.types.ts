import type { CreateProductVariantPriceListItemInput } from "../actions/product.action";
import type { BulkProductType } from "./bulk-product-excel";

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
  productType: BulkProductType;
  /** UP resuelta por nombre de columna cocina (si aplica). */
  productionUnitId: string | null;
  productionUnitBranchId: string | null;
  productionUnitName: string | null;
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
