import {
  PaymentStatus,
  TransactionStatus,
} from '@modules/transactions/domain/transaction.entity';

const NOT_COLLECTIBLE_TX_STATUSES: string[] = [
  TransactionStatus.VOIDED,
  TransactionStatus.CANCELLED,
  TransactionStatus.DRAFT,
];

export function saleBalanceDue(total: number, amountPaid: number): number {
  const t = Math.round(Number(total) || 0);
  const paid = Math.round(Number(amountPaid) || 0);
  return Math.max(0, t - paid);
}

export function isSaleCollectible(params: {
  transactionType: string;
  paymentStatus?: string | null;
  /** Estado de la transacción: una venta anulada o cancelada ya no se cobra. */
  status?: string | null;
  total: number;
  amountPaid: number;
}): boolean {
  if (params.transactionType !== 'SALE') return false;
  const status = (params.paymentStatus ?? '').trim().toUpperCase();
  if (status === PaymentStatus.PAID || status === PaymentStatus.VOIDED) return false;
  if (NOT_COLLECTIBLE_TX_STATUSES.includes((params.status ?? '').trim().toUpperCase())) {
    return false;
  }
  return saleBalanceDue(params.total, params.amountPaid) > 0;
}
