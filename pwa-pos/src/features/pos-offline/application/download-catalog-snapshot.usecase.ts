import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { fetchOfflineCatalogSnapshot } from "../infrastructure/offline-catalog.request";
import type { OfflineCatalogDownloadProgress, OfflineCatalogRow } from "../domain/offline-catalog.types";
import { normalizeCatalogSearchText } from "../lib/normalize-catalog-search";

function toCatalogRow(
  item: PosProductSearchItem,
  pointOfSaleId: string,
  priceListId: string,
  snapshotAt: string,
): OfflineCatalogRow {
  const parts = [item.productName, item.sku ?? "", item.barcode ?? ""].filter(Boolean);
  return {
    ...item,
    pointOfSaleId,
    priceListId,
    snapshotAt,
    searchName: normalizeCatalogSearchText(parts.join(" ")),
  };
}

export async function downloadCatalogSnapshotForPos(
  pointOfSaleId: string,
  priceListId: string,
  onProgress?: (progress: OfflineCatalogDownloadProgress) => void,
): Promise<
  | { success: true; total: number; snapshotAt: string }
  | { success: false; message: string }
> {
  const db = getPosOfflineDb();
  let cursor: string | undefined;
  let total = 0;
  let snapshotAt = new Date().toISOString();
  const rows: OfflineCatalogRow[] = [];

  for (;;) {
    const res = await fetchOfflineCatalogSnapshot(pointOfSaleId, {
      priceListId,
      cursor,
      limit: 500,
    });
    if (!res.ok) {
      return {
        success: false,
        message: res.unreachable
          ? "Sin conexión al servidor"
          : res.message || "No se pudo descargar el catálogo offline",
      };
    }
    const body = res.data;
    if (!body.success || !body.items) {
      return {
        success: false,
        message: body.message || "No se pudo descargar el catálogo offline",
      };
    }
    if (body.snapshotAt) snapshotAt = body.snapshotAt;
    total = body.totalCount ?? total;
    for (const item of body.items) {
      rows.push(toCatalogRow(item, pointOfSaleId, priceListId, snapshotAt));
    }
    onProgress?.({ downloaded: rows.length, total: total || rows.length });
    if (!body.nextCursor) break;
    cursor = body.nextCursor;
  }

  await db.transaction("rw", db.catalog, async () => {
    await db.catalog.where({ pointOfSaleId, priceListId }).delete();
    if (rows.length > 0) {
      await db.catalog.bulkPut(rows);
    }
  });

  return { success: true, total: rows.length, snapshotAt };
}

export async function getOfflineCatalogCount(
  pointOfSaleId: string,
  priceListId: string,
): Promise<number> {
  const db = getPosOfflineDb();
  return db.catalog.where({ pointOfSaleId, priceListId }).count();
}
