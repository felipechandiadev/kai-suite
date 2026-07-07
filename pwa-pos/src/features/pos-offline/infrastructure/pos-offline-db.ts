import Dexie, { type Table } from "dexie";
import type { PosOfflineSaleCommand } from "../domain/offline-command.types";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";
import type { OfflineCatalogRow } from "../domain/offline-catalog.types";

export type PosOfflineDeviceRow = {
  id: "device";
  deviceId: string;
};

export type PosOfflineMetaRow = {
  id: "meta";
  localFolioSeq: number;
};

const DB_NAME = "kai-pos-offline";
const DB_VERSION = 2;

export class PosOfflineDatabase extends Dexie {
  commands!: Table<PosOfflineSaleCommand, string>;
  fiscal_pack!: Table<OfflineFiscalPack, string>;
  device!: Table<PosOfflineDeviceRow, string>;
  meta!: Table<PosOfflineMetaRow, string>;
  catalog!: Table<OfflineCatalogRow, string>;

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
