export type ProductionBatchStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type ProductionBatchListItem = {
  id: string;
  documentNumber: string | null;
  status: ProductionBatchStatus;
  branchId: string | null;
  branchName: string | null;
  storageId: string | null;
  storageName: string | null;
  createdAt: string | null;
  notes: string | null;
  outputProductName: string | null;
  outputQuantity: number | null;
};

export type ProductionBatchDetail = ProductionBatchListItem & {
  userId: string | null;
  metadata: Record<string, unknown> | null;
  lines: Array<{
    id: string;
    productVariantId: string | null;
    productName: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  unitCost?: number | null;
  totalCost?: number | null;
};

export type CreateProductionBatchInput = {
  branchId: string;
  storageId: string;
  productVariantId: string;
  productName?: string;
  quantity: number;
  notes?: string;
  recipeId?: string;
  productionUnitId?: string;
};

export type ListProductionBatchesParams = {
  page?: number;
  limit?: number;
  branchId?: string;
  storageId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};
