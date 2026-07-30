import { PaymentFeeDragProvider } from '../../application/providers/payment-fee-drag.provider';
import type { SalesReportsQueryService } from '@modules/sales-reports/application/sales-reports-query.service';
import type { SignalsQueryService } from '../../application/signals-query.service';

describe('PaymentFeeDragProvider', () => {
  it('computes fee drag vs gross margin and marks CRITICAL above threshold', async () => {
    const salesReports = {
      paymentMix: jest.fn().mockResolvedValue([
        { paymentMethod: 'CREDIT_CARD', total: 1_000_000, count: 10 },
        { paymentMethod: 'CASH', total: 500_000, count: 20 },
      ]),
      marginForLines: jest.fn().mockResolvedValue({
        revenue: 1_500_000,
        cogs: 1_000_000,
        margin: 500_000,
        quality: { linesWithCost: 1, linesMissingCost: 0, coveragePct: 100 },
      }),
    } as unknown as SalesReportsQueryService;

    const queries = {
      feePercentByMethod: jest.fn().mockResolvedValue(
        new Map([
          ['CREDIT_CARD', 10], // 100_000 fee
        ]),
      ),
    } as unknown as SignalsQueryService;

    // 100k / 500k = 20% > critical 15%
    const provider = new PaymentFeeDragProvider(salesReports, queries);
    const card = await provider.evaluate({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(card.severity).toBe('CRITICAL');
    expect(card.id).toBe('payment-fee-drag');
    expect(card.meta).toMatchObject({
      estimatedFees: 100_000,
      dragPct: 20,
    });
  });

  it('returns INFO when no fees configured', async () => {
    const salesReports = {
      paymentMix: jest.fn().mockResolvedValue([
        { paymentMethod: 'CASH', total: 100_000, count: 5 },
      ]),
      marginForLines: jest.fn().mockResolvedValue({
        revenue: 100_000,
        cogs: 40_000,
        margin: 60_000,
        quality: { linesWithCost: 1, linesMissingCost: 0, coveragePct: 100 },
      }),
    } as unknown as SalesReportsQueryService;

    const queries = {
      feePercentByMethod: jest.fn().mockResolvedValue(new Map()),
    } as unknown as SignalsQueryService;

    const provider = new PaymentFeeDragProvider(salesReports, queries);
    const card = await provider.evaluate({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(card.severity).toBe('INFO');
  });

  it('evidence returns breakdown kind with fee slices', async () => {
    const salesReports = {
      paymentMix: jest.fn().mockResolvedValue([
        { paymentMethod: 'CREDIT_CARD', total: 1_000_000, count: 10 },
      ]),
      marginForLines: jest.fn().mockResolvedValue({
        revenue: 1_000_000,
        cogs: 500_000,
        margin: 500_000,
        quality: { linesWithCost: 1, linesMissingCost: 0, coveragePct: 100 },
      }),
    } as unknown as SalesReportsQueryService;

    const queries = {
      feePercentByMethod: jest
        .fn()
        .mockResolvedValue(new Map([['CREDIT_CARD', 10]])),
    } as unknown as SignalsQueryService;

    const provider = new PaymentFeeDragProvider(salesReports, queries);
    const ev = await provider.evidence({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(ev.kind).toBe('breakdown');
    expect(ev.breakdown?.slices[0]).toMatchObject({
      label: 'CREDIT_CARD',
      value: 100_000,
    });
  });
});
