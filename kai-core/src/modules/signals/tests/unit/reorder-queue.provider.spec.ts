import { ReorderQueueProvider } from '../../application/providers/reorder-queue.provider';
import type { SignalsQueryService } from '../../application/signals-query.service';
import type { ThresholdAlertRow } from '../../application/signals-query.service';

function alert(partial: Partial<ThresholdAlertRow>): ThresholdAlertRow {
  return {
    productVariantId: partial.productVariantId ?? 'v1',
    sku: partial.sku ?? 'SKU-1',
    productName: partial.productName ?? 'Prod',
    attributesLabel: partial.attributesLabel ?? '',
    availableStock: partial.availableStock ?? 1,
    minimumStock: partial.minimumStock ?? 5,
    reorderPoint: partial.reorderPoint ?? 10,
    outOfStock: partial.outOfStock ?? false,
  };
}

describe('ReorderQueueProvider', () => {
  it('marks CRITICAL when out of stock even with few SKUs', async () => {
    const queries = {
      listThresholdAlerts: jest.fn().mockResolvedValue([
        alert({ outOfStock: true, availableStock: 0, sku: 'A' }),
      ]),
    } as unknown as SignalsQueryService;

    const provider = new ReorderQueueProvider(queries);
    const card = await provider.evaluate({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(card.severity).toBe('CRITICAL');
    expect(card.id).toBe('reorder-queue');
    expect(card.cta?.href).toContain('stock-alerts');
  });

  it('marks WATCH for 1–4 SKUs under minimum without quiebre', async () => {
    const queries = {
      listThresholdAlerts: jest
        .fn()
        .mockResolvedValue([alert({ sku: 'A' }), alert({ sku: 'B' })]),
    } as unknown as SignalsQueryService;

    const provider = new ReorderQueueProvider(queries);
    const card = await provider.evaluate({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(card.severity).toBe('WATCH');
    expect(card.headline).toContain('2 productos');
  });

  it('marks OK when empty', async () => {
    const queries = {
      listThresholdAlerts: jest.fn().mockResolvedValue([]),
    } as unknown as SignalsQueryService;

    const provider = new ReorderQueueProvider(queries);
    const card = await provider.evaluate({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(card.severity).toBe('OK');
  });

  it('evidence returns ranking kind with methodology', async () => {
    const queries = {
      listThresholdAlerts: jest.fn().mockResolvedValue([
        alert({ sku: 'A', productName: 'Alpha', availableStock: 2 }),
      ]),
    } as unknown as SignalsQueryService;

    const provider = new ReorderQueueProvider(queries);
    const ev = await provider.evidence({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(ev.kind).toBe('ranking');
    expect(ev.signalId).toBe('reorder-queue');
    expect(ev.methodology.length).toBeGreaterThan(10);
    expect(ev.ranking?.rows.length).toBe(1);
    expect(ev.ranking?.rows[0]?.sublabel).toBe('A');
  });
});
