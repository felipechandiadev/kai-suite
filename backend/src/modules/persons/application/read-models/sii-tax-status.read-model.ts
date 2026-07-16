export type SiiTaxStatusActivityReadModel = {
  code: string;
  name: string;
  category: 'PRIMERA' | 'SEGUNDA';
  ivaAffected: boolean;
  requiresOverrides: boolean;
};

export type SiiTaxStatusReadModel = {
  rut: string;
  legalName: string;
  activityStarted: boolean;
  activityStartDate: string | null;
  smallBusiness: string | null;
  foreignCurrencyAuth: string | null;
  economicActivities: SiiTaxStatusActivityReadModel[];
  warnings: string[];
  fetchedAt: string;
};
