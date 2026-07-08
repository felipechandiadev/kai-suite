import { getPosOfflineDb, ensurePosOfflineDbOpen } from "../infrastructure/pos-offline-db";
import type {
  PosCommandType,
  PosOfflineCommand,
  PosOfflineFiscalBlock,
} from "../domain/offline-command.types";
import { getOrCreateDeviceId, nextLocalDocumentNumber } from "./device-id";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type EnqueueOfflineCommandInput = {
  commandType: PosCommandType;
  payload: Record<string, unknown>;
  fiscal?: PosOfflineFiscalBlock | null;
  localDocumentNumber?: string;
  dependsOn?: string | null;
};

export async function enqueueOfflineCommand(
  input: EnqueueOfflineCommandInput,
): Promise<PosOfflineCommand> {
  await ensurePosOfflineDbOpen();
  const db = getPosOfflineDb();
  const now = new Date().toISOString();
  const deviceId = await getOrCreateDeviceId();
  const localDocumentNumber =
    input.localDocumentNumber?.trim() || (await nextLocalDocumentNumber());
  const clientOperationId = randomUuid();

  const command: PosOfflineCommand = {
    id: clientOperationId,
    clientOperationId,
    deviceId,
    commandType: input.commandType,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    localDocumentNumber,
    serverDocumentNumber: null,
    serverTransactionId: null,
    payload: input.payload,
    fiscal: input.fiscal ?? null,
    dependsOn: input.dependsOn ?? null,
    lastError: null,
  };

  await db.commands.put(command);
  return command;
}

export async function enqueueOfflineSale(
  input: Omit<EnqueueOfflineCommandInput, "commandType">,
): Promise<PosOfflineCommand> {
  return enqueueOfflineCommand({ ...input, commandType: "SALE" });
}

export async function listOfflineCommands(): Promise<PosOfflineCommand[]> {
  const db = getPosOfflineDb();
  return db.commands.orderBy("createdAt").toArray();
}

export async function countPendingCommands(): Promise<number> {
  const db = getPosOfflineDb();
  return db.commands
    .where("status")
    .anyOf(["PENDING", "FAILED", "SYNCING", "CONFLICT"])
    .count();
}

export async function hasBlockingCommandsForClose(): Promise<boolean> {
  const db = getPosOfflineDb();
  const blocking = await db.commands
    .where("status")
    .anyOf(["PENDING", "FAILED", "SYNCING", "CONFLICT"])
    .count();
  return blocking > 0;
}

/** Último comando encolado para una sesión de caja (orden FIFO por createdAt). */
export async function getLastCommandIdForCashSession(
  cashSessionId: string,
): Promise<string | null> {
  const sessionId = cashSessionId.trim();
  if (!sessionId) return null;
  const db = getPosOfflineDb();
  const cmds = await db.commands.orderBy("createdAt").toArray();
  const forSession = cmds.filter(
    (cmd) => String((cmd.payload as { cashSessionId?: string }).cashSessionId ?? "") === sessionId,
  );
  if (forSession.length === 0) return null;
  return forSession[forSession.length - 1]?.id ?? null;
}
