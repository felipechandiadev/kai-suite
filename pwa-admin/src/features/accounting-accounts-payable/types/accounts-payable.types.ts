export type AccountsPayablePaymentType =
  | "SUPPLIER_PAYMENT"
  | "PAYROLL_PAYMENT"
  | "EXPENSE_PAYMENT";

export type AccountsPayableOriginCategory =
  | "PURCHASE"
  | "OPERATING_EXPENSE"
  | "PAYROLL"
  | "OTHER";

/** @deprecated use originCategory — legacy filter alias */
export type AccountsPayableSourceType =
  | "PURCHASE"
  | "PAYROLL"
  | "OPERATING_EXPENSE"
  | "OTHER";

export type AccountsPayableStatus = "PENDING" | "PARTIAL" | "OVERDUE" | "PAID";

export type AccountsPayablePayeeType = "SUPPLIER" | "EMPLOYEE" | "OTHER";

export type AccountsPayableRow = {
  id: string;
  paymentType: AccountsPayablePaymentType | string;
  /** Origen de negocio: compra, gasto operativo, nómina. */
  originCategory?: AccountsPayableOriginCategory | string;
  documentNumber: string;
  parentTransactionId: string | null;
  parentDocumentNumber: string | null;
  parentType: string | null;
  payeeType: AccountsPayablePayeeType | string;
  payeeId: string | null;
  payeeName: string | null;
  installmentNumber: number;
  totalInstallments: number;
  fromReceptionNumber: string | null;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  dueDate: string | null;
  status: AccountsPayableStatus | string;
  isOverdue: boolean;
  daysOverdue: number;
  paymentTransactionId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** Legacy alias mapped from paymentType */
  sourceType: AccountsPayableSourceType | string;
};

export type AccountsPayableListFilters = {
  paymentType?: string;
  sourceType?: string;
  status?: string;
  payeeType?: string;
  fromDate?: string;
  toDate?: string;
  overdueOnly?: boolean;
  /** Folio de pago, documento origen (ej. FPR-…), beneficiario, referencia. */
  search?: string;
};

export type AccountsPayableListResult = {
  items: AccountsPayableRow[];
};

export type AccountsPayablePaymentContext = {
  payment: {
    id: string;
    paymentType: string;
    documentNumber: string;
    payeeName: string;
    payeePersonId?: string | null;
    total: number;
    pendingAmount: number;
    paymentMethod: string | null;
    dueDate: string | null;
  };
  supplierAccounts: Array<Record<string, unknown>>;
  companyAccounts: Array<Record<string, unknown>>;
};

export type CompleteAccountsPayableCheckData = {
  checkNumber: string;
  bankName: string;
  bankAccountKey?: string | null;
  drawerName?: string | null;
  dueDate?: string | null;
  payeeName?: string | null;
};

export type CompleteAccountsPayablePaymentInput = {
  paymentId: string;
  paymentMethod: "CASH" | "TRANSFER" | "CHECK";
  bankAccountKey?: string;
  cashHubId?: string;
  companyBankAccount?: Record<string, unknown>;
  supplierBankAccount?: Record<string, unknown>;
  note?: string;
  checkData?: CompleteAccountsPayableCheckData;
};
