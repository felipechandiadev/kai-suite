import { FiscalCafPackageService } from '../../application/fiscal-caf-package.service';
import { FiscalCaf } from '../../domain/fiscal-caf.entity';
import {
  FiscalCafPackageSource,
  FiscalCafPackageStatus,
  SiiEnvironment,
} from '../../domain/fiscal.enums';

describe('FiscalCafPackageService', () => {
  const companyId = 'company-1';

  function makeService(overrides?: {
    cafs?: FiscalCaf[];
    emissionCount?: number;
    allocations?: unknown[];
  }) {
    const cafRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (row: FiscalCaf) => ({
        ...row,
        id: row.id ?? 'caf-new',
        uploadedAt: row.uploadedAt ?? new Date(),
      })),
      create: jest.fn((row: Partial<FiscalCaf>) => row as FiscalCaf),
      find: jest.fn().mockResolvedValue(overrides?.cafs ?? []),
      findOne: jest.fn().mockImplementation(async ({ where }: { where: { id?: string } }) => {
        return (overrides?.cafs ?? []).find((c) => c.id === where.id) ?? null;
      }),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };
    const allocationRepo = {
      find: jest.fn().mockResolvedValue(overrides?.allocations ?? []),
    };
    const emissionRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(
          Array.from({ length: overrides?.emissionCount ?? 0 }, (_, i) => ({
            folio: 1000 + i,
          })),
        ),
      })),
    };
    const posRepo = { find: jest.fn().mockResolvedValue([]) };
    const profileRepo = {
      findOne: jest.fn().mockResolvedValue({ companyId, environment: SiiEnvironment.PRODUCTION }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const companyRepo = {
      findOne: jest.fn().mockResolvedValue({ id: companyId, rut: '1-9' }),
    };
    const crypto = {
      encrypt: jest.fn(() => ({ data: Buffer.from('enc'), iv: 'iv' })),
    };

    return new FiscalCafPackageService(
      cafRepo as never,
      allocationRepo as never,
      emissionRepo as never,
      posRepo as never,
      profileRepo as never,
      companyRepo as never,
      crypto as never,
    );
  }

  it('archives previous active package on upload', async () => {
    const service = makeService();
    const cafXml = `<?xml version="1.0"?>
<AUTORIZACION>
  <CAF version="1.0">
    <DA><TD>39</TD><RNG><D>1000</D><H>1999</H></RNG></DA>
  </CAF>
</AUTORIZACION>`;

    await service.uploadPackage(companyId, Buffer.from(cafXml), SiiEnvironment.PRODUCTION);

    const cafRepo = (service as unknown as { cafRepo: { update: jest.Mock; save: jest.Mock } })
      .cafRepo;
    expect(cafRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        dteType: 39,
        status: FiscalCafPackageStatus.ACTIVE,
      }),
      expect.objectContaining({ status: FiscalCafPackageStatus.ARCHIVED, isActive: false }),
    );
    expect(cafRepo.save).toHaveBeenCalled();
  });

  it('builds package stats with emitted count', async () => {
    const caf: FiscalCaf = {
      id: 'caf-1',
      companyId,
      packageCode: 'FOL-39-0001',
      status: FiscalCafPackageStatus.ACTIVE,
      source: FiscalCafPackageSource.MANUAL_UPLOAD,
      dteType: 39,
      rangeFrom: 1000,
      rangeTo: 1099,
      nextFolio: 1000,
      environment: SiiEnvironment.PRODUCTION,
      isActive: true,
      encryptedCafXml: Buffer.from('x'),
      cafIv: 'iv',
      uploadedAt: new Date(),
    } as FiscalCaf;

    const service = makeService({ cafs: [caf], emissionCount: 5 });
    const list = await service.listPackages(companyId);
    expect(list[0].stats.totalFolios).toBe(100);
    expect(list[0].stats.emittedCount).toBe(5);
    expect(list[0].stats.available).toBe(95);
  });
});
