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

export type EShopTopBarAdminState = {
  topBar: CompanyEShopTopBarSettings;
  resolved: CompanyEShopTopBarSettings;
};

export const NAV_LINK_KIND_LABELS: Record<EShopNavLinkKind, string> = {
  route: "Ruta interna",
  anchor: "Ancla (home)",
  external: "URL externa",
};

export const INTERNAL_ROUTE_OPTIONS = [
  { value: "/", label: "Inicio" },
  { value: "/productos", label: "Productos" },
  { value: "/nosotros", label: "Nosotros" },
  { value: "/donde-estamos", label: "Encuéntranos" },
  { value: "/checkout", label: "Checkout" },
] as const;
