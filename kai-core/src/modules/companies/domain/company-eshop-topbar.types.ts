import {
  ESHOP_NAV_LINKS_PER_GROUP_MAX,
  newEShopNavLink,
  sanitizeEShopNavLinks,
  type EShopNavLink,
} from './company-eshop-nav.types';

export type CompanyEShopTopBarSettings = {
  showLogo: boolean;
  showCompanyName: boolean;
  showCart: boolean;
  navLinks: EShopNavLink[];
};

export function buildDefaultCompanyEShopTopBarSettings(): CompanyEShopTopBarSettings {
  return {
    showLogo: true,
    showCompanyName: true,
    showCart: true,
    navLinks: [
      newEShopNavLink({
        label: 'Productos',
        kind: 'route',
        href: '/productos',
        order: 0,
      }),
      newEShopNavLink({
        label: 'Encuéntranos',
        kind: 'anchor',
        href: '#donde-estamos',
        order: 1,
      }),
      newEShopNavLink({
        label: 'Nosotros',
        kind: 'route',
        href: '/nosotros',
        order: 2,
      }),
    ],
  };
}

export function sanitizeCompanyEShopTopBarSettings(
  raw: unknown,
): CompanyEShopTopBarSettings {
  const defaults = buildDefaultCompanyEShopTopBarSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  const navLinks = sanitizeEShopNavLinks(
    o.navLinks,
    ESHOP_NAV_LINKS_PER_GROUP_MAX,
  );
  return {
    showLogo: o.showLogo !== false,
    showCompanyName: o.showCompanyName !== false,
    showCart: o.showCart !== false,
    navLinks: navLinks.length > 0 ? navLinks : defaults.navLinks,
  };
}

export function resolveEShopTopBar(
  settings: Record<string, unknown> | null | undefined,
): CompanyEShopTopBarSettings {
  const raw = settings?.eShopTopBar;
  return sanitizeCompanyEShopTopBarSettings(raw);
}
