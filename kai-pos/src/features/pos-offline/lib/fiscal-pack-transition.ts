import type {
  OfflineFiscalPack,
  OfflineFiscalPackSlice,
  OfflineFiscalPackStandbyRow,
} from "../domain/offline-fiscal-pack.types";
import type { PosOfflineDatabase } from "../infrastructure/pos-offline-db";

export function isFiscalPackSliceExhausted(pack: OfflineFiscalPackSlice): boolean {
  return pack.nextFolioLocal > pack.rangeTo;
}

export async function getStoredFiscalPackStandby(
  db: PosOfflineDatabase,
  pointOfSaleId: string,
): Promise<OfflineFiscalPackStandbyRow | null> {
  return (await db.fiscal_pack_standby.get(pointOfSaleId)) ?? null;
}

export async function promoteStandbyFiscalPackIfNeeded(
  db: PosOfflineDatabase,
  pointOfSaleId: string,
): Promise<OfflineFiscalPack | null> {
  const current = await db.fiscal_pack.get(pointOfSaleId);
  if (!current || !isFiscalPackSliceExhausted(current)) {
    return current ?? null;
  }

  const standby = await db.fiscal_pack_standby.get(pointOfSaleId);
  if (!standby) {
    return current;
  }

  const promoted: OfflineFiscalPack = {
    pointOfSaleId,
    ...standby,
    downloadedAt: current.downloadedAt,
  };
  await db.fiscal_pack.put(promoted);
  await db.fiscal_pack_standby.delete(pointOfSaleId);
  return promoted;
}

export function apiSliceToLocalPack(
  pointOfSaleId: string,
  slice: {
    allocationId: string;
    cafId: string;
    dteType: number;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    cafXml: string;
    emisor: OfflineFiscalPackSlice["emisor"];
    packExpiresAt: string;
  },
  existingNextFolioLocal: number | undefined,
  downloadedAt: string,
): OfflineFiscalPack {
  const serverNext = slice.nextFolio;
  const localNext = existingNextFolioLocal ?? serverNext;
  return {
    pointOfSaleId,
    allocationId: slice.allocationId,
    cafId: slice.cafId,
    dteType: slice.dteType,
    rangeFrom: slice.rangeFrom,
    rangeTo: slice.rangeTo,
    nextFolioLocal: Math.max(localNext, serverNext),
    cafXml: slice.cafXml,
    emisor: slice.emisor,
    downloadedAt,
    packExpiresAt: slice.packExpiresAt,
  };
}

export function apiSliceToStandbyPack(
  pointOfSaleId: string,
  slice: {
    allocationId: string;
    cafId: string;
    dteType: number;
    rangeFrom: number;
    rangeTo: number;
    nextFolio: number;
    cafXml: string;
    emisor: OfflineFiscalPackSlice["emisor"];
    packExpiresAt: string;
  },
  existingStandby: OfflineFiscalPackStandbyRow | null | undefined,
): OfflineFiscalPackStandbyRow {
  const serverNext = slice.nextFolio;
  const localNext =
    existingStandby?.allocationId === slice.allocationId
      ? existingStandby.nextFolioLocal
      : serverNext;
  return {
    pointOfSaleId,
    allocationId: slice.allocationId,
    cafId: slice.cafId,
    dteType: slice.dteType,
    rangeFrom: slice.rangeFrom,
    rangeTo: slice.rangeTo,
    nextFolioLocal: Math.max(localNext, serverNext),
    cafXml: slice.cafXml,
    emisor: slice.emisor,
    packExpiresAt: slice.packExpiresAt,
  };
}
