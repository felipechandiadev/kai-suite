import type { CompanyDetails } from "@/features/company/infrastructure/company.request";

/** Comprobante de apertura de sesión de caja. */
export type CashSessionOpeningPrintInput = {
  cashSessionId: string;
  openedAt: string;
  openingAmount: number;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
  cashHubName?: string | null;
};
