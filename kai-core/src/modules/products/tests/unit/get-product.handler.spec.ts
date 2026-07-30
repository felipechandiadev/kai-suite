import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetProductQueryHandler } from '@modules/products/application/handlers/queries/get-product.handler';
import { GetProductQuery } from '@modules/products/application/queries/get-product.query';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

describe('GetProductQueryHandler', () => {
  let handler: GetProductQueryHandler;
  let repository: { findOne: jest.Mock };
  let multimediaService: { listByEntity: jest.Mock };

  beforeEach(async () => {
    repository = { findOne: jest.fn() };
    multimediaService = { listByEntity: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductQueryHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: repository,
        },
        {
          provide: MultimediaServiceAdapter,
          useValue: multimediaService,
        },
      ],
    }).compile();

    handler = module.get(GetProductQueryHandler);
  });

  it('should map orm entity to domain product', async () => {
    const now = new Date();
    repository.findOne.mockResolvedValueOnce({
      id: 'product-1',
      name: 'Gold Ring',
      categoryId: 'cat-1',
      brand: 'Acme',
      description: 'desc',
      isActive: true,
      productType: ProductType.PHYSICAL,
      taxIds: ['tax-1'],
      resultCenterId: 'rc-1',
      baseUnitId: 'unit-1',
      metadata: { source: 'test' },
      changeHistory: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    });

    const result = await handler.execute(new GetProductQuery('product-1'));

    expect(multimediaService.listByEntity).toHaveBeenCalledWith(
      'product',
      'product-1',
    );

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'product-1', deletedAt: null as any },
    });
    expect(result).toMatchObject({
      id: 'product-1',
      name: 'Gold Ring',
      categoryId: 'cat-1',
      brand: 'Acme',
      productType: ProductType.PHYSICAL,
      primaryImageUrl: null,
      mediaAssets: [],
    });
  });

  it('should throw when product does not exist', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetProductQuery('missing'))).rejects.toThrow(
      new NotFoundException('Product missing not found'),
    );
  });
});