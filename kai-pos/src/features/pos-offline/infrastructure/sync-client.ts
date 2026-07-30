import { posOfflineBackendFetch } from "./backend-api-client";
import type { PosCommandType, PosOfflineFiscalBlock } from "../domain/offline-command.types";

export type SyncCommandBody = {
  clientOperationId: string;
  deviceId: string;
  commandType: PosCommandType;
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  [key: string]: unknown;
  fiscal?: PosOfflineFiscalBlock;
};

export type SyncCommandResponse = {
  success: boolean;
  clientOperationId: string;
  transactionId?: string;
  documentNumber?: string;
  fiscalEmission?: unknown;
  message?: string;
  statusCode?: number;
  reason?: string;
};

export async function postSyncCommand(body: SyncCommandBody) {
  return posOfflineBackendFetch<SyncCommandResponse>("/api/pos/sync/commands", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postSyncCommandsBatch(commands: SyncCommandBody[]) {
  return posOfflineBackendFetch<{ success: boolean; results: SyncCommandResponse[] }>(
    "/api/pos/sync/commands/batch",
    {
      method: "POST",
      body: JSON.stringify({ commands: commands.slice(0, 10) }),
    },
  );
}

/** @deprecated Use postSyncCommand */
export async function postSyncSaleCommand(body: SyncCommandBody) {
  return postSyncCommand(body);
}
