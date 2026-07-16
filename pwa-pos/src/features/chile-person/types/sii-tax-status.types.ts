export type SiiTaxStatusActivityView = {
  code: string;
  name: string;
  category: "PRIMERA" | "SEGUNDA";
  ivaAffected: boolean;
  requiresOverrides: boolean;
};

export type SiiTaxStatusView = {
  rut: string;
  legalName: string;
  activityStarted: boolean;
  activityStartDate: string | null;
  smallBusiness: string | null;
  foreignCurrencyAuth: string | null;
  economicActivities: SiiTaxStatusActivityView[];
  warnings: string[];
  fetchedAt: string;
};

export type SiiCompanyFormDraft = {
  businessName: string;
  documentNumber: string;
  activityStarted: boolean;
  economicActivities: import("@kai/chile-catalogs").PersonEconomicActivity[];
};

export type LookupSiiTaxStatusResult =
  | { success: true; data: SiiTaxStatusView }
  | { success: false; error: string };
