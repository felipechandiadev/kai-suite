import { BadRequestException } from '@nestjs/common';
import { EShopFulfillmentMethodsService } from '../../application/eshop-fulfillment-methods.service';
import type { EShopFulfillmentMethod } from '../../domain/e-shop-fulfillment-method.entity';

function matchesWhere(row: EShopFulfillmentMethod, where: Partial<EShopFulfillmentMethod>) {
  const record = row as unknown as Record<string, unknown>;
  return Object.entries(where).every(([k, v]) => record[k] === v);
}

function createRepoMock(seed: EShopFulfillmentMethod[] = []) {
  const rows = [...seed];
  return {
    rows,
    find: jest.fn(async ({ where }: { where: Partial<EShopFulfillmentMethod> }) =>
      rows.filter((r) => matchesWhere(r, where)),
    ),
    findOne: jest.fn(async ({ where }: { where: Partial<EShopFulfillmentMethod> }) =>
      rows.find((r) => matchesWhere(r, where)) ?? null,
    ),
    count: jest.fn(async ({ where }: { where: Partial<EShopFulfillmentMethod> }) =>
      rows.filter((r) => matchesWhere(r, where)).length,
    ),
    create: jest.fn((data: Partial<EShopFulfillmentMethod>) => ({ ...data }) as EShopFulfillmentMethod),
    save: jest.fn(async (row: EShopFulfillmentMethod) => {
      const idx = rows.findIndex((r) => r.id === row.id || (r.companyId === row.companyId && r.code === row.code));
      if (!row.id) row.id = `id-${rows.length + 1}`;
      if (idx >= 0) rows[idx] = row;
      else rows.push(row);
      return row;
    }),
    delete: jest.fn(async () => undefined),
    update: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ max: String(rows.length - 1) })),
    })),
  };
}

describe('EShopFulfillmentMethodsService.calculateShippingCost', () => {
  const svc = new EShopFulfillmentMethodsService({} as never);

  const base = (type: EShopFulfillmentMethod['type'], extra?: Partial<EShopFulfillmentMethod>) =>
    ({
      id: '1',
      companyId: 'c1',
      code: 'x',
      name: 'X',
      type,
      priceFlat: 3000,
      freeShippingThreshold: 100_000,
      isActive: true,
      sortOrder: 0,
      requiresAddress: false,
      requiresPhone: false,
      ...extra,
    }) as EShopFulfillmentMethod;

  it('PICKUP is free', () => {
    expect(svc.calculateShippingCost(base('PICKUP'), 50_000, null)).toBe(0);
  });

  it('FLAT_RATE uses priceFlat', () => {
    expect(svc.calculateShippingCost(base('FLAT_RATE'), 0, null)).toBe(3000);
  });

  it('FREE_OVER_THRESHOLD waives cost over threshold', () => {
    expect(svc.calculateShippingCost(base('FREE_OVER_THRESHOLD'), 120_000, null)).toBe(0);
    expect(svc.calculateShippingCost(base('FREE_OVER_THRESHOLD'), 50_000, null)).toBe(3000);
  });
});

describe('EShopFulfillmentMethodsService canonical methods', () => {
  it('ensureCanonicalMethods creates pickup and local-delivery even if coordinate exists', async () => {
    const repo = createRepoMock([
      {
        id: 'coord-1',
        companyId: 'c1',
        code: 'coordinate',
        name: 'Envío a coordinar',
        type: 'MANUAL_QUOTE',
        isActive: true,
        sortOrder: 0,
        requiresAddress: true,
        requiresPhone: true,
      } as EShopFulfillmentMethod,
    ]);
    const svc = new EShopFulfillmentMethodsService(repo as never);
    await svc.ensureCanonicalMethods('c1');
    const codes = repo.rows.map((r) => r.code).sort();
    expect(codes).toEqual(['coordinate', 'local-delivery', 'pickup']);
  });

  it('setCanonicalMethodEnabled rejects non-canonical codes', async () => {
    const repo = createRepoMock();
    const svc = new EShopFulfillmentMethodsService(repo as never);
    await expect(svc.setCanonicalMethodEnabled('c1', 'coordinate', true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('setCanonicalMethodEnabled syncs localDeliveryEnabled for local-delivery', async () => {
    const repo = createRepoMock([
      {
        id: 'ld-1',
        companyId: 'c1',
        code: 'local-delivery',
        name: 'Reparto local',
        type: 'LOCAL_DELIVERY',
        isActive: false,
        sortOrder: 1,
        requiresAddress: true,
        requiresPhone: true,
      } as EShopFulfillmentMethod,
      {
        id: 'pk-1',
        companyId: 'c1',
        code: 'pickup',
        name: 'Retiro en tienda',
        type: 'PICKUP',
        isActive: true,
        sortOrder: 0,
        requiresAddress: false,
        requiresPhone: false,
      } as EShopFulfillmentMethod,
    ]);
    const updateSettings = jest.fn(async () => ({ localDeliveryEnabled: true }));
    const coverage = {
      updateSettings,
      getSettings: jest.fn(),
      listCommunes: jest.fn(),
    };
    const svc = new EShopFulfillmentMethodsService(
      repo as never,
      coverage as never,
    );
    const result = await svc.setCanonicalMethodEnabled('c1', 'local-delivery', true);
    expect(result.isActive).toBe(true);
    expect(updateSettings).toHaveBeenCalledWith('c1', { localDeliveryEnabled: true });
  });

  it('listActiveWithPricing hides LOCAL_DELIVERY when localDeliveryEnabled is false', async () => {
    const repo = createRepoMock([
      {
        id: 'pk-1',
        companyId: 'c1',
        code: 'pickup',
        name: 'Retiro en tienda',
        type: 'PICKUP',
        isActive: true,
        sortOrder: 0,
        requiresAddress: false,
        requiresPhone: false,
        priceFlat: null,
      } as EShopFulfillmentMethod,
      {
        id: 'ld-1',
        companyId: 'c1',
        code: 'local-delivery',
        name: 'Reparto local',
        type: 'LOCAL_DELIVERY',
        isActive: true,
        sortOrder: 1,
        requiresAddress: true,
        requiresPhone: true,
        priceFlat: 2500,
      } as EShopFulfillmentMethod,
    ]);
    const svc = new EShopFulfillmentMethodsService(repo as never);
    const hidden = await svc.listActiveWithPricing('c1', 10_000, null, {
      localDeliveryEnabled: false,
    });
    expect(hidden.map((m) => m.code)).toEqual(['pickup']);

    const shown = await svc.listActiveWithPricing('c1', 10_000, null, {
      localDeliveryEnabled: true,
    });
    expect(shown.map((m) => m.code)).toEqual(['pickup', 'local-delivery']);
  });
});
