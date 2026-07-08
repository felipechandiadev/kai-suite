import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { clearFiscalPackForPos } from "./download-fiscal-pack.usecase";
import { catalogMetaId } from "../lib/catalog-keys";

/** Limpia datos sensibles del POS al cerrar sesión (CAF, catálogo, stock, meta). */
export async function clearOfflineSensitiveDataForPos(pointOfSaleId: string): Promise<void> {
  await clearFiscalPackForPos(pointOfSaleId);
  const db = getPosOfflineDb();
  await db.transaction("rw", [db.catalog, db.catalog_meta, db.stock_snapshot, db.customers], async () => {
    await db.catalog.where("pointOfSaleId").equals(pointOfSaleId).delete();
    await db.catalog_meta.where("pointOfSaleId").equals(pointOfSaleId).delete();
    await db.stock_snapshot.where("pointOfSaleId").equals(pointOfSaleId).delete();
    await db.customers.clear();
  });
}

export async function clearOfflineCatalogForPriceList(
  pointOfSaleId: string,
  priceListId: string,
): Promise<void> {
  const db = getPosOfflineDb();
  await db.transaction("rw", [db.catalog, db.catalog_meta, db.stock_snapshot], async () => {
    await db.catalog.where({ pointOfSaleId, priceListId }).delete();
    await db.catalog_meta.delete(catalogMetaId(pointOfSaleId, priceListId));
    await db.stock_snapshot.where({ pointOfSaleId, priceListId }).delete();
  });
}
