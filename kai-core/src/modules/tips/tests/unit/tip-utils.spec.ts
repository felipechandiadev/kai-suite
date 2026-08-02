import {
  TIP_CARD_DUE_BUSINESS_DAYS,
  addBusinessDaysUtc,
  isCardTipPaymentMethod,
} from '../../domain/tip-business-days.util';
import { distributeByWeights } from '../../domain/tip-distribute.util';

describe('tip-business-days', () => {
  it('adds 7 business days skipping weekends', () => {
    // Friday 2026-07-31 UTC
    const from = new Date(Date.UTC(2026, 6, 31, 12, 0, 0));
    const due = addBusinessDaysUtc(from, TIP_CARD_DUE_BUSINESS_DAYS);
    // +7 business days from Fri → Mon+Tue+Wed+Thu+Fri+Mon+Tue = Aug 11
    expect(due.toISOString().slice(0, 10)).toBe('2026-08-11');
  });

  it('detects card payment methods', () => {
    expect(isCardTipPaymentMethod('DEBIT_CARD')).toBe(true);
    expect(isCardTipPaymentMethod('CREDIT_CARD')).toBe(true);
    expect(isCardTipPaymentMethod('CASH')).toBe(false);
  });
});

describe('distributeByWeights', () => {
  it('splits total by weights with remainder on last', () => {
    const out = distributeByWeights(100, [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 1 },
      { id: 'c', weight: 1 },
    ]);
    expect(out.reduce((s, x) => s + x.amount, 0)).toBe(100);
    expect(out).toHaveLength(3);
  });
});
