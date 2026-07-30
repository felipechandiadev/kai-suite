import { getPosOfflineDb } from "../infrastructure/pos-offline-db";

export async function decrementOfflineCatalogStock(args: {
  pointOfSaleId: string;
  priceListId: string;
  lines: Array<{ variantId: string; quantity: number; trackInventory?: boolean }>;
}): Promise<void> {
  const db = getPosOfflineDb();
  await db.transaction("rw", db.catalog, async () => {
    for (const line of args.lines) {
      if (!line.trackInventory) continue;
      const row = await db.catalog.get(line.variantId);
      if (!row) continue;
      if (row.pointOfSaleId !== args.pointOfSaleId || row.priceListId !== args.priceListId) {
        continue;
      }
      const qty = Math.max(0, Number(line.quantity) || 0);
      if (qty <= 0) continue;
      const nextStock =
        row.availableStock != null ? Math.max(0, row.availableStock - qty) : row.availableStock;
      const ratio =
        row.availableStockBase != null && row.availableStock != null && row.availableStock > 0
          ? row.availableStockBase / row.availableStock
          : null;
      const nextStockBase =
        row.availableStockBase != null && ratio != null
          ? Math.max(0, row.availableStockBase - qty * ratio)
          : row.availableStockBase;
      await db.catalog.update(line.variantId, {
        availableStock: nextStock,
        availableStockBase: nextStockBase,
      });
    }
  });
}
