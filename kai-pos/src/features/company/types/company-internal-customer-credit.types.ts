export interface CompanyInternalCustomerCreditSettings {
  enabled: boolean;
}

export type InternalCreditPaymentMethodRef = {
  id: string;
  label: string;
};

export type InternalCustomerCreditContext = {
  enabled: boolean;
  paymentMethodId: string | null;
  paymentMethodLabel: string | null;
};
