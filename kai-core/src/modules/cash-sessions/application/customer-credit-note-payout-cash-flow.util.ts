import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { getPaymentSnapshots } from '@modules/transactions/application/payment-snapshots.util';
import { isLegacyPosNcPayoutMetadata } from '@modules/transactions/application/payment-in-allocations.util';

type NcPayoutTxLike = {
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  amountPaid?: number | string | null;
  total?: number | string | null;
  metadata?: Record<string, unknown> | null;
};

export function isCustomerCreditNotePayoutTransaction(tx: {
  transactionType: TransactionType;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (tx.transactionType === TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT) {
    return true;
  }
  if (tx.transactionType !== TransactionType.PAYMENT_IN) {
    return false;
  }
  return isLegacyPosNcPayoutMetadata(tx.metadata);
}

/**
 * Egreso de caja al liquidar saldo de NC al cliente.
 */
export function customerCreditNotePayoutCashFlows(tx: NcPayoutTxLike): {
  cashIn: number;
  cashOut: number;
} {
  if (!isCustomerCreditNotePayoutTransaction(tx)) {
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
