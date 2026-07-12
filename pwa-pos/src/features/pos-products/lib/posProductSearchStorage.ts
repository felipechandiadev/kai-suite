/** Clave en `localStorage` para `pageSize` del buscador POS (mismo patrón que `purchaseDocVariantSearchStorage`). */

import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export const POS_PRODUCT_SEARCH_LS_KEY = "kai.posProductSearch.pageSize";
export const POS_PRODUCT_SEARCH_LS_KEY_LEGACY = "flowstore.posProductSearch.pageSize";
export const POS_PRODUCT_SEARCH_SHOW_FAVORITES_LS_KEY = "kai.posProductSearch.showFavorites";
export const POS_PRODUCT_SEARCH_SHOW_FAVORITES_LS_KEY_LEGACY =
  "flowstore.posProductSearch.showFavorites";
export const POS_PRODUCT_SEARCH_CAMERA_ENABLED_LS_KEY = "kai.posProductSearch.cameraEnabled";
export const POS_PRODUCT_SEARCH_CAMERA_ENABLED_LS_KEY_LEGACY =
  "flowstore.posProductSearch.cameraEnabled";

/** Mismo criterio que `PURCHASE_DOC_SEARCH_DEBOUNCE_MS` en pwa-admin (PurchaseDocumentVariantSearchPanel). */
export const POS_PRODUCT_SEARCH_DEBOUNCE_MS = 400;

export const POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE = 20;
export const POS_PRODUCT_SEARCH_MIN = 1;
export const POS_PRODUCT_SEARCH_MAX = 50;

export function clampPosProductSearchPageSize(n: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(POS_PRODUCT_SEARCH_MAX, Math.max(POS_PRODUCT_SEARCH_MIN, x));
}

/** Solo en cliente; en SSR devolver el default. */
export function readPosProductSearchPageSize(): number {
  if (typeof window === "undefined") {
    return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
  try {
    const raw = getMigratedLocalStorageItem(
      POS_PRODUCT_SEARCH_LS_KEY,
      POS_PRODUCT_SEARCH_LS_KEY_LEGACY,
    );
    if (raw == null || raw === "") {
      return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
    }
    return clampPosProductSearchPageSize(parseInt(raw, 10));
  } catch {
    return POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE;
  }
}

export function writePosProductSearchPageSize(n: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    setMigratedLocalStorageItem(
      POS_PRODUCT_SEARCH_LS_KEY,
      POS_PRODUCT_SEARCH_LS_KEY_LEGACY,
      String(clampPosProductSearchPageSize(n)),
    );
  } catch {
    // ignore quota / private mode
  }
}

/** Solo en cliente; en SSR devolver false. */
export function readPosProductSearchShowFavorites(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = getMigratedLocalStorageItem(
      POS_PRODUCT_SEARCH_SHOW_FAVORITES_LS_KEY,
      POS_PRODUCT_SEARCH_SHOW_FAVORITES_LS_KEY_LEGACY,
    );
    if (raw == null || raw === "") {
      return false;
    }
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function writePosProductSearchShowFavorites(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    setMigratedLocalStorageItem(
      POS_PRODUCT_SEARCH_SHOW_FAVORITES_LS_KEY,
      POS_PRODUCT_SEARCH_SHOW_FAVORITES_LS_KEY_LEGACY,
      enabled ? "1" : "0",
    );
  } catch {
    // ignore quota / private mode
  }
}

/** Solo en cliente; en SSR devolver false. */
export function readPosProductSearchCameraEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = getMigratedLocalStorageItem(
      POS_PRODUCT_SEARCH_CAMERA_ENABLED_LS_KEY,
      POS_PRODUCT_SEARCH_CAMERA_ENABLED_LS_KEY_LEGACY,
    );
    if (raw == null || raw === "") {
      return false;
    }
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function writePosProductSearchCameraEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    setMigratedLocalStorageItem(
      POS_PRODUCT_SEARCH_CAMERA_ENABLED_LS_KEY,
      POS_PRODUCT_SEARCH_CAMERA_ENABLED_LS_KEY_LEGACY,
      enabled ? "1" : "0",
    );
  } catch {
    // ignore quota / private mode
  }
}
