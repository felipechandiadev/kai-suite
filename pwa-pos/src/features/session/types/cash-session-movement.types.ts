/** Fila devuelta por `GET /api/cash-sessions/:id/movements` (alineada con `SessionMovement` en backend). */

export type CashSessionMovementDirection = "IN" | "OUT" | "NEUTRAL";

export type CashSessionMovementRow = {
  id: string;
  transactionType: string;
  documentNumber: string;
  /** Tipo de documento tributario (`transactions.documentType`). */
  documentType?: string | null;
  /** Folio del documento tributario (`transactions.documentFolio`). */
  documentFolio?: string | null;
  createdAt: string;
  total: number;
  paymentMethod: string;
  paymentMethodLabel?: string;
  userId: string | null;
  userFullName: string | null;
  userUserName: string | null;
  notes: string | null;
  reason: string | null;
  metadata: unknown;
  direction: CashSessionMovementDirection;
  /** Proveedor / centro de efectivo asociado (cuando aplica). */
  counterpartyLabel?: string | null;
};
