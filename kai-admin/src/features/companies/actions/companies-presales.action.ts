"use server";

import { CompaniesPresalesRequest } from "../infrastructure/companies-presales.request";
import type { CompanyPresaleSettings } from "../types/company-presales.types";

export async function getCompanyPresaleSettingsAction(companyId: string) {
  return CompaniesPresalesRequest.get(companyId);
}

export async function replaceCompanyPresaleSettingsAction(
  companyId: string,
  presaleSettings: CompanyPresaleSettings,
) {
  return CompaniesPresalesRequest.replace(companyId, presaleSettings);
}
