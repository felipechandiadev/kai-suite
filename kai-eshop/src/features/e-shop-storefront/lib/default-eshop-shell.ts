import type {
  CompanyEShopFooterSettings,
  CompanyEShopTopBarSettings,
} from "../types/storefront.types";

export const DEFAULT_ESHOP_TOP_BAR: CompanyEShopTopBarSettings = {
  showLogo: true,
  showCompanyName: true,
  showCart: true,
  navLinks: [
    {
      id: "default-productos",
      label: "Productos",
      kind: "route",
      href: "/productos",
      enabled: true,
      order: 0,
    },
    {
      id: "default-encuentranos",
      label: "Encuéntranos",
      kind: "anchor",
      href: "#donde-estamos",
      enabled: true,
      order: 1,
    },
    {
      id: "default-nosotros",
      label: "Nosotros",
      kind: "route",
      href: "/nosotros",
      enabled: true,
      order: 2,
    },
  ],
};

export const DEFAULT_ESHOP_FOOTER: CompanyEShopFooterSettings = {
  showLogo: true,
  showTagline: true,
  showBrandManifest: true,
  showContactBlock: true,
  showSocialLinks: true,
  linkGroups: [
    {
      id: "default-enlaces",
      title: "Enlaces",
      enabled: true,
      order: 0,
      links: [
        {
          id: "default-footer-nosotros",
          label: "Nosotros",
          kind: "route",
          href: "/nosotros",
          enabled: true,
          order: 0,
        },
        {
          id: "default-footer-encuentranos",
          label: "Encuéntranos",
          kind: "route",
          href: "/donde-estamos",
          enabled: true,
          order: 1,
        },
      ],
    },
  ],
};
