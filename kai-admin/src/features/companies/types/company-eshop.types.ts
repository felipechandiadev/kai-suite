export type CompanyEShopFlatSettings = {
  eShopEnabled: boolean;
  eShopPublicSlug: string | null;
  eShopFeaturedProductVariantIds: string[];
  eShopFeaturedProductIds: string[];
  eShopFreeShippingThreshold: number | null;
  eShopShippingMode: "disabled" | "flat" | "distance";
  eShopDefaultBranchId: string | null;
  eShopDefaultPriceListId: string | null;
  eShopDefaultStorageId: string | null;
  eShopHeroSliderAutoplaySeconds: number;
  eShopStockPolicy: "ALLOW_BACKORDER" | "BLOCK_OUT_OF_STOCK" | "IGNORE_STOCK";
};

export type CompanyPublicContactSettings = {
  email?: string;
  phone?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
};

export type CompanyIdentitySettings = {
  tagline?: string;
  brandManifest?: string;
};

export function defaultCompanyEShopFlatSettings(): CompanyEShopFlatSettings {
  return {
    eShopEnabled: false,
    eShopPublicSlug: null,
    eShopFeaturedProductVariantIds: [],
    eShopFeaturedProductIds: [],
    eShopFreeShippingThreshold: null,
    eShopShippingMode: "disabled",
    eShopDefaultBranchId: null,
    eShopDefaultPriceListId: null,
    eShopDefaultStorageId: null,
    eShopHeroSliderAutoplaySeconds: 6,
    eShopStockPolicy: "ALLOW_BACKORDER",
  };
}

export function isEShopEnabledFromSettings(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  return settings?.eShopEnabled === true;
}
