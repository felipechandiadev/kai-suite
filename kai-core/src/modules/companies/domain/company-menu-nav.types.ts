import { randomUUID } from 'crypto';

export type MenuNavLinkKind = 'anchor' | 'external';

export type MenuNavLink = {
  id: string;
  label: string;
  kind: MenuNavLinkKind;
  href: string;
  enabled: boolean;
  order: number;
};

export const MENU_NAV_LINK_LABEL_MAX = 40;
export const MENU_NAV_LINKS_PER_GROUP_MAX = 8;

const KINDS: MenuNavLinkKind[] = ['anchor', 'external'];

function isKind(v: unknown): v is MenuNavLinkKind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}

function trimLabel(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().slice(0, MENU_NAV_LINK_LABEL_MAX);
  return t.length > 0 ? t : undefined;
}

function isValidHref(kind: MenuNavLinkKind, href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  if (kind === 'anchor') return /^#[a-zA-Z0-9_-]+$/.test(h);
  if (kind === 'external') return /^https:\/\/.+/.test(h);
  return false;
}

export function sanitizeMenuNavLink(
  raw: unknown,
  fallbackOrder: number,
): MenuNavLink | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const kind = isKind(o.kind) ? o.kind : 'anchor';
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

export function sanitizeMenuNavLinks(
  raw: unknown,
  maxCount: number,
): MenuNavLink[] {
  if (!Array.isArray(raw)) return [];
  const links: MenuNavLink[] = [];
  for (let i = 0; i < raw.length && links.length < maxCount; i++) {
    const link = sanitizeMenuNavLink(raw[i], i);
    if (link) links.push(link);
  }
  return links
    .sort((a, b) => a.order - b.order)
    .map((link, index) => ({ ...link, order: index }));
}

export function newMenuNavLink(
  partial: Pick<MenuNavLink, 'label' | 'kind' | 'href'> & { order: number },
): MenuNavLink {
  return {
    id: randomUUID(),
    label: partial.label.slice(0, MENU_NAV_LINK_LABEL_MAX),
    kind: partial.kind,
    href: partial.href,
    enabled: true,
    order: partial.order,
  };
}
