import type { StockStorageBreakdownRow } from "../types/stock-grid.types";
import type { StorageListItem } from "@/features/stock/types/storage-list.types";

export type VariantThresholdDraft = {
  enabled: boolean;
  value: string;
};

export type StorageThresholdFieldDraft = {
  /** true = umbral propio del almacén; false = heredar variante */
  override: boolean;
  enabled: boolean;
  value: string;
};

export type StorageThresholdDraft = {
  storageId: string;
  storageName: string;
  minimum: StorageThresholdFieldDraft;
  maximum: StorageThresholdFieldDraft;
  reorder: StorageThresholdFieldDraft;
};

export function mergeStoragesForThresholds(
  storages: StorageListItem[],
  breakdown: StockStorageBreakdownRow[],
  branchId?: string,
): StockStorageBreakdownRow[] {
  const byId = new Map(breakdown.map((b) => [b.storageId, b]));
  const active = storages.filter((s) => s.isActive !== false);
  const scoped = branchId
    ? active.filter((s) => (s.branchId ?? s.branch?.id ?? "") === branchId)
    : active;
  const sorted = [...scoped].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
  if (sorted.length === 0) {
    return [...breakdown];
  }
  return sorted.map((s) => {
    const existing = byId.get(s.id);
    if (existing) {
      return existing;
    }
    return {
      storageId: s.id,
      storageName: s.name,
      branchName: s.branch?.name ?? null,
      quantity: 0,
      reservedStock: 0,
      availableStock: 0,
      committedStock: 0,
    };
  });
}

export function numToThresholdInput(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) {
    return "";
  }
  return String(Math.max(0, Math.round(Number(v))));
}

export function parseThresholdInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  const n = Math.round(Number(t.replace(",", ".")));
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

export function storageFieldFromBreakdown(
  valueOverride: number | null | undefined,
  enabledOverride: boolean | null | undefined,
): StorageThresholdFieldDraft {
  const hasValueOverride = valueOverride !== null && valueOverride !== undefined;
  const hasEnabledOverride = enabledOverride !== null && enabledOverride !== undefined;
  const override = hasValueOverride || hasEnabledOverride;
  return {
    override,
    enabled: hasEnabledOverride ? Boolean(enabledOverride) : false,
    value: hasValueOverride ? numToThresholdInput(valueOverride) : "",
  };
}

export function storageDraftsFromBreakdown(
  merged: StockStorageBreakdownRow[],
): StorageThresholdDraft[] {
  return merged.map((b) => ({
    storageId: b.storageId,
    storageName: b.branchName ? `${b.storageName} (${b.branchName})` : b.storageName,
    minimum: storageFieldFromBreakdown(b.minimumStockOverride, b.minimumStockEnabledOverride),
    maximum: storageFieldFromBreakdown(b.maximumStockOverride, b.maximumStockEnabledOverride),
    reorder: storageFieldFromBreakdown(b.reorderPointOverride, b.reorderPointEnabledOverride),
  }));
}

export function inheritedThresholdDisplay(variant: VariantThresholdDraft): string {
  if (!variant.enabled) {
    return "—";
  }
  return variant.value.trim() !== "" ? variant.value : "0";
}

export function storageFieldForSave(
  draft: StorageThresholdFieldDraft,
): { value: number | null; enabled: boolean | null } {
  if (!draft.override) {
    return { value: null, enabled: null };
  }
  return {
    enabled: draft.enabled,
    value: parseThresholdInput(draft.value),
  };
}

export function storageThresholdsPayloadFromDrafts(drafts: StorageThresholdDraft[]) {
  return drafts.map((s) => {
    const min = storageFieldForSave(s.minimum);
    const max = storageFieldForSave(s.maximum);
    const rep = storageFieldForSave(s.reorder);
    return {
      storageId: s.storageId,
      minimumStock: min.value,
      minimumStockEnabled: min.enabled,
      maximumStock: max.value,
      maximumStockEnabled: max.enabled,
      reorderPoint: rep.value,
      reorderPointEnabled: rep.enabled,
    };
  });
}
