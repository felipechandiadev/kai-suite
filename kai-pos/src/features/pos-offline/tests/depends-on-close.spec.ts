import { beforeEach, describe, expect, it } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import {
  enqueueOfflineCommand,
  getLastCommandIdForCashSession,
} from "../application/enqueue-command.usecase";

describe("dependsOn close session", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
    await db.device.put({ id: "device", deviceId: "dev-test" });
    await db.meta.put({ id: "meta", localFolioSeq: 0 });
  });

  it("resuelve el último comando FIFO de la sesión", async () => {
    await enqueueOfflineCommand({
      commandType: "CASH_MOVEMENT",
      payload: {
        pointOfSaleId: "pos-1",
        cashSessionId: "sess-1",
        direction: "DEPOSIT",
        amount: 1000,
      },
    });
    const sale = await enqueueOfflineCommand({
      commandType: "SALE",
      payload: {
        pointOfSaleId: "pos-1",
        cashSessionId: "sess-1",
        lines: [],
      },
    });

    const lastId = await getLastCommandIdForCashSession("sess-1");
    expect(lastId).toBe(sale.id);
  });
});
