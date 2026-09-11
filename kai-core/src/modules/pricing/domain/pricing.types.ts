import { ExpenseCategoryOperationalGroup } from '@modules/expense-categories/domain/expense-category-operational-group.enum';

/** Grupos operativos que entran al pool GF (estructura fija). */
export const PRICING_STRUCTURE_OPERATIONAL_GROUPS: readonly ExpenseCategoryOperationalGroup[] = [
  ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
  ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
  ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
  ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
  ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
] as const;

export type PricingAlertLevel =
  | 'INSUFFICIENT_DATA'
  | 'BELOW_FLOOR'
  | 'BELOW_PE'
  | 'OK';

export type PricingSnapshotStatus = 'DRAFT' | 'APPLIED';

export type PricingCalculateLineDto = {
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

export type PricingCalculateResultDto = {
  weekIso: string;
  salesWindowFrom: string;
  salesWindowTo: string;
  gfPoolNet: number;
  companyNetSales: number;
  entityNetSales: number;
  gfQuota: number;
  unitQuota: number;
  targetMarginPercent: number;
  lines: PricingCalculateLineDto[];
  computedAt: string;
};

export type PricingSnapshotSummaryDto = {
  id: string;
  weekIso: string;
  status: PricingSnapshotStatus;
  priceListId: string | null;
  branchId: string | null;
  categoryId: string | null;
  targetMarginPercent: number;
  gfPoolNet: number;
  lineCount: number;
  appliedAt: string | null;
  createdAt: string;
};

export type PricingSnapshotDetailDto = PricingCalculateResultDto & {
  id: string;
  status: PricingSnapshotStatus;
  priceListId: string | null;
  branchId: string | null;
  categoryId: string | null;
  appliedAt: string | null;
};

export type PricingApplyResultDto = {
  snapshotId: string;
  appliedCount: number;
  appliedAt: string;
};
