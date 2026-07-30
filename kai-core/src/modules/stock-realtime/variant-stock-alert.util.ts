import type { StockAlertKind } from './stock-realtime.types';
import { variantThresholdDefaultsFromRow } from './stock-threshold-field.util';
import {
  resolveStockThresholds,
  sumVariantPhysicalStock,
  type StockLevelThresholdSlice,
} from './stock-threshold-resolution.util';

export function stockLevelToThresholdSlice(sl: {
  storageId: string;
  productVariantId: string;
  physicalStock: unknown;
  minimumStock?: number | null;
  minimumStockEnabled?: boolean | null;
  maximumStock?: number | null;
  maximumStockEnabled?: boolean | null;
  reorderPoint?: number | null;
  reorderPointEnabled?: boolean | null;
}): StockLevelThresholdSlice {
  return {
    storageId: sl.storageId,
    productVariantId: sl.productVariantId,
    physicalStock: sl.physicalStock,
    minimumStock: sl.minimumStock,
    minimumStockEnabled: sl.minimumStockEnabled,
    maximumStock: sl.maximumStock,
    maximumStockEnabled: sl.maximumStockEnabled,
    reorderPoint: sl.reorderPoint,
    reorderPointEnabled: sl.reorderPointEnabled,
  };
}

/**
 * Umbrales activos para una variante (unión por almacén evaluado).
 * Con `filterStorageId`, solo se evalúan niveles de ese almacén (y total variante si aplica).
 */
export function computeVariantStockAlertKinds(
  variant: Parameters<typeof variantThresholdDefaultsFromRow>[0],
  allLevels: StockLevelThresholdSlice[],
  options?: { filterStorageId?: string },
): StockAlertKind[] {
  const variantRow = variantThresholdDefaultsFromRow(variant);
  const totalPhysical = sumVariantPhysicalStock(allLevels);
  const kinds = new Set<StockAlertKind>();
  const filterSid = options?.filterStorageId?.trim();

  const levelsToEval = filterSid
    ? allLevels.filter((l) => l.storageId === filterSid)
    : allLevels;

  if (levelsToEval.length === 0 && filterSid) {
    const resolved = resolveStockThresholds(
      variantRow,
      {
        storageId: filterSid,
        productVariantId: String((variant as { id?: string }).id ?? ''),
        physicalStock: 0,
        minimumStock: null,
        minimumStockEnabled: null,
        maximumStock: null,
        maximumStockEnabled: null,
        reorderPoint: null,
        reorderPointEnabled: null,
      },
      { totalPhysicalStock: totalPhysical },
    );
    for (const a of resolved.alerts) {
      kinds.add(a);
    }
    return [...kinds];
  }

  for (const sl of levelsToEval) {
    const resolved = resolveStockThresholds(variantRow, sl, {
      totalPhysicalStock: totalPhysical,
    });
    for (const a of resolved.alerts) {
      kinds.add(a);
    }
  }

  return [...kinds];
}

export function variantHasStockAlert(
  variant: Parameters<typeof variantThresholdDefaultsFromRow>[0],
  allLevels: StockLevelThresholdSlice[],
  options?: { filterStorageId?: string },
): boolean {
  return computeVariantStockAlertKinds(variant, allLevels, options).length > 0;
}

/** Query param `stock-alerts` (kebab-case en URL). */
export function parseStockAlertsQueryParam(
  value?: string | boolean | null,
): boolean {
  if (value === true) {
    return true;
  }
  if (value === false || value == null) {
    return false;
  }
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}
