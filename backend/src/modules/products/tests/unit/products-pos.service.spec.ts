import { ProductsPosService } from '@modules/products/application/products-pos.service';

describe('ProductsPosService.buildCatalogSnapshotForPos', () => {
  it('pagina por cursor y omite multimedia', async () => {
    const variantsPage1 = [{ id: 'v1' }, { id: 'v2' }];
    const variantsPage2 = [{ id: 'v3' }];

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
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

    const service = new ProductsPosService(
      variantRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { listByEntity: jest.fn() } as any,
      { getRepository: jest.fn() } as any,
    );

    jest.spyOn(service as any, 'resolvePosStockScope').mockResolvedValue({
      storageIdsForStock: ['st-1'],
    });
    jest.spyOn(service as any, 'mapVariantsToPosSearchResults').mockImplementation(
      async (variants: { id: string }[], _scope: unknown, options?: { skipMultimedia?: boolean }) => {
        expect(options?.skipMultimedia).toBe(true);
        return variants.map((v) => ({
          variantId: v.id,
          productId: 'p1',
          productName: 'X',
          productDescription: null,
          productImageUrl: null,
          sku: null,
          barcode: null,
          unitSymbol: null,
          unitId: null,
          unitAllowDecimals: false,
          unitPrice: 1,
          unitTaxRate: 0,
          unitTaxAmount: 0,
          unitPriceWithTax: 1,
          trackInventory: false,
          availableStock: null,
          availableStockBase: null,
          attributes: [],
          metadata: null,
        }));
      },
    );

    const page1 = await service.buildCatalogSnapshotForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      limit: 2,
    });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).toBe('v2');
    expect(page1.totalCount).toBe(3);

    const page2 = await service.buildCatalogSnapshotForPos({
      pointOfSaleId: 'pos-1',
      priceListId: 'pl-1',
      cursor: 'v2',
      limit: 2,
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.nextCursor).toBeUndefined();
  });
});
