import {
  isSaleCollectible,
  saleBalanceDue,
} from '../../application/collect-pending-sales.util';

describe('collect-pending-sales.util', () => {
  it('saleBalanceDue returns total minus amountPaid floored at zero', () => {
    expect(saleBalanceDue(10000, 0)).toBe(10000);
    expect(saleBalanceDue(10000, 3000)).toBe(7000);
    expect(saleBalanceDue(10000, 10000)).toBe(0);
    expect(saleBalanceDue(10000, 12000)).toBe(0);
  });

  it('isSaleCollectible accepts PENDING SALE with balance', () => {
    expect(
      isSaleCollectible({
        transactionType: 'SALE',
        paymentStatus: 'PENDING',
        total: 5000,
        amountPaid: 0,
      }),
    ).toBe(true);
  });

  it('isSaleCollectible rejects PAID or non-SALE', () => {
    expect(
      isSaleCollectible({
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        total: 5000,
        amountPaid: 5000,
      }),
    ).toBe(false);
    expect(
      isSaleCollectible({
        transactionType: 'BACKORDER',
        paymentStatus: 'PENDING',
        total: 5000,
        amountPaid: 0,
      }),
    ).toBe(false);
  });
});
