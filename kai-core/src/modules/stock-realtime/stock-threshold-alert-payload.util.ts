import {
  resolveStockThresholds,
  type StockLevelThresholdSlice,
  type VariantThresholds,
} from './stock-threshold-resolution.util';
import type { StockUpdatedPayload } from './stock-realtime.types';

export type { StockLevelThresholdSlice, VariantThresholds };

/**
 * Umbrales: override en `stock_levels` (> 0) → solo ese almacén.
 * Si no, mínimo/máximo/reposición de variante → stock físico total en todos los almacenes.
 */
export function buildStockUpdatedPayload(
  companyId: string,
  variantRow: VariantThresholds,
  stockEntry: StockLevelThresholdSlice,
  transactionId: string | null | undefined,
  options?: { totalPhysicalStock?: number },
): StockUpdatedPayload {
  const resolved = resolveStockThresholds(variantRow, stockEntry, options);
  const available = Number(stockEntry.availableStock ?? 0);

  return {
    companyId,
    storageId: stockEntry.storageId,
    productVariantId: stockEntry.productVariantId,
    physicalStock: resolved.storagePhysical,
    availableStock: Number.isFinite(available) ? available : resolved.storagePhysical,
    totalPhysicalStock: resolved.totalPhysical,
    thresholdScope: resolved.scope,
    transactionId: transactionId ?? null,
    alerts: resolved.alerts,
  };
}
