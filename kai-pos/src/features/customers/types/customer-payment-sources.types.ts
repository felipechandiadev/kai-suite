export type CustomerCreditNoteSource = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  createdAt: string;
};

export type CustomerOrderAdvanceSource = {
  id: string;
  documentNumber: string;
  depositAmount: number;
  depositConsumedAmount: number;
  availableAmount: number;
  createdAt: string;
};

export type CustomerPaymentSources = {
  creditNotes: CustomerCreditNoteSource[];
  orderAdvances: CustomerOrderAdvanceSource[];
};

export type CustomerPaymentSourcesResponse =
  | ({ success: true } & CustomerPaymentSources)
  | { success: false; message: string };
