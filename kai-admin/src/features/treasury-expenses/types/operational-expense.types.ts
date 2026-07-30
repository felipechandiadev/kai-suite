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

/** Alineado con `ExpenseCategoryPnlNature` (SALES = ventas, ADMIN = administración). */
export type ExpenseCategoryPnlNatureValue = "SALES" | "ADMIN";

export type OperationalExpenseGridRow = {
  id: string;
  companyId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  /** Tipo P&L de la categoría: ventas vs administración. */
  categoryPnlNature: ExpenseCategoryPnlNatureValue;
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
  /** Persist a reusable template after creating the OE. */
  saveAsTemplate?: boolean;
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

/** Etiquetas cortas para columna «Tipo» en la grilla de gastos. */
export const EXPENSE_CATEGORY_PNL_NATURE_LABELS: Record<
  ExpenseCategoryPnlNatureValue,
  string
> = {
  SALES: "Ventas",
  ADMIN: "Administración",
};
