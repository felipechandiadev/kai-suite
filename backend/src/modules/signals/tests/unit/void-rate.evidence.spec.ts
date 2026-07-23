import { VoidRateProvider } from '../../application/providers/void-rate.provider';
import type { SignalsQueryService } from '../../application/signals-query.service';

describe('VoidRateProvider evidence', () => {
  it('returns comparison kind with recent vs baseline bars', async () => {
    const queries = {
      countSalesAndVoids: jest
        .fn()
        .mockResolvedValueOnce({ salesCount: 90, voidCount: 10 })
        .mockResolvedValueOnce({ salesCount: 190, voidCount: 10 }),
    } as unknown as SignalsQueryService;

    const provider = new VoidRateProvider(queries);
    const ev = await provider.evidence({
      companyId: 'c1',
      now: new Date('2026-07-22T12:00:00Z'),
    });

    expect(ev.kind).toBe('comparison');
    expect(ev.comparison?.bars).toHaveLength(2);
    expect(ev.methodology).toContain('anulaciones');
  });
});
