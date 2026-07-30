/**
 * Política global de crédito interno para clientes. Espejo del backend en
 * `kai-core/src/modules/companies/domain/company-internal-customer-credit.types.ts`.
 */
export interface CompanyInternalCustomerCreditSettings {
  enabled: boolean;
}

export function defaultCompanyInternalCustomerCreditSettings(): CompanyInternalCustomerCreditSettings {
  return { enabled: true };
}
