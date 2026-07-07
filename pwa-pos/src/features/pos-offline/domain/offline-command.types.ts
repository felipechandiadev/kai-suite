export type PosOfflineCommandStatus =
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT";

export type PosOfflineFiscalBlock = {
  folio: number;
  allocationId: string;
  cafId: string;
  tedXml: string;
  issuedAt: string;
};

export type PosOfflineSaleCommand = {
  id: string;
  clientOperationId: string;
  deviceId: string;
  commandType: "SALE";
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
};
