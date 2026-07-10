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

  function makeAllocation(
    partial: Partial<PointOfSaleFolioAllocation> & { id: string; rangeFrom: number; rangeTo: number },
  ): PointOfSaleFolioAllocation {
    return {
      companyId,
      cafId,
      subPackCode: partial.subPackCode ?? `SUB-${partial.id}`,
      label: null,
      pointOfSaleId: posA,
      dteType: 39,
      nextFolio: partial.nextFolio ?? partial.rangeFrom,
      environment: SiiEnvironment.PRODUCTION,
      isActive: true,
      createdAt: partial.createdAt ?? new Date('2026-01-01'),
      ...partial,
    } as PointOfSaleFolioAllocation;
  }

  function makeService(overrides?: {
    allocations?: PointOfSaleFolioAllocation[];
    caf?: FiscalCaf | null;
    pos?: PointOfSale | null;
  }) {
    const rows = [...(overrides?.allocations ?? [])];

    const allocationRepo = {
      find: jest.fn().mockImplementation(async (opts?: { where?: Record<string, unknown> }) => {
        if (!opts?.where) return rows;
        return rows.filter((row) =>
          Object.entries(opts.where ?? {}).every(([key, value]) => {
            if (value === undefined) return true;
            return (row as unknown as Record<string, unknown>)[key] === value;
          }),
        );
      }),
      findOne: jest.fn().mockImplementation(async (opts: { where: Record<string, unknown> }) => {
        if (opts.where.id) {
          return rows.find((r) => r.id === opts.where.id) ?? null;
        }
        return (
          rows.find((r) =>
            Object.entries(opts.where).every(
              ([key, value]) => (r as unknown as Record<string, unknown>)[key] === value,
            ),
          ) ?? null
        );
      }),
      save: jest.fn(async (row: PointOfSaleFolioAllocation) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx >= 0) rows[idx] = row;
        return row;
      }),
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
                find: allocationRepo.find,
                findOne: jest.fn().mockImplementation(async (opts: { where: Record<string, unknown> }) => {
                  if (opts.where.id) {
                    return rows.find((r) => r.id === opts.where.id) ?? null;
                  }
                  return allocationRepo.findOne(opts);
                }),
                save: allocationRepo.save,
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

    return {
      service: new PosFolioAllocationService(
        allocationRepo as never,
        cafRepo as never,
        posRepo as never,
        dataSource,
        cafPackageService,
      ),
      rows,
    };
  }

  it('rejects overlapping ranges within same caf', async () => {
    const { service } = makeService({
      allocations: [
        makeAllocation({
          id: 'a1',
          pointOfSaleId: posB,
          rangeFrom: 100,
          rangeTo: 150,
        }),
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
    const { service } = makeService({
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
    const { service } = makeService();
    const count = service.getAvailableCount({
      rangeFrom: 10,
      rangeTo: 12,
      nextFolio: 11,
      isActive: true,
    } as PointOfSaleFolioAllocation);
    expect(count).toBe(2);
  });

  it('reserveFolio uses allocation cafId', async () => {
    const allocation = makeAllocation({
      id: 'alloc-1',
      rangeFrom: 100,
      rangeTo: 102,
      nextFolio: 100,
    });
    const { service, rows } = makeService({
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
    expect(rows[0].nextFolio).toBe(101);
  });

  it('reserveFolio transitions to next sub-pack when current is exhausted', async () => {
    const first = makeAllocation({
      id: 'alloc-1',
      rangeFrom: 100,
      rangeTo: 101,
      nextFolio: 102,
      createdAt: new Date('2026-01-01'),
    });
    const second = makeAllocation({
      id: 'alloc-2',
      rangeFrom: 200,
      rangeTo: 205,
      nextFolio: 200,
      createdAt: new Date('2026-01-02'),
    });
    const { service, rows } = makeService({
      allocations: [first, second],
      caf: {
        id: cafId,
        companyId,
        dteType: 39,
        rangeFrom: 100,
        rangeTo: 300,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
    });

    const reserved = await service.reserveFolio(posA, 39);
    expect(reserved.folio).toBe(200);
    expect(reserved.allocationId).toBe('alloc-2');
    expect(rows.find((r) => r.id === 'alloc-2')?.nextFolio).toBe(201);
  });

  it('getAvailableFoliosForPos sums all active sub-packs with stock', async () => {
    const { service } = makeService({
      allocations: [
        makeAllocation({ id: 'a1', rangeFrom: 100, rangeTo: 101, nextFolio: 102 }),
        makeAllocation({ id: 'a2', rangeFrom: 200, rangeTo: 204, nextFolio: 201 }),
      ],
    });

    await expect(service.getAvailableFoliosForPos(posA, 39)).resolves.toBe(4);
  });

  it('allows second sub-pack on different caf for same pos', async () => {
    const caf2Id = 'caf-2';
    const { service } = makeService({
      allocations: [
        makeAllocation({ id: 'a1', cafId, rangeFrom: 100, rangeTo: 150, nextFolio: 100 }),
      ],
      caf: {
        id: caf2Id,
        companyId,
        packageCode: 'FOL-39-0002',
        dteType: 39,
        rangeFrom: 300,
        rangeTo: 350,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
    });

    await expect(
      service.validateNoOverlap(companyId, caf2Id, { from: 300, to: 320 }),
    ).resolves.toBeUndefined();
  });

  it('listByPos marks current and exhausted flags', async () => {
    const { service } = makeService({
      allocations: [
        makeAllocation({
          id: 'a1',
          rangeFrom: 100,
          rangeTo: 101,
          nextFolio: 102,
          createdAt: new Date('2026-01-01'),
        }),
        makeAllocation({
          id: 'a2',
          rangeFrom: 200,
          rangeTo: 205,
          nextFolio: 200,
          createdAt: new Date('2026-01-02'),
        }),
      ],
      caf: {
        id: cafId,
        companyId,
        packageCode: 'FOL-39-0001',
        dteType: 39,
        rangeFrom: 100,
        rangeTo: 300,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
    });

    const items = await service.listByPos(posA);
    const first = items.find((i) => i.id === 'a1');
    const second = items.find((i) => i.id === 'a2');
    expect(first?.isExhausted).toBe(true);
    expect(first?.isCurrent).toBe(false);
    expect(second?.isCurrent).toBe(true);
    expect(second?.isExhausted).toBe(false);
  });
});
