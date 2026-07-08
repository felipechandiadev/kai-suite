export const POS_SYNC_COMMAND_TYPES = [
  'SALE',
  'CASH_MOVEMENT',
  'HUB_DEPOSIT',
  'HUB_WITHDRAWAL',
  'CLOSE_SESSION',
] as const;

export type PosSyncCommandType = (typeof POS_SYNC_COMMAND_TYPES)[number];

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

export type SyncCommandBase = {
  clientOperationId: string;
  deviceId: string;
  commandType: PosSyncCommandType;
  userName: string;
  cashSessionId: string;
  pointOfSaleId?: string;
};
