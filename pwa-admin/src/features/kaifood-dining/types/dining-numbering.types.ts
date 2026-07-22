export type DiningNumberingSettings = {
  branchId: string;
  companyId: string;
  timezone: string;
  resetTimeLocal: string;
  allowWaiterOpenTable: boolean;
  allowPosOpenTable: boolean;
  /** Vacío = todas las categorías en el menú de accounts. */
  posAccountsMenuCategoryIds: string[];
  posAccountsMenuCategories: Array<{ id: string; name: string }>;
};

export type DiningNumberingSettingsResult =
  | { success: true; settings: DiningNumberingSettings }
  | { success: false; message: string };
