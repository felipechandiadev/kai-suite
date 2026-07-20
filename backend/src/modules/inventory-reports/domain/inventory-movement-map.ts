/**
 * Mapa canónico de tipos de movimiento de inventario para reportes.
 * Transferencias de empresa: contar solo TRANSFER_OUT (TRANSFER_IN es espejo).
 */

export type InventoryMovementFamily = 'transfer' | 'adjustment';

export const TRANSFER_EVENT_TYPES = ['TRANSFER_OUT'] as const;
export const ADJUSTMENT_TYPES = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] as const;

export function inventorySignedDelta(transactionType: string): number {
  switch (transactionType) {
    case 'TRANSFER_IN':
    case 'ADJUSTMENT_IN':
      return 1;
    case 'TRANSFER_OUT':
    case 'ADJUSTMENT_OUT':
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
