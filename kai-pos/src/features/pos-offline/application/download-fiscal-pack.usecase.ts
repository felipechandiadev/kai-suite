import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { fetchOfflineFiscalPack } from "../infrastructure/offline-fiscal-pack.request";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";
import {
  apiSliceToLocalPack,
  apiSliceToStandbyPack,
} from "../lib/fiscal-pack-transition";

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
  if (!body.success || !body.current) {
    return {
      success: false,
      message: body.message || "El POS no tiene folios configurados para operar offline",
    };
  }

  const db = getPosOfflineDb();
  const existing = await db.fiscal_pack.get(pointOfSaleId);
  const existingStandby = await db.fiscal_pack_standby.get(pointOfSaleId);
  const downloadedAt = new Date().toISOString();

  const pack = apiSliceToLocalPack(
    pointOfSaleId,
    body.current,
    existing?.allocationId === body.current.allocationId
      ? existing.nextFolioLocal
      : undefined,
    downloadedAt,
  );

  await db.fiscal_pack.put(pack);

  if (body.next) {
    const standby = apiSliceToStandbyPack(pointOfSaleId, body.next, existingStandby);
    await db.fiscal_pack_standby.put(standby);
  } else {
    await db.fiscal_pack_standby.delete(pointOfSaleId);
  }

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
  await db.fiscal_pack_standby.delete(pointOfSaleId);
}
