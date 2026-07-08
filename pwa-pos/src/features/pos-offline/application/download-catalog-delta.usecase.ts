import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { getPosOfflineDb, OFFLINE_CATALOG_SCHEMA_VERSION } from "../infrastructure/pos-offline-db";
import { posOfflineBackendFetch } from "../infrastructure/backend-api-client";
import type { OfflineCatalogRow } from "../domain/offline-catalog.types";
import { normalizeCatalogSearchText } from "../lib/normalize-catalog-search";
import { catalogMetaId, catalogRowId } from "../lib/catalog-keys";
import { rebuildStockSnapshotFromCatalog } from "./stock-snapshot.usecase";
import { logOfflineTelemetry } from "../lib/offline-telemetry";

type CatalogDeltaApiResponse = {
  success: boolean;
  items?: PosProductSearchItem[];
  tombstones?: string[];
  snapshotAt?: string;
  message?: string;
};

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

export async function applyCatalogDeltaForPos(
  pointOfSaleId: string,
  priceListId: string,
  since: string,
): Promise<{ success: true; updated: number } | { success: false; message: string }> {
  const startedAt = Date.now();
  const res = await posOfflineBackendFetch<CatalogDeltaApiResponse>(
    `/api/points-of-sale/${encodeURIComponent(pointOfSaleId)}/offline-catalog-delta?priceListId=${encodeURIComponent(priceListId)}&since=${encodeURIComponent(since)}`,
    { method: "GET" },
  );
  if (!res.ok || !res.data.success) {
    return {
      success: false,
      message: res.unreachable
        ? "Sin conexión al servidor"
        : res.data.message || res.message || "No se pudo aplicar delta de catálogo",
    };
  }

  const body = res.data;
  const snapshotAt = body.snapshotAt ?? new Date().toISOString();
  const items = body.items ?? [];
  const tombstones = body.tombstones ?? [];
  const db = getPosOfflineDb();
  const metaId = catalogMetaId(pointOfSaleId, priceListId);

  await db.transaction("rw", [db.catalog, db.catalog_meta], async () => {
    for (const variantId of tombstones) {
      await db.catalog.delete(catalogRowId(pointOfSaleId, priceListId, variantId));
    }
    if (items.length > 0) {
      await db.catalog.bulkPut(
        items.map((item) => toCatalogRow(item, pointOfSaleId, priceListId, snapshotAt)),
      );
    }
    const rowCount = await db.catalog.where({ pointOfSaleId, priceListId }).count();
    await db.catalog_meta.put({
      id: metaId,
      pointOfSaleId,
      priceListId,
      snapshotAt,
      rowCount,
      ready: rowCount > 0,
      schemaVersion: OFFLINE_CATALOG_SCHEMA_VERSION,
      downloadedAt: new Date().toISOString(),
    });
  });

  if (items.length > 0 || tombstones.length > 0) {
    await rebuildStockSnapshotFromCatalog(pointOfSaleId, priceListId);
  }

  logOfflineTelemetry("offline_catalog_delta", {
    pointOfSaleId,
    priceListId,
    updated: items.length,
    removed: tombstones.length,
    durationMs: Date.now() - startedAt,
  });

  return { success: true, updated: items.length + tombstones.length };
}
