import type { Transaction } from '../../domain/transaction.entity';
import {
  readCreditNoteAvailableAmount,
  readCreditNoteConsumedAmount,
} from '../../domain/transaction-customer-credit-note.metadata';

export type CustomerCreditNoteUsageStatus =
  | 'available'
  | 'partially_used'
  | 'fully_used';

export type CustomerCreditNoteLinkSummary = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  usageStatus: CustomerCreditNoteUsageStatus;
  createdAt: string;
  status: string;
};

export function buildCustomerCreditNoteLinkSummary(
  creditNote: Transaction,
): CustomerCreditNoteLinkSummary {
  const meta = (creditNote.metadata ?? {}) as Record<string, unknown>;
  const total = Math.round(Number(creditNote.total) || 0);
  const consumedAmount = readCreditNoteConsumedAmount(meta);
  const availableAmount = readCreditNoteAvailableAmount(total, meta);
  let usageStatus: CustomerCreditNoteUsageStatus = 'available';
  if (availableAmount < 1) {
    usageStatus = 'fully_used';
  } else if (consumedAmount > 0) {
    usageStatus = 'partially_used';
  }
  return {
    id: creditNote.id,
    documentNumber: String(creditNote.documentNumber ?? creditNote.id),
    total,
    consumedAmount,
    availableAmount,
    usageStatus,
    createdAt:
      creditNote.createdAt instanceof Date
        ? creditNote.createdAt.toISOString()
        : String(creditNote.createdAt ?? ''),
    status: String(creditNote.status ?? ''),
  };
}
