import { PaymentMethod, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { saleTransactionCashFlows } from './sale-transaction-cash-flow.util';

describe('saleTransactionCashFlows', () => {
  it('returns zero for non-SALE', () => {
    expect(
      saleTransactionCashFlows({
        transactionType: TransactionType.PAYMENT_IN,
        paymentMethod: PaymentMethod.CASH,
        total: 100,
      }),
    ).toEqual({ cashIn: 0, cashOut: 0 });
  });

  it('reads canonical metadata.payments', () => {
    const r = saleTransactionCashFlows({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.DEBIT_CARD,
      total: 1300,
      metadata: {
        payments: [
          { method: 'CASH', amount: 400, capturedAt: 'x' },
          { method: 'DEBIT_CARD', amount: 900, capturedAt: 'x' },
        ],
      },
    });
    expect(r.cashIn).toBe(400);
    expect(r.cashOut).toBe(0);
  });

  it('mixed payment: sums only CASH snapshots and adds change as out', () => {
    const r = saleTransactionCashFlows({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      total: 7000,
      amountPaid: 7000,
      changeAmount: 3000,
      metadata: {
        paymentSnapshots: [
          { method: 'CASH', amount: 10000 },
          { method: 'CREDIT_CARD', amount: 0 },
        ],
      },
    });
    expect(r.cashIn).toBe(10000);
    expect(r.cashOut).toBe(3000);
  });

  it('single CASH without snapshots: uses amountPaid as tender and change out', () => {
    const r = saleTransactionCashFlows({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.CASH,
      total: 7000,
      amountPaid: 10000,
      changeAmount: 3000,
    });
    expect(r.cashIn).toBe(10000);
    expect(r.cashOut).toBe(3000);
  });

  it('single CASH exact pay: amountPaid equals total, no change', () => {
    const r = saleTransactionCashFlows({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.CASH,
      total: 7000,
      amountPaid: 7000,
      changeAmount: 0,
    });
    expect(r.cashIn).toBe(7000);
    expect(r.cashOut).toBe(0);
  });

  it('snapshots only non-cash: no cash in, still vuelto out', () => {
    const r = saleTransactionCashFlows({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      total: 5000,
      amountPaid: 5000,
      changeAmount: 0,
      metadata: {
        paymentSnapshots: [{ method: 'CREDIT_CARD', amount: 5000 }],
      },
    });
    expect(r.cashIn).toBe(0);
    expect(r.cashOut).toBe(0);
  });
});
