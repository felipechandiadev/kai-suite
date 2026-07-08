/**
 * Política global de venta sin pago inmediato (cobro pendiente).
 *
 * Persiste en `companies.settings.deferredPayment`.
 *
 * - `enabled`: si false, ningún POS puede emitir ventas con `deferPayment`.
 */
export interface CompanyDeferredPaymentSettings {
  enabled: boolean;
}

export function buildDefaultCompanyDeferredPaymentSettings(): CompanyDeferredPaymentSettings {
  return { enabled: false };
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true';

export function sanitizeCompanyDeferredPaymentSettings(
  raw: unknown,
): CompanyDeferredPaymentSettings {
  const r = (raw ?? {}) as Partial<CompanyDeferredPaymentSettings> & {
    [k: string]: unknown;
  };
  return {
    enabled: truthy(r.enabled),
  };
}
