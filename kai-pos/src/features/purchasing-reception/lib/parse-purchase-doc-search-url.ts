import {
  clampPurchaseDocVariantSearchPageSize,
  PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE,
} from "@/shared/components/PurchaseDocumentBuilder/purchaseDocVariantSearchStorage";

/** Deben coincidir con `PurchaseDocumentVariantSearchPanel` (misma query en cliente y SSR). */
const PURCHASE_DOC_URL_QUERY = "v";
const PURCHASE_DOC_URL_PAGE = "vp";
const PURCHASE_DOC_URL_LIMIT = "limit";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

/** Lectura estable de `v`, `vp`, `limit` desde `searchParams` del App Router. */
export function getPurchaseDocSearchFromUrl(sp: Record<string, string | string[] | undefined>): {
  q: string;
  page: number;
  pageSize: number;
} {
  const q = parseSp(sp, PURCHASE_DOC_URL_QUERY);
  const page = Math.max(1, parseInt(parseSp(sp, PURCHASE_DOC_URL_PAGE) || "1", 10) || 1);
  const limitRaw = parseSp(sp, PURCHASE_DOC_URL_LIMIT);
  const limitParsed = limitRaw ? parseInt(limitRaw, 10) : NaN;
  const pageSize = Number.isFinite(limitParsed)
    ? clampPurchaseDocVariantSearchPageSize(limitParsed)
    : PURCHASE_DOC_VARIANT_SEARCH_DEFAULT_PAGE_SIZE;
  return { q, page, pageSize };
}
