import {
  computeServiceLineTotal,
  recalculateLaundryTotals,
} from '../../application/utils/recalculate-laundry-totals.util';

describe('recalculateLaundryTotals', () => {
  it('sums line totals into servicesTotal', () => {
    const result = recalculateLaundryTotals(
      [{ lineTotal: 100 }, { lineTotal: '50.5' }, { lineTotal: 0 }],
      0,
    );
    expect(result.servicesTotal).toBe(150.5);
    expect(result.balanceDue).toBe(150.5);
  });

  it('computes balanceDue as servicesTotal minus paidAmount', () => {
    const result = recalculateLaundryTotals(
      [{ lineTotal: 200 }, { lineTotal: 50 }],
      75,
    );
    expect(result.servicesTotal).toBe(250);
    expect(result.balanceDue).toBe(175);
  });

  it('never returns negative balanceDue', () => {
    const result = recalculateLaundryTotals([{ lineTotal: 100 }], 150);
    expect(result.balanceDue).toBe(0);
  });
});

describe('computeServiceLineTotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(computeServiceLineTotal(2, 15.5)).toBe(31);
    expect(computeServiceLineTotal('3', '10')).toBe(30);
  });
});
