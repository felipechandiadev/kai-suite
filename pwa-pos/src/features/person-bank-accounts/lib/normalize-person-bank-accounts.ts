import type { PersonBankAccountItem } from "../types/person-bank-account.types";

export function normalizePersonBankAccounts(raw: unknown): PersonBankAccountItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PersonBankAccountItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const bankName = o.bankName != null ? String(o.bankName) : "";
    const accountType = o.accountType != null ? String(o.accountType) : "";
    const accountNumber = o.accountNumber != null ? String(o.accountNumber) : "";
    if (!bankName || !accountNumber) {
      continue;
    }
    out.push({
      accountKey: o.accountKey != null ? String(o.accountKey) : undefined,
      bankName,
      accountType,
      accountNumber,
      accountHolderName: o.accountHolderName != null ? String(o.accountHolderName) : undefined,
      isPrimary: o.isPrimary === true,
      notes: o.notes != null ? String(o.notes) : undefined,
      currentBalance:
        typeof o.currentBalance === "number" && Number.isFinite(o.currentBalance)
          ? o.currentBalance
          : undefined,
    });
  }
  return out;
}
