import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { getPosOfflineDb, OFFLINE_CATALOG_SCHEMA_VERSION } from "../infrastructure/pos-offline-db";
import { fetchOfflineCatalogSnapshot } from "../infrastructure/offline-catalog.request";
import type { OfflineCatalogDownloadProgress, OfflineCatalogRow } from "../domain/offline-catalog.types";
import { normalizeCatalogSearchText } from "../lib/normalize-catalog-search";
import { rebuildStockSnapshotFromCatalog } from "./stock-snapshot.usecase";
import { catalogMetaId, catalogRowId } from "../lib/catalog-keys";
import { logOfflineTelemetry } from "../lib/offline-telemetry";
import {
  beginCatalogSync,
  completeCatalogSync,
  failCatalogSync,
  updateCatalogSyncProgress,
} from "../lib/offline-catalog-sync-progress";

function toCatalogRow(
  item: PosProductSearchItem,
  pointOfSaleId: string,
  priceListId: string,
  snapshotAt: string,
): OfflineCatalogRow {
  const parts = [item.productName, item.sku ?? "", item.barcode ?? ""].filter(Boolean);
  return {
    ...item,
    id: catalogRowId(pointOfSaleId, priceListId, item.variantId),
    pointOfSaleId,
    priceListId,
    snapshotAt,
    searchName: normalizeCatalogSearchText(parts.join(" ")),
  };
}

function reportProgress(
  onProgress: ((progress: OfflineCatalogDownloadProgress) => void) | undefined,
  downloaded: number,
  persisted: number,
  total: number,
) {
  const progress = { downloaded, persisted, total: total || downloaded };
  updateCatalogSyncProgress(progress);
  onProgress?.(progress);
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
  const metaId = catalogMetaId(pointOfSaleId, priceListId);
  const startedAt = Date.now();
  let cursor: string | undefined;
  let total = 0;
  let snapshotAt = new Date().toISOString();
  let downloaded = 0;

  beginCatalogSync(0);

  await db.transaction("rw", [db.catalog, db.catalog_meta], async () => {
    await db.catalog.where({ pointOfSaleId, priceListId }).delete();
    await db.catalog_meta.put({
      id: metaId,
      pointOfSaleId,
      priceListId,
      snapshotAt,
      rowCount: 0,
      ready: false,
      schemaVersion: OFFLINE_CATALOG_SCHEMA_VERSION,
      downloadedAt: new Date().toISOString(),
    });
  });

  reportProgress(onProgress, 0, 0, 0);

  for (;;) {
    const res = await fetchOfflineCatalogSnapshot(pointOfSaleId, {
      priceListId,
      cursor,
      limit: 500,
    });
    if (!res.ok) {
      await db.catalog_meta.update(metaId, { ready: false });
      failCatalogSync();
      return {
        success: false,
        message: res.unreachable
          ? "Sin conexión al servidor"
          : res.message || "No se pudo descargar el catálogo offline",
      };
    }
    const body = res.data;
    if (!body.success || !body.items) {
      await db.catalog_meta.update(metaId, { ready: false });
      failCatalogSync();
      return {
        success: false,
        message: body.message || "No se pudo descargar el catálogo offline",
      };
    }
    if (body.snapshotAt) snapshotAt = body.snapshotAt;
    total = body.totalCount ?? total;

    const pageRows = body.items.map((item) =>
      toCatalogRow(item, pointOfSaleId, priceListId, snapshotAt),
    );
    downloaded += pageRows.length;

    await db.catalog.bulkPut(pageRows);
    const persisted = await db.catalog
      .where({ pointOfSaleId, priceListId })
      .count();

    await db.catalog_meta.update(metaId, {
      rowCount: persisted,
      snapshotAt,
      ready: false,
    });

    reportProgress(onProgress, downloaded, persisted, total || downloaded);

    if (!body.nextCursor) break;
    cursor = body.nextCursor;
  }

  await db.catalog_meta.put({
    id: metaId,
    pointOfSaleId,
    priceListId,
    snapshotAt,
    rowCount: downloaded,
    ready: true,
    schemaVersion: OFFLINE_CATALOG_SCHEMA_VERSION,
    downloadedAt: new Date().toISOString(),
  });

  await rebuildStockSnapshotFromCatalog(pointOfSaleId, priceListId);
  completeCatalogSync(downloaded);

  logOfflineTelemetry("offline_catalog_download", {
    pointOfSaleId,
    priceListId,
    total: downloaded,
    durationMs: Date.now() - startedAt,
    mode: "full",
  });

  return { success: true, total: downloaded, snapshotAt };
}

export async function getOfflineCatalogCount(
  pointOfSaleId: string,
  priceListId: string,
): Promise<number> {
  const db = getPosOfflineDb();
  const meta = await db.catalog_meta.get(catalogMetaId(pointOfSaleId, priceListId));
  if (meta?.ready) return meta.rowCount;
  return db.catalog.where({ pointOfSaleId, priceListId }).count();
}
