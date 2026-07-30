import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import {
  computeCashSessionExpectedAmount,
  isPosLinkedPaymentIn,
} from './cash-session-expected-amount.util';

function tx(partial: Record<string, unknown>) {
  return partial as any;
}

describe('cash-session-expected-amount.util', () => {
  it('isPosLinkedPaymentIn only when metadata.source is pos_sale', () => {
    expect(
      isPosLinkedPaymentIn(
        tx({
          transactionType: TransactionType.PAYMENT_IN,
          relatedTransactionId: 'sale-1',
        }),
      ),
    ).toBe(false);
    expect(
      isPosLinkedPaymentIn(
        tx({
          transactionType: TransactionType.PAYMENT_IN,
          metadata: { source: 'pos_sale' },
        }),
      ),
    ).toBe(true);
  });

  it('SALE with vuelto: net cash in drawer, not gross tender', () => {
    const expected = computeCashSessionExpectedAmount(0, [
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CASH,
        total: 10000,
        amountPaid: 15000,
        changeAmount: 5000,
      }),
    ]);
    expect(expected).toBe(10000);
  });

  it('ignores pos PAYMENT_IN duplicate; uses SALE cash flow only', () => {
    const expected = computeCashSessionExpectedAmount(0, [
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CASH,
        total: 10000,
        amountPaid: 15000,
        changeAmount: 5000,
        metadata: {
          paymentSnapshots: [{ method: 'CASH', amount: 15000 }],
        },
      }),
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.PAYMENT_IN,
        paymentMethod: PaymentMethod.CASH,
        total: 15000,
        changeAmount: 5000,
        metadata: { source: 'pos_sale' },
      }),
    ]);
    expect(expected).toBe(10000);
  });

  it('standalone PAYMENT_IN in cash adds net (total − change)', () => {
    const expected = computeCashSessionExpectedAmount(0, [
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.PAYMENT_IN,
        paymentMethod: PaymentMethod.CASH,
        total: 8000,
        changeAmount: 0,
      }),
    ]);
    expect(expected).toBe(8000);
  });

  it('does not double-count opening: session.openingAmount + CASH_SESSION_OPENING tx', () => {
    const expected = computeCashSessionExpectedAmount(8000, [
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.CASH_SESSION_OPENING,
        paymentMethod: PaymentMethod.CASH,
        total: 8000,
      }),
    ]);
    expect(expected).toBe(8000);
  });

  it('SUPPLIER_PAYMENT in cash with cashSessionId reduces expected amount', () => {
    const expected = computeCashSessionExpectedAmount(10000, [
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        paymentMethod: PaymentMethod.CASH,
        cashSessionId: 'session-1',
        total: 3500,
      }),
    ]);
    expect(expected).toBe(6500);
  });

  it('SUPPLIER_PAYMENT transfer without cashSessionId does not affect cash expected', () => {
    const expected = computeCashSessionExpectedAmount(10000, [
      tx({
        status: TransactionStatus.CONFIRMED,
        transactionType: TransactionType.SUPPLIER_PAYMENT,
        paymentMethod: PaymentMethod.TRANSFER,
        total: 3500,
      }),
    ]);
    expect(expected).toBe(10000);
  });
});
