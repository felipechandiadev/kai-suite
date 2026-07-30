export type CashSessionMovementDirection = "IN" | "OUT" | "NEUTRAL";

export interface CashSessionMovementRow {
  id: string;
  transactionType: string;
  documentNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  userFullName: string | null;
  userUserName: string | null;
  direction: CashSessionMovementDirection;
  notes: string | null;
  relatedTransactionId?: string | null;
}
