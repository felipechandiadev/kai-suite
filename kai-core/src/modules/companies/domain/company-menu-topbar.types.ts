import {
  MENU_NAV_LINKS_PER_GROUP_MAX,
  newMenuNavLink,
  sanitizeMenuNavLinks,
  type MenuNavLink,
} from './company-menu-nav.types';

export type CompanyMenuTopBarSettings = {
  showLogo: boolean;
  showCompanyName: boolean;
  navLinks: MenuNavLink[];
};

export function buildDefaultCompanyMenuTopBarSettings(): CompanyMenuTopBarSettings {
  return {
    showLogo: true,
    showCompanyName: true,
    navLinks: [
      newMenuNavLink({
        label: 'Menú',
        kind: 'anchor',
        href: '#menu',
        order: 0,
      }),
      newMenuNavLink({
        label: 'Encuéntranos',
        kind: 'anchor',
        href: '#find-us',
        order: 1,
      }),
      newMenuNavLink({
        label: 'Nosotros',
        kind: 'anchor',
        href: '#about',
        order: 2,
      }),
    ],
  };
}

export function sanitizeCompanyMenuTopBarSettings(
  raw: unknown,
): CompanyMenuTopBarSettings {
  const defaults = buildDefaultCompanyMenuTopBarSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  const navLinks = sanitizeMenuNavLinks(o.navLinks, MENU_NAV_LINKS_PER_GROUP_MAX);
  return {
    showLogo: o.showLogo !== false,
    showCompanyName: o.showCompanyName !== false,
    navLinks: navLinks.length > 0 ? navLinks : defaults.navLinks,
  };
}

export function resolveMenuTopBar(
  settings: Record<string, unknown> | null | undefined,
): CompanyMenuTopBarSettings {
  const raw = settings?.menuTopBar;
  return sanitizeCompanyMenuTopBarSettings(raw);
}
