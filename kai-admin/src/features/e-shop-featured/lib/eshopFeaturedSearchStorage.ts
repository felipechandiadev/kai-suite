/** Clave en `localStorage` para resultados por página del buscador de productos destacados. */
import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "../../../../../shared/storage-key-migrate";

export const ESHOP_FEATURED_SEARCH_LS_KEY = "kai.eshopFeaturedSearch.pageSize";
export const ESHOP_FEATURED_SEARCH_LS_KEY_LEGACY = "flowstore.eshopFeaturedSearch.pageSize";

export const ESHOP_FEATURED_SEARCH_MIN_PAGE_SIZE = 5;
export const ESHOP_FEATURED_SEARCH_MAX_PAGE_SIZE = 50;

export function readEshopFeaturedSearchPageSize(defaultSize: number): number {
  if (typeof window === "undefined") {
    return defaultSize;
  }
  try {
    const raw = getMigratedLocalStorageItem(
      ESHOP_FEATURED_SEARCH_LS_KEY,
      ESHOP_FEATURED_SEARCH_LS_KEY_LEGACY,
    );
    if (raw == null || raw === "") {
      return defaultSize;
    }
    return clampEshopFeaturedSearchPageSize(parseInt(raw, 10), defaultSize);
  } catch {
    return defaultSize;
  }
}

export function writeEshopFeaturedSearchPageSize(n: number, defaultSize: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    setMigratedLocalStorageItem(
      ESHOP_FEATURED_SEARCH_LS_KEY,
      ESHOP_FEATURED_SEARCH_LS_KEY_LEGACY,
      String(clampEshopFeaturedSearchPageSize(n, defaultSize)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clampEshopFeaturedSearchPageSize(n: number, defaultSize: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return defaultSize;
  }
  return Math.min(
    ESHOP_FEATURED_SEARCH_MAX_PAGE_SIZE,
    Math.max(ESHOP_FEATURED_SEARCH_MIN_PAGE_SIZE, x),
  );
}
