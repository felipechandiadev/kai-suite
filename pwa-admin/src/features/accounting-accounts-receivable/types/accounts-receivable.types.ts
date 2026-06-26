export type AccountsReceivableOriginCategory = "INSTALLMENT";

export type AccountsReceivableStatus = "PENDING" | "PARTIAL" | "OVERDUE" | "PAID";

export type AccountsReceivableRow = {
  id: string;
  originCategory: AccountsReceivableOriginCategory | string;
  documentNumber: string | null;
  saleTransactionId: string | null;
  customerId: string | null;
  customerName: string | null;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  dueDate: string | null;
  status: AccountsReceivableStatus | string;
  isOverdue: boolean;
  daysOverdue: number;
  createdAt: string;
};

export type AccountsReceivableListForGridInput = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  overdueOnly?: boolean;
  includePaid?: boolean;
};

export type AccountsReceivableListForGridResult = {
  rows: AccountsReceivableRow[];
  total: number;
};

export type AccountsReceivablePaymentContext = {
  payment: {
    id: string;
    documentNumber: string;
    customerId?: string | null;
    customerName: string | null;
    total: number;
    pendingAmount: number;
    paymentMethod: string | null;
    dueDate: string | null;
    installmentNumber?: number;
    totalInstallments?: number;
  };
  supplierAccounts: Array<Record<string, unknown>>;
  companyAccounts: Array<Record<string, unknown>>;
};

export type CompleteAccountsReceivablePaymentInput = {
  installmentId: string;
  paymentMethod: "CASH" | "TRANSFER" | "CHECK";
  companyAccountKey?: string;
  cashHubId?: string;
  note?: string;
  amount?: number;
};
