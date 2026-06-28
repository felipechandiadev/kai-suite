/** Snapshot del cierre para la página `/cash/closing/result` (sin TopBar). */

import {
  getMigratedSessionStorageItem,
  removeMigratedSessionStorageKeys,
  setMigratedSessionStorageItem,
} from "../../../../../shared/storage-key-migrate";

export const CASH_CLOSING_RESULT_STORAGE_KEY = "kai.cashClosing.result.v1";
export const CASH_CLOSING_RESULT_STORAGE_KEY_LEGACY = "flowstore.cashClosing.result.v1";

export type CashClosingCloseResultPayload = {
  success: true;
  message?: string;
  sessionId?: string;
  closingTransactionId?: string | null;
  hubTransferTransactionId?: string | null;
  expectedAmount?: number;
  salesTotal?: number;
  systemCashExpected?: number;
  usedBlindCount?: boolean;
  countedGrand?: number;
  counted?: Record<string, number>;
  difference?: number;
};

export type CashClosingResultSnapshot = {
  closeResult: CashClosingCloseResultPayload;
  sessionOpenedAt: string | null;
  notes: string;
  countedGrand: number;
  pointOfSaleName: string | null;
  branchName: string | null;
  operatorName: string | null;
  closedAt: string;
};

export function saveCashClosingResultSnapshot(snapshot: CashClosingResultSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedSessionStorageItem(
      CASH_CLOSING_RESULT_STORAGE_KEY,
      CASH_CLOSING_RESULT_STORAGE_KEY_LEGACY,
      JSON.stringify(snapshot),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readCashClosingResultSnapshot(): CashClosingResultSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getMigratedSessionStorageItem(
      CASH_CLOSING_RESULT_STORAGE_KEY,
      CASH_CLOSING_RESULT_STORAGE_KEY_LEGACY,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CashClosingResultSnapshot;
    if (!parsed?.closeResult || parsed.closeResult.success !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCashClosingResultSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    removeMigratedSessionStorageKeys(
      CASH_CLOSING_RESULT_STORAGE_KEY,
      CASH_CLOSING_RESULT_STORAGE_KEY_LEGACY,
    );
  } catch {
    // ignore
  }
}
