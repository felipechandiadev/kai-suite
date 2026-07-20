/**
 * DTO alineado con el mapa del backend (BranchesService).
 */
export type BranchListItem = {
  id: string;
  companyId: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  location: unknown;
  isActive: boolean;
  isHeadquarters: boolean;
  laborUnitIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ListBranchesResult =
  | { success: true; branches: BranchListItem[] }
  | { success: false; error: string; branches: [] };

export type CreateBranchResult = { success: true; data: BranchListItem } | { success: false; error: string };

export type UpdateBranchResult = { success: true; data: BranchListItem } | { success: false; error: string };

export type DeleteBranchResult = { success: true } | { success: false; error: string };
