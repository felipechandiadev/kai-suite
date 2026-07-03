import {
  computeFolioRangeStats,
  fetchDistinctEmittedFoliosInRange,
} from '../../application/fiscal-folio-emission-stats';
import { SiiEnvironment } from '../../domain/fiscal.enums';

describe('fiscal-folio-emission-stats', () => {
  it('counts distinct folios in range regardless of caf_id', async () => {
    const emissionRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ folio: 198581 }, { folio: 198582 }]),
      })),
    };

    const folios = await fetchDistinctEmittedFoliosInRange(emissionRepo as never, {
      companyId: 'c1',
      dteType: 39,
      environment: SiiEnvironment.PRODUCTION,
      rangeFrom: 198581,
      rangeTo: 198610,
    });

    expect(folios.size).toBe(2);
    expect(computeFolioRangeStats(198581, 198610, folios)).toEqual({
      total: 30,
      emittedCount: 2,
      available: 28,
    });
  });
});
