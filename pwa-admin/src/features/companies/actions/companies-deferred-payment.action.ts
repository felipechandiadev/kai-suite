"use server";

import { revalidatePath } from "next/cache";
import { CompaniesDeferredPaymentRequest } from "../infrastructure/companies-deferred-payment.request";
import type { CompanyDeferredPaymentSettings } from "../types/company-deferred-payment.types";

export async function getCompanyDeferredPaymentSettingsAction(companyId: string) {
  return CompaniesDeferredPaymentRequest.get(companyId);
}

export async function replaceCompanyDeferredPaymentSettingsAction(
  companyId: string,
  deferredPayment: CompanyDeferredPaymentSettings,
) {
  const res = await CompaniesDeferredPaymentRequest.replace(companyId, deferredPayment);
  if (res.success) {
    revalidatePath("/settings/company");
    revalidatePath("/sales/points-of-sale");
  }
  return res;
}
