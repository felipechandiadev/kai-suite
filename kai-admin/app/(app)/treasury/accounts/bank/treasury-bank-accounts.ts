import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";

/** Clave estable para URL y API (alineado con `TreasuryBankTabContent`). */
export function treasuryBankAccountKey(a: CompanyBankAccountItem): string {
  const k = a.accountKey?.trim();
  if (k) return k;
  return `${String(a.bankName)}_${String(a.accountNumber)}`;
}

export function treasuryDefaultBankAccountKey(accounts: CompanyBankAccountItem[]): string | null {
  if (accounts.length === 0) return null;
  const primary = accounts.find((x) => x.isPrimary === true);
  return treasuryBankAccountKey(primary ?? accounts[0]!);
}

/**
 * Si `bankAccount` en la URL falta o no coincide con ninguna cuenta, hay que redirigir
 * al default (principal o primera). Si es válido, no redirige.
 */
export function resolveTreasuryBankAccountSelection(
  accounts: CompanyBankAccountItem[],
  bankAccountParam: string | undefined | null,
): { selectedKey: string | null; mustRedirect: boolean } {
  if (accounts.length === 0) {
    return { selectedKey: null, mustRedirect: false };
  }
  const valid = new Set(accounts.map(treasuryBankAccountKey));
  const defaultKey = treasuryDefaultBankAccountKey(accounts)!;
  const raw = typeof bankAccountParam === "string" && bankAccountParam.trim() !== "" ? bankAccountParam.trim() : null;
  if (raw && valid.has(raw)) {
    return { selectedKey: raw, mustRedirect: false };
  }
  return { selectedKey: defaultKey, mustRedirect: true };
}
