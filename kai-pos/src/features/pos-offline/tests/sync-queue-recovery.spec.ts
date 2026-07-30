import { beforeEach, describe, expect, it } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import { recoverStaleSyncingCommands } from "../application/sync-queue.usecase";

describe("sync-queue recovery", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
  });

  it("recupera comandos SYNCING stale a PENDING", async () => {
    const db = getPosOfflineDb();
    const staleAt = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    await db.commands.put({
      id: "cmd-1",
      clientOperationId: "cmd-1",
      deviceId: "dev-1",
      commandType: "SALE",
      status: "SYNCING",
      createdAt: staleAt,
      updatedAt: staleAt,
      retryCount: 0,
      localDocumentNumber: "OFF1",
      serverDocumentNumber: null,
      serverTransactionId: null,
      payload: { cashSessionId: "sess-1" },
      fiscal: null,
      dependsOn: null,
      lastError: null,
    });

    const recovered = await recoverStaleSyncingCommands();
    expect(recovered).toBe(1);
    const cmd = await db.commands.get("cmd-1");
    expect(cmd?.status).toBe("PENDING");
  });
});
