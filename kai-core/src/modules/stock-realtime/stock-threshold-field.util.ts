export type ThresholdFieldInput = {
  value?: number | null;
  enabled?: boolean | null;
};

export type ResolvedThresholdField = {
  value: number;
  enabled: boolean;
};

export function resolveThresholdField(
  storage: ThresholdFieldInput,
  variant: { value: number; enabled: boolean },
): ResolvedThresholdField {
  if (storage.enabled === false) {
    return { value: 0, enabled: false };
  }
  if (storage.enabled === true) {
    const raw =
      storage.value != null && Number.isFinite(Number(storage.value))
        ? Number(storage.value)
        : Number(variant.value) || 0;
    return { value: Math.max(0, raw), enabled: true };
  }
  return {
    value: Math.max(0, Number(variant.value) || 0),
    enabled: Boolean(variant.enabled),
  };
}

/** `null` en almacén = heredar variante; distinto de null = configuración explícita del almacén. */
export function hasStorageSpecificThresholdConfig(
  enabled: boolean | null | undefined,
): boolean {
  return enabled !== null && enabled !== undefined;
}

export type VariantThresholdDefaults = {
  minimumStock: number;
  minimumStockEnabled: boolean;
  maximumStock: number;
  maximumStockEnabled: boolean;
  reorderPoint: number;
  reorderPointEnabled: boolean;
};

export type StorageThresholdOverrides = {
  minimumStock?: number | null;
  minimumStockEnabled?: boolean | null;
  maximumStock?: number | null;
  maximumStockEnabled?: boolean | null;
  reorderPoint?: number | null;
  reorderPointEnabled?: boolean | null;
};

export type EffectiveStorageThresholds = {
  effectiveMinimumStock: number;
  effectiveMinimumStockEnabled: boolean;
  effectiveMaximumStock: number;
  effectiveMaximumStockEnabled: boolean;
  effectiveReorderPoint: number;
  effectiveReorderPointEnabled: boolean;
  minimumStockOverride: number | null;
  minimumStockEnabledOverride: boolean | null;
  maximumStockOverride: number | null;
  maximumStockEnabledOverride: boolean | null;
  reorderPointOverride: number | null;
  reorderPointEnabledOverride: boolean | null;
};

export function resolveEffectiveThresholdsForStorage(
  variant: VariantThresholdDefaults,
  storage: StorageThresholdOverrides,
): EffectiveStorageThresholds {
  const min = resolveThresholdField(
    { value: storage.minimumStock, enabled: storage.minimumStockEnabled },
    { value: variant.minimumStock, enabled: variant.minimumStockEnabled },
  );
  const max = resolveThresholdField(
    { value: storage.maximumStock, enabled: storage.maximumStockEnabled },
    { value: variant.maximumStock, enabled: variant.maximumStockEnabled },
  );
  const reorder = resolveThresholdField(
    { value: storage.reorderPoint, enabled: storage.reorderPointEnabled },
    { value: variant.reorderPoint, enabled: variant.reorderPointEnabled },
  );
  return {
    effectiveMinimumStock: min.value,
    effectiveMinimumStockEnabled: min.enabled,
    effectiveMaximumStock: max.value,
    effectiveMaximumStockEnabled: max.enabled,
    effectiveReorderPoint: reorder.value,
    effectiveReorderPointEnabled: reorder.enabled,
    minimumStockOverride: storage.minimumStock ?? null,
    minimumStockEnabledOverride: storage.minimumStockEnabled ?? null,
    maximumStockOverride: storage.maximumStock ?? null,
    maximumStockEnabledOverride: storage.maximumStockEnabled ?? null,
    reorderPointOverride: storage.reorderPoint ?? null,
    reorderPointEnabledOverride: storage.reorderPointEnabled ?? null,
  };
}

export function variantThresholdDefaultsFromRow(variant: {
  minimumStock?: number;
  minimumStockEnabled?: boolean;
  maximumStock?: number;
  maximumStockEnabled?: boolean;
  reorderPoint?: number;
  reorderPointEnabled?: boolean;
}): VariantThresholdDefaults {
  return {
    minimumStock: Number(variant.minimumStock ?? 0) || 0,
    minimumStockEnabled: Boolean(variant.minimumStockEnabled),
    maximumStock: Number(variant.maximumStock ?? 0) || 0,
    maximumStockEnabled: Boolean(variant.maximumStockEnabled),
    reorderPoint: Number(variant.reorderPoint ?? 0) || 0,
    reorderPointEnabled: Boolean(variant.reorderPointEnabled),
  };
}
