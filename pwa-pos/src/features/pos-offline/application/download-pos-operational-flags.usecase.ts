import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { fetchPosOperationalFlags } from "../infrastructure/offline-pos-operational-flags.request";
import {
  patchPosContextClient,
  readPosContextClient,
} from "@/features/session/lib/pos-context-storage";

export async function downloadPosOperationalFlagsForPos(
  pointOfSaleId: string,
): Promise<{ success: true; deferredPaymentEnabled: boolean } | { success: false; message: string }> {
  const res = await fetchPosOperationalFlags(pointOfSaleId);
  if (!res.ok) {
    return {
      success: false,
      message: res.unreachable
        ? "Sin conexión al servidor"
        : res.message || "No se pudo descargar la política operativa del POS",
    };
  }

  const deferredPaymentEnabled = res.data.pointOfSale?.deferredPaymentEnabled === true;
  const db = getPosOfflineDb();
  const existing = await db.session_meta.get("session");
  await db.session_meta.put({
    id: "session",
    pointOfSaleName: existing?.pointOfSaleName ?? null,
    userRole: existing?.userRole ?? null,
    personName: existing?.personName ?? null,
    deferredPaymentEnabled,
    cachedAt: new Date().toISOString(),
  });

  const ctx = readPosContextClient();
  if (ctx?.pointOfSaleId === pointOfSaleId) {
    patchPosContextClient({ deferredPaymentEnabled });
  }

  return { success: true, deferredPaymentEnabled };
}
