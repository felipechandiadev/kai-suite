const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildEShopProductCategoryNavHref(categoryId: string): string {
  const id = categoryId.trim();
  return `/productos?categoryId=${encodeURIComponent(id)}`;
}

export function parseEShopProductCategoryIdFromNavHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/productos")) return null;
  const query = trimmed.includes("?") ? trimmed.split("?")[1]?.split("#")[0] : "";
  if (!query) return null;
  const params = new URLSearchParams(query);
  const categoryId = params.get("categoryId")?.trim();
  if (!categoryId || !UUID_RE.test(categoryId)) return null;
  return categoryId;
}

export function isEShopProductCategoryNavHref(href: string): boolean {
  return parseEShopProductCategoryIdFromNavHref(href) !== null;
}

export function getEShopNavRouteBasePath(href: string): string {
  return href.trim().split("?")[0]?.split("#")[0] ?? href.trim();
}
