import { randomUUID } from 'crypto';
import {
  ESHOP_NAV_LINKS_PER_GROUP_MAX,
  newEShopNavLink,
  sanitizeEShopNavLinks,
  type EShopNavLink,
} from './company-eshop-nav.types';

export const ESHOP_FOOTER_LINK_GROUPS_MAX = 4;
export const ESHOP_FOOTER_COPYRIGHT_SUFFIX_MAX = 80;

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

function trimTitle(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, 40);
  return t.length > 0 ? t : undefined;
}

function sanitizeLinkGroup(raw: unknown, fallbackOrder: number): EShopFooterLinkGroup | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = trimTitle(o.title);
  if (!title) return null;
  const id =
    typeof o.id === 'string' && o.id.trim().length > 0
      ? o.id.trim()
      : randomUUID();
  const order =
    typeof o.order === 'number' && Number.isFinite(o.order)
      ? Math.max(0, Math.floor(o.order))
      : fallbackOrder;
  const links = sanitizeEShopNavLinks(
    o.links,
    ESHOP_NAV_LINKS_PER_GROUP_MAX,
  );
  return {
    id,
    title,
    links,
    order,
    enabled: o.enabled !== false,
  };
}

function buildDefaultLinkGroups(): EShopFooterLinkGroup[] {
  return [
    {
      id: randomUUID(),
      title: 'Enlaces',
      enabled: true,
      order: 0,
      links: [
        newEShopNavLink({
          label: 'Nosotros',
          kind: 'route',
          href: '/nosotros',
          order: 0,
        }),
        newEShopNavLink({
          label: 'Encuéntranos',
          kind: 'route',
          href: '/donde-estamos',
          order: 1,
        }),
      ],
    },
  ];
}

export function buildDefaultCompanyEShopFooterSettings(): CompanyEShopFooterSettings {
  return {
    showLogo: true,
    showTagline: true,
    showBrandManifest: true,
    showContactBlock: true,
    showSocialLinks: true,
    copyrightSuffix: undefined,
    linkGroups: buildDefaultLinkGroups(),
  };
}

export function sanitizeCompanyEShopFooterSettings(
  raw: unknown,
): CompanyEShopFooterSettings {
  const defaults = buildDefaultCompanyEShopFooterSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;

  const groups: EShopFooterLinkGroup[] = [];
  if (Array.isArray(o.linkGroups)) {
    for (let i = 0; i < o.linkGroups.length && groups.length < ESHOP_FOOTER_LINK_GROUPS_MAX; i++) {
      const g = sanitizeLinkGroup(o.linkGroups[i], i);
      if (g) groups.push(g);
    }
  }

  const copyrightSuffix =
    typeof o.copyrightSuffix === 'string'
      ? o.copyrightSuffix.trim().slice(0, ESHOP_FOOTER_COPYRIGHT_SUFFIX_MAX) || undefined
      : undefined;

  return {
    showLogo: o.showLogo !== false,
    showTagline: o.showTagline !== false,
    showBrandManifest: o.showBrandManifest !== false,
    showContactBlock: o.showContactBlock !== false,
    showSocialLinks: o.showSocialLinks !== false,
    copyrightSuffix,
    linkGroups:
      groups.length > 0
        ? groups.sort((a, b) => a.order - b.order).map((g, i) => ({ ...g, order: i }))
        : defaults.linkGroups,
  };
}

export function resolveEShopFooter(
  settings: Record<string, unknown> | null | undefined,
): CompanyEShopFooterSettings {
  return sanitizeCompanyEShopFooterSettings(settings?.eShopFooter);
}
