import { ProductsPosService } from '@modules/products/application/products-pos.service';
import type { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

function hydratedVariant(id: string): ProductVariant {
  return {
    id,
    productId: 'p1',
    sku: `SKU${id}`,
    barcode: null,
    trackInventory: false,
    attributeValues: null,
    product: {
      id: 'p1',
      companyId: 'c1',
      name: 'Producto demo',
      description: null,
    } as any,
    priceListItems: [
      {
        id: `pli-${id}`,
        netPrice: 5000,
        grossPrice: 5950,
        taxIds: [],
      } as any,
    ],
    saleUnit: { id: 'u1', symbol: 'UN', allowDecimals: false } as any,
    stockBaseUnit: { id: 'u1', symbol: 'UN' } as any,
    taxCategory: 'TAX_STANDARD',
    requiresDte: true,
    taxIds: [],
  } as unknown as ProductVariant;
}

function createBranchAvailabilityQb(rawRows: Array<{ variantId: string }> = []) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawRows),
  };
}

function createProductsPosService(overrides?: {
  variantRepository?: Record<string, unknown>;
  variantBranchAvailabilityRepository?: Record<string, unknown>;
}) {
  const stockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  return new ProductsPosService(
    (overrides?.variantRepository ?? {}) as any,
    (overrides?.variantBranchAvailabilityRepository ??
      ({
        createQueryBuilder: jest.fn().mockReturnValue(createBranchAvailabilityQb()),
      } as any)),
    {} as any,
    {} as any,
    { createQueryBuilder: jest.fn().mockReturnValue(stockQb) } as any,
    { find: jest.fn().mockResolvedValue([]) } as any,
    { listByEntity: jest.fn() } as any,
    { getRepository: jest.fn() } as any,
  );
}

describe('ProductsPosService branch availability filter', () => {
  it('applyVariantBranchAvailabilityFilter adds NOT EXISTS when branchId is set', () => {
    const qb = { andWhere: jest.fn() };
    const service = createProductsPosService();
    (service as any).applyVariantBranchAvailabilityFilter(qb, 'branch-1');
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('product_variant_branch_availability'),
      { availBranchId: 'branch-1' },
    );
  });

  it('applyVariantBranchAvailabilityFilter skips when branchId is empty', () => {
    const qb = { andWhere: jest.fn() };
    const service = createProductsPosService();
    (service as any).applyVariantBranchAvailabilityFilter(qb, '');
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('lookupVariantsForPos applies branch filter on query builder', async () => {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const variantRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const service = createProductsPosService({ variantRepository });
    const filterSpy = jest.spyOn(service as any, 'applyVariantBranchAvailabilityFilter');
    jest.spyOn(service as any, 'resolvePosStockScope').mockResolvedValue({
      resolvedBranchId: 'branch-1',
      storageIdsForStock: null,
    });
    jest.spyOn(service as any, 'mapVariantsToPosSearchResults').mockResolvedValue([]);

    await service.lookupVariantsForPos({
      variantIds: ['v1'],
      branchId: 'branch-1',
      priceListId: 'pl-1',
    });

    expect(filterSpy).toHaveBeenCalledWith(qb, 'branch-1');
  });
});

describe('ProductsPosService.buildCatalogSnapshotForPos', () => {
  it('pagina por cursor y omite multimedia', async () => {
    const variantsPage1 = [hydratedVariant('v1'), hydratedVariant('v2')];
    const variantsPage2 = [hydratedVariant('v3')];

    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
      getMany: jest
        .fn()
        .mockResolvedValueOnce(variantsPage1)
        .mockResolvedValueOnce(variantsPage2),
      clone: jest.fn(),
    };
    qb.clone.mockReturnValue(qb);

    const variantRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = createProductsPosService({ variantRepository });

    jest.spyOn(service as any, 'resolvePosStockScope').mockResolvedValue({
      resolvedBranchId: 'branch-1',
      storageIdsForStock: ['st-1'],
    });

    const page1 = await service.buildCatalogSnapshotForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      limit: 2,
    });
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0].productName).toBe('Producto demo');
    expect(page1.items[0].unitPriceWithTax).toBe(5950);
    expect(page1.nextCursor).toBe('v2');
    expect(page1.totalCount).toBe(3);
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('product_variant_branch_availability'),
      { availBranchId: 'branch-1' },
    );

    const page2 = await service.buildCatalogSnapshotForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      cursor: 'v2',
      limit: 2,
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].productName).toBe('Producto demo');
    expect(page2.nextCursor).toBeUndefined();
  });

  it('applyPosPriceListVariantJoins usa innerJoinAndSelect para product y priceListItems', () => {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
    };

    const service = createProductsPosService();

    (service as any).applyPosPriceListVariantJoins(qb, 'pl-99');

    expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('v.product', 'product');
    expect(qb.innerJoinAndSelect).toHaveBeenCalledWith(
      'v.priceListItems',
      'priceListItem',
      'priceListItem.priceListId = :priceListId AND priceListItem.deletedAt IS NULL',
      { priceListId: 'pl-99' },
    );
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('v.saleUnit', 'saleUnit');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('v.stockBaseUnit', 'stockBaseUnit');
  });
});

