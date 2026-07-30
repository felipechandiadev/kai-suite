/**
 * Política global de crédito interno para clientes.
 *
 * Persiste en `companies.settings.internalCustomerCredit` (JSON en
 * `companies.settings`).
 *
 * - `enabled`: si false, se desactivan medios empresa `INTERNAL_CREDIT`,
 *   la cascada en POS y no se permiten límites de crédito en altas/edición
 *   de cliente (validación en backend).
 */
export interface CompanyInternalCustomerCreditSettings {
  enabled: boolean;
}

export function buildDefaultInternalCustomerCreditSettings(): CompanyInternalCustomerCreditSettings {
  return { enabled: true };
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true';

export function sanitizeInternalCustomerCreditSettings(
  raw: unknown,
): CompanyInternalCustomerCreditSettings {
  const r = (raw ?? {}) as Partial<CompanyInternalCustomerCreditSettings> & {
    [k: string]: unknown;
  };
  return {
    enabled: truthy(r.enabled),
  };
}
