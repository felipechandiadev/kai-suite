"use server";

import { revalidatePath } from "next/cache";
import { CompaniesChecksRequest } from "../infrastructure/companies-checks.request";
import type { CompanyCheckSettings } from "../types/company-checks.types";

export async function getCompanyCheckSettingsAction(companyId: string) {
  return CompaniesChecksRequest.get(companyId);
}

export async function replaceCompanyCheckSettingsAction(
  companyId: string,
  checkSettings: CompanyCheckSettings,
) {
  const res = await CompaniesChecksRequest.replace(companyId, checkSettings);
  if (res.success) {
    revalidatePath("/settings/companies");
    revalidatePath("/settings/company");
  }
  return res;
}
