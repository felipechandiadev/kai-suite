import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import {
  buildOpenCreditRowsFromSales,
  extractInternalCreditAmountFromSale,
  extractOpenCreditModeFromSale,
} from '../../application/internal-credit-debt.util';

describe('internal-credit-debt.util', () => {
  it('extracts INTERNAL_CREDIT from payment snapshots', () => {
    const amount = extractInternalCreditAmountFromSale({
      id: 's1',
      total: 999,
      paymentMethod: 'CASH',
      metadata: {
        payments: [
          { method: PaymentMethod.CASH, amount: 10000 },
          { method: PaymentMethod.INTERNAL_CREDIT, amount: 40000 },
        ],
      },
    });
    expect(amount).toBe(40000);
  });

  it('falls back to total when paymentMethod is INTERNAL_CREDIT', () => {
    expect(
      extractInternalCreditAmountFromSale({
        id: 's1',
        total: 55000,
        paymentMethod: PaymentMethod.INTERNAL_CREDIT,
        metadata: {},
      }),
    ).toBe(55000);
  });

  it('reads CREDIT_LUMP mode from metadata', () => {
    expect(
      extractOpenCreditModeFromSale({
        id: 's1',
        metadata: { customerCreditPlan: { mode: 'CREDIT_LUMP' } },
      }),
    ).toBe('CREDIT_LUMP');
  });

  it('excludes sales that already have installments', () => {
    const rows = buildOpenCreditRowsFromSales(
      [
        {
          id: 'lump-1',
          documentNumber: 'B-1',
          createdAt: '2026-07-01T12:00:00.000Z',
          paymentMethod: PaymentMethod.INTERNAL_CREDIT,
          total: 30000,
          metadata: { customerCreditPlan: { mode: 'CREDIT_LUMP' } },
        },
        {
          id: 'sched-1',
          documentNumber: 'B-2',
          paymentMethod: PaymentMethod.INTERNAL_CREDIT,
          total: 90000,
          metadata: {
            payments: [{ method: PaymentMethod.INTERNAL_CREDIT, amount: 90000 }],
            customerCreditPlan: { mode: 'CREDIT_SCHEDULED' },
          },
        },
      ],
      new Set(['sched-1']),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      transactionId: 'lump-1',
      creditAmount: 30000,
      mode: 'CREDIT_LUMP',
      documentNumber: 'B-1',
    });
  });
});
