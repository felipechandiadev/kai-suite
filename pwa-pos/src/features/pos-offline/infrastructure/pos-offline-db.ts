import Dexie, { type Table } from "dexie";
import type { PosOfflineCommand } from "../domain/offline-command.types";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";
import type { OfflineCatalogMetaRow, OfflineCatalogRow } from "../domain/offline-catalog.types";
import type {
  CompanyCacheRow,
  OfflineCustomerRow,
  OfflineStockSnapshotRow,
  SessionMetaRow,
} from "../domain/offline-cache.types";
import { OFFLINE_CATALOG_SCHEMA_VERSION } from "../lib/catalog-keys";

export type PosOfflineDeviceRow = {
  id: "device";
  deviceId: string;
};

export type PosOfflineMetaRow = {
  id: "meta";
  localFolioSeq: number;
};

const DB_NAME = "kai-pos-offline";
const DB_VERSION = 4;

export class PosOfflineDatabase extends Dexie {
  commands!: Table<PosOfflineCommand, string>;
  fiscal_pack!: Table<OfflineFiscalPack, string>;
  device!: Table<PosOfflineDeviceRow, string>;
  meta!: Table<PosOfflineMetaRow, string>;
  catalog!: Table<OfflineCatalogRow, string>;
  catalog_meta!: Table<OfflineCatalogMetaRow, string>;
  customers!: Table<OfflineCustomerRow, string>;
  stock_snapshot!: Table<OfflineStockSnapshotRow, string>;
  company_cache!: Table<CompanyCacheRow, string>;
  session_meta!: Table<SessionMetaRow, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      commands: "id, clientOperationId, status, createdAt",
      fiscal_pack: "pointOfSaleId",
      device: "id",
      meta: "id",
    });
    this.version(2).stores({
      commands: "id, clientOperationId, status, createdAt",
      fiscal_pack: "pointOfSaleId",
      device: "id",
      meta: "id",
      catalog: "variantId, [pointOfSaleId+priceListId], barcode, sku, searchName",
    });
    this.version(3).stores({
      commands:
        "id, clientOperationId, status, commandType, createdAt, dependsOn, [status+commandType]",
      fiscal_pack: "pointOfSaleId",
      device: "id",
      meta: "id",
      catalog: "variantId, [pointOfSaleId+priceListId], barcode, sku, searchName",
      customers: "customerId, searchName, lastUsedAt",
      stock_snapshot: "variantId, [pointOfSaleId+priceListId]",
      company_cache: "id",
      session_meta: "id",
    });
    this.version(4)
      .stores({
        commands:
          "id, clientOperationId, status, commandType, createdAt, dependsOn, [status+commandType]",
        fiscal_pack: "pointOfSaleId",
        device: "id",
        meta: "id",
        catalog:
          "id, variantId, pointOfSaleId, priceListId, [pointOfSaleId+priceListId], barcode, sku, searchName",
        catalog_meta: "id, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
        customers: "customerId, searchName, lastUsedAt",
        stock_snapshot:
          "id, variantId, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
        company_cache: "id",
        session_meta: "id",
      })
      .upgrade(async (tx) => {
        await tx.table("catalog").clear();
        await tx.table("stock_snapshot").clear();
        await tx.table("catalog_meta").clear();
      });
  }
}

let dbSingleton: PosOfflineDatabase | null = null;

export function getPosOfflineDb(): PosOfflineDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB no disponible en este entorno");
  }
  if (!dbSingleton) {
    dbSingleton = new PosOfflineDatabase();
  }
  return dbSingleton;
}

/** Solo tests: reinicia singleton Dexie entre casos. */
export function resetPosOfflineDbForTests(): void {
  dbSingleton = null;
}

export { OFFLINE_CATALOG_SCHEMA_VERSION };
