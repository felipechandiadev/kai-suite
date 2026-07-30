import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { ProductVariantsRepositoryPort } from '@modules/product-variants/application/ports/product-variants.repository.port';
import { PriceListItemsRepositoryPort } from '@modules/price-list-items/application/ports/price-list-items.repository.port';

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;
  let variantRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
  };
  let priceListItemRepository: {
    save: jest.Mock;
    findByVariantId: jest.Mock;
    deleteByVariantId: jest.Mock;
  };
  let multimediaService: {
    listByEntity: jest.Mock;
    listByEntityIds: jest.Mock;
    unlink: jest.Mock;
    link: jest.Mock;
  };
  let attributesService: {
    validateAndNormalizeAttributeValues: jest.Mock;
  };
  let variantOrm: {
    createQueryBuilder: jest.Mock;
    manager: { getRepository: jest.Mock };
  };
  let stockLevelOrm: {
    find: jest.Mock;
  };

  beforeEach(() => {
    variantRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    priceListItemRepository = {
      save: jest.fn(),
      findByVariantId: jest.fn(),
      deleteByVariantId: jest.fn(),
    };
    multimediaService = {
      listByEntity: jest.fn(),
      listByEntityIds: jest.fn(),
      unlink: jest.fn(),
      link: jest.fn(),
    };
    attributesService = {
      validateAndNormalizeAttributeValues: jest.fn().mockResolvedValue(null),
    };
    variantOrm = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      manager: {
        getRepository: jest.fn().mockImplementation((Entity: any) => {
          const n = Entity?.name ?? '';
          if (n === 'Product') {
            return {
              findOne: jest
                .fn()
                .mockResolvedValue({ id: 'product-1', companyId: 'company-1' }),
            };
          }
          if (n === 'Unit') {
            return {
              find: jest.fn().mockResolvedValue([
                { id: 'unit-1', dimension: 'count', deletedAt: null },
              ]),
            };
          }
          return { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
        }),
      },
    };
    stockLevelOrm = {
      find: jest.fn().mockResolvedValue([]),
    };

    const conversion = {
      validateVariantUomTripletAsync: jest.fn().mockResolvedValue(undefined),
      normalizePersistedCountBridges: jest.fn().mockReturnValue({
        stockBaseQtyPerCountSaleUnit: null,
        stockBaseQtyPerCountPurchaseUnit: null,
      }),
      toVariantStockBaseSync: jest.fn(),
      enrichCreateTransactionDto: jest.fn(),
    };

    service = new ProductVariantsService(
      variantRepository as unknown as ProductVariantsRepositoryPort,
      priceListItemRepository as unknown as PriceListItemsRepositoryPort,
      multimediaService as unknown as MultimediaServiceAdapter,
      attributesService as any,
      variantOrm as any,
      stockLevelOrm as any,
      { find: jest.fn(), findOne: jest.fn() } as any, // taxRepo
      { find: jest.fn(), findOne: jest.fn(), manager: { transaction: jest.fn() } } as any, // variantProductionUnitOrm
      { find: jest.fn(), findOne: jest.fn(), manager: { transaction: jest.fn() } } as any, // variantBranchAvailabilityOrm
      { findOne: jest.fn() } as any, // productionUnitOrm
      { findOne: jest.fn() } as any, // branchOrm
      conversion as any,
      { afterVariantEshopVisibilityChanged: jest.fn() } as any, // eshopVisibilitySync
    );
  });

  it('should create variant, persist price list items, and ignore legacy multimediaAssetIds', async () => {
    variantRepository.save.mockResolvedValueOnce({ id: 'variant-1' });
    priceListItemRepository.save.mockResolvedValue({ id: 'pli-1' });
    variantRepository.findById.mockResolvedValueOnce({
      id: 'variant-1',
      productId: 'product-1',
      priceListItems: [],
    });
    multimediaService.listByEntityIds.mockResolvedValueOnce({});
    multimediaService.link.mockResolvedValue(undefined);

    const result = await service.create({
      productId: 'product-1',
      sku: 'SKU-1',
      basePrice: 100,
      unitId: 'unit-1',
      priceListItems: [
        {
          priceListId: 'price-list-1',
          netPrice: 90,
          grossPrice: 100,
        },
      ],
      multimediaAssetIds: ['asset-1'],
    });

    expect(variantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        sku: 'SKU-1',
        basePrice: 100,
        unitId: 'unit-1',
      }),
    );
    expect(priceListItemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        priceListId: 'price-list-1',
        productVariantId: 'variant-1',
      }),
    );
    expect(multimediaService.link).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      variant: {
        id: 'variant-1',
        primaryImageUrl: null,
        mediaAssets: [],
      },
    });
  });

  it('should update variant and ignore legacy multimediaAssetIds', async () => {
    variantRepository.findById
      .mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'product-1',
        sku: 'SKU-1',
        companyId: 'company-1',
        unitId: 'unit-1',
        saleUnitId: 'unit-1',
        stockBaseUnitId: 'unit-1',
        purchaseUnitId: 'unit-1',
      })
      .mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'product-1',
        sku: 'SKU-2',
      });
    variantRepository.save.mockResolvedValueOnce({
      id: 'variant-1',
      productId: 'product-1',
      sku: 'SKU-2',
    });
    priceListItemRepository.deleteByVariantId.mockResolvedValue(undefined);
    priceListItemRepository.save.mockResolvedValue({ id: 'pli-9' });
    multimediaService.listByEntityIds.mockResolvedValueOnce({
      'variant-1': [
        {
          id: 'asset-9',
          publicUrl: '/multimedia/files/asset-9',
          mimeType: 'image/jpeg',
          kind: 'image',
        },
      ],
    });
    multimediaService.unlink.mockResolvedValue(undefined);
    multimediaService.link.mockResolvedValue(undefined);

    const result = await service.update('variant-1', {
      sku: 'SKU-2',
      priceListItems: [
        {
          priceListId: 'price-list-9',
          netPrice: 180,
          grossPrice: 200,
        },
      ],
      multimediaAssetIds: ['asset-9'],
    });

    expect(priceListItemRepository.deleteByVariantId).toHaveBeenCalledWith('variant-1');
    expect(multimediaService.unlink).not.toHaveBeenCalled();
    expect(multimediaService.link).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      variant: {
        id: 'variant-1',
        primaryImageUrl: null,
      },
    });
  });

  it('should reject create when price list ids are duplicated', async () => {
    await expect(
      service.create({
        productId: 'product-1',
        sku: 'SKU-1',
        basePrice: 100,
        unitId: 'unit-1',
        priceListItems: [
          { priceListId: 'same-list', netPrice: 90, grossPrice: 100 },
          { priceListId: 'same-list', netPrice: 80, grossPrice: 90 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(variantRepository.save).not.toHaveBeenCalled();
  });

  it('should throw when updating a missing variant', async () => {
    variantRepository.findById.mockResolvedValueOnce(null);

    await expect(service.update('missing', { sku: 'SKU-X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should reject manual pmp update via API', async () => {
    variantRepository.findById.mockResolvedValueOnce({
      id: 'variant-1',
      productId: 'product-1',
      sku: 'SKU-1',
      pmp: 100,
      companyId: 'company-1',
      unitId: 'unit-1',
      saleUnitId: 'unit-1',
      stockBaseUnitId: 'unit-1',
      purchaseUnitId: 'unit-1',
    });

    await expect(service.update('variant-1', { pmp: 250 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(variantRepository.save).not.toHaveBeenCalled();
  });

  it('should strip pmpHistory from client payload on update', async () => {
    variantRepository.findById
      .mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'product-1',
        sku: 'SKU-1',
        pmp: 10,
        companyId: 'company-1',
        unitId: 'unit-1',
        saleUnitId: 'unit-1',
        stockBaseUnitId: 'unit-1',
        purchaseUnitId: 'unit-1',
      })
      .mockResolvedValueOnce({ id: 'variant-1', sku: 'SKU-1' });
    variantRepository.save.mockImplementation(async (row: any) => ({ ...row }));
    multimediaService.listByEntity.mockResolvedValue([]);

    await service.update('variant-1', {
      sku: 'SKU-1',
      pmpHistory: [{ forged: true }] as any,
    });

    const saved = variantRepository.save.mock.calls[0][0] as any;
    expect(saved.pmpHistory).toBeUndefined();
  });

  it('should strip salePriceHistory from client payload on update', async () => {
    variantRepository.findById
      .mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'product-1',
        sku: 'SKU-1',
        pmp: 10,
        companyId: 'company-1',
        unitId: 'unit-1',
        saleUnitId: 'unit-1',
        stockBaseUnitId: 'unit-1',
        purchaseUnitId: 'unit-1',
      })
      .mockResolvedValueOnce({ id: 'variant-1', sku: 'SKU-1' });
    variantRepository.save.mockImplementation(async (row: any) => ({ ...row }));
    multimediaService.listByEntity.mockResolvedValue([]);

    await service.update('variant-1', {
      sku: 'SKU-1',
      salePriceHistory: [{ forged: true }] as any,
    });

    const saved = variantRepository.save.mock.calls[0][0] as any;
    expect(saved.salePriceHistory).toBeUndefined();
  });

  it('should create variant with null pmp and reject explicit pmp in payload', async () => {
    variantRepository.save.mockImplementation(async (row: any) => ({
      id: 'variant-new',
      ...row,
    }));
    variantRepository.findById.mockResolvedValue({
      id: 'variant-new',
      productId: 'product-1',
      priceListItems: [],
    });
    multimediaService.listByEntity.mockResolvedValue([]);

    await service.create({
      productId: 'product-1',
      sku: 'SKU-PMP',
      basePrice: 1,
      unitId: 'unit-1',
    });

    expect(variantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        pmp: null,
        pmpHistory: null,
        salePriceHistory: null,
      }),
    );

    await expect(
      service.create({
        productId: 'product-1',
        sku: 'SKU-PMP-2',
        basePrice: 1,
        unitId: 'unit-1',
        pmp: 99.5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});