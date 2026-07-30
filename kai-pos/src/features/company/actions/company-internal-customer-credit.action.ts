"use server";

import { CompaniesInternalCustomerCreditRequest } from "../infrastructure/companies-internal-customer-credit.request";
import type { InternalCustomerCreditContext } from "../types/company-internal-customer-credit.types";

const EMPTY_CONTEXT: InternalCustomerCreditContext = {
  enabled: false,
  paymentMethodId: null,
  paymentMethodLabel: null,
};

/** Política y medio empresa de crédito interno para la empresa activa. */
export async function getInternalCustomerCreditContextAction(): Promise<InternalCustomerCreditContext> {
  const res = await CompaniesInternalCustomerCreditRequest.getForActiveCompany();
  if (!res.success) return EMPTY_CONTEXT;
  return {
    enabled: res.internalCustomerCredit.enabled === true,
    paymentMethodId: res.internalCreditPaymentMethod?.id ?? null,
    paymentMethodLabel: res.internalCreditPaymentMethod?.label ?? null,
  };
}

/** `true` si la empresa tiene habilitado el crédito interno de clientes. */
export async function getInternalCustomerCreditEnabledAction(): Promise<boolean> {
  const ctx = await getInternalCustomerCreditContextAction();
  return ctx.enabled;
}
