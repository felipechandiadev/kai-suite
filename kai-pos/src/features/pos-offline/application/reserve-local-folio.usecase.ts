import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { promoteStandbyFiscalPackIfNeeded } from "../lib/fiscal-pack-transition";

export type ReserveLocalFolioResult =
  | { ok: true; folio: number; allocationId: string; cafId: string }
  | { ok: false; reason: "NO_PACK" | "NO_FOLIOS" };

export async function reserveLocalFolio(
  pointOfSaleId: string,
): Promise<ReserveLocalFolioResult> {
  const db = getPosOfflineDb();
  return db.transaction("rw", [db.fiscal_pack, db.fiscal_pack_standby], async () => {
    let pack = await promoteStandbyFiscalPackIfNeeded(db, pointOfSaleId);
    if (!pack) {
      return { ok: false as const, reason: "NO_PACK" as const };
    }
    if (pack.nextFolioLocal > pack.rangeTo) {
      return { ok: false as const, reason: "NO_FOLIOS" as const };
    }
    const folio = pack.nextFolioLocal;
    pack.nextFolioLocal = folio + 1;
    await db.fiscal_pack.put(pack);
    return {
      ok: true as const,
      folio,
      allocationId: pack.allocationId,
      cafId: pack.cafId,
    };
  });
}
