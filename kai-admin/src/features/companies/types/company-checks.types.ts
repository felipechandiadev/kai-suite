/**
 * Configuración de cheques de una empresa. Espejo del tipo backend en
 * `kai-core/src/modules/companies/domain/company-checks.types.ts`.
 * Se persiste en `company.settings.checks` (JSON).
 */
export interface CompanyCheckSettings {
  enabled: boolean;
  receiveChecks: boolean;
  issueChecks: boolean;
  allowPostdatedReceived: boolean;
  allowPostdatedIssued: boolean;
  defaultDepositBankAccountKey: string | null;
  defaultIssueBankAccountKey: string | null;
}

export function defaultCompanyCheckSettings(): CompanyCheckSettings {
  return {
    enabled: false,
    receiveChecks: false,
    issueChecks: false,
    allowPostdatedReceived: false,
    allowPostdatedIssued: false,
    defaultDepositBankAccountKey: null,
    defaultIssueBankAccountKey: null,
  };
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

/** Lee `settings.checks.enabled` del JSON de empresa (misma coerción que el backend). */
export function isCompanyChecksEnabledFromSettings(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  const checks = settings?.checks;
  if (checks == null || typeof checks !== "object" || Array.isArray(checks)) {
    return false;
  }
  return truthy((checks as Record<string, unknown>).enabled);
}
