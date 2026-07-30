import { randomUUID } from 'crypto';

export type EShopNavLinkKind = 'route' | 'anchor' | 'external';

export type EShopNavLink = {
  id: string;
  label: string;
  kind: EShopNavLinkKind;
  href: string;
  enabled: boolean;
  order: number;
};

export const ESHOP_NAV_LINK_LABEL_MAX = 40;
export const ESHOP_NAV_LINKS_PER_GROUP_MAX = 8;

/** Rutas internas permitidas en enlaces eShop. */
export const ESHOP_ALLOWED_INTERNAL_ROUTES = [
  '/',
  '/productos',
  '/nosotros',
  '/donde-estamos',
  '/checkout',
] as const;

const KINDS: EShopNavLinkKind[] = ['route', 'anchor', 'external'];

function isKind(v: unknown): v is EShopNavLinkKind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}

function trimLabel(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, ESHOP_NAV_LINK_LABEL_MAX);
  return t.length > 0 ? t : undefined;
}

function isValidRoute(href: string): boolean {
  if (!href.startsWith('/')) return false;
  const path = href.split('?')[0]?.split('#')[0] ?? href;
  if ((ESHOP_ALLOWED_INTERNAL_ROUTES as readonly string[]).includes(path)) {
    return true;
  }
  if (path.startsWith('/productos/')) return true;
  return false;
}

function isValidHref(kind: EShopNavLinkKind, href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  if (kind === 'route') return isValidRoute(h);
  if (kind === 'anchor') return /^#[a-zA-Z0-9_-]+$/.test(h);
  if (kind === 'external') return /^https:\/\/.+/.test(h);
  return false;
}

export function sanitizeEShopNavLink(
  raw: unknown,
  fallbackOrder: number,
): EShopNavLink | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const kind = isKind(o.kind) ? o.kind : 'route';
  const href = typeof o.href === 'string' ? o.href.trim() : '';
  if (!isValidHref(kind, href)) return null;
  const label = trimLabel(o.label);
  if (!label) return null;
  const id =
    typeof o.id === 'string' && o.id.trim().length > 0
      ? o.id.trim()
      : randomUUID();
  const order =
    typeof o.order === 'number' && Number.isFinite(o.order)
      ? Math.max(0, Math.floor(o.order))
      : fallbackOrder;
  return {
    id,
    label,
    kind,
    href,
    enabled: o.enabled !== false,
    order,
  };
}

export function sanitizeEShopNavLinks(
  raw: unknown,
  maxCount: number,
): EShopNavLink[] {
  if (!Array.isArray(raw)) return [];
  const links: EShopNavLink[] = [];
  for (let i = 0; i < raw.length && links.length < maxCount; i++) {
    const link = sanitizeEShopNavLink(raw[i], i);
    if (link) links.push(link);
  }
  return links
    .sort((a, b) => a.order - b.order)
    .map((link, index) => ({ ...link, order: index }));
}

export function newEShopNavLink(
  partial: Pick<EShopNavLink, 'label' | 'kind' | 'href'> & { order: number },
): EShopNavLink {
  return {
    id: randomUUID(),
    label: partial.label.slice(0, ESHOP_NAV_LINK_LABEL_MAX),
    kind: partial.kind,
    href: partial.href,
    enabled: true,
    order: partial.order,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Ruta interna de catálogo filtrada por categoría. */
export function buildEShopProductCategoryNavHref(categoryId: string): string {
  const id = categoryId.trim();
  return `/productos?categoryId=${encodeURIComponent(id)}`;
}

/** Extrae categoryId de un href de navegación de productos. */
export function parseEShopProductCategoryIdFromNavHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith('/productos')) return null;
  const query = trimmed.includes('?') ? trimmed.split('?')[1]?.split('#')[0] : '';
  if (!query) return null;
  const params = new URLSearchParams(query);
  const categoryId = params.get('categoryId')?.trim();
  if (!categoryId || !UUID_RE.test(categoryId)) return null;
  return categoryId;
}

export function isEShopProductCategoryNavHref(href: string): boolean {
  return parseEShopProductCategoryIdFromNavHref(href) !== null;
}
