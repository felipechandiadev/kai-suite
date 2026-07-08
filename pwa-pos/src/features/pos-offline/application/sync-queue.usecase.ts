import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { postSyncCommand } from "../infrastructure/sync-client";
import type { PosOfflineCommand } from "../domain/offline-command.types";
import { isBackendReachable } from "../infrastructure/connectivity";

const MAX_BACKOFF_MS = 60_000;
const BASE_BACKOFF_MS = 2_000;
const SYNCED_PURGE_DAYS = 30;
const FAILED_PURGE_DAYS = 90;
const SYNCING_STALE_MS = 2 * 60 * 1000;
const SYNC_LOCK_NAME = "kai-pos-offline-sync";
const SYNC_BATCH_SIZE = 10;

function backoffMs(retryCount: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount));
}

let syncInFlight = false;

export async function recoverStaleSyncingCommands(): Promise<number> {
  const db = getPosOfflineDb();
  const syncing = await db.commands.where("status").equals("SYNCING").toArray();
  const now = Date.now();
  let recovered = 0;
  for (const cmd of syncing) {
    const updatedAt = cmd.updatedAt ? new Date(cmd.updatedAt).getTime() : 0;
    if (updatedAt > 0 && now - updatedAt > SYNCING_STALE_MS) {
      await db.commands.update(cmd.id, {
        status: "PENDING",
        updatedAt: new Date().toISOString(),
      });
      recovered += 1;
    }
  }
  return recovered;
}

async function withSyncLeader<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks?.request) {
    return navigator.locks.request(SYNC_LOCK_NAME, { mode: "exclusive", ifAvailable: true }, (lock) => {
      if (!lock) return undefined;
      return fn();
    });
  }
  return fn();
}

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
  const syncedCutoff = Date.now() - SYNCED_PURGE_DAYS * 24 * 60 * 60 * 1000;
  const failedCutoff = Date.now() - FAILED_PURGE_DAYS * 24 * 60 * 60 * 1000;
  const all = await db.commands.toArray();
  let removed = 0;
  for (const cmd of all) {
    const updatedAt = cmd.updatedAt ? new Date(cmd.updatedAt).getTime() : 0;
    if (updatedAt <= 0) continue;
    const purgeSynced = cmd.status === "SYNCED" && updatedAt < syncedCutoff;
    const purgeFailed =
      (cmd.status === "FAILED" || cmd.status === "CONFLICT") && updatedAt < failedCutoff;
    if (purgeSynced || purgeFailed) {
      await db.commands.delete(cmd.id);
      removed += 1;
    }
  }
  return removed;
}

export async function syncOfflineQueueOnce(userName: string): Promise<void> {
  if (syncInFlight || !isBackendReachable()) return;

  await withSyncLeader(async () => {
    if (syncInFlight) return;
    syncInFlight = true;
    try {
      await recoverStaleSyncingCommands();
      await purgeOldSyncedCommands();
      const db = getPosOfflineDb();
      const pending = await db.commands
        .where("status")
        .anyOf(["PENDING", "FAILED"])
        .sortBy("createdAt");

      let processed = 0;
      for (const cmd of pending) {
        if (!isBackendReachable()) break;
        if (processed >= SYNC_BATCH_SIZE) break;
        if (cmd.dependsOn) {
          const dep = await db.commands.get(cmd.dependsOn);
          if (dep && dep.status !== "SYNCED") continue;
        }
        const waitMs = backoffMs(cmd.retryCount);
        if (cmd.retryCount > 0 && cmd.updatedAt) {
          const elapsed = Date.now() - new Date(cmd.updatedAt).getTime();
          if (elapsed < waitMs) continue;
        }
        await syncOneCommand(cmd, userName);
        processed += 1;
      }
    } finally {
      syncInFlight = false;
    }
  });
}

function buildSyncBody(cmd: PosOfflineCommand, userName: string): Record<string, unknown> {
  const payload = cmd.payload as Record<string, unknown>;
  const base = {
    clientOperationId: cmd.clientOperationId,
    deviceId: cmd.deviceId,
    commandType: cmd.commandType,
    userName,
    pointOfSaleId: String(payload.pointOfSaleId ?? ""),
    cashSessionId: String(payload.cashSessionId ?? ""),
  };

  switch (cmd.commandType) {
    case "SALE":
      return {
        ...base,
        paymentMethod: payload.paymentMethod,
        lines: payload.lines ?? [],
        payments: payload.payments,
        amountPaid: payload.amountPaid,
        changeAmount: payload.changeAmount,
        customerId: payload.customerId,
        saleDocumentKind: payload.saleDocumentKind,
        metadata: {
          ...(payload.metadata as Record<string, unknown> | undefined),
          offlineLocalDocumentNumber: cmd.localDocumentNumber,
        },
        promotionSnapshot: payload.promotionSnapshot,
        fiscal: cmd.fiscal ?? undefined,
      };
    case "CASH_MOVEMENT":
      return {
        ...base,
        direction: payload.direction,
        amount: payload.amount,
        reason: payload.reason,
      };
    case "HUB_DEPOSIT":
    case "HUB_WITHDRAWAL":
      return {
        ...base,
        cashHubId: payload.cashHubId,
        amount: payload.amount,
        reason: payload.reason,
      };
    case "CLOSE_SESSION":
      return {
        ...base,
        cashHubId: payload.cashHubId,
        notes: payload.notes,
        counted: payload.counted,
      };
    default:
      return base;
  }
}

async function syncOneCommand(cmd: PosOfflineCommand, userName: string) {
  const db = getPosOfflineDb();
  const now = new Date().toISOString();
  await db.commands.update(cmd.id, { status: "SYNCING", updatedAt: now });

  const res = await postSyncCommand(buildSyncBody(cmd, userName) as Parameters<typeof postSyncCommand>[0]);

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

export async function discardOfflineCommand(commandId: string) {
  const db = getPosOfflineDb();
  await db.commands.delete(commandId);
}
