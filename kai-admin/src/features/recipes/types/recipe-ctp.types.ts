export type RecipeCtpDetailReason =
  | "NO_RECIPE"
  | "NO_ROUTING"
  | "NO_STORAGE"
  | "NO_LIMITING_LINES";

export type RecipeCtpDetailLine = {
  inputVariantId: string;
  inputProductName: string | null;
  inputSku: string | null;
  inputStockBaseUnitLabel: string | null;
  qtyPerOutputUnit: number;
  wasteFactor: number;
  limitsProjectedStock: boolean;
  trackInventory: boolean;
  consumptionPerUnit: number;
  available: number;
  lineCapacity: number | null;
  isBottleneck: boolean;
};

export type RecipeCtpDetail = {
  variantId: string;
  branchId: string;
  productionUnitId: string | null;
  productionUnitName: string | null;
  inputStorageId: string | null;
  inputStorageName: string | null;
  producibleQty: number | null;
  reason: RecipeCtpDetailReason | null;
  lines: RecipeCtpDetailLine[];
};

export type RecipeCtpDetailResponse =
  | { success: true; detail: RecipeCtpDetail }
  | { success: false; message: string };

export type RecipeCtpByStorageItem = {
  storageId: string;
  storageName: string | null;
  productionUnitNames: string[];
  producibleQty: number | null;
  reason: RecipeCtpDetailReason | null;
  lines: RecipeCtpDetailLine[];
};

export type RecipeCtpByStorage = {
  variantId: string;
  reason: RecipeCtpDetailReason | null;
  storages: RecipeCtpByStorageItem[];
};

export type RecipeCtpByStorageResponse =
  | { success: true; result: RecipeCtpByStorage }
  | { success: false; message: string };
