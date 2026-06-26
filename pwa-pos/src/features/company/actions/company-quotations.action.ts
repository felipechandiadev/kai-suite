"use server";

import { CompaniesQuotationsRequest } from "../infrastructure/companies-quotations.request";
import type { CompanyQuotationSettings } from "../types/company-quotations.types";
import { DEFAULT_COMPANY_QUOTATION_SETTINGS } from "../types/company-quotations.types";

export type { CompanyQuotationSettings };

/** Configuración de cotizaciones de la empresa activa. Fail-closed si falla la carga. */
export async function getCompanyQuotationSettingsAction(): Promise<CompanyQuotationSettings> {
  const res = await CompaniesQuotationsRequest.getForActiveCompany();
  if (!res.success) {
    return { ...DEFAULT_COMPANY_QUOTATION_SETTINGS, enabled: false };
  }
  return res.quotationSettings;
}

/** `true` si la empresa tiene habilitado el módulo de cotizaciones. */
export async function getQuotationsEnabledAction(): Promise<boolean> {
  const settings = await getCompanyQuotationSettingsAction();
  return settings.enabled === true;
}
