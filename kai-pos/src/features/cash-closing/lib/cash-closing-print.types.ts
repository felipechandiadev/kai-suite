import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { CloseSessionCountedPayload } from "@/features/session/lib/close-counted-buckets";

export type CashClosingPrintInput = {
  closedAt: string;
  sessionOpenedAt: string | null;
  cashSessionId: string;
  message?: string;
  usedBlindCount: boolean;
  countedGrand: number;
  systemCashExpected?: number;
  difference?: number;
  salesTotal?: number;
  counted: CloseSessionCountedPayload;
  notes?: string;
  pointOfSaleName?: string | null;
  branchName?: string | null;
  operatorName?: string | null;
  company: CompanyDetails | null;
};
