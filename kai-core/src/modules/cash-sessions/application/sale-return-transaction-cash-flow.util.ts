import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { getPaymentSnapshots } from '@modules/transactions/application/payment-snapshots.util';

type SaleReturnTxLike = {
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  amountPaid?: number | string | null;
  total?: number | string | null;
  metadata?: Record<string, unknown> | null;
};

export type SaleReturnRefundMode = 'document' | 'immediate';

export function getSaleReturnRefundMode(
  metadata?: Record<string, unknown> | null,
): SaleReturnRefundMode | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const mode = String((metadata as { refundMode?: unknown }).refundMode ?? '').trim();
  if (mode === 'immediate' || mode === 'document') return mode;
  return null;
}

/** Devolución con reembolso en caja (metadata o snapshots con montos). */
export function isImmediateSaleReturnRefund(tx: SaleReturnTxLike): boolean {
  if (tx.transactionType !== TransactionType.SALE_RETURN) return false;
  const mode = getSaleReturnRefundMode(tx.metadata);
  if (mode === 'document') return false;
  if (mode === 'immediate') return true;
  const snapshots = getPaymentSnapshots(tx);
  if (snapshots.some((s) => (Number(s.amount) || 0) > 0)) return true;
  return (Number(tx.amountPaid) || 0) > 0;
}

/**
 * Efectivo de caja en devolución con reembolso inmediato: salida = efectivo devuelto al cliente.
 * Modo documento (sin reembolso) → sin movimiento de efectivo.
 */
export function saleReturnTransactionCashFlows(tx: SaleReturnTxLike): {
  cashIn: number;
  cashOut: number;
} {
  if (tx.transactionType !== TransactionType.SALE_RETURN) {
    return { cashIn: 0, cashOut: 0 };
  }
  if (!isImmediateSaleReturnRefund(tx)) {
    return { cashIn: 0, cashOut: 0 };
  }

  let cashOut = 0;
  const snapshots = getPaymentSnapshots(tx);

  if (snapshots.length > 0) {
    for (const s of snapshots) {
      const m = String(s.method ?? '').toUpperCase();
      if (m === 'CASH') {
        cashOut += Math.max(0, Number(s.amount) || 0);
      }
    }
  } else if (tx.paymentMethod === PaymentMethod.CASH) {
    const paid = Number(tx.amountPaid);
    const total = Number(tx.total) || 0;
    cashOut += Math.max(0, Number.isFinite(paid) && paid > 0 ? paid : total);
  }

  return { cashIn: 0, cashOut };
}
