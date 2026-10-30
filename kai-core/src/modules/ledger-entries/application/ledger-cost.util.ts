import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';

/**
 * Costo de una línea para el asiento de costo de ventas: `unitCost × quantity`.
 * Invariante del sistema (ver `inventory-cost-from-line.ts`): `unitCost` es el costo **por la unidad
 * de la línea** (no por unidad base) y `quantity` está en esa misma unidad.
 * Devuelve 0 si la línea no tiene costo (se omite del asiento y se advierte).
 */
export function resolveLineCostAmount(
  line: Pick<TransactionLine, 'unitCost' | 'quantity'>,
): number {
  const unitCost = Number(line.unitCost);
  const qty = Math.abs(Number(line.quantity));
  if (!Number.isFinite(unitCost) || unitCost <= 0 || !Number.isFinite(qty) || qty <= 0) {
    return 0;
  }
  return Math.round(unitCost * qty * 100) / 100;
}
