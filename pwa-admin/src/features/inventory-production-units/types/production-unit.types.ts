export type ProductionUnitListItem = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  defaultInputStorageId: string | null;
  isActive: boolean;
};

export type CreateProductionUnitInput = {
  branchId: string;
  /** Si se omite, el backend asigna correlativo `UPR#####`. */
  code?: string;
  name: string;
  defaultInputStorageId?: string | null;
  isActive?: boolean;
};

export type UpdateProductionUnitInput = {
  id: string;
  branchId?: string;
  code?: string;
  name?: string;
  defaultInputStorageId?: string | null;
  isActive?: boolean;
};

export type ProductionUnitActionResult =
  | { success: true; unit: ProductionUnitListItem }
  | { success: false; message: string };
