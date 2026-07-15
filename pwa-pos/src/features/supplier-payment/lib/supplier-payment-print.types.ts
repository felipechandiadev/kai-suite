import type { CompanyDetails } from "@/features/company/infrastructure/company.request";

/** Comprobante de egreso de caja por pago a proveedor (efectivo desde sesión). */
export type SupplierPaymentPrintInput = {
  documentNumber: string;
  issuedAt: string;
  amount: number;
  supplierName: string;
  supplierDocument?: string | null;
  receptionDocumentNumber?: string | null;
  supplierDocumentRef?: string | null;
  cashSessionId: string;
  paymentMethodLabel?: string | null;
  reason?: string | null;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
};
