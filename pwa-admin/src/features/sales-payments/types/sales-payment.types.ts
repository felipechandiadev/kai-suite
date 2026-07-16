export type SalesPaymentStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED"
  | "COMPLETED"
  | "VOIDED"
  | "PENDING"
  | "EXPIRED";

export type SalesPaymentMethod =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "TRANSFER"
  | "CHECK"
  | "CREDIT"
  | "INTERNAL_CREDIT"
  | "VOUCHER"
  | "CUSTOMER_CREDIT_NOTE"
  | "ORDER_ADVANCE"
  | "MIXED";

export type SalesPaymentRelatedSale = {
  saleId: string;
  documentNumber: string;
  amount: number;
};

export interface SalesPaymentRow {
  id: string;
  documentNumber: string;
  externalReference: string | null;
  documentType: string | null;
  documentFolio: string | null;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  branchId: string | null;
  branchName: string | null;
  pointOfSaleId: string | null;
  pointOfSaleName: string | null;
  total: number;
  amountPaid: number;
  currency: string;
  paymentMethod: SalesPaymentMethod;
  paymentLinesCount: number;
  status: SalesPaymentStatus;
  relatedTransactionId: string | null;
  /** Ventas (SALE) cubiertas por este cobro (1 o N vía `metadata.allocations`). */
  relatedSales: SalesPaymentRelatedSale[];
  /** Primera venta vinculada (compatibilidad / cobro simple). */
  relatedSaleId: string | null;
  relatedSaleDocumentNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SalesPaymentsListResult {
  rows: SalesPaymentRow[];
  total: number;
  page: number;
  limit: number;
}

export const SALES_PAYMENT_STATUS_LABEL: Record<SalesPaymentStatus, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmado",
  PARTIALLY_RECEIVED: "Parcial",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
  VOIDED: "Anulado",
  PENDING: "Pendiente",
  EXPIRED: "Vencido",
};

export const SALES_PAYMENT_METHOD_LABEL: Record<SalesPaymentMethod, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CREDIT: "Crédito",
  INTERNAL_CREDIT: "Crédito interno",
  VOUCHER: "Voucher",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito cliente",
  ORDER_ADVANCE: "Abono por encargo",
  MIXED: "Mixto",
};
