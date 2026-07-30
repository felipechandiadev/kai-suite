export type CashSessionStatus = "OPEN" | "CLOSED";

export type CashSessionListItem = {
  id: string;
  pointOfSaleId: string;
  openedById: string;
  status: CashSessionStatus;
  openedAt?: string;
  createdAt?: string;
  pointOfSaleName?: string | null;
  branchName?: string | null;
  openedByFullName?: string | null;
};

export type ListCashSessionsResponse = {
  success: boolean;
  total?: number;
  items?: CashSessionListItem[];
  message?: string;
  statusCode?: number;
};

