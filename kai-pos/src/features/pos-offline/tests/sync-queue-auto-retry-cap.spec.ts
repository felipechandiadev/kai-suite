import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";

const postSyncCommand = vi.fn();
vi.mock("../infrastructure/sync-client", () => ({ postSyncCommand: (b: unknown) => postSyncCommand(b) }));
vi.mock("../infrastructure/connectivity", () => ({ isBackendReachable: () => true }));

import { syncOfflineQueueOnce } from "../application/sync-queue.usecase";

const cmd = (id: string, over: Record<string, unknown>) => {
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  return {
    id,
    clientOperationId: id,
    deviceId: "dev-1",
    commandType: "SALE" as const,
    status: "FAILED" as const,
    createdAt: old,
    updatedAt: old,
    retryCount: 0,
    localDocumentNumber: `OFF-${id}`,
    serverDocumentNumber: null,
    serverTransactionId: null,
    payload: { pointOfSaleId: "pos", cashSessionId: "sess" },
    fiscal: null,
    dependsOn: null,
    lastError: "x",
    ...over,
  };
};

describe("sync-queue: tope de reintentos automáticos", () => {
  beforeEach(async () => {
    postSyncCommand.mockReset();
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
  });

  it("no reenvía un comando FAILED que agotó los reintentos automáticos", async () => {
    const db = getPosOfflineDb();
    await db.commands.put(cmd("agotado", { retryCount: 5 }));
    await syncOfflineQueueOnce("cajero");
    expect(postSyncCommand).not.toHaveBeenCalled();
    expect((await db.commands.get("agotado"))?.status).toBe("FAILED");
  });

  it("sí reenvía uno con menos intentos y deja constancia si falla la boleta", async () => {
    const db = getPosOfflineDb();
    await db.commands.put(cmd("vigente", { retryCount: 1 }));
    postSyncCommand.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        success: true,
        clientOperationId: "vigente",
        transactionId: "tx-1",
        documentNumber: "V-1",
        fiscalEmission: { status: "FAILED", error: "TED no coincide" },
      },
    });
    await syncOfflineQueueOnce("cajero");
    const row = await db.commands.get("vigente");
    expect(row?.status).toBe("SYNCED");
    expect(row?.lastError).toContain("TED no coincide");
  });
});
