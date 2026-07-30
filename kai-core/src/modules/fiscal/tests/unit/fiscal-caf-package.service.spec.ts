import { ConflictException } from '@nestjs/common';
import { FiscalCafPackageService } from '../../application/fiscal-caf-package.service';
import { FiscalCaf } from '../../domain/fiscal-caf.entity';
import {
  FiscalCafPackageSource,
  FiscalCafPackageStatus,
  SiiEnvironment,
} from '../../domain/fiscal.enums';

describe('FiscalCafPackageService', () => {
  const companyId = 'company-1';

  function makeCaf(overrides?: Partial<FiscalCaf>): FiscalCaf {
    return {
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
      ...overrides,
    } as FiscalCaf;
  }

  function makeService(overrides?: {
    cafs?: FiscalCaf[];
    emissionCount?: number;
    allocations?: Array<{
      id: string;
      cafId: string;
      companyId: string;
      rangeFrom: number;
      rangeTo: number;
      nextFolio: number;
      isActive?: boolean;
    }>;
    profile?: { companyId: string; productionEnabled: boolean; environment?: SiiEnvironment };
  }) {
    const txDelete = jest.fn().mockResolvedValue(undefined);
    const dataSource = {
      transaction: jest.fn(async (cb: (manager: { delete: jest.Mock }) => Promise<void>) =>
        cb({ delete: txDelete }),
      ),
    };

    const cafRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(async (row: FiscalCaf) => ({
        ...row,
        id: row.id ?? 'caf-new',
        uploadedAt: row.uploadedAt ?? new Date(),
      })),
      create: jest.fn((row: Partial<FiscalCaf>) => row as FiscalCaf),
      find: jest.fn().mockResolvedValue(overrides?.cafs ?? []),
      findOne: jest.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        const cafs = overrides?.cafs ?? [];
        return (
          cafs.find(
            (c) =>
              (where.id == null || c.id === where.id) &&
              (where.companyId == null || c.companyId === where.companyId) &&
              (where.status == null || c.status === where.status) &&
              (where.environment == null || c.environment === where.environment) &&
              (where.dteType == null || c.dteType === where.dteType) &&
              (where.isActive == null || c.isActive === where.isActive),
          ) ?? null
        );
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
      findOne: jest.fn().mockResolvedValue(
        overrides?.profile ?? { companyId, productionEnabled: false, environment: SiiEnvironment.PRODUCTION },
      ),
      create: jest.fn(),
      save: jest.fn(async (p: unknown) => p),
    };
    const companyRepo = {
      findOne: jest.fn().mockResolvedValue({ id: companyId, rut: '1-9' }),
    };
    const crypto = {
      encrypt: jest.fn(() => ({ data: Buffer.from('enc'), iv: 'iv' })),
    };

    const service = new FiscalCafPackageService(
      cafRepo as never,
      allocationRepo as never,
      emissionRepo as never,
      posRepo as never,
      profileRepo as never,
      companyRepo as never,
      crypto as never,
      dataSource as never,
    );

    return { service, cafRepo, allocationRepo, profileRepo, txDelete, dataSource };
  }

  it('archives previous active package on upload', async () => {
    const { service, cafRepo } = makeService();
    const cafXml = `<?xml version="1.0"?>
<AUTORIZACION>
  <CAF version="1.0">
    <DA><TD>39</TD><RNG><D>1000</D><H>1999</H></RNG></DA>
  </CAF>
</AUTORIZACION>`;

    await service.uploadPackage(companyId, Buffer.from(cafXml), SiiEnvironment.PRODUCTION);

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
    const caf = makeCaf();
    const { service } = makeService({ cafs: [caf], emissionCount: 5 });
    const list = await service.listPackages(companyId);
    expect(list[0].stats.totalFolios).toBe(100);
    expect(list[0].stats.emittedCount).toBe(5);
    expect(list[0].stats.available).toBe(95);
  });

  it('deletes package when no emissions and allocations are intact', async () => {
    const caf = makeCaf();
    const { service, txDelete } = makeService({
      cafs: [caf],
      allocations: [
        {
          id: 'alloc-1',
          cafId: caf.id,
          companyId,
          rangeFrom: 1000,
          rangeTo: 1009,
          nextFolio: 1000,
        },
      ],
    });

    await service.deletePackage(companyId, caf.id);

    expect(txDelete).toHaveBeenCalledTimes(2);
  });

  it('rejects delete when package has emissions', async () => {
    const caf = makeCaf();
    const { service } = makeService({ cafs: [caf], emissionCount: 1 });

    await expect(service.deletePackage(companyId, caf.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects delete when allocation consumed folios', async () => {
    const caf = makeCaf();
    const { service } = makeService({
      cafs: [caf],
      allocations: [
        {
          id: 'alloc-1',
          cafId: caf.id,
          companyId,
          rangeFrom: 1000,
          rangeTo: 1009,
          nextFolio: 1001,
        },
      ],
    });

    await expect(service.deletePackage(companyId, caf.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('disables production when deleting the only active production CAF', async () => {
    const caf = makeCaf();
    const { service, profileRepo, cafRepo } = makeService({
      cafs: [caf],
      profile: { companyId, productionEnabled: true },
    });
    cafRepo.findOne = jest
      .fn()
      .mockResolvedValueOnce(caf)
      .mockResolvedValueOnce(null);

    await service.deletePackage(companyId, caf.id);

    expect(profileRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ productionEnabled: false }),
    );
  });
});
