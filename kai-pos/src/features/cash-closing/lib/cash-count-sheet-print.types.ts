import type { CompanyDetails } from "@/features/company/infrastructure/company.request";

/** Medio de pago a listar en la planilla (solo etiqueta; montos se escriben a mano). */
export type CashCountSheetPaymentLine = {
  label: string;
};

/** Planilla en blanco para que el operador anote el conteo antes o durante el cierre. */
export type CashCountSheetPrintInput = {
  cashSessionId: string;
  sessionOpenedAt: string | null;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
  paymentLines: CashCountSheetPaymentLine[];
};
