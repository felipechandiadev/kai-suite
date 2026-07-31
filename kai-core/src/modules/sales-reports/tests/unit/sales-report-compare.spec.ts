import {
  buildSummaryDelta,
  compareDateRange,
  computeDeltaPct,
  daysInRange,
  resolveGranularity,
} from '../../domain/sales-report.types';

describe('sales report compare helpers', () => {
  it('resolves auto granularity by range length', () => {
    expect(resolveGranularity('auto', '2026-01-01', '2026-01-20')).toBe('day');
    expect(resolveGranularity(undefined, '2026-01-01', '2026-03-01')).toBe('week');
    expect(resolveGranularity(null, '2026-01-01', '2026-12-31')).toBe('month');
    expect(resolveGranularity('week', '2026-01-01', '2026-01-10')).toBe('week');
  });

  it('builds previousPeriod of equal length ending day before from', () => {
    const cmp = compareDateRange('2026-02-01', '2026-02-28', 'previousPeriod');
    expect(cmp).toEqual({ dateFrom: '2026-01-04', dateTo: '2026-01-31' });
    expect(daysInRange('2026-02-01', '2026-02-28')).toBe(28);
    expect(daysInRange(cmp!.dateFrom, cmp!.dateTo)).toBe(28);
  });

  it('builds samePeriodLastYear', () => {
    expect(compareDateRange('2026-03-01', '2026-03-15', 'samePeriodLastYear')).toEqual({
      dateFrom: '2025-03-01',
      dateTo: '2025-03-15',
    });
    expect(compareDateRange('2026-01-01', '2026-01-31', 'none')).toBeNull();
  });

  it('computes delta pct and summaryDelta', () => {
    expect(computeDeltaPct(110, 100)).toBe(10);
    expect(computeDeltaPct(0, 0)).toBe(0);
    expect(computeDeltaPct(10, 0)).toBeNull();
    expect(buildSummaryDelta({ totalSales: 120 }, { totalSales: 100 })).toEqual({
      totalSales: { current: 120, previous: 100, deltaPct: 20 },
    });
  });
});
