import { BadRequestException } from '@nestjs/common';
import {
  buildSummaryDelta,
  compareDateRange,
  computeDeltaPct,
  daysInRange,
  inventoryBucketKey,
  mergeBucketPoints,
  resolveGranularity,
} from '../../domain/inventory-report.types';
import { InventoryPeriodCompareHandler } from '../../application/handlers/compare.handlers';

describe('inventory report compare helpers', () => {
  it('resolves auto granularity by range length', () => {
    expect(resolveGranularity('auto', '2026-01-01', '2026-01-20')).toBe('day');
    expect(resolveGranularity(undefined, '2026-01-01', '2026-03-01')).toBe(
      'week',
    );
    expect(resolveGranularity(null, '2026-01-01', '2026-12-31')).toBe('month');
    expect(resolveGranularity('month', '2026-01-01', '2026-01-10')).toBe(
      'month',
    );
  });

  it('builds previousPeriod of equal length ending day before from', () => {
    const cmp = compareDateRange('2026-02-01', '2026-02-28', 'previousPeriod');
    expect(cmp).toEqual({ dateFrom: '2026-01-04', dateTo: '2026-01-31' });
    expect(daysInRange(cmp!.dateFrom, cmp!.dateTo)).toBe(
      daysInRange('2026-02-01', '2026-02-28'),
    );
  });

  it('builds samePeriodLastYear and none', () => {
    expect(
      compareDateRange('2026-03-01', '2026-03-15', 'samePeriodLastYear'),
    ).toEqual({
      dateFrom: '2025-03-01',
      dateTo: '2025-03-15',
    });
    expect(compareDateRange('2026-01-01', '2026-01-31', 'none')).toBeNull();
  });

  it('computes delta pct and summaryDelta', () => {
    expect(computeDeltaPct(110, 100)).toBe(10);
    expect(computeDeltaPct(0, 0)).toBe(0);
    expect(computeDeltaPct(10, 0)).toBeNull();
    expect(buildSummaryDelta({ qtyNet: 120 }, { qtyNet: 100 })).toEqual({
      qtyNet: { current: 120, previous: 100, deltaPct: 20 },
    });
  });

  it('buckets movement dates by day / week / month', () => {
    const d = new Date('2026-01-15T10:30:00.000Z');
    expect(inventoryBucketKey(d, 'day')).toBe('2026-01-15');
    expect(inventoryBucketKey(d, 'week')).toBe('2026-W03');
    expect(inventoryBucketKey(d, 'month')).toBe('2026-01');
  });

  it('merges current and previous buckets by position', () => {
    expect(
      mergeBucketPoints(
        [
          { x: '2026-02-01', y: 5 },
          { x: '2026-02-02', y: 7 },
        ],
        [{ x: '2026-01-01', y: 3 }],
      ),
    ).toEqual([
      { x: '2026-02-01', y: 5, y2: 3 },
      { x: '2026-02-02', y: 7, y2: undefined },
    ]);
  });
});

describe('InventoryPeriodCompareHandler', () => {
  const range = (from: string, to: string) => ({
    from: new Date(`${from}T00:00:00.000`),
    to: new Date(`${to}T23:59:59.999`),
    dateFrom: from,
    dateTo: to,
  });

  function buildQuery(
    calls: Array<{ dateFrom: string; dateTo: string }>,
    totalsByCall: Array<{ qtyIn: number; qtyOut: number; valorMovido: number }>,
  ) {
    let call = 0;
    return {
      parseDateRange: (p: Record<string, unknown>) => {
        if (!p.dateFrom || !p.dateTo) {
          throw new BadRequestException('dateFrom es requerido (YYYY-MM-DD)');
        }
        return range(String(p.dateFrom), String(p.dateTo));
      },
      requireUuidList: () => ['u-un'],
      optionalUuidList: () => undefined,
      optionalUuid: () => undefined,
      movementByBucket: async (
        _companyId: string,
        r: { dateFrom: string; dateTo: string },
      ) => {
        calls.push({ dateFrom: r.dateFrom, dateTo: r.dateTo });
        const t = totalsByCall[call++] ?? {
          qtyIn: 0,
          qtyOut: 0,
          valorMovido: 0,
        };
        return {
          buckets: [
            {
              bucket: r.dateFrom,
              qtyIn: t.qtyIn,
              qtyOut: t.qtyOut,
              qtyNet: t.qtyIn - t.qtyOut,
              valorMovido: t.valorMovido,
              lineEvents: 1,
            },
          ],
          totals: {
            qtyIn: t.qtyIn,
            qtyOut: t.qtyOut,
            qtyNet: t.qtyIn - t.qtyOut,
            valorMovido: t.valorMovido,
            lineEvents: 1,
            lineasSinCosto: 0,
          },
        };
      },
    };
  }

  it('defaults compareWith to previousPeriod and requires stock units', () => {
    const q = buildQuery([], []);
    const handler = new InventoryPeriodCompareHandler(q as never);
    expect(() => handler.validate({})).toThrow(BadRequestException);
    const validated = handler.validate({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    });
    expect(validated.compareWith).toBe('previousPeriod');
    expect(validated.stockUnitIds).toEqual(['u-un']);
  });

  it('queries current and comparison ranges and exposes deltas', async () => {
    const calls: Array<{ dateFrom: string; dateTo: string }> = [];
    const q = buildQuery(calls, [
      { qtyIn: 120, qtyOut: 20, valorMovido: 2000 },
      { qtyIn: 100, qtyOut: 20, valorMovido: 1000 },
    ]);
    const handler = new InventoryPeriodCompareHandler(q as never);
    const result = await handler.run({
      companyId: 'c1',
      params: {
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
        stockUnitIds: ['u-un'],
        compareWith: 'previousPeriod',
      },
    });

    expect(calls).toEqual([
      { dateFrom: '2026-02-01', dateTo: '2026-02-28' },
      { dateFrom: '2026-01-04', dateTo: '2026-01-31' },
    ]);
    expect(result.summary.qtyNet).toBe(100);
    expect(result.summaryDelta?.valorMovido).toEqual({
      current: 2000,
      previous: 1000,
      deltaPct: 100,
    });
    expect(result.series.map((s) => s.id)).toEqual([
      'movement-net-compare',
      'movement-valor-compare',
    ]);
    expect(result.rows.map((r) => r.metric)).toContain('qtyNet');
  });
});
