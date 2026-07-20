/**
 * Mapa canónico de tipos de movimiento de inventario para reportes.
 * Transferencias de empresa: contar solo TRANSFER_OUT (TRANSFER_IN es espejo)
 * cuando se listan transferencias; en trend de neto se usan ambos signos.
 */

export type InventoryMovementFamily =
  | 'transfer'
  | 'adjustment'
  | 'sale'
  | 'purchase'
  | 'other';

export const TRANSFER_EVENT_TYPES = ['TRANSFER_OUT'] as const;
export const ADJUSTMENT_TYPES = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] as const;

/** Tipos que mueven stock físico (trend de variabilidad). */
export const STOCK_TREND_TYPES = [
  'PURCHASE',
  'SALE',
  'SALE_RETURN',
  'PURCHASE_RETURN',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'CASH_SESSION_OPENING',
] as const;

/**
 * Signo del delta de stock físico en el almacén de la transacción.
 * +1 entrada, -1 salida, 0 no aplica.
 */
export function inventorySignedDelta(transactionType: string): number {
  switch (transactionType) {
    case 'PURCHASE':
    case 'TRANSFER_IN':
    case 'ADJUSTMENT_IN':
    case 'SALE_RETURN':
    case 'CASH_SESSION_OPENING':
      return 1;
    case 'SALE':
    case 'TRANSFER_OUT':
    case 'ADJUSTMENT_OUT':
    case 'PURCHASE_RETURN':
      return -1;
    default:
      return 0;
  }
}

export function inventoryMovementFamily(
  transactionType: string,
): InventoryMovementFamily | null {
  if (transactionType === 'TRANSFER_OUT' || transactionType === 'TRANSFER_IN') {
    return 'transfer';
  }
  if (
    transactionType === 'ADJUSTMENT_IN' ||
    transactionType === 'ADJUSTMENT_OUT'
  ) {
    return 'adjustment';
  }
  if (transactionType === 'SALE' || transactionType === 'SALE_RETURN') {
    return 'sale';
  }
  if (transactionType === 'PURCHASE' || transactionType === 'PURCHASE_RETURN') {
    return 'purchase';
  }
  if (transactionType === 'CASH_SESSION_OPENING') {
    return 'other';
  }
  return null;
}

/** Valoración: physicalStock × pmp solo con PMP válido (sin fallback a baseCost). */
export function computePmpValue(
  physicalStock: number,
  pmp: number | null | undefined,
): number | null {
  if (pmp == null || !Number.isFinite(Number(pmp))) return null;
  const p = Number(pmp);
  const qty = Number(physicalStock) || 0;
  return Math.round(qty * p * 100) / 100;
}
