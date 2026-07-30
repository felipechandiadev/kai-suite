export type PosOfflineCommandStatus =
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT";

export type PosCommandType =
  | "SALE"
  | "CASH_MOVEMENT"
  | "HUB_DEPOSIT"
  | "HUB_WITHDRAWAL"
  | "CLOSE_SESSION";

export type PosOfflineFiscalBlock = {
  folio: number;
  allocationId: string;
  cafId: string;
  tedXml: string;
  issuedAt: string;
};

export type PosOfflineCommandBase = {
  id: string;
  clientOperationId: string;
  deviceId: string;
  commandType: PosCommandType;
  status: PosOfflineCommandStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  retryCount: number;
  localDocumentNumber: string;
  serverDocumentNumber?: string | null;
  serverTransactionId?: string | null;
  payload: Record<string, unknown>;
  fiscal?: PosOfflineFiscalBlock | null;
  dependsOn?: string | null;
};

export type PosOfflineSaleCommand = PosOfflineCommandBase & {
  commandType: "SALE";
};

export type PosOfflineCommand = PosOfflineCommandBase;

export type PosOfflineFeature =
  | "sale"
  | "cash_movement"
  | "hub_deposit"
  | "hub_withdrawal"
  | "close_session";
