"use server";

import { revalidatePath } from "next/cache";
import { CompaniesPaymentMethodsRequest } from "../infrastructure/companies-payment-methods.request";
import type { CompanyPaymentMethodConfig } from "../types/company-payment-methods.types";

export async function getCompanyPaymentMethodsAction(companyId: string) {
  return CompaniesPaymentMethodsRequest.list(companyId);
}

export async function replaceCompanyPaymentMethodsAction(
  companyId: string,
  paymentMethods: CompanyPaymentMethodConfig[],
) {
  const res = await CompaniesPaymentMethodsRequest.replace(
    companyId,
    paymentMethods,
  );
  if (res.success) {
    revalidatePath("/settings/companies");
    revalidatePath("/settings/company");
  }
  return res;
}
