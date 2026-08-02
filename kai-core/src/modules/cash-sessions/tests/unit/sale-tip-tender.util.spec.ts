import { saleTipTenderBreakdown, sumSaleTipTenders } from '../../application/sale-tip-tender.util';
import { PaymentMethod, TransactionType } from '@modules/transactions/domain/transaction.entity';

describe('saleTipTenderBreakdown', () => {
  it('classifies tip as card when debit present', () => {
    const out = saleTipTenderBreakdown({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.DEBIT_CARD,
      metadata: {
        tipAmount: 1000,
        payments: [{ method: 'DEBIT_CARD', amount: 11000 }],
      },
    });
    expect(out).toEqual({ tipCash: 0, tipCard: 1000 });
  });

  it('classifies tip as cash when only cash', () => {
    const out = saleTipTenderBreakdown({
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.CASH,
      metadata: {
        tipAmount: 500,
        payments: [{ method: 'CASH', amount: 5500 }],
      },
    });
    expect(out).toEqual({ tipCash: 500, tipCard: 0 });
  });

  it('sums session tips', () => {
    const sum = sumSaleTipTenders([
      {
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CASH,
        metadata: { tipAmount: 100, payments: [{ method: 'CASH', amount: 100 }] },
      },
      {
        transactionType: TransactionType.SALE,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        metadata: {
          tipAmount: 200,
          payments: [{ method: 'CREDIT_CARD', amount: 200 }],
        },
      },
    ]);
    expect(sum).toEqual({ tipCash: 100, tipCard: 200, tipTotal: 300 });
  });
});
