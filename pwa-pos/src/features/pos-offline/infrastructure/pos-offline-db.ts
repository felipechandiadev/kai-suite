import Dexie, { type Table } from "dexie";
import type { PosOfflineCommand } from "../domain/offline-command.types";
import type {
  OfflineFiscalPack,
  OfflineFiscalPackSlice,
  OfflineFiscalPackStandbyRow,
} from "../domain/offline-fiscal-pack.types";
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
const DB_VERSION = 6;

const SHARED_STORES_V3 = {
  commands:
    "id, clientOperationId, status, commandType, createdAt, dependsOn, [status+commandType]",
  fiscal_pack: "pointOfSaleId",
  device: "id",
  meta: "id",
  customers: "customerId, searchName, lastUsedAt",
  company_cache: "id",
  session_meta: "id",
} as const;

const SHARED_STORES_V6 = {
  ...SHARED_STORES_V3,
  fiscal_pack_standby: "pointOfSaleId",
} as const;

export class PosOfflineDatabase extends Dexie {
  commands!: Table<PosOfflineCommand, string>;
  fiscal_pack!: Table<OfflineFiscalPack, string>;
  fiscal_pack_standby!: Table<OfflineFiscalPackStandbyRow, string>;
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
      ...SHARED_STORES_V3,
      catalog: "variantId, [pointOfSaleId+priceListId], barcode, sku, searchName",
      stock_snapshot: "variantId, [pointOfSaleId+priceListId]",
    });
    // Dexie no permite cambiar PK in-place: primero eliminamos tablas con PK vieja.
    this.version(4).stores({
      ...SHARED_STORES_V3,
      catalog: null,
      stock_snapshot: null,
      catalog_meta: "id, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
    });
    // Recreamos catálogo/stock con PK compuesta en campo `id`.
    this.version(5).stores({
      ...SHARED_STORES_V3,
      catalog:
        "id, variantId, pointOfSaleId, priceListId, [pointOfSaleId+priceListId], barcode, sku, searchName",
      catalog_meta: "id, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
      stock_snapshot:
        "id, variantId, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
    });
    this.version(6).stores({
      ...SHARED_STORES_V6,
      catalog:
        "id, variantId, pointOfSaleId, priceListId, [pointOfSaleId+priceListId], barcode, sku, searchName",
      catalog_meta: "id, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
      stock_snapshot:
        "id, variantId, pointOfSaleId, priceListId, [pointOfSaleId+priceListId]",
    });
  }
}

let dbSingleton: PosOfflineDatabase | null = null;
let openPromise: Promise<PosOfflineDatabase> | null = null;

function isPrimaryKeyUpgradeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const name = err instanceof Error ? err.name : "";
  return (
    name === "UpgradeError" ||
    name === "DatabaseClosedError" ||
    /primary key/i.test(message) ||
    /changing primary key/i.test(message)
  );
}

async function openDatabaseWithRecovery(): Promise<PosOfflineDatabase> {
  const db = new PosOfflineDatabase();
  try {
    await db.open();
    return db;
  } catch (err) {
    if (!isPrimaryKeyUpgradeError(err)) throw err;
    await Dexie.delete(DB_NAME);
    const fresh = new PosOfflineDatabase();
    await fresh.open();
    return fresh;
  }
}

export function getPosOfflineDb(): PosOfflineDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB no disponible en este entorno");
  }
  if (!dbSingleton) {
    dbSingleton = new PosOfflineDatabase();
  }
  return dbSingleton;
}

/** Abre IndexedDB y recupera DB corrupta tras migración fallida de PK. */
export async function ensurePosOfflineDbOpen(): Promise<PosOfflineDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB no disponible en este entorno");
  }
  if (openPromise) {
    return openPromise;
  }
  openPromise = (async () => {
    const db = await openDatabaseWithRecovery();
    dbSingleton = db;
    return db;
  })().finally(() => {
    openPromise = null;
  });
  return openPromise;
}

/** Solo tests: reinicia singleton Dexie entre casos. */
export function resetPosOfflineDbForTests(): void {
  dbSingleton = null;
  openPromise = null;
}

export { OFFLINE_CATALOG_SCHEMA_VERSION, DB_VERSION };
