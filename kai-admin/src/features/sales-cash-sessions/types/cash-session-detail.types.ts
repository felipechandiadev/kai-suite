import type { CashSessionListStatus } from "./cash-session-list.types";
import type { CashSessionMovementRow } from "./cash-session-movement.types";

export interface CashSessionDetail {
  id: string;
  status: CashSessionListStatus;
  pointOfSaleId: string | null;
  pointOfSaleName: string | null;
  branchName: string | null;
  openedByFullName: string | null;
  openedByUserName: string | null;
  closedByFullName: string | null;
  closedByUserName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  salesTotal: number | null;
}

export interface CashSessionDetailResult {
  session: CashSessionDetail;
  movements: CashSessionMovementRow[];
}

export type CashSessionDetailSectionId = "resumen" | "movimientos";

export type CashSessionDetailTabItem = {
  id: CashSessionDetailSectionId;
  label: string;
};

export const CASH_SESSION_DETAIL_TABS: CashSessionDetailTabItem[] = [
  { id: "resumen", label: "Resumen" },
  { id: "movimientos", label: "Movimientos" },
];

export function cashSessionDetailSectionFromHash(
  hash: string,
): CashSessionDetailSectionId | null {
  const id = hash.replace(/^#/, "").trim();
  if (id === "resumen" || id === "movimientos") return id;
  return null;
}
