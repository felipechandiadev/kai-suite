export type LaborUnitNamedLink = { id: string; name: string };

export type LaborUnitView = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  branchIds: string[];
  branches: LaborUnitNamedLink[];
  storageIds: string[];
  storages: LaborUnitNamedLink[];
  organizationalUnitIds: string[];
  organizationalUnits: LaborUnitNamedLink[];
  productionUnitIds: string[];
  productionUnits: LaborUnitNamedLink[];
  createdAt: string;
  updatedAt: string;
};

export type CreateLaborUnitInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type LaborUnitAssociationsInput = {
  branchIds: string[];
  storageIds: string[];
  organizationalUnitIds: string[];
  productionUnitIds: string[];
};

export type LaborUnitNamedOption = {
  id: string;
  name: string;
  code?: string;
};
