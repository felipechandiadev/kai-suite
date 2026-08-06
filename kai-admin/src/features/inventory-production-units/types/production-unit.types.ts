export type ProductionUnitScope = "BRANCH" | "COMPANY";
export type ProductionUnitInventoryMode = "AUTONOMOUS" | "DEPENDENT";
export type ProductionUnitPurpose = "KITCHEN" | "BATCH";
export type KitchenFulfillmentMode = "KDS" | "PRINTED" | "BOTH";

export type KitchenPrintSettings = {
  printAgentId?: string | null;
  printerDisplayLabel?: string | null;
};

export type ProductionUnitListItem = {
  id: string;
  branchId: string | null;
  scope: ProductionUnitScope;
  inventoryMode: ProductionUnitInventoryMode;
  purpose: ProductionUnitPurpose;
  code: string;
  name: string;
  defaultInputStorageId: string | null;
  /** @deprecated Prefer selecting output on the production order. */
  defaultOutputStorageId: string | null;
  /**
   * Capacidad histórica (piezas en 30d). Alias API de `computedCapacity`.
   * @deprecated No es capacidad teórica editable.
   */
  monthlyCapacity: number | null;
  /** Piezas completadas en los últimos 30 días. */
  computedCapacity?: number | null;
  laborUnitIds?: string[];
  /** Empleados asociados directamente a la UP. */
  employeeIds?: string[];
  employeeCount?: number;
  monthlyPayrollTotal?: number;
  laborCostPerUnit?: number | null;
  isActive: boolean;
  kitchenFulfillmentMode?: KitchenFulfillmentMode;
  kitchenPrintSettings?: KitchenPrintSettings | null;
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
  monthlyCapacity?: number | null;
  laborUnitIds?: string[];
  employeeIds?: string[];
  isActive?: boolean;
  kitchenFulfillmentMode?: KitchenFulfillmentMode;
  kitchenPrintSettings?: KitchenPrintSettings | null;
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
  monthlyCapacity?: number | null;
  laborUnitIds?: string[];
  employeeIds?: string[];
  isActive?: boolean;
  kitchenFulfillmentMode?: KitchenFulfillmentMode;
  kitchenPrintSettings?: KitchenPrintSettings | null;
};

export type ProductionUnitActionResult =
  | { success: true; unit: ProductionUnitListItem }
  | { success: false; message: string };

export type VariantProductionCostPreview = {
  variantId: string;
  productionUnitId: string;
  materialsPerUnit: number | null;
  laborPerUnit: number | null;
  unitCostPreview: number | null;
  materialsWarning?: string | null;
  laborWarning?: string | null;
};
