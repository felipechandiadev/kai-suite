/**
 * Ventas vinculadas a un PAYMENT_IN.
 * - Cobro AR consolidado: `metadata.allocations[]`
 * - POS venta pagada: `metadata.saleTransactionId` o `relatedTransactionId`
 */
export type PaymentInRelatedSale = {
  saleId: string;
  documentNumber: string;
  amount: number;
};

/** NC liquidadas en `CUSTOMER_CREDIT_NOTE_PAYOUT` (`metadata.allocations[]`). */
export type CustomerCreditNotePayoutAllocation = {
  creditNoteId: string;
  documentNumber: string;
  amount: number;
};

export function isLegacyPosNcPayoutMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as { source?: unknown }).source === 'pos_nc_payout';
}

export function parseCreditNotePayoutAllocationsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CustomerCreditNotePayoutAllocation[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = metadata.allocations;
  if (!Array.isArray(raw)) return [];
  const out: CustomerCreditNotePayoutAllocation[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const creditNoteId =
      typeof o.creditNoteId === 'string' ? o.creditNoteId.trim() : '';
    if (!creditNoteId) continue;
    out.push({
      creditNoteId,
      documentNumber:
        typeof o.documentNumber === 'string' && o.documentNumber.trim()
          ? o.documentNumber.trim()
          : '',
      amount: Math.round(Number(o.amount) || 0),
    });
  }
  return out;
}

export function relatedCreditNotesFromCustomerPayout(tx: {
  transactionType?: string | null;
  metadata?: Record<string, unknown> | null;
}): CustomerCreditNotePayoutAllocation[] {
  const type = (tx.transactionType ?? '').trim();
  const meta =
    tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : null;
  if (
    type === 'CUSTOMER_CREDIT_NOTE_PAYOUT' ||
    isLegacyPosNcPayoutMetadata(meta)
  ) {
    return parseCreditNotePayoutAllocationsFromMetadata(meta);
  }
  return [];
}

export function parsePaymentInAllocationsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): PaymentInRelatedSale[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = metadata.allocations;
  if (!Array.isArray(raw)) return [];
  const out: PaymentInRelatedSale[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const saleId =
      typeof o.saleId === 'string'
        ? o.saleId.trim()
        : typeof o.saleTransactionId === 'string'
          ? o.saleTransactionId.trim()
          : '';
    if (!saleId) continue;
    out.push({
      saleId,
      documentNumber:
        typeof o.documentNumber === 'string' && o.documentNumber.trim()
          ? o.documentNumber.trim()
          : '',
      amount: Math.round(Number(o.amount) || 0),
    });
  }
  return out;
}

export function relatedSalesFromPaymentIn(tx: {
  relatedTransactionId?: string | null;
  documentNumber?: string | null;
  metadata?: Record<string, unknown> | null;
  relatedTransaction?: {
    id?: string;
    documentNumber?: string;
    transactionType?: string;
  } | null;
}): PaymentInRelatedSale[] {
  const meta =
    tx.metadata && typeof tx.metadata === 'object'
      ? tx.metadata
      : null;
  const fromAllocations = parsePaymentInAllocationsFromMetadata(meta);
  if (fromAllocations.length > 0) return fromAllocations;

  const related = tx.relatedTransaction;
  if (
    related?.id?.trim() &&
    (related.transactionType === 'SALE' || !related.transactionType)
  ) {
    return [
      {
        saleId: related.id.trim(),
        documentNumber:
          typeof related.documentNumber === 'string' &&
          related.documentNumber.trim()
            ? related.documentNumber.trim()
            : '',
        amount: 0,
      },
    ];
  }

  const metaSaleId =
    meta && typeof meta.saleTransactionId === 'string'
      ? meta.saleTransactionId.trim()
      : '';
  const relatedId = tx.relatedTransactionId?.trim() || metaSaleId;
  if (!relatedId) return [];

  return [
    {
      saleId: relatedId,
      documentNumber: '',
      amount: 0,
    },
  ];
}
