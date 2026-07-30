/**
 * Persistencia local del `pageSize` preferido del buscador de clientes
 * en POS. Mismo patrón que `posProductSearchStorage` para mantener
 * consistencia: LS = preferencia personal, URL = override / deeplink.
 */

import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export const POS_CUSTOMER_SEARCH_LS_KEY = "kai.posCustomerSearch.pageSize";
export const POS_CUSTOMER_SEARCH_LS_KEY_LEGACY = "flowstore.posCustomerSearch.pageSize";

export const POS_CUSTOMER_SEARCH_DEBOUNCE_MS = 350;

export const POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE = 15;
export const POS_CUSTOMER_SEARCH_MIN = 1;
export const POS_CUSTOMER_SEARCH_MAX = 50;

export function clampPosCustomerSearchPageSize(n: number): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) {
    return POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE;
  }
  return Math.min(POS_CUSTOMER_SEARCH_MAX, Math.max(POS_CUSTOMER_SEARCH_MIN, x));
}

/** Solo en cliente; en SSR devolver el default. */
export function readPosCustomerSearchPageSize(): number {
  if (typeof window === "undefined") {
    return POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE;
  }
  try {
    const raw = getMigratedLocalStorageItem(
      POS_CUSTOMER_SEARCH_LS_KEY,
      POS_CUSTOMER_SEARCH_LS_KEY_LEGACY,
    );
    if (raw == null || raw === "") {
      return POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE;
    }
    return clampPosCustomerSearchPageSize(parseInt(raw, 10));
  } catch {
    return POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE;
  }
}

export function writePosCustomerSearchPageSize(n: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    setMigratedLocalStorageItem(
      POS_CUSTOMER_SEARCH_LS_KEY,
      POS_CUSTOMER_SEARCH_LS_KEY_LEGACY,
      String(clampPosCustomerSearchPageSize(n)),
    );
  } catch {
    // Ignorar quota / private mode.
  }
}
