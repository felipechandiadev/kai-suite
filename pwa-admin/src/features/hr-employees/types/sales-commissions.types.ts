export type SalesCommissionMonthSummary = {
  yearMonth: string;
  salesCount: number;
  salesGrossTotal: number;
  commissionTotal: number;
};

export type SalesCommissionsSummary = {
  enabled: boolean;
  percent: number | null;
  linked: boolean;
  userIds: string[];
  months: SalesCommissionMonthSummary[];
};

export type SalesCommissionSaleRow = {
  id: string;
  documentNumber: string;
  occurredAt: string;
  pointOfSaleName: string | null;
  total: number;
  commission: number;
};

export type SalesCommissionsSalesPage = {
  enabled: boolean;
  percent: number | null;
  linked: boolean;
  items: SalesCommissionSaleRow[];
  total: number;
  page: number;
  limit: number;
};

export function contractHasSalesCommissionPercent(contract: {
  salesCommissionType?: string | null;
  salesCommissionValue?: string | null;
} | null): boolean {
  if (!contract) return false;
  if (String(contract.salesCommissionType ?? "").toUpperCase() !== "PERCENT") {
    return false;
  }
  const n = Number(contract.salesCommissionValue);
  return Number.isFinite(n) && n > 0;
}
