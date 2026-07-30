export type CustomerCreditNoteUsageStatus =
  | "available"
  | "partially_used"
  | "fully_used";

export type LinkedCustomerCreditNoteDetail = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  usageStatus: CustomerCreditNoteUsageStatus;
  createdAt: string;
  status: string;
};

export type PaymentSnapshotRow = {
  method: string;
  alias: string | null;
  amount: number;
  reference: string | null;
  bankAccountKey: string | null;
  capturedAt: string | null;
};

export type SaleTransactionDetailLine = {
  id: string;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unitOfMeasure: string | null;
};

export type SaleTransactionDetail = {
  id: string;
  documentNumber: string;
  transactionType: string;
  createdAt: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  /** Colección canónica desde `metadata.payments` (o legacy snapshots). */
  payments: PaymentSnapshotRow[];
  amountPaid: number;
  changeAmount: number | null;
  notes: string | null;
  externalReference: string | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  userFullName: string | null;
  userUserName: string | null;
  customerLabel: string | null;
  customerDocument: string | null;
  lines: SaleTransactionDetailLine[];
  backorderDepositAmount: number | null;
  backorderDepositPercent: number | null;
  backorderReservationStatus: string | null;
  backorderPendingBalance: number | null;
  /** Presente en devoluciones (`SALE_RETURN`) con NC generada. */
  linkedCustomerCreditNote: LinkedCustomerCreditNoteDetail | null;
  /** `document` | `immediate` desde metadata de la devolución. */
  saleReturnRefundMode: string | null;
  /** Cobro AR consolidado (`metadata.allocations`). */
  arCollectionAllocations: Array<{
    saleId: string;
    documentNumber: string;
    amount: number;
  }>;
};
