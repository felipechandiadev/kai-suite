export type CashHubBranchRef = { id: string; name?: string };
export type CashHubPosRef = { id: string; name?: string };

export type CashHubRow = {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  currentBalance?: number;
  notes?: string | null;
  branches?: CashHubBranchRef[];
  pointsOfSale?: CashHubPosRef[];
};
