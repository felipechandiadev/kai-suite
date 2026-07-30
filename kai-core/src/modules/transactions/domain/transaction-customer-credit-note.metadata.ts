/**
 * Bloque opcional en `transactions.metadata.creditNote` cuando
 * `transactionType === CUSTOMER_CREDIT_NOTE`.
 */
export interface CustomerCreditNoteApplication {
  /** Imputación en venta posterior (medio de pago NC). */
  saleTransactionId?: string;
  /** Liquidación en caja del saldo NC (egreso al cliente). */
  payoutTransactionId?: string;
  amount: number;
  appliedAt: string;
}

export interface TransactionCustomerCreditNoteMetadata {
  /** Monto ya imputado como medio de pago en ventas posteriores. */
  consumedAmount?: number;
  applications?: CustomerCreditNoteApplication[];
}

export function readCreditNoteConsumedAmount(
  metadata: Record<string, unknown> | null | undefined,
): number {
  const block = metadata?.creditNote;
  if (!block || typeof block !== 'object') return 0;
  const n = Number((block as TransactionCustomerCreditNoteMetadata).consumedAmount);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function readCreditNoteAvailableAmount(
  total: number,
  metadata: Record<string, unknown> | null | undefined,
): number {
  const consumed = readCreditNoteConsumedAmount(metadata);
  return Math.max(0, Math.round(Number(total) || 0) - consumed);
}
