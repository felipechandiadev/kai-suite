import type { StockStorageBreakdownRow } from "../types/stock-grid.types";
import type { StorageListItem } from "@/features/stock/types/storage-list.types";

/**
 * Une catálogo de almacenes con el desglose de la API (cantidades),
 * e incluye almacenes solo presentes en el breakdown.
 */
export function mergeStoragesWithBreakdown(
  storages: StorageListItem[],
  breakdown: StockStorageBreakdownRow[],
  branchId?: string,
): StockStorageBreakdownRow[] {
  const byId = new Map(breakdown.map((b) => [b.storageId, b]));
  const active = storages.filter((s) => s.isActive !== false);
  const scoped = branchId
    ? active.filter((s) => (s.branchId ?? s.branch?.id ?? "") === branchId)
    : active;

  const sortedCatalog = [...scoped].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });

  if (sortedCatalog.length === 0) {
    return [...breakdown].sort((a, b) =>
      a.storageName.localeCompare(b.storageName, "es", { sensitivity: "base" }),
    );
  }

  const fromCatalog: StockStorageBreakdownRow[] = sortedCatalog.map((s) => {
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

  const ids = new Set(fromCatalog.map((c) => c.storageId));
  const extras = breakdown
    .filter((b) => !ids.has(b.storageId))
    .sort((a, b) => a.storageName.localeCompare(b.storageName, "es", { sensitivity: "base" }));

  return [...fromCatalog, ...extras];
}
