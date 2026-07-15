import type { CompanyBankAccountItem } from "@/features/purchasing-reception/types/company.types";
import type { SupplierPersonBankAccount } from "@/features/purchasing-reception/types/supplier.types";

export type BankLike = CompanyBankAccountItem | SupplierPersonBankAccount;

export function bankAccountOptionKey(a: BankLike, index: number): string {
  const k = a.accountKey != null ? String(a.accountKey).trim() : "";
  if (k) {
    return k;
  }
  return `idx-${index}-${a.bankName}-${a.accountNumber}`;
}

/** Para cheques: el banco se toma de la cuenta empresa seleccionada; `fallback` cubre datos legacy. */
export function resolveChequeBankNameFromCompanyAccount(
  companyBankAccountKey: string | null | undefined,
  companyBankAccounts: CompanyBankAccountItem[],
  fallback?: string | null,
): string | null {
  const key = companyBankAccountKey != null ? String(companyBankAccountKey).trim() : "";
  if (key) {
    const idx = companyBankAccounts.findIndex((a, i) => bankAccountOptionKey(a, i) === key);
    if (idx >= 0) {
      const n = companyBankAccounts[idx]?.bankName?.trim();
      if (n) {
        return n;
      }
    }
  }
  const f = fallback != null ? String(fallback).trim() : "";
  return f || null;
}

/** Fecha local YYYY-MM-DD (sin UTC shift). */
export function toYyyyMmDdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYyyyMmDdLocal(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

export function addCalendarDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

/** Suma meses calendario conservando el día cuando es posible (p. ej. 31 ene + 1 mes → 28/29 feb). */
export function addCalendarMonths(d: Date, months: number): Date {
  const x = new Date(d.getTime());
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  if (x.getDate() !== day) {
    x.setDate(0);
  }
  return x;
}

/** Reparte `total` en `count` partes enteras que suman exactamente `total`. */
/** Interpreta monto CLP desde TextField (solo dígitos o texto con separadores). */
export function parseClpAmountInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) {
    return 0;
  }
  const n = Number(digits);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function splitTotalAcrossLines(total: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }
  const n = Math.max(0, Math.round(total));
  const base = Math.floor(n / count);
  const rem = n - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
}
