const ESHOP_FEATURED_URL_QUERY = "q";
const ESHOP_FEATURED_URL_PAGE = "fp";
const ESHOP_FEATURED_URL_LIMIT = "limit";

export const ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE = 10;

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export function clampFeaturedSearchPageSize(n: number): number {
  if (!Number.isFinite(n)) {
    return ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(50, Math.max(5, Math.round(n)));
}

export function getFeaturedSearchFromUrl(sp: Record<string, string | string[] | undefined>): {
  q: string;
  page: number;
  pageSize: number;
} {
  const q = parseSp(sp, ESHOP_FEATURED_URL_QUERY);
  const page = Math.max(1, parseInt(parseSp(sp, ESHOP_FEATURED_URL_PAGE) || "1", 10) || 1);
  const limitRaw = parseSp(sp, ESHOP_FEATURED_URL_LIMIT);
  const limitParsed = limitRaw ? parseInt(limitRaw, 10) : NaN;
  const pageSize = Number.isFinite(limitParsed)
    ? clampFeaturedSearchPageSize(limitParsed)
    : ESHOP_FEATURED_SEARCH_DEFAULT_PAGE_SIZE;
  return { q, page, pageSize };
}

export {
  ESHOP_FEATURED_URL_QUERY,
  ESHOP_FEATURED_URL_PAGE,
  ESHOP_FEATURED_URL_LIMIT,
};
