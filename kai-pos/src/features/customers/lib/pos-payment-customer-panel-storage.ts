/**
 * Preferencia UI: panel de cliente en `/pos/payment` expandido o colapsado.
 * Default: colapsado (barra entre resumen y medios de pago).
 */

import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export const POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY =
  "kai.pos.payment.customerPanelOpen";

/** Solo en cliente; en SSR default colapsado. */
export function readPosPaymentCustomerPanelOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = getMigratedLocalStorageItem(
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
    );
    if (raw == null || raw === "") return false;
    return raw === "1" || raw === "true";
  } catch {
    return false;
  }
}

export function writePosPaymentCustomerPanelOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedLocalStorageItem(
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      open ? "1" : "0",
    );
  } catch {
    // ignore quota / private mode
  }
}
