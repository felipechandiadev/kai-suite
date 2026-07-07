import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import type {
  PosOfflineFiscalBlock,
  PosOfflineSaleCommand,
} from "../domain/offline-command.types";
import { getOrCreateDeviceId, nextLocalDocumentNumber } from "./device-id";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type EnqueueOfflineSaleInput = {
  payload: Record<string, unknown>;
  fiscal?: PosOfflineFiscalBlock | null;
  localDocumentNumber?: string;
};

export async function enqueueOfflineSale(
  input: EnqueueOfflineSaleInput,
): Promise<PosOfflineSaleCommand> {
  const db = getPosOfflineDb();
  const now = new Date().toISOString();
  const deviceId = await getOrCreateDeviceId();
  const localDocumentNumber =
    input.localDocumentNumber?.trim() || (await nextLocalDocumentNumber());
  const clientOperationId = randomUuid();

  const command: PosOfflineSaleCommand = {
    id: clientOperationId,
    clientOperationId,
    deviceId,
    commandType: "SALE",
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    localDocumentNumber,
    serverDocumentNumber: null,
    serverTransactionId: null,
    payload: input.payload,
    fiscal: input.fiscal ?? null,
    lastError: null,
  };

  await db.commands.put(command);
  return command;
}

export async function listOfflineCommands(): Promise<PosOfflineSaleCommand[]> {
  const db = getPosOfflineDb();
  return db.commands.orderBy("createdAt").toArray();
}

export async function countPendingCommands(): Promise<number> {
  const db = getPosOfflineDb();
  return db.commands
    .where("status")
    .anyOf(["PENDING", "FAILED", "SYNCING"])
    .count();
}
