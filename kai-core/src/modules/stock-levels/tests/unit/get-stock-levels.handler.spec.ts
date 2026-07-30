import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetStockLevelsQueryHandler } from '@modules/stock-levels/application/handlers/queries/get-stock-levels.handler';
import { GetStockLevelsQuery } from '@modules/stock-levels/application/queries/get-stock-levels.query';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

describe('GetStockLevelsQueryHandler', () => {
  let handler: GetStockLevelsQueryHandler;
  let repository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStockLevelsQueryHandler,
        {
          provide: getRepositoryToken(StockLevel),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetStockLevelsQueryHandler);
  });

  it('should return mapped stock levels and apply filters', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([
      {
        id: 'sl-1',
        productVariantId: 'variant-1',
        storageId: 'storage-1',
        physicalStock: 10,
        committedStock: 3,
        availableStock: 7,
        incomingStock: 2,
      },
    ]);

    const result = await handler.execute(
      new GetStockLevelsQuery('variant-1', 'storage-1'),
    );

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('sl');
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'sl.productVariantId = :productVariantId',
      { productVariantId: 'variant-1' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'sl.storageId = :storageId',
      { storageId: 'storage-1' },
    );
    expect(result).toEqual({
      stockLevels: [
        {
          id: 'sl-1',
          productVariantId: 'variant-1',
          storageId: 'storage-1',
          physicalStock: 10,
          committedStock: 3,
          availableStock: 7,
          incomingStock: 2,
        },
      ],
    });
  });

  it('should omit filters when query params are absent', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await handler.execute(new GetStockLevelsQuery());

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  });
});