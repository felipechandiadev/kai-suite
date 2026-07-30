"use server";

import { revalidatePath } from "next/cache";
import { CompaniesInternalCustomerCreditRequest } from "../infrastructure/companies-internal-customer-credit.request";
import type { CompanyInternalCustomerCreditSettings } from "../types/company-internal-customer-credit.types";

export async function getCompanyInternalCustomerCreditSettingsAction(
  companyId: string,
) {
  return CompaniesInternalCustomerCreditRequest.get(companyId);
}

export async function replaceCompanyInternalCustomerCreditSettingsAction(
  companyId: string,
  internalCustomerCredit: CompanyInternalCustomerCreditSettings,
) {
  const res = await CompaniesInternalCustomerCreditRequest.replace(
    companyId,
    internalCustomerCredit,
  );
  if (res.success) {
    revalidatePath("/settings/company");
    revalidatePath("/settings/companies");
    revalidatePath("/sales/customers");
  }
  return res;
}
