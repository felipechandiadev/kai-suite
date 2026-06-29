import type { CashSessionOpeningPrintInput } from "@/features/cash-session-opening/lib/cash-session-opening-print.types";
import {
  getMigratedSessionStorageItem,
  removeMigratedSessionStorageKeys,
  setMigratedSessionStorageItem,
} from "@kai-shared/storage-key-migrate";

const STORAGE_KEY = "kai.pendingCashSessionOpeningPrint";
const STORAGE_KEY_LEGACY = "flowstore.pendingCashSessionOpeningPrint";

/** Datos para imprimir tras llegar al POS (sin `company`; se resuelve allí). */
export type PendingCashSessionOpeningPrint = Omit<CashSessionOpeningPrintInput, "company">;

export function queueCashSessionOpeningPrint(pending: PendingCashSessionOpeningPrint): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedSessionStorageItem(STORAGE_KEY, STORAGE_KEY_LEGACY, JSON.stringify(pending));
  } catch {
    /* quota / private mode */
  }
}

export function peekPendingCashSessionOpeningPrint(): PendingCashSessionOpeningPrint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getMigratedSessionStorageItem(STORAGE_KEY, STORAGE_KEY_LEGACY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCashSessionOpeningPrint;
  } catch {
    return null;
  }
}

export function consumePendingCashSessionOpeningPrint(): PendingCashSessionOpeningPrint | null {
  const pending = peekPendingCashSessionOpeningPrint();
  if (!pending) return null;
  try {
    removeMigratedSessionStorageKeys(STORAGE_KEY, STORAGE_KEY_LEGACY);
  } catch {
    /* ignore */
  }
  return pending;
}
