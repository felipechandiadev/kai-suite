import * as crypto from 'crypto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ProductsServiceAdapter } from '@modules/products/application/products.service.adapter';
import { CreateProductCommand } from '@modules/products/application/commands/create-product.command';
import { UpdateProductCommand } from '@modules/products/application/commands/update-product.command';
import { RemoveProductCommand } from '@modules/products/application/commands/remove-product.command';
import { SearchProductsQuery } from '@modules/products/application/queries/search-products.query';
import { GetProductQuery } from '@modules/products/application/queries/get-product.query';
import { GetAllProductsQuery } from '@modules/products/application/queries/get-all-products.query';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { ProductModeService } from '@shared/product-mode/product-mode.service';

describe('ProductsServiceAdapter', () => {
  let service: ProductsServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let multimediaService: {
    listByEntity: jest.Mock;
    unlink: jest.Mock;
    link: jest.Mock;
  };
  let productModeService: { assertProductTypeAllowed: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    multimediaService = {
      listByEntity: jest.fn(),
      unlink: jest.fn(),
      link: jest.fn(),
    };
    productModeService = {
      assertProductTypeAllowed: jest.fn(),
    };

    service = new ProductsServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      multimediaService as unknown as MultimediaServiceAdapter,
      productModeService as unknown as ProductModeService,
    );
  });

  it('should dispatch SearchProductsQuery with defaults', async () => {
    queryBus.execute.mockResolvedValueOnce({ items: [] });

    await service.search({ query: 'ring', page: 2, pageSize: 5, priceListId: 'pl-1' });

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(SearchProductsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      query: 'ring',
      page: 2,
      pageSize: 5,
      priceListId: 'pl-1',
    });
  });

  it('should dispatch GetProductQuery for findOne and getStocks', async () => {
    queryBus.execute.mockResolvedValue(null);

    await service.findOne('product-1');
    await service.getStocks('product-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(2);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetProductQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ productId: 'product-1' });
    expect(queryBus.execute.mock.calls[1][0]).toBeInstanceOf(GetProductQuery);
    expect(queryBus.execute.mock.calls[1][0]).toMatchObject({ productId: 'product-1' });
  });

  it('should dispatch GetAllProductsQuery with mapped filter fields', async () => {
    queryBus.execute.mockResolvedValueOnce({ items: [], total: 0 });

    await service.findAll({ limit: 25, offset: 10, search: 'gold' });

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllProductsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      limit: 25,
      offset: 10,
      search: 'gold',
    });
  });

  it('should dispatch CreateProductCommand with generated product id', async () => {
    const generatedId = '33333333-3333-4333-8333-333333333333';
    const randomUuidSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue(generatedId);
    commandBus.execute.mockResolvedValueOnce({ id: generatedId });
    queryBus.execute.mockResolvedValueOnce({ id: generatedId, mediaAssets: [] });
    multimediaService.listByEntity.mockResolvedValueOnce([]);
    multimediaService.link.mockResolvedValue(undefined);

    await service.create({
      name: 'Gold Ring',
      categoryId: 'cat-1',
      brand: 'Acme',
      description: 'desc',
      isActive: true,
      multimediaAssetIds: ['asset-1', 'asset-2'],
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreateProductCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      productId: generatedId,
      name: 'Gold Ring',
      categoryId: 'cat-1',
      brand: 'Acme',
      description: 'desc',
      isActive: true,
    });
    expect(multimediaService.listByEntity).toHaveBeenCalledWith('product', generatedId);
    expect(multimediaService.link).toHaveBeenNthCalledWith(1, {
      assetId: 'asset-1',
      entityType: 'product',
      entityId: generatedId,
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
    expect(multimediaService.link).toHaveBeenNthCalledWith(2, {
      assetId: 'asset-2',
      entityType: 'product',
      entityId: generatedId,
      usageType: 'primary-image',
      sortOrder: 1,
      isPrimary: false,
    });

    randomUuidSpy.mockRestore();
  });

  it('should dispatch UpdateProductCommand with placeholder current user id', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'product-1' });
    multimediaService.listByEntity.mockResolvedValueOnce([{ id: 'old-asset' }]);
    multimediaService.unlink.mockResolvedValue(undefined);
    multimediaService.link.mockResolvedValue(undefined);
    queryBus.execute.mockResolvedValueOnce({ id: 'product-1', mediaAssets: [] });

    await service.update('product-1', {
      name: 'Updated ring',
      description: 'updated desc',
      brand: 'New brand',
      categoryId: 'cat-2',
      isActive: false,
      multimediaAssetIds: ['asset-9'],
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateProductCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      productId: 'product-1',
      currentUserId: 'system-user',
      name: 'Updated ring',
      description: 'updated desc',
      brand: 'New brand',
      categoryId: 'cat-2',
      isActive: false,
    });
    expect(multimediaService.listByEntity).toHaveBeenCalledWith('product', 'product-1');
    expect(multimediaService.unlink).toHaveBeenCalledWith({
      assetId: 'old-asset',
      entityType: 'product',
      entityId: 'product-1',
    });
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-9',
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
  });

  it('should dispatch RemoveProductCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.remove('product-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(RemoveProductCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      productId: 'product-1',
      currentUserId: 'system-user',
    });
  });
});