"use server";

import { revalidatePath } from "next/cache";
import { CompaniesQuotationsRequest } from "../infrastructure/companies-quotations.request";
import type { CompanyQuotationSettings } from "../types/company-quotations.types";

export async function getCompanyQuotationSettingsAction(companyId: string) {
  return CompaniesQuotationsRequest.get(companyId);
}

export async function replaceCompanyQuotationSettingsAction(
  companyId: string,
  quotationSettings: CompanyQuotationSettings,
) {
  const res = await CompaniesQuotationsRequest.replace(
    companyId,
    quotationSettings,
  );
  if (res.success) {
    revalidatePath("/settings/companies");
    revalidatePath("/settings/company");
  }
  return res;
}
