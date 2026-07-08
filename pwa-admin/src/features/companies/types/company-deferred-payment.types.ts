export interface CompanyDeferredPaymentSettings {
  enabled: boolean;
}

export function defaultCompanyDeferredPaymentSettings(): CompanyDeferredPaymentSettings {
  return { enabled: false };
}
