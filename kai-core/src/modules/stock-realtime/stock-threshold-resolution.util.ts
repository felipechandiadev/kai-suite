import type { StockAlertKind } from './stock-realtime.types';
import { computeStockAlertsFromThresholdsScoped } from './stock-alert.util';
import {
  hasStorageSpecificThresholdConfig,
  resolveThresholdField,
} from './stock-threshold-field.util';

export type ThresholdScope = 'storage' | 'variant_total';

export type VariantThresholds = {
  minimumStock?: number;
  minimumStockEnabled?: boolean;
  maximumStock?: number;
  maximumStockEnabled?: boolean;
  reorderPoint?: number;
  reorderPointEnabled?: boolean;
} | null;

export type StockLevelThresholdSlice = {
  storageId: string;
  productVariantId: string;
  physicalStock: unknown;
  availableStock?: unknown;
  minimumStock?: number | null;
  minimumStockEnabled?: boolean | null;
  maximumStock?: number | null;
  maximumStockEnabled?: boolean | null;
  reorderPoint?: number | null;
  reorderPointEnabled?: boolean | null;
};

export type ResolvedStockThresholds = {
  scope: ThresholdScope;
  min: number;
  max: number;
  reorder: number;
  minEnabled: boolean;
  maxEnabled: boolean;
  reorderEnabled: boolean;
  comparePhysical: number;
  storagePhysical: number;
  totalPhysical?: number;
  alerts: StockAlertKind[];
};

export function sumVariantPhysicalStock(
  levels: Array<{ storageId: string; physicalStock: unknown }>,
  override?: { storageId: string; physical: number },
): number {
  let sum = 0;
  const seen = new Set<string>();
  for (const sl of levels) {
    const sid = String(sl.storageId || '').trim();
    if (!sid) continue;
    seen.add(sid);
    if (override && sid === override.storageId) {
      sum += Math.max(0, Number(override.physical) || 0);
    } else {
      sum += Math.max(0, Number(sl.physicalStock ?? 0) || 0);
    }
  }
  if (override && !seen.has(override.storageId)) {
    sum += Math.max(0, Number(override.physical) || 0);
  }
  return sum;
}

function variantField(
  variantRow: VariantThresholds,
  key: 'minimum' | 'maximum' | 'reorder',
): { value: number; enabled: boolean } {
  if (key === 'minimum') {
    return {
      value: Number(variantRow?.minimumStock ?? 0) || 0,
      enabled: Boolean(variantRow?.minimumStockEnabled),
    };
  }
  if (key === 'maximum') {
    return {
      value: Number(variantRow?.maximumStock ?? 0) || 0,
      enabled: Boolean(variantRow?.maximumStockEnabled),
    };
  }
  return {
    value: Number(variantRow?.reorderPoint ?? 0) || 0,
    enabled: Boolean(variantRow?.reorderPointEnabled),
  };
}

export function resolveStockThresholds(
  variantRow: VariantThresholds,
  stockEntry: StockLevelThresholdSlice,
  options?: { totalPhysicalStock?: number },
): ResolvedStockThresholds {
  const storagePhysical = Math.max(0, Number(stockEntry.physicalStock ?? 0) || 0);
  const totalPhysical = Math.max(
    0,
    options?.totalPhysicalStock ?? storagePhysical,
  );
  const minStorageSpecific = hasStorageSpecificThresholdConfig(
    stockEntry.minimumStockEnabled,
  );
  const maxStorageSpecific = hasStorageSpecificThresholdConfig(
    stockEntry.maximumStockEnabled,
  );
  const reorderStorageSpecific = hasStorageSpecificThresholdConfig(
    stockEntry.reorderPointEnabled,
  );

  const minResolved = resolveThresholdField(
    {
      value: stockEntry.minimumStock,
      enabled: stockEntry.minimumStockEnabled,
    },
    variantField(variantRow, 'minimum'),
  );
  const maxResolved = resolveThresholdField(
    {
      value: stockEntry.maximumStock,
      enabled: stockEntry.maximumStockEnabled,
    },
    variantField(variantRow, 'maximum'),
  );
  const reorderResolved = resolveThresholdField(
    {
      value: stockEntry.reorderPoint,
      enabled: stockEntry.reorderPointEnabled,
    },
    variantField(variantRow, 'reorder'),
  );

  const physicalForMin = minStorageSpecific ? storagePhysical : totalPhysical;
  const physicalForMax = maxStorageSpecific ? storagePhysical : totalPhysical;
  const physicalForReorder = reorderStorageSpecific
    ? storagePhysical
    : totalPhysical;
  const alerts = computeStockAlertsFromThresholdsScoped({
    min: minResolved.value,
    max: maxResolved.value,
    reorder: reorderResolved.value,
    minEnabled: minResolved.enabled,
    maxEnabled: maxResolved.enabled,
    reorderEnabled: reorderResolved.enabled,
    minPhysical: physicalForMin,
    maxPhysical: physicalForMax,
    reorderPhysical: physicalForReorder,
  });

  const scope: ThresholdScope =
    minStorageSpecific || maxStorageSpecific || reorderStorageSpecific
      ? 'storage'
      : 'variant_total';

  return {
    scope,
    min: minResolved.value,
    max: maxResolved.value,
    reorder: reorderResolved.value,
    minEnabled: minResolved.enabled,
    maxEnabled: maxResolved.enabled,
    reorderEnabled: reorderResolved.enabled,
    comparePhysical: physicalForMin,
    storagePhysical,
    totalPhysical:
      scope === 'variant_total' ? totalPhysical : undefined,
    alerts,
  };
}

export function stockAlertGroupKey(
  companyId: string,
  variantId: string,
  storageId: string,
  kind: string,
  scope: ThresholdScope,
): string {
  if (scope === 'variant_total') {
    return `stock:${companyId}:variant:${variantId}:${kind}`;
  }
  return `stock:${companyId}:${storageId}:${variantId}:${kind}`;
}

/** Compatibilidad: antes se infería por valor > 0. */
export function hasStorageSpecificMinimum(
  stockLevel: StockLevelThresholdSlice | null | undefined,
): boolean {
  return hasStorageSpecificThresholdConfig(stockLevel?.minimumStockEnabled);
}

export function hasStorageSpecificMaximum(
  stockLevel: StockLevelThresholdSlice | null | undefined,
): boolean {
  return hasStorageSpecificThresholdConfig(stockLevel?.maximumStockEnabled);
}

export function hasStorageSpecificReorder(
  stockLevel: StockLevelThresholdSlice | null | undefined,
): boolean {
  return hasStorageSpecificThresholdConfig(stockLevel?.reorderPointEnabled);
}
