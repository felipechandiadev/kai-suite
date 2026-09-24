/** pageSize del buscador POS Lite (mismo criterio que kai-pos). */

export const LITE_POS_PRODUCT_SEARCH_LS_KEY = "kai.lite.posProductSearch.pageSize";
export const LITE_POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE = 15;
export const LITE_POS_PRODUCT_SEARCH_MIN = 5;
export const LITE_POS_PRODUCT_SEARCH_MAX = 50;
export const LITE_POS_PRODUCT_SEARCH_DEBOUNCE_MS = 300;

export function clampLitePosProductSearchPageSize(n: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return LITE_POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(
    LITE_POS_PRODUCT_SEARCH_MAX,
    Math.max(LITE_POS_PRODUCT_SEARCH_MIN, x),
  );
}

export function readLitePosProductSearchPageSize(): number {
  try {
    const raw = localStorage.getItem(LITE_POS_PRODUCT_SEARCH_LS_KEY);
    if (raw == null || raw === "") {
      return LITE_POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
    }
    return clampLitePosProductSearchPageSize(parseInt(raw, 10));
  } catch {
    return LITE_POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
}

export function writeLitePosProductSearchPageSize(n: number): void {
  try {
    localStorage.setItem(
      LITE_POS_PRODUCT_SEARCH_LS_KEY,
      String(clampLitePosProductSearchPageSize(n)),
    );
  } catch {
    /* ignore */
  }
}
