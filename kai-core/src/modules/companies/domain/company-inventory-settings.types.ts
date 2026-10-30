/**
 * Qué hacer cuando una venta pide más stock del disponible.
 * - ALLOW: se vende igual y el stock queda negativo.
 * - WARN: se vende igual, el stock queda negativo y se deja registro (log) para revisar.
 * - BLOCK: se rechaza la venta (comportamiento histórico y por defecto).
 * Una variante con `allowNegativeStock = true` siempre vende (ALLOW).
 */
export type NegativeStockPolicy = 'ALLOW' | 'WARN' | 'BLOCK';

export interface CompanyInventorySettings {
  negativeStockPolicy: NegativeStockPolicy;
}

export const DEFAULT_NEGATIVE_STOCK_POLICY: NegativeStockPolicy = 'BLOCK';

export function sanitizeNegativeStockPolicy(raw: unknown): NegativeStockPolicy {
  return raw === 'ALLOW' || raw === 'WARN' || raw === 'BLOCK'
    ? raw
    : DEFAULT_NEGATIVE_STOCK_POLICY;
}

export function sanitizeCompanyInventorySettings(
  raw: unknown,
): CompanyInventorySettings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { negativeStockPolicy: sanitizeNegativeStockPolicy(o.negativeStockPolicy) };
}

/** Política de la empresa a partir de `company.settings`. */
export function resolveNegativeStockPolicy(
  settings: Record<string, any> | null | undefined,
): NegativeStockPolicy {
  return sanitizeNegativeStockPolicy(settings?.inventory?.negativeStockPolicy);
}
