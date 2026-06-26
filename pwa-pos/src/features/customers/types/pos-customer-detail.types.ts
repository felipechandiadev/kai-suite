export type PosCustomerDetail = {
  customerId: string;
  personId: string | null;
  displayName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  paymentDayOfMonth: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  personType?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
};

export type PosCustomerPaymentRelatedSale = {
  saleId: string;
  documentNumber: string;
  amount: number;
};

export type PosCustomerPaymentRelatedCreditNote = {
  creditNoteId: string;
  documentNumber: string;
  amount: number;
};

export type PosCustomerPaymentRow = {
  id: string;
  documentNumber: string | null;
  type: string | null;
  status: string | null;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
  relatedSales: PosCustomerPaymentRelatedSale[];
  relatedCreditNotes: PosCustomerPaymentRelatedCreditNote[];
};

export type PosCustomerQuotaRow = {
  id: string;
  transactionId: string | null;
  documentNumber: string | null;
  amount: number;
  dueDate: string | null;
  createdAt: string | null;
};

export type PosCustomerPurchaseRow = {
  id: string;
  documentNumber: string | null;
  transactionType: string | null;
  status: string | null;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
};

export type PosCustomerBackorderRow = {
  id: string;
  documentNumber: string | null;
  status: string | null;
  total: number;
  createdAt: string;
};

export type CustomerCreditNoteUsageStatus =
  | "available"
  | "partially_used"
  | "fully_used";

export type PosCustomerCreditNoteRow = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  usageStatus: CustomerCreditNoteUsageStatus;
  createdAt: string;
  status: string;
};

export type PosCustomerReturnRow = {
  id: string;
  documentNumber: string;
  total: number;
  status: string;
  createdAt: string;
  refundMode: string | null;
  linkedCreditNote: PosCustomerCreditNoteRow | null;
};

export type PosCustomerDetailBundle =
  | {
      success: true;
      customer: PosCustomerDetail;
      payments: PosCustomerPaymentRow[];
      quotas: PosCustomerQuotaRow[];
      purchases: PosCustomerPurchaseRow[];
      backorders: PosCustomerBackorderRow[];
      returns: PosCustomerReturnRow[];
      creditNotes: PosCustomerCreditNoteRow[];
    }
  | { success: false; message: string };
