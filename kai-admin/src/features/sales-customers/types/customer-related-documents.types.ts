export type CustomerCreditNoteUsageStatus =
  | "available"
  | "partially_used"
  | "fully_used";

export type CustomerCreditNoteRow = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  usageStatus: CustomerCreditNoteUsageStatus;
  createdAt: string;
  status: string;
};

export type CustomerReturnRow = {
  id: string;
  documentNumber: string;
  total: number;
  status: string;
  createdAt: string;
  refundMode: string | null;
  linkedCreditNote: CustomerCreditNoteRow | null;
};

export type CustomerPurchaseRow = {
  id: string;
  documentNumber: string | null;
  transactionType: string | null;
  status: string | null;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
};

export type CustomerBackorderRow = {
  id: string;
  documentNumber: string | null;
  transactionType: string | null;
  status: string | null;
  total: number;
  createdAt: string;
};

export type CustomerPaymentRow = {
  id: string;
  documentNumber: string | null;
  type: string | null;
  status: string | null;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
};
