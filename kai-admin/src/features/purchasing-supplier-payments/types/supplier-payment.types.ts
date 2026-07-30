export type SupplierPaymentStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "VOIDED"
  | "PENDING";

export type SupplierPaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "CHECK"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "CREDIT"
  | "MIXED";

export interface SupplierPaymentRow {
  id: string;
  documentNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierDocument: string | null;
  branchId: string | null;
  branchName: string | null;
  total: number;
  amountPaid: number;
  currency: string;
  paymentMethod: SupplierPaymentMethod | string;
  paymentStatus: string | null;
  status: SupplierPaymentStatus | string;
  relatedTransactionId: string | null;
  relatedDocumentNumber: string | null;
  relatedDocumentType: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  notes: string | null;
  createdAt: string;
}

export interface SupplierPaymentsListResult {
  rows: SupplierPaymentRow[];
  total: number;
  page: number;
  limit: number;
}

export const SUPPLIER_PAYMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Pagado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  VOIDED: "Anulado",
  PENDING: "Pendiente",
};

export const SUPPLIER_PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  CREDIT: "Crédito",
  MIXED: "Mixto",
};
