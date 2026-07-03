import { FiscalFolioLedgerService } from '../../application/fiscal-folio-ledger.service';
import { FiscalCaf } from '../../domain/fiscal-caf.entity';
import { PointOfSaleFolioAllocation } from '../../domain/point-of-sale-folio-allocation.entity';
import { SiiEnvironment } from '../../domain/fiscal.enums';

describe('FiscalFolioLedgerService', () => {
  const companyId = 'company-1';

  function makeService(emittedFolios: number[]) {
    const cafRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'caf-1',
        companyId,
        dteType: 39,
        environment: SiiEnvironment.PRODUCTION,
        rangeFrom: 10,
        rangeTo: 15,
        nextFolio: 12,
      } as FiscalCaf),
    };
    const allocationRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'alloc-1',
        companyId,
        cafId: 'caf-1',
        pointOfSaleId: 'pos-1',
        dteType: 39,
        environment: SiiEnvironment.PRODUCTION,
        rangeFrom: 10,
        rangeTo: 12,
        nextFolio: 11,
      } as PointOfSaleFolioAllocation),
    };
    const emissionRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(emittedFolios.map((folio) => ({ folio }))),
      })),
    };

    return new FiscalFolioLedgerService(
      cafRepo as never,
      allocationRepo as never,
      emissionRepo as never,
    );
  }

  it('computes free ranges skipping emitted folios', async () => {
    const service = makeService([10, 12, 14]);
    const summary = await service.getPackLedgerSummary(companyId, 'caf-1');
    expect(summary.emittedCount).toBe(3);
    expect(summary.available).toBe(3);
    expect(summary.freeRanges).toEqual([
      { from: 11, to: 11 },
      { from: 13, to: 13 },
      { from: 15, to: 15 },
    ]);
  });

  it('scopes sub-pack summary to allocation range', async () => {
    const service = makeService([10, 11]);
    const summary = await service.getSubPackLedgerSummary(companyId, 'alloc-1');
    expect(summary.allocationId).toBe('alloc-1');
    expect(summary.total).toBe(3);
    expect(summary.emittedCount).toBe(2);
    expect(summary.available).toBe(1);
  });
});
