import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type { OfflineStockSnapshotRow } from "../domain/offline-cache.types";
import { stockSnapshotRowId } from "../lib/catalog-keys";

export async function rebuildStockSnapshotFromCatalog(
  pointOfSaleId: string,
  priceListId: string,
): Promise<number> {
  const db = getPosOfflineDb();
  const catalogRows = await db.catalog.where({ pointOfSaleId, priceListId }).toArray();
  const snapshotAt = new Date().toISOString();
  const stockRows: OfflineStockSnapshotRow[] = catalogRows.map((row) => ({
    id: stockSnapshotRowId(pointOfSaleId, priceListId, row.variantId),
    variantId: row.variantId,
    pointOfSaleId,
    priceListId,
    availableStock: row.availableStock ?? null,
    availableStockBase: row.availableStockBase ?? null,
    trackInventory: row.trackInventory !== false,
    snapshotAt,
  }));

  await db.transaction("rw", db.stock_snapshot, async () => {
    await db.stock_snapshot.where({ pointOfSaleId, priceListId }).delete();
    if (stockRows.length > 0) {
      await db.stock_snapshot.bulkPut(stockRows);
    }
  });

  return stockRows.length;
}

export async function decrementOfflineStockSnapshot(args: {
  pointOfSaleId: string;
  priceListId: string;
  lines: Array<{ variantId: string; quantity: number; trackInventory?: boolean }>;
}): Promise<void> {
  const db = getPosOfflineDb();
  await db.transaction("rw", [db.stock_snapshot, db.catalog], async () => {
    for (const line of args.lines) {
      if (!line.trackInventory) continue;
      const qty = Math.max(0, Number(line.quantity) || 0);
      if (qty <= 0) continue;

      const rowId = stockSnapshotRowId(args.pointOfSaleId, args.priceListId, line.variantId);
      const stockRow = await db.stock_snapshot.get(rowId);
      if (stockRow) {
        const nextStock =
          stockRow.availableStock != null
            ? Math.max(0, stockRow.availableStock - qty)
            : stockRow.availableStock;
        const ratio =
          stockRow.availableStockBase != null &&
          stockRow.availableStock != null &&
          stockRow.availableStock > 0
            ? stockRow.availableStockBase / stockRow.availableStock
            : null;
        const nextStockBase =
          stockRow.availableStockBase != null && ratio != null
            ? Math.max(0, stockRow.availableStockBase - qty * ratio)
            : stockRow.availableStockBase;
        await db.stock_snapshot.update(rowId, {
          availableStock: nextStock,
          availableStockBase: nextStockBase,
        });
      }

      const catalogRowId = stockSnapshotRowId(args.pointOfSaleId, args.priceListId, line.variantId);
      const catalogRow = await db.catalog.get(catalogRowId);
      if (catalogRow) {
        const nextStock =
          catalogRow.availableStock != null
            ? Math.max(0, catalogRow.availableStock - qty)
            : catalogRow.availableStock;
        const ratio =
          catalogRow.availableStockBase != null &&
          catalogRow.availableStock != null &&
          catalogRow.availableStock > 0
            ? catalogRow.availableStockBase / catalogRow.availableStock
            : null;
        const nextStockBase =
          catalogRow.availableStockBase != null && ratio != null
            ? Math.max(0, catalogRow.availableStockBase - qty * ratio)
            : catalogRow.availableStockBase;
        await db.catalog.update(catalogRowId, {
          availableStock: nextStock,
          availableStockBase: nextStockBase,
        });
      }
    }
  });
}
