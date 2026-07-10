import { beforeEach, describe, expect, it } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import { reserveLocalFolio } from "../application/reserve-local-folio.usecase";
import type { OfflineFiscalPack, OfflineFiscalPackStandbyRow } from "../domain/offline-fiscal-pack.types";

const emisor = {
  rut: "1-9",
  legalName: "X",
  businessActivity: null,
  address: null,
  commune: null,
  city: null,
  resolutionNumber: null,
  resolutionDate: null,
};

describe("reserve-local-folio", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
  });

  it("agota rango → ticket-only (NO_FOLIOS)", async () => {
    const pack: OfflineFiscalPack = {
      pointOfSaleId: "pos-1",
      allocationId: "a1",
      cafId: "c1",
      dteType: 39,
      rangeFrom: 10,
      rangeTo: 10,
      nextFolioLocal: 11,
      cafXml: "<AUTORIZACION/>",
      emisor,
      downloadedAt: new Date().toISOString(),
      packExpiresAt: new Date().toISOString(),
    };
    await getPosOfflineDb().fiscal_pack.put(pack);

    const result = await reserveLocalFolio("pos-1");
    expect(result).toEqual({ ok: false, reason: "NO_FOLIOS" });
  });

  it("reserva e incrementa nextFolioLocal", async () => {
    const pack: OfflineFiscalPack = {
      pointOfSaleId: "pos-2",
      allocationId: "a2",
      cafId: "c2",
      dteType: 39,
      rangeFrom: 100,
      rangeTo: 105,
      nextFolioLocal: 100,
      cafXml: "<AUTORIZACION/>",
      emisor,
      downloadedAt: new Date().toISOString(),
      packExpiresAt: new Date().toISOString(),
    };
    await getPosOfflineDb().fiscal_pack.put(pack);

    const result = await reserveLocalFolio("pos-2");
    expect(result).toMatchObject({ ok: true, folio: 100 });
    const updated = await getPosOfflineDb().fiscal_pack.get("pos-2");
    expect(updated?.nextFolioLocal).toBe(101);
  });

  it("promotes standby pack when current range is exhausted", async () => {
    const pack: OfflineFiscalPack = {
      pointOfSaleId: "pos-3",
      allocationId: "a-current",
      cafId: "c1",
      dteType: 39,
      rangeFrom: 10,
      rangeTo: 10,
      nextFolioLocal: 11,
      cafXml: "<AUTORIZACION/>",
      emisor,
      downloadedAt: new Date().toISOString(),
      packExpiresAt: new Date().toISOString(),
    };
    const standby: OfflineFiscalPackStandbyRow = {
      pointOfSaleId: "pos-3",
      allocationId: "a-standby",
      cafId: "c2",
      dteType: 39,
      rangeFrom: 20,
      rangeTo: 25,
      nextFolioLocal: 20,
      cafXml: "<AUTORIZACION/>",
      emisor,
      packExpiresAt: new Date().toISOString(),
    };
    const db = getPosOfflineDb();
    await db.fiscal_pack.put(pack);
    await db.fiscal_pack_standby.put(standby);

    const result = await reserveLocalFolio("pos-3");
    expect(result).toMatchObject({
      ok: true,
      folio: 20,
      allocationId: "a-standby",
      cafId: "c2",
    });
    const updated = await db.fiscal_pack.get("pos-3");
    expect(updated?.allocationId).toBe("a-standby");
    expect(updated?.nextFolioLocal).toBe(21);
    expect(await db.fiscal_pack_standby.get("pos-3")).toBeUndefined();
  });
});
