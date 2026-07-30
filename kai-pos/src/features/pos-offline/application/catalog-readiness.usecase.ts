import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type { OfflineCatalogMetaRow } from "../domain/offline-catalog.types";
import { catalogMetaId, OFFLINE_CATALOG_SCHEMA_VERSION } from "../lib/catalog-keys";

export type CatalogReadiness = {
  ready: boolean;
  rowCount: number;
  snapshotAt: string | null;
  schemaVersion?: number | null;
  message?: string;
};

function isCatalogSchemaCurrent(meta: OfflineCatalogMetaRow | null | undefined): boolean {
  return (meta?.schemaVersion ?? 0) >= OFFLINE_CATALOG_SCHEMA_VERSION;
}

export async function getCatalogMeta(
  pointOfSaleId: string,
  priceListId: string,
): Promise<OfflineCatalogMetaRow | null> {
  const db = getPosOfflineDb();
  return db.catalog_meta.get(catalogMetaId(pointOfSaleId, priceListId));
}

export async function assertCatalogReady(
  pointOfSaleId: string,
  priceListId: string,
): Promise<CatalogReadiness> {
  const meta = await getCatalogMeta(pointOfSaleId, priceListId);
  if (!meta?.ready) {
    return {
      ready: false,
      rowCount: meta?.rowCount ?? 0,
      snapshotAt: meta?.snapshotAt ?? null,
      schemaVersion: meta?.schemaVersion ?? null,
      message: "Catálogo offline no listo. Espera la descarga o reconecta.",
    };
  }
  if (!isCatalogSchemaCurrent(meta)) {
    return {
      ready: false,
      rowCount: meta.rowCount,
      snapshotAt: meta.snapshotAt,
      schemaVersion: meta.schemaVersion,
      message: "Catálogo desactualizado. Reconecta para actualizar.",
    };
  }
  if (meta.rowCount <= 0) {
    return {
      ready: false,
      rowCount: 0,
      snapshotAt: meta.snapshotAt,
      schemaVersion: meta.schemaVersion,
      message: "Catálogo local vacío. Reconecta para descargar productos.",
    };
  }
  return {
    ready: true,
    rowCount: meta.rowCount,
    snapshotAt: meta.snapshotAt,
    schemaVersion: meta.schemaVersion,
  };
}

export async function getOfflineCatalogStatus(
  pointOfSaleId: string,
  priceListId: string,
): Promise<{
  rowCount: number;
  snapshotAt: string | null;
  ready: boolean;
  schemaVersion: number | null;
}> {
  const meta = await getCatalogMeta(pointOfSaleId, priceListId);
  if (meta) {
    const schemaCurrent = isCatalogSchemaCurrent(meta);
    return {
      rowCount: meta.rowCount,
      snapshotAt: meta.snapshotAt,
      ready: meta.ready && meta.rowCount > 0 && schemaCurrent,
      schemaVersion: meta.schemaVersion ?? null,
    };
  }
  const db = getPosOfflineDb();
  const rowCount = await db.catalog.where({ pointOfSaleId, priceListId }).count();
  return { rowCount, snapshotAt: null, ready: rowCount > 0, schemaVersion: null };
}

export function formatCatalogAge(snapshotAt: string | null): string | null {
  if (!snapshotAt) return null;
  const ms = Date.now() - new Date(snapshotAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}
