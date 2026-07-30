export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE" | (string & {});

export type AccountHierarchyNode = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isActive: boolean;
  balance: number;
  children: AccountHierarchyNode[];
};

export type ChartOfAccountsHierarchy = {
  hierarchy: AccountHierarchyNode[];
};

export type CreateChartOfAccountPayload = {
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  isActive?: boolean;
};

export type CreateChartOfAccountResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

