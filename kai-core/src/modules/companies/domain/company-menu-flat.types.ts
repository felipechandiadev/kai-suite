export const MENU_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS = 6;
export const MENU_HERO_SLIDER_AUTOPLAY_MIN_SECONDS = 3;

export type CompanyMenuFlatSettings = {
  menuEnabled: boolean;
  menuPublicSlug: string | null;
  menuDefaultPriceListId: string | null;
  menuDefaultBranchId: string | null;
  menuHeroSliderAutoplaySeconds: number;
};

export function buildDefaultCompanyMenuFlatSettings(): CompanyMenuFlatSettings {
  return {
    menuEnabled: false,
    menuPublicSlug: null,
    menuDefaultPriceListId: null,
    menuDefaultBranchId: null,
    menuHeroSliderAutoplaySeconds: MENU_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS,
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
  const autoplayRaw = settings.menuHeroSliderAutoplaySeconds;
  const autoplaySeconds = Math.max(
    MENU_HERO_SLIDER_AUTOPLAY_MIN_SECONDS,
    Math.round(
      Number(autoplayRaw) || MENU_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS,
    ),
  );
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
    menuHeroSliderAutoplaySeconds: autoplaySeconds,
  };
}
