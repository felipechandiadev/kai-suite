export type EShopNavLinkKind = "route" | "anchor" | "external";

export type EShopNavLink = {
  id: string;
  label: string;
  kind: EShopNavLinkKind;
  href: string;
  enabled: boolean;
  order: number;
};

export type CompanyEShopTopBarSettings = {
  showLogo: boolean;
  showCompanyName: boolean;
  showCart: boolean;
  navLinks: EShopNavLink[];
};

export type EShopFooterLinkGroup = {
  id: string;
  title: string;
  links: EShopNavLink[];
  order: number;
  enabled: boolean;
};

export type CompanyEShopFooterSettings = {
  showLogo: boolean;
  showTagline: boolean;
  showBrandManifest: boolean;
  showContactBlock: boolean;
  showSocialLinks: boolean;
  copyrightSuffix?: string;
  linkGroups: EShopFooterLinkGroup[];
};

export type EShopThemeTokenKey =
  | "primary"
  | "secondary"
  | "background"
  | "foreground"
  | "accent"
  | "border"
  | "chrome"
  | "chromeForeground"
  | "surface"
  | "active"
  | "muted"
  | "mutedForeground";

export type EShopThemeTokens = Record<EShopThemeTokenKey, string>;

export type EShopTemplateId = "classic" | "minimal" | "bold" | "warm" | "jewelry";

export type EShopResolvedTheme = {
  templateId: EShopTemplateId;
  tokens: EShopThemeTokens;
};

export type EShopStorefront = {
  companyName: string;
  companyLogoUrl: string | null;
  slug: string;
  tagline: string | null;
  brandManifest: string | null;
  publicContact: {
    email?: string;
    phone?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  eShopEnabled: boolean;
  eShopFreeShippingThreshold: number | null;
  eShopCustomerPortalEnabled?: boolean;
  eShopRegistrationRequireRut?: boolean;
  eShopFeaturedProductIds?: string[];
  eShopFeaturedProductVariantIds: string[];
  theme?: EShopResolvedTheme;
  topBar?: CompanyEShopTopBarSettings;
  footer?: CompanyEShopFooterSettings;
};

export type EShopProductCard = {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  inStock: boolean;
  defaultVariantId: string | null;
};

export type EShopCatalogMultimediaItem = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  isPrimary?: boolean;
};

export type EShopCatalogProductVariant = {
  id: string;
  sku: string;
  attributeValues: Record<string, string>;
  basePrice: number;
  inStock: boolean;
  multimedia: EShopCatalogMultimediaItem[];
};

export type EShopCatalogProductDetail = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    categoryName: string | null;
    description: string | null;
    productType: string;
    multimedia: EShopCatalogMultimediaItem[];
  };
  variants: EShopCatalogProductVariant[];
  attributeOptions: Record<string, string[]>;
  defaultVariantId: string | null;
};

export type EShopHeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaStyle: "none" | "button" | "link";
  textAlign: "left" | "center" | "right";
  overlayOpacity: number;
  textColor?: string | null;
  imageUrl: string | null;
};

export type EShopTestimonial = {
  id: string;
  clientName: string;
  rating: number;
  message: string;
  avatarUrl: string | null;
};

export type EShopBranch = {
  id: string;
  name: string;
  address?: string | null;
  location?: { lat: number; lng: number } | null;
};
