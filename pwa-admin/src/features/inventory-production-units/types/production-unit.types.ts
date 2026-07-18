export type ProductionUnitScope = "BRANCH" | "COMPANY";
export type ProductionUnitInventoryMode = "AUTONOMOUS" | "DEPENDENT";
export type ProductionUnitPurpose = "KITCHEN" | "BATCH";

export type ProductionUnitListItem = {
  id: string;
  branchId: string | null;
  scope: ProductionUnitScope;
  inventoryMode: ProductionUnitInventoryMode;
  purpose: ProductionUnitPurpose;
  code: string;
  name: string;
  defaultInputStorageId: string | null;
  defaultOutputStorageId: string | null;
  isActive: boolean;
};

export type CreateProductionUnitInput = {
  scope?: ProductionUnitScope;
  branchId?: string | null;
  /** Si se omite, el backend asigna correlativo `UPR#####`. */
  code?: string;
  name: string;
  inventoryMode?: ProductionUnitInventoryMode;
  purpose?: ProductionUnitPurpose;
  defaultInputStorageId?: string | null;
  defaultOutputStorageId?: string | null;
  isActive?: boolean;
};

export type UpdateProductionUnitInput = {
  id: string;
  scope?: ProductionUnitScope;
  branchId?: string | null;
  code?: string;
  name?: string;
  inventoryMode?: ProductionUnitInventoryMode;
  purpose?: ProductionUnitPurpose;
  defaultInputStorageId?: string | null;
  defaultOutputStorageId?: string | null;
  isActive?: boolean;
};

export type ProductionUnitActionResult =
  | { success: true; unit: ProductionUnitListItem }
  | { success: false; message: string };
