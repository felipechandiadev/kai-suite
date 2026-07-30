import { PaymentMethod, TransactionType } from '@modules/transactions/domain/transaction.entity';
import {
  isImmediateSaleReturnRefund,
  saleReturnTransactionCashFlows,
} from './sale-return-transaction-cash-flow.util';

describe('saleReturnTransactionCashFlows', () => {
  it('returns zero for document-mode return', () => {
    expect(
      saleReturnTransactionCashFlows({
        transactionType: TransactionType.SALE_RETURN,
        paymentMethod: PaymentMethod.CASH,
        total: 10000,
        amountPaid: 0,
        metadata: { refundMode: 'document' },
      }),
    ).toEqual({ cashIn: 0, cashOut: 0 });
  });

  it('counts cash from paymentSnapshots on immediate refund', () => {
    expect(
      saleReturnTransactionCashFlows({
        transactionType: TransactionType.SALE_RETURN,
        paymentMethod: PaymentMethod.MIXED,
        total: 15000,
        amountPaid: 15000,
        metadata: {
          refundMode: 'immediate',
          paymentSnapshots: [
            { method: 'CASH', amount: 5000 },
            { method: 'TRANSFER', amount: 10000 },
          ],
        },
      }),
    ).toEqual({ cashIn: 0, cashOut: 5000 });
  });

  it('falls back to amountPaid when CASH and no snapshots', () => {
    expect(
      saleReturnTransactionCashFlows({
        transactionType: TransactionType.SALE_RETURN,
        paymentMethod: PaymentMethod.CASH,
        total: 8000,
        amountPaid: 8000,
        metadata: { refundMode: 'immediate' },
      }),
    ).toEqual({ cashIn: 0, cashOut: 8000 });
  });
});

describe('isImmediateSaleReturnRefund', () => {
  it('is false for document mode', () => {
    expect(
      isImmediateSaleReturnRefund({
        transactionType: TransactionType.SALE_RETURN,
        paymentMethod: PaymentMethod.CASH,
        metadata: { refundMode: 'document' },
      }),
    ).toBe(false);
  });

  it('is true for immediate mode', () => {
    expect(
      isImmediateSaleReturnRefund({
        transactionType: TransactionType.SALE_RETURN,
        paymentMethod: PaymentMethod.CASH,
        metadata: { refundMode: 'immediate' },
      }),
    ).toBe(true);
  });
});
