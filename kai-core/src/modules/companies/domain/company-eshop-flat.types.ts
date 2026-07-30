/**
 * Ajustes planos de tienda en `companies.settings` (sin objeto anidado `eShop`).
 */
export type EShopShippingMode = 'disabled' | 'flat' | 'distance';

export type EShopStockPolicy =
  | 'ALLOW_BACKORDER'
  | 'BLOCK_OUT_OF_STOCK'
  | 'IGNORE_STOCK';

export const ESHOP_STOCK_POLICIES: EShopStockPolicy[] = [
  'ALLOW_BACKORDER',
  'BLOCK_OUT_OF_STOCK',
  'IGNORE_STOCK',
];

export const ESHOP_HERO_SLIDER_AUTOPLAY_MIN_SECONDS = 3;
export const ESHOP_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS = 6;

export interface CompanyEShopFlatSettings {
  eShopEnabled: boolean;
  eShopPublicSlug: string | null;
  eShopFeaturedProductVariantIds: string[];
  /** Productos destacados en home eShop (orden = orden en vitrina). */
  eShopFeaturedProductIds: string[];
  eShopFreeShippingThreshold: number | null;
  eShopShippingMode: EShopShippingMode;
  eShopDefaultBranchId: string | null;
  eShopDefaultPriceListId: string | null;
  /** Almacén desde el cual se muestra disponibilidad y se despacha la tienda en línea. */
  eShopDefaultStorageId: string | null;
  eShopHeroSliderAutoplaySeconds: number;
  /** Comportamiento ante falta de stock en checkout eShop. */
  eShopStockPolicy: EShopStockPolicy;
  /** Portal Mi cuenta habilitado. */
  eShopCustomerPortalEnabled: boolean;
  /** RUT obligatorio al registrarse en eShop. */
  eShopRegistrationRequireRut: boolean;
  /** Mostrar deudas/cuotas en portal (requiere crédito interno). */
  eShopShowDebtsInPortal: boolean;
}

export function buildDefaultCompanyEShopFlatSettings(): CompanyEShopFlatSettings {
  return {
    eShopEnabled: false,
    eShopPublicSlug: null,
    eShopFeaturedProductVariantIds: [],
    eShopFeaturedProductIds: [],
    eShopFreeShippingThreshold: null,
    eShopShippingMode: 'disabled',
    eShopDefaultBranchId: null,
    eShopDefaultPriceListId: null,
    eShopDefaultStorageId: null,
    eShopHeroSliderAutoplaySeconds: ESHOP_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS,
    eShopStockPolicy: 'ALLOW_BACKORDER',
    eShopCustomerPortalEnabled: false,
    eShopRegistrationRequireRut: false,
    eShopShowDebtsInPortal: true,
  };
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

export function sanitizeCompanyEShopFlatSettings(
  settings: Record<string, unknown> | null | undefined,
): CompanyEShopFlatSettings {
  const defaults = buildDefaultCompanyEShopFlatSettings();
  if (!settings || typeof settings !== 'object') return defaults;

  const slug =
    typeof settings.eShopPublicSlug === 'string'
      ? settings.eShopPublicSlug.trim() || null
      : null;

  const featuredVariantIds = Array.isArray(settings.eShopFeaturedProductVariantIds)
    ? settings.eShopFeaturedProductVariantIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : [];

  const featuredProductIds = Array.isArray(settings.eShopFeaturedProductIds)
    ? settings.eShopFeaturedProductIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : [];

  const thresholdRaw = settings.eShopFreeShippingThreshold;
  const threshold =
    thresholdRaw == null || thresholdRaw === ''
      ? null
      : Math.max(0, Number(thresholdRaw) || 0);

  const mode = settings.eShopShippingMode;
  const shippingMode: EShopShippingMode =
    mode === 'flat' || mode === 'distance' ? mode : 'disabled';

  const branchId =
    typeof settings.eShopDefaultBranchId === 'string'
      ? settings.eShopDefaultBranchId.trim() || null
      : null;

  const priceListId =
    typeof settings.eShopDefaultPriceListId === 'string'
      ? settings.eShopDefaultPriceListId.trim() || null
      : null;

  const storageId =
    typeof settings.eShopDefaultStorageId === 'string'
      ? settings.eShopDefaultStorageId.trim() || null
      : null;

  const autoplayRaw = settings.eShopHeroSliderAutoplaySeconds;
  const autoplaySeconds = Math.max(
    ESHOP_HERO_SLIDER_AUTOPLAY_MIN_SECONDS,
    Math.round(Number(autoplayRaw) || ESHOP_HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS),
  );

  const stockPolicyRaw = settings.eShopStockPolicy;
  const stockPolicy: EShopStockPolicy = ESHOP_STOCK_POLICIES.includes(
    stockPolicyRaw as EShopStockPolicy,
  )
    ? (stockPolicyRaw as EShopStockPolicy)
    : defaults.eShopStockPolicy;

  return {
    eShopEnabled: truthy(settings.eShopEnabled),
    eShopPublicSlug: slug,
    eShopFeaturedProductVariantIds: featuredVariantIds,
    eShopFeaturedProductIds: featuredProductIds,
    eShopFreeShippingThreshold: threshold,
    eShopShippingMode: shippingMode,
    eShopDefaultBranchId: branchId,
    eShopDefaultPriceListId: priceListId,
    eShopDefaultStorageId: storageId,
    eShopHeroSliderAutoplaySeconds: autoplaySeconds,
    eShopStockPolicy: stockPolicy,
    eShopCustomerPortalEnabled: truthy(settings.eShopCustomerPortalEnabled),
    eShopRegistrationRequireRut: truthy(settings.eShopRegistrationRequireRut),
    eShopShowDebtsInPortal: settings.eShopShowDebtsInPortal === false ? false : true,
  };
}

export function isEShopEnabledFromSettings(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  return sanitizeCompanyEShopFlatSettings(settings).eShopEnabled;
}
