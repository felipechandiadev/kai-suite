export type CompanyMenuFlatSettings = {
  menuEnabled: boolean;
  menuPublicSlug: string | null;
  menuDefaultPriceListId: string | null;
  menuDefaultBranchId: string | null;
};

export function buildDefaultCompanyMenuFlatSettings(): CompanyMenuFlatSettings {
  return {
    menuEnabled: false,
    menuPublicSlug: null,
    menuDefaultPriceListId: null,
    menuDefaultBranchId: null,
  };
}

export function sanitizeCompanyMenuFlatSettings(
  settings: Record<string, unknown> | null | undefined,
): CompanyMenuFlatSettings {
  const defaults = buildDefaultCompanyMenuFlatSettings();
  if (!settings || typeof settings !== 'object') return defaults;
  const slug =
    typeof settings.menuPublicSlug === 'string'
      ? settings.menuPublicSlug.trim() || null
      : null;
  return {
    menuEnabled: settings.menuEnabled === true,
    menuPublicSlug: slug,
    menuDefaultPriceListId:
      typeof settings.menuDefaultPriceListId === 'string' &&
      settings.menuDefaultPriceListId.trim()
        ? settings.menuDefaultPriceListId.trim()
        : null,
    menuDefaultBranchId:
      typeof settings.menuDefaultBranchId === 'string' &&
      settings.menuDefaultBranchId.trim()
        ? settings.menuDefaultBranchId.trim()
        : null,
  };
}
