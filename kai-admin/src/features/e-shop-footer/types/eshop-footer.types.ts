import type { EShopNavLink, EShopNavLinkKind } from "@/features/e-shop-topbar/types/eshop-topbar.types";

export type { EShopNavLink, EShopNavLinkKind };

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

export type EShopFooterAdminState = {
  footer: CompanyEShopFooterSettings;
  resolved: CompanyEShopFooterSettings;
};
