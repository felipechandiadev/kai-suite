import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PosFolioAllocationService } from '../../application/pos-folio-allocation.service';
import { FiscalCafPackageService } from '../../application/fiscal-caf-package.service';
import { PointOfSaleFolioAllocation } from '../../domain/point-of-sale-folio-allocation.entity';
import { FiscalCaf } from '../../domain/fiscal-caf.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { SiiEnvironment } from '../../domain/fiscal.enums';

describe('PosFolioAllocationService', () => {
  const companyId = 'company-1';
  const posA = 'pos-a';
  const posB = 'pos-b';
  const cafId = 'caf-1';

  function makeService(overrides?: {
    allocations?: PointOfSaleFolioAllocation[];
    caf?: FiscalCaf | null;
    pos?: PointOfSale | null;
  }) {
    const allocationRepo = {
      find: jest.fn().mockResolvedValue(overrides?.allocations ?? []),
      findOne: jest.fn().mockImplementation(async (opts: { where: Record<string, unknown> }) => {
        const rows = overrides?.allocations ?? [];
        if (opts.where.id) {
          return rows.find((r) => r.id === opts.where.id) ?? null;
        }
        return (
          rows.find(
            (r) =>
              r.pointOfSaleId === opts.where.pointOfSaleId &&
              r.dteType === opts.where.dteType &&
              r.environment === opts.where.environment &&
              r.isActive === opts.where.isActive,
          ) ?? null
        );
      }),
      save: jest.fn(async (row: PointOfSaleFolioAllocation) => row),
      create: jest.fn((row: Partial<PointOfSaleFolioAllocation>) => row as PointOfSaleFolioAllocation),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };
    const cafRepo = {
      find: jest.fn().mockResolvedValue(overrides?.caf ? [overrides.caf] : []),
      findOne: jest.fn().mockImplementation(async (opts: { where: Record<string, unknown> }) => {
        const caf = overrides?.caf;
        if (!caf) return null;
        if (opts.where.id && caf.id !== opts.where.id) return null;
        if (opts.where.companyId && caf.companyId !== opts.where.companyId) return null;
        return caf;
      }),
    };
    const posRepo = {
      findOne: jest.fn().mockResolvedValue(
        overrides?.pos ??
          ({
            id: posA,
            companyId,
            deletedAt: null,
          } as unknown as PointOfSale),
      ),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: (entity: unknown) => {
            if (entity === PointOfSale) return posRepo;
            if (entity === PointOfSaleFolioAllocation) {
              return {
                findOne: jest.fn().mockResolvedValue(
                  (overrides?.allocations ?? []).find(
                    (a) => a.pointOfSaleId === posA && a.isActive,
                  ) ?? null,
                ),
                save: jest.fn(async (row: PointOfSaleFolioAllocation) => {
                  const alloc = (overrides?.allocations ?? [])[0];
                  if (alloc) alloc.nextFolio = row.nextFolio;
                  return row;
                }),
              };
            }
            if (entity === FiscalCaf) return cafRepo;
            throw new Error('unknown entity');
          },
        };
        return fn(manager);
      }),
    } as unknown as DataSource;

    const cafPackageService = {
      requirePackage: jest.fn(async () => overrides?.caf),
    } as unknown as FiscalCafPackageService;

    return new PosFolioAllocationService(
      allocationRepo as never,
      cafRepo as never,
      posRepo as never,
      dataSource,
      cafPackageService,
    );
  }

  it('rejects overlapping ranges within same caf', async () => {
    const service = makeService({
      allocations: [
        {
          id: 'a1',
          companyId,
          cafId,
          subPackCode: 'SUB-1',
          pointOfSaleId: posB,
          dteType: 39,
          rangeFrom: 100,
          rangeTo: 150,
          nextFolio: 100,
          environment: SiiEnvironment.PRODUCTION,
          isActive: true,
        } as PointOfSaleFolioAllocation,
      ],
      caf: {
        id: cafId,
        companyId,
        packageCode: 'FOL-39-0001',
        dteType: 39,
        rangeFrom: 100,
        rangeTo: 200,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
    });

    await expect(
      service.validateNoOverlap(companyId, cafId, { from: 140, to: 160 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects range outside package', async () => {
    const service = makeService({
      caf: {
        id: cafId,
        companyId,
        dteType: 39,
        rangeFrom: 100,
        rangeTo: 200,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
    });

    await expect(service.validateWithinCaf(companyId, cafId, 90, 120)).rejects.toThrow(
      /contenido en el paquete/,
    );
  });

  it('computes available folios from nextFolio cursor', () => {
    const service = makeService();
    const count = service.getAvailableCount({
      rangeFrom: 10,
      rangeTo: 12,
      nextFolio: 11,
      isActive: true,
    } as PointOfSaleFolioAllocation);
    expect(count).toBe(2);
  });

  it('reserveFolio uses allocation cafId', async () => {
    const allocation = {
      id: 'alloc-1',
      companyId,
      cafId,
      subPackCode: 'SUB-1',
      pointOfSaleId: posA,
      dteType: 39,
      rangeFrom: 100,
      rangeTo: 102,
      nextFolio: 100,
      environment: SiiEnvironment.PRODUCTION,
      isActive: true,
    } as PointOfSaleFolioAllocation;
    const service = makeService({
      allocations: [allocation],
      caf: {
        id: cafId,
        companyId,
        dteType: 39,
        rangeFrom: 100,
        rangeTo: 200,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
    });

    const reserved = await service.reserveFolio(posA, 39);
    expect(reserved.folio).toBe(100);
    expect(reserved.cafId).toBe(cafId);
    expect(reserved.allocationId).toBe('alloc-1');
    expect(allocation.nextFolio).toBe(101);
  });
});
