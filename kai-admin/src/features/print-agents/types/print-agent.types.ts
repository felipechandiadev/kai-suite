export type PrintAgentDto = {
  id: string;
  companyId: string;
  branchId: string | null;
  displayName: string;
  lanHost: string | null;
  wsPort: number | null;
  wssPort: number | null;
  useTls: boolean;
  platform: string;
  online: boolean;
  lastSeenAt: string | null;
  pairedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatePrintAgentResult = PrintAgentDto & {
  pairingToken: string;
};
