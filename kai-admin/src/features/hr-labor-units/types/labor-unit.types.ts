export type LaborUnitView = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  branchIds: string[];
  branches: Array<{ id: string; name: string }>;
  storageIds: string[];
  storages: Array<{ id: string; name: string }>;
  organizationalUnitIds: string[];
  productionUnitIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateLaborUnitInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};
