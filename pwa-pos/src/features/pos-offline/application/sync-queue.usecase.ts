import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { postSyncSaleCommand } from "../infrastructure/sync-client";
import type { PosOfflineSaleCommand } from "../domain/offline-command.types";
import { isBackendReachable } from "../infrastructure/connectivity";

const MAX_BACKOFF_MS = 60_000;
const BASE_BACKOFF_MS = 2_000;
const SYNCED_PURGE_DAYS = 7;

function backoffMs(retryCount: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount));
}

let syncInFlight = false;

export type SyncQueueEvent =
  | { type: "SYNCED"; documentNumber: string; localDocumentNumber: string }
  | { type: "AUTH_EXPIRED" };

const syncListeners = new Set<(event: SyncQueueEvent) => void>();

export function subscribeSyncQueueEvents(listener: (event: SyncQueueEvent) => void): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

function emitSyncEvent(event: SyncQueueEvent) {
  for (const l of syncListeners) l(event);
}

export async function purgeOldSyncedCommands(): Promise<number> {
  const db = getPosOfflineDb();
  const cutoff = Date.now() - SYNCED_PURGE_DAYS * 24 * 60 * 60 * 1000;
  const synced = await db.commands.where("status").equals("SYNCED").toArray();
  let removed = 0;
  for (const cmd of synced) {
    const updatedAt = cmd.updatedAt ? new Date(cmd.updatedAt).getTime() : 0;
    if (updatedAt > 0 && updatedAt < cutoff) {
      await db.commands.delete(cmd.id);
      removed += 1;
    }
  }
  return removed;
}

export async function syncOfflineQueueOnce(userName: string): Promise<void> {
  if (syncInFlight || !isBackendReachable()) return;
  syncInFlight = true;
  try {
    await purgeOldSyncedCommands();
    const db = getPosOfflineDb();
    const pending = await db.commands
      .where("status")
      .anyOf(["PENDING", "FAILED"])
      .sortBy("createdAt");

    for (const cmd of pending) {
      if (!isBackendReachable()) break;
      const waitMs = backoffMs(cmd.retryCount);
      if (cmd.retryCount > 0 && cmd.updatedAt) {
        const elapsed = Date.now() - new Date(cmd.updatedAt).getTime();
        if (elapsed < waitMs) continue;
      }
      await syncOneCommand(cmd, userName);
    }
  } finally {
    syncInFlight = false;
  }
}

async function syncOneCommand(cmd: PosOfflineSaleCommand, userName: string) {
  const db = getPosOfflineDb();
  const now = new Date().toISOString();
  await db.commands.update(cmd.id, { status: "SYNCING", updatedAt: now });

  const payload = cmd.payload as Record<string, unknown>;
  const res = await postSyncSaleCommand({
    clientOperationId: cmd.clientOperationId,
    deviceId: cmd.deviceId,
    commandType: "SALE",
    userName,
    pointOfSaleId: String(payload.pointOfSaleId ?? ""),
    cashSessionId: String(payload.cashSessionId ?? ""),
    paymentMethod: payload.paymentMethod as string | undefined,
    lines: (payload.lines as unknown[]) ?? [],
    payments: payload.payments as unknown[] | undefined,
    amountPaid: payload.amountPaid as number | undefined,
    changeAmount: payload.changeAmount as number | undefined,
    customerId: payload.customerId as string | undefined,
    saleDocumentKind: payload.saleDocumentKind as string | undefined,
    metadata: {
      ...(payload.metadata as Record<string, unknown> | undefined),
      offlineLocalDocumentNumber: cmd.localDocumentNumber,
    },
    promotionSnapshot: payload.promotionSnapshot as unknown[] | undefined,
    fiscal: cmd.fiscal ?? undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      emitSyncEvent({ type: "AUTH_EXPIRED" });
    }
    await db.commands.update(cmd.id, {
      status: res.unreachable ? "PENDING" : "FAILED",
      updatedAt: new Date().toISOString(),
      lastError:
        res.status === 401
          ? "Sesión expirada. Inicia sesión con red."
          : res.message,
      retryCount: cmd.retryCount + 1,
    });
    return;
  }

  const body = res.data;
  if (!body.success) {
    const isConflict = body.statusCode === 409;
    await db.commands.update(cmd.id, {
      status: isConflict ? "CONFLICT" : "FAILED",
      updatedAt: new Date().toISOString(),
      lastError: body.message ?? "Error de sincronización",
      retryCount: cmd.retryCount + 1,
      serverTransactionId: body.transactionId ?? null,
      serverDocumentNumber: body.documentNumber ?? null,
    });
    return;
  }

  await db.commands.update(cmd.id, {
    status: "SYNCED",
    updatedAt: new Date().toISOString(),
    lastError: null,
    serverTransactionId: body.transactionId ?? null,
    serverDocumentNumber: body.documentNumber ?? null,
  });
  if (body.documentNumber) {
    emitSyncEvent({
      type: "SYNCED",
      documentNumber: body.documentNumber,
      localDocumentNumber: cmd.localDocumentNumber,
    });
  }
}

export async function retryOfflineCommand(commandId: string, userName: string) {
  const db = getPosOfflineDb();
  const cmd = await db.commands.get(commandId);
  if (!cmd) return;
  await db.commands.update(commandId, {
    status: "PENDING",
    retryCount: 0,
    lastError: null,
    updatedAt: new Date().toISOString(),
  });
  await syncOfflineQueueOnce(userName);
}
