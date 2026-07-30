import {
  appendPmpHistory,
  PMP_HISTORY_MAX_ENTRIES,
} from './pmp-history';

describe('appendPmpHistory', () => {
  it('does not append when previous and new PMP are equal at 2 decimals', () => {
    const h = appendPmpHistory([], {
      previousPmp: 10,
      newPmp: 10,
      source: 'manual_api',
    });
    expect(h).toEqual([]);
  });

  it('does not append when both values round to the same 2-decimal amount', () => {
    const h = appendPmpHistory([], {
      previousPmp: 10.001,
      newPmp: 10.002,
      source: 'manual_api',
    });
    expect(h).toEqual([]);
  });

  it('appends one entry and preserves optional fields', () => {
    const h = appendPmpHistory(null, {
      previousPmp: 100,
      newPmp: 150.5,
      source: 'transaction_cost',
      transactionId: 'tx-1',
      storageId: 'st-1',
      unitCost: 200,
      quantity: 3,
      at: '2026-01-01T00:00:00.000Z',
    });
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({
      at: '2026-01-01T00:00:00.000Z',
      previousPmp: 100,
      newPmp: 150.5,
      source: 'transaction_cost',
      transactionId: 'tx-1',
      storageId: 'st-1',
      unitCost: 200,
      quantity: 3,
    });
  });

  it('keeps at most PMP_HISTORY_MAX_ENTRIES (most recent)', () => {
    let acc = appendPmpHistory(undefined, {
      previousPmp: 0,
      newPmp: 1,
      source: 'initial',
    });
    for (let i = 1; i < 520; i++) {
      acc = appendPmpHistory(acc, {
        previousPmp: i,
        newPmp: i + 1,
        source: 'manual_api',
      });
    }
    expect(acc.length).toBe(PMP_HISTORY_MAX_ENTRIES);
    expect(acc[acc.length - 1].newPmp).toBe(520);
    expect(acc[0].previousPmp).toBe(20);
  });

  it('filters invalid entries from existing JSON', () => {
    const dirty = [{ foo: 1 } as any, null, undefined];
    const h = appendPmpHistory(dirty as any, {
      previousPmp: 1,
      newPmp: 2,
      source: 'manual_api',
    });
    expect(h).toHaveLength(1);
    expect(h[0].newPmp).toBe(2);
  });
});
