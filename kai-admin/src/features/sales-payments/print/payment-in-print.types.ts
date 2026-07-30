export type PaymentInPrintPaymentRow = {
  label: string;
  amount: number;
  detail: string | null;
};

export type PaymentInPrintAllocationRow = {
  documentNumber: string;
  amount: number;
};

export type PaymentInPrintData = {
  folio: string;
  issuedAtIso: string;
  company: {
    razonSocial: string;
    nombreFantasia: string | null;
    rut: string | null;
    businessActivity: string | null;
    logoUrl: string | null;
    address: string | null;
    mail: string | null;
    phone: string | null;
  };
  branchName: string | null;
  pointOfSaleName: string | null;
  operatorName: string | null;
  customer: { name: string; document: string | null } | null;
  totalCollected: number;
  amountPaid: number;
  payments: PaymentInPrintPaymentRow[];
  allocations: PaymentInPrintAllocationRow[];
  notes: string | null;
  externalReference: string | null;
};
