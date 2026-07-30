/**
 * Tipos compartidos con el backend para el sistema de cheques.
 * Mirror de `kai-core/src/modules/checks/domain/check.entity.ts`.
 */
export type CheckDirection = "INCOMING" | "OUTGOING";

export type CheckStatus =
  | "PENDING"
  | "DEPOSITED"
  | "CLEARED"
  | "BOUNCED"
  | "VOIDED"
  | "ENDORSED";

export interface CheckRow {
  id: string;
  companyId: string;
  direction: CheckDirection;
  status: CheckStatus;
  checkNumber: string;
  bankName: string;
  bankAccountKey?: string | null;
  drawerName?: string | null;
  drawerDocument?: string | null;
  payeeName?: string | null;
  payeeId?: string | null;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  depositDate?: string | null;
  clearedDate?: string | null;
  bouncedReason?: string | null;
  transactionId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckEventRow {
  id: string;
  checkId: string;
  fromStatus: CheckStatus | null;
  toStatus: CheckStatus;
  userId: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  at: string;
}

export interface CheckLinkRow {
  id: string;
  checkId: string;
  transactionId: string;
  role: "ORIGIN" | "ENDORSED_TO";
  createdAt: string;
}

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  PENDING: "Pendiente",
  DEPOSITED: "Depositado en banco",
  CLEARED: "Cobrado",
  BOUNCED: "Protestado",
  VOIDED: "Anulado",
  ENDORSED: "Endosado",
};

/** Etiqueta según tipo de cheque (Chile: emitido compensado = pagado). */
export function checkStatusLabel(
  status: CheckStatus,
  direction?: CheckDirection,
): string {
  if (status === "CLEARED" && direction === "OUTGOING") {
    return "Pagado (compensado)";
  }
  if (status === "PENDING" && direction === "OUTGOING") {
    return "Emitido (por pagar)";
  }
  return CHECK_STATUS_LABELS[status];
}

export const CHECK_DIRECTION_LABELS: Record<CheckDirection, string> = {
  INCOMING: "Recibido",
  OUTGOING: "Emitido",
};

export interface CommittedOutgoingChecksSummary {
  totalAmount: number;
  checkCount: number;
  byDueDate: Array<{ dueDate: string | null; amount: number; count: number }>;
  stalePendingCount: number;
}
