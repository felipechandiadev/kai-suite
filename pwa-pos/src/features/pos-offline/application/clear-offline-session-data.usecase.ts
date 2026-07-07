import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { clearFiscalPackForPos } from "./download-fiscal-pack.usecase";

/** Limpia datos sensibles del POS al cerrar sesión (CAF en IndexedDB). */
export async function clearOfflineSensitiveDataForPos(pointOfSaleId: string): Promise<void> {
  await clearFiscalPackForPos(pointOfSaleId);
  const db = getPosOfflineDb();
  await db.catalog.where("pointOfSaleId").equals(pointOfSaleId).delete();
}
