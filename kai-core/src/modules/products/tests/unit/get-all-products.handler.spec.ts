import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetAllProductsQueryHandler } from '@modules/products/application/handlers/queries/get-all-products.handler';
import { GetAllProductsQuery } from '@modules/products/application/queries/get-all-products.query';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

describe('GetAllProductsQueryHandler', () => {
  let handler: GetAllProductsQueryHandler;
  let repository: { createQueryBuilder: jest.Mock };
  let multimediaService: { listByEntity: jest.Mock };
  let queryBuilder: {
    leftJoin: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    distinct: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    getMany: jest.Mock;
    expressionMap: { joinAttributes: unknown[] };
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      expressionMap: { joinAttributes: [] },
    };

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    multimediaService = { listByEntity: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllProductsQueryHandler,
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

    handler = module.get(GetAllProductsQueryHandler);
  });

  it('should fetch products with search and map to domain entities', async () => {
    const now = new Date();
    queryBuilder.getCount.mockResolvedValueOnce(1);
    queryBuilder.getMany.mockResolvedValueOnce([
      {
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
      },
    ]);

    const result = await handler.execute(new GetAllProductsQuery(20, 10, ' gold '));

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('product');
    expect(queryBuilder.where).toHaveBeenCalledWith('product.deletedAt IS NULL');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('unaccent'),
      { productCatalogSearchQ: '%gold%' }, // término plegado (sin tildes / minúsculas)
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('product.name', 'ASC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(20);
    expect(queryBuilder.offset).toHaveBeenCalledWith(10);
    expect(multimediaService.listByEntity).toHaveBeenCalledWith(
      'product',
      'product-1',
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'product-1',
      name: 'Gold Ring',
      primaryImageUrl: null,
      mediaAssets: [],
    });
  });

  it('should omit search filter when query is empty', async () => {
    queryBuilder.getCount.mockResolvedValueOnce(0);
    queryBuilder.getMany.mockResolvedValueOnce([]);

    const result = await handler.execute(new GetAllProductsQuery());

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0, limit: 100, offset: 0 });
  });
});