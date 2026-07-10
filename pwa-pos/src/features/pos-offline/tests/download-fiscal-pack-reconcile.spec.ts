import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import { downloadFiscalPackForPos } from "../application/download-fiscal-pack.usecase";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";

vi.mock("../infrastructure/offline-fiscal-pack.request", () => ({
  fetchOfflineFiscalPack: vi.fn(),
}));

import { fetchOfflineFiscalPack } from "../infrastructure/offline-fiscal-pack.request";

describe("download-fiscal-pack reconcile", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
    vi.mocked(fetchOfflineFiscalPack).mockReset();
  });

  it("nextFolioLocal = max(local, server)", async () => {
    const existing: OfflineFiscalPack = {
      pointOfSaleId: "pos-1",
      allocationId: "a1",
      cafId: "c1",
      dteType: 39,
      rangeFrom: 100,
      rangeTo: 200,
      nextFolioLocal: 150,
      cafXml: "<AUTORIZACION/>",
      emisor: {
        rut: "1-9",
        legalName: "X",
        businessActivity: null,
        address: null,
        commune: null,
        city: null,
        resolutionNumber: null,
        resolutionDate: null,
      },
      downloadedAt: new Date().toISOString(),
      packExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    await getPosOfflineDb().fiscal_pack.put(existing);

    vi.mocked(fetchOfflineFiscalPack).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        success: true,
        current: {
          allocationId: "a1",
          cafId: "c1",
          dteType: 39,
          rangeFrom: 100,
          rangeTo: 200,
          nextFolio: 140,
          cafXml: "<AUTORIZACION/>",
          emisor: existing.emisor,
          packExpiresAt: existing.packExpiresAt,
        },
        next: null,
      },
    });

    const result = await downloadFiscalPackForPos("pos-1");
    expect(result.success).toBe(true);
    const stored = await getPosOfflineDb().fiscal_pack.get("pos-1");
    expect(stored?.nextFolioLocal).toBe(150);
  });

  it("persists current and standby packs from API", async () => {
    vi.mocked(fetchOfflineFiscalPack).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        success: true,
        current: {
          allocationId: "a1",
          cafId: "c1",
          dteType: 39,
          rangeFrom: 100,
          rangeTo: 110,
          nextFolio: 100,
          cafXml: "<AUTORIZACION/>",
          emisor: {
            rut: "1-9",
            legalName: "X",
            businessActivity: null,
            address: null,
            commune: null,
            city: null,
            resolutionNumber: null,
            resolutionDate: null,
          },
          packExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        next: {
          allocationId: "a2",
          cafId: "c2",
          dteType: 39,
          rangeFrom: 200,
          rangeTo: 210,
          nextFolio: 200,
          cafXml: "<AUTORIZACION/>",
          emisor: {
            rut: "1-9",
            legalName: "X",
            businessActivity: null,
            address: null,
            commune: null,
            city: null,
            resolutionNumber: null,
            resolutionDate: null,
          },
          packExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    });

    const result = await downloadFiscalPackForPos("pos-2");
    expect(result.success).toBe(true);
    const current = await getPosOfflineDb().fiscal_pack.get("pos-2");
    const standby = await getPosOfflineDb().fiscal_pack_standby.get("pos-2");
    expect(current?.allocationId).toBe("a1");
    expect(standby?.allocationId).toBe("a2");
  });
});
