import type { CompanyDetails } from "@/features/company/infrastructure/company.request";

export type CashHubMovementDirection = "IN" | "OUT";

/** Comprobante de ingreso/egreso entre sesión de caja y centro de efectivo. */
export type CashHubMovementPrintInput = {
  direction: CashHubMovementDirection;
  documentNumber: string;
  issuedAt: string;
  amount: number;
  cashHubName: string;
  cashSessionId: string;
  reason?: string | null;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
};