describe('ProductsPosService.buildCatalogDeltaForPos', () => {
  it('incluye variantes con v.updatedAt o priceListItem.updatedAt además de product.updatedAt', async () => {
    const activeQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([hydratedVariant('v-fiscal')]),
    };

    const tombstoneQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const variantRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(activeQb)
        .mockReturnValueOnce(tombstoneQb),
    };

    const service = createProductsPosService({ variantRepository });

    jest.spyOn(service as any, 'resolvePosStockScope').mockResolvedValue({
      resolvedBranchId: 'branch-1',
      storageIdsForStock: ['st-1'],
    });

    const since = new Date(Date.now() - 60_000).toISOString();
    const delta = await service.buildCatalogDeltaForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      since,
    });

    expect(activeQb.andWhere).toHaveBeenCalledWith(
      '(product.updatedAt >= :since OR v.updatedAt >= :since OR priceListItem.updatedAt >= :since)',
      { since: new Date(since) },
    );
    expect(delta.items).toHaveLength(1);
    expect(delta.items[0].requiresDte).toBe(true);
  });

  it('TAX_OUT_OF_SCOPE expone requiresDte false en catálogo POS', async () => {
    const outOfScope = {
      ...hydratedVariant('v-lucky'),
      taxCategory: 'TAX_OUT_OF_SCOPE',
      requiresDte: true,
    };

    const activeQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([outOfScope]),
    };

    const tombstoneQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const variantRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(activeQb)
        .mockReturnValueOnce(tombstoneQb),
    };

    const service = createProductsPosService({ variantRepository });

    jest.spyOn(service as any, 'resolvePosStockScope').mockResolvedValue({
      resolvedBranchId: 'branch-1',
      storageIdsForStock: ['st-1'],
    });

    const delta = await service.buildCatalogDeltaForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      since: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(delta.items).toHaveLength(1);
    expect(delta.items[0].requiresDte).toBe(false);
  });

  it('agrega tombstones por desactivación en sucursal', async () => {
    const activeQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const tombstoneQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const variantRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(activeQb)
        .mockReturnValueOnce(tombstoneQb),
    };

    const variantBranchAvailabilityRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(
          createBranchAvailabilityQb([{ variantId: 'v-branch-off' }]),
        ),
    };

    const service = createProductsPosService({
      variantRepository,
      variantBranchAvailabilityRepository,
    });

    jest.spyOn(service as any, 'resolvePosStockScope').mockResolvedValue({
      resolvedBranchId: 'branch-1',
      storageIdsForStock: ['st-1'],
    });

    const delta = await service.buildCatalogDeltaForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      since: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(delta.tombstones).toContain('v-branch-off');
  });
});
