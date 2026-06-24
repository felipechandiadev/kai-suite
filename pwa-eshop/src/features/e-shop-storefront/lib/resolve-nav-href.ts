import type { EShopNavLink } from "../types/storefront.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseProductCategoryIdFromNavHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/productos")) return null;
  const query = trimmed.includes("?") ? trimmed.split("?")[1]?.split("#")[0] : "";
  if (!query) return null;
  const categoryId = new URLSearchParams(query).get("categoryId")?.trim();
  if (!categoryId || !UUID_RE.test(categoryId)) return null;
  return categoryId;
}

/** Resuelve href de navegación según pathname (anclas en home vs rutas). */
export function resolveEShopNavHref(link: EShopNavLink, pathname: string): string {
  if (link.kind === "external") return link.href;
  if (link.kind === "route") return link.href;
  const anchor = link.href.startsWith("#") ? link.href : `#${link.href}`;
  return pathname === "/" ? anchor : `/${anchor.slice(1)}`;
}

export function isEShopNavLinkActive(
  link: EShopNavLink,
  pathname: string,
  currentCategoryId = "",
): boolean {
  if (link.kind === "route") {
    const linkPath = link.href.split("?")[0]?.split("#")[0] ?? link.href;
    if (linkPath !== pathname) return false;
    if (linkPath === "/productos") {
      const linkCategoryId = parseProductCategoryIdFromNavHref(link.href);
      if (linkCategoryId) return currentCategoryId === linkCategoryId;
      return !currentCategoryId;
    }
    return true;
  }
  if (link.kind === "anchor") {
    return pathname === "/";
  }
  return false;
}

export function eshopNavLinkKey(link: EShopNavLink): string {
  return link.id;
}

export function sortEnabledNavLinks<T extends EShopNavLink>(links: T[]): T[] {
  return [...links]
    .filter((l) => l.enabled)
    .sort((a, b) => a.order - b.order);
}
