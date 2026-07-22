export type ProductionBatchStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type ProductionOrderAttributeSnapshot = {
  attributeId: string;
  optionId: string;
  tagKey?: string | null;
  attributeName: string;
  optionLabel: string;
};

export type ProductionOrderLotSnapshot = {
  lineKey: string;
  productVariantId: string;
  quantity: number;
  notes?: string;
  attributes: ProductionOrderAttributeSnapshot[];
  lineCost?: number;
  unitCost?: number;
};

export type ProductionOrderMetadata = {
  productionUnitId: string;
  capacity: number | null;
  plannedStartAt: string | null;
  plannedDeliveryAt: string | null;
  lots: ProductionOrderLotSnapshot[];
};

export type ProductionBatchListItem = {
  id: string;
  documentNumber: string | null;
  status: ProductionBatchStatus;
  branchId: string | null;
  branchName: string | null;
  /** Almacén de insumos (consumo). */
  storageId: string | null;
  storageName: string | null;
  /** Almacén de salida (terminado). */
  outputStorageId: string | null;
  productionUnitId: string | null;
  createdAt: string | null;
  notes: string | null;
  outputProductName: string | null;
  outputQuantity: number | null;
  lotCount: number;
};

export type ProductionBatchDetail = ProductionBatchListItem & {
  userId: string | null;
  metadata: Record<string, unknown> | null;
  productionOrder: ProductionOrderMetadata | null;
  lines: Array<{
    id: string;
    productVariantId: string | null;
    productName: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string | null;
  }>;
  unitCost?: number | null;
  totalCost?: number | null;
  materialsCost?: number | null;
  laborCost?: number | null;
};

export type CreateProductionBatchLotInput = {
  lineKey?: string;
  productVariantId: string;
  productName?: string;
  quantity: number;
  notes?: string;
  attributes?: Array<{ attributeId: string; optionId: string }>;
};

export type CreateProductionBatchInput = {
  branchId: string;
  storageId: string;
  outputStorageId: string;
  productionUnitId: string;
  capacity?: number | null;
  plannedStartAt?: string | null;
  plannedDeliveryAt?: string | null;
  notes?: string;
  lots: CreateProductionBatchLotInput[];
};

export type ManufactureVariantSearchItem = {
  variantId: string;
  sku: string;
  productName: string;
  productType: string;
  hasRecipe: boolean;
  attributesCount: number;
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
