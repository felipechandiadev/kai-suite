"use server";

import { CompaniesInventoryRequest } from "../infrastructure/companies-inventory.request";
import type { CompanyInventorySettings } from "../types/company-inventory.types";

export async function getCompanyInventorySettingsAction(companyId: string) {
  return CompaniesInventoryRequest.get(companyId);
}

export async function replaceCompanyInventorySettingsAction(
  companyId: string,
  inventorySettings: CompanyInventorySettings,
) {
  return CompaniesInventoryRequest.replace(companyId, inventorySettings);
}
