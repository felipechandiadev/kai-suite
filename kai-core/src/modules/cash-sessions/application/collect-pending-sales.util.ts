import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';

export function saleBalanceDue(total: number, amountPaid: number): number {
  const t = Math.round(Number(total) || 0);
  const paid = Math.round(Number(amountPaid) || 0);
  return Math.max(0, t - paid);
}

export function isSaleCollectible(params: {
  transactionType: string;
  paymentStatus?: string | null;
  total: number;
  amountPaid: number;
}): boolean {
  if (params.transactionType !== 'SALE') return false;
  const status = (params.paymentStatus ?? '').trim().toUpperCase();
  if (status === PaymentStatus.PAID) return false;
  return saleBalanceDue(params.total, params.amountPaid) > 0;
}
