/** Configuración de cotizaciones de la empresa activa (espejo backend). */
export interface CompanyQuotationSettings {
  enabled: boolean;
  defaultValidityDays: number;
  maxValidityDays: number;
  allowCustomValidity: boolean;
  defaultTerms: string | null;
}

export const DEFAULT_COMPANY_QUOTATION_SETTINGS: CompanyQuotationSettings = {
  enabled: true,
  defaultValidityDays: 15,
  maxValidityDays: 60,
  allowCustomValidity: true,
  defaultTerms: null,
};
