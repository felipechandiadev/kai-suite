import { posOfflineBackendFetch } from "./backend-api-client";
import type { PosOfflineFiscalBlock } from "../domain/offline-command.types";

export type SyncSaleCommandBody = {
  clientOperationId: string;
  deviceId: string;
  commandType: "SALE";
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  paymentMethod?: string;
  lines: unknown[];
  payments?: unknown[];
  amountPaid?: number;
  changeAmount?: number;
  customerId?: string;
  saleDocumentKind?: string;
  metadata?: Record<string, unknown>;
  promotionSnapshot?: unknown[];
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
};

export async function postSyncSaleCommand(body: SyncSaleCommandBody) {
  return posOfflineBackendFetch<SyncCommandResponse>("/api/pos/sync/commands", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
