import {
  clampVariantSearchPageSize,
  VARIANT_SEARCH_DEFAULT_PAGE_SIZE,
} from "./variantSearchStorage";

export const VARIANT_SEARCH_URL_QUERY = "q";
export const VARIANT_SEARCH_URL_PAGE = "page";
export const VARIANT_SEARCH_URL_LIMIT = "limit";

export { VARIANT_SEARCH_DEFAULT_PAGE_SIZE };
export const VARIANT_SEARCH_DEBOUNCE_MS = 400;

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export function getVariantSearchFromUrl(sp: Record<string, string | string[] | undefined>): {
  q: string;
  page: number;
  pageSize: number;
} {
  const q = parseSp(sp, VARIANT_SEARCH_URL_QUERY);
  const page = Math.max(1, parseInt(parseSp(sp, VARIANT_SEARCH_URL_PAGE) || "1", 10) || 1);
  const limitRaw = parseSp(sp, VARIANT_SEARCH_URL_LIMIT);
  const limitParsed = limitRaw ? parseInt(limitRaw, 10) : NaN;
  const pageSize = Number.isFinite(limitParsed)
    ? clampVariantSearchPageSize(limitParsed)
    : VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  return { q, page, pageSize };
}
