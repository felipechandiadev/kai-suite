import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { fetchOfflineFiscalPack } from "../infrastructure/offline-fiscal-pack.request";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";

export async function downloadFiscalPackForPos(
  pointOfSaleId: string,
): Promise<{ success: true; pack: OfflineFiscalPack } | { success: false; message: string }> {
  const res = await fetchOfflineFiscalPack(pointOfSaleId);
  if (!res.ok) {
    return {
      success: false,
      message: res.unreachable
        ? "Sin conexión al servidor"
        : res.message || "No se pudo descargar el paquete fiscal",
    };
  }
  const body = res.data;
  if (!body.success || !body.pack) {
    return {
      success: false,
      message: body.message || "El POS no tiene folios configurados para operar offline",
    };
  }

  const db = getPosOfflineDb();
  const existing = await db.fiscal_pack.get(pointOfSaleId);
  const serverNext = body.pack.nextFolio;
  const localNext = existing?.nextFolioLocal ?? serverNext;

  const pack: OfflineFiscalPack = {
    pointOfSaleId,
    allocationId: body.pack.allocationId,
    cafId: body.pack.cafId,
    dteType: body.pack.dteType,
    rangeFrom: body.pack.rangeFrom,
    rangeTo: body.pack.rangeTo,
    nextFolioLocal: Math.max(localNext, serverNext),
    cafXml: body.pack.cafXml,
    emisor: body.pack.emisor,
    downloadedAt: new Date().toISOString(),
    packExpiresAt: body.pack.packExpiresAt,
  };

  await db.fiscal_pack.put(pack);
  return { success: true, pack };
}

export async function getStoredFiscalPack(
  pointOfSaleId: string,
): Promise<OfflineFiscalPack | null> {
  const db = getPosOfflineDb();
  return (await db.fiscal_pack.get(pointOfSaleId)) ?? null;
}

export function isFiscalPackExpired(pack: OfflineFiscalPack | null): boolean {
  if (!pack?.packExpiresAt) return false;
  return Date.now() >= new Date(pack.packExpiresAt).getTime();
}

export async function clearFiscalPackForPos(pointOfSaleId: string): Promise<void> {
  const db = getPosOfflineDb();
  await db.fiscal_pack.delete(pointOfSaleId);
}
