export type OperationalExpenseStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type OperationalExpensePaymentStatus =
  | "PENDING"
  | "PAID"
  | "PARTIAL"
  | "OVERDUE"
  | "VOIDED";

export type OperationalExpenseDocumentKind =
  | "SUPPLIER_INVOICE"
  | "SUPPLIER_RECEIPT"
  | "SUPPLIER_HONORARIUM_RECEIPT"
  | "OTHER";

export type OperationalExpenseGridRow = {
  id: string;
  companyId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  referenceNumber: string | null;
  documentNumber?: string | null;
  operationDate: string;
  status: OperationalExpenseStatus;
  paymentStatus?: OperationalExpensePaymentStatus | null;
  documentKind?: OperationalExpenseDocumentKind | null;
  description: string | null;
  branchId?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  employeeId?: string | null;
  netAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  createdAt?: string;
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
};

export type SupplierOption = {
  id: string;
  name: string;
};

export type OperationalExpenseFiscalAmounts = {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxId?: string | null;
};

export type OperationalExpenseCreatePayload = {
  name: string;
  categoryId: string;
  supplierId: string;
  referenceNumber: string;
  operationDate: string;
  description?: string;
  documentKind: OperationalExpenseDocumentKind;
  fiscalAmounts: OperationalExpenseFiscalAmounts;
  supplierDocumentPayment: {
    mode: string;
    partialPaidAmount?: number;
    paidLines: unknown[];
    scheduledLines: unknown[];
  };
};

/** @deprecated Legacy create shape */
export type OperationalExpenseLinkedDteKind =
  | "SUPPLIER_INVOICE"
  | "SUPPLIER_RECEIPT"
  | "SUPPLIER_HONORARIUM_RECEIPT";

export const OPERATIONAL_EXPENSE_DOCUMENT_KIND_LABELS: Record<
  OperationalExpenseDocumentKind,
  string
> = {
  SUPPLIER_INVOICE: "Factura",
  SUPPLIER_RECEIPT: "Boleta",
  SUPPLIER_HONORARIUM_RECEIPT: "Boleta honorarios",
  OTHER: "Otro",
};

export const OPERATIONAL_EXPENSE_PAYMENT_STATUS_LABELS: Record<
  OperationalExpensePaymentStatus,
  string
> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  OVERDUE: "Vencida",
  PAID: "Pagada",
  VOIDED: "Anulada",
};
