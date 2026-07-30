export type CashSessionListStatus = "OPEN" | "CLOSED" | "RECONCILED";

export interface CashSessionListRow {
  id: string;
  status: CashSessionListStatus;
  pointOfSaleName: string | null;
  branchName: string | null;
  openedByFullName: string | null;
  openedByUserName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  /** Suma de transacciones SALE de la sesión. */
  salesTotal: number;
  difference: number | null;
  createdAt: string;
}

export interface CashSessionsListResult {
  rows: CashSessionListRow[];
  total: number;
}

export const CASH_SESSION_STATUS_LABEL: Record<CashSessionListStatus, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  RECONCILED: "Conciliada",
};
