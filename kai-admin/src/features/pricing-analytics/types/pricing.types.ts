export type PricingAlertLevel =
  | "INSUFFICIENT_DATA"
  | "BELOW_FLOOR"
  | "BELOW_PE"
  | "OK";

export type PricingCalculateLine = {
  variantId: string;
  productId: string;
  sku: string | null;
  productName: string;
  categoryId: string | null;
  floorNet: number;
  listNet: number;
  listGross: number;
  unitQuota: number;
  peNet: number;
  targetNet: number;
  suggestedNet: number;
  suggestedGross: number;
  alert: PricingAlertLevel;
  unitsInWindow: number;
};

export type PricingCalculateResult = {
  weekIso: string;
  salesWindowFrom: string;
  salesWindowTo: string;
  gfPoolNet: number;
  companyNetSales: number;
  entityNetSales: number;
  gfQuota: number;
  unitQuota: number;
  targetMarginPercent: number;
  lines: PricingCalculateLine[];
  computedAt: string;
};

export type PricingSnapshotSummary = {
  id: string;
  weekIso: string;
  status: "DRAFT" | "APPLIED";
  priceListId: string | null;
  branchId: string | null;
  categoryId: string | null;
  targetMarginPercent: number;
  gfPoolNet: number;
  lineCount: number;
  appliedAt: string | null;
  createdAt: string;
};

export type PricingSnapshotDetail = PricingCalculateResult & {
  id: string;
  status: "DRAFT" | "APPLIED";
  priceListId: string | null;
  branchId: string | null;
  categoryId: string | null;
  appliedAt: string | null;
};

export type PricingApplyResult = {
  snapshotId: string;
  appliedCount: number;
  appliedAt: string;
};

export type PricingCalculateInput = {
  weekIso?: string;
  priceListId: string;
  branchId?: string;
  categoryId?: string;
  targetMarginPercent?: number;
  salesWindowWeekIso?: string;
};

export const PRICING_ALERT_LABEL: Record<PricingAlertLevel, string> = {
  INSUFFICIENT_DATA: "Sin datos",
  BELOW_FLOOR: "Bajo costo",
  BELOW_PE: "Bajo equilibrio",
  OK: "OK",
};
