import type { DiningOrderProfile } from '../domain/dining-order.entity';

export const DINING_CUSTOMER_NAME_MAX_LENGTH = 80;

/**
 * Nombre de cliente en profile: trim, tope de longitud.
 * Vacío → null (el caller usa displayLabel como default).
 */
export function normalizeDiningCustomerName(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim().slice(0, DINING_CUSTOMER_NAME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/** Profile al abrir cuenta: customerName = explícito o displayLabel. */
export function buildDiningOrderProfileOnOpen(
  displayLabel: string,
  profile?: DiningOrderProfile | null,
): DiningOrderProfile {
  const base = profile && typeof profile === 'object' ? { ...profile } : {};
  const fromInput = normalizeDiningCustomerName(base.customerName);
  return {
    ...base,
    customerName: fromInput ?? displayLabel,
  };
}

/** Merge al renombrar: vacío vuelve a displayLabel. */
export function mergeDiningOrderCustomerName(
  current: DiningOrderProfile | null | undefined,
  customerName: string | null | undefined,
  displayLabel: string,
): DiningOrderProfile {
  const base = current && typeof current === 'object' ? { ...current } : {};
  const normalized = normalizeDiningCustomerName(customerName);
  return {
    ...base,
    customerName: normalized ?? displayLabel,
  };
}
