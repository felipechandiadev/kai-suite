import {
  parsePaymentInAllocationsFromMetadata,
  relatedSalesFromPaymentIn,
} from '../../application/payment-in-allocations.util';

describe('payment-in-allocations.util', () => {
  it('parses metadata.allocations', () => {
    const rows = parsePaymentInAllocationsFromMetadata({
      source: 'pos_ar_collection',
      allocations: [
        { saleId: 's1', documentNumber: 'VTA-1', amount: 3000 },
        { saleId: 's2', documentNumber: 'VTA-2', amount: 7000 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].saleId).toBe('s1');
    expect(rows[1].amount).toBe(7000);
  });

  it('prefers allocations over single relatedTransactionId', () => {
    const rows = relatedSalesFromPaymentIn({
      relatedTransactionId: 's1',
      metadata: {
        allocations: [
          { saleId: 's1', documentNumber: 'VTA-1', amount: 1000 },
          { saleId: 's2', documentNumber: 'VTA-2', amount: 2000 },
        ],
      },
    });
    expect(rows).toHaveLength(2);
  });

  it('falls back to relatedTransactionId when no allocations', () => {
    const rows = relatedSalesFromPaymentIn({
      relatedTransactionId: 's9',
      metadata: { saleTransactionId: 's9', source: 'pos_sale' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].saleId).toBe('s9');
  });
});
