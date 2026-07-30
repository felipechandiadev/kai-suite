import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetAllPriceListsQueryHandler } from '@modules/price-lists/application/handlers/queries/get-all-price-lists.handler';
import { GetAllPriceListsQuery } from '@modules/price-lists/application/queries/get-price-lists.query';
import { PriceListOrmEntity, PriceListType } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

describe('GetAllPriceListsQueryHandler', () => {
  let handler: GetAllPriceListsQueryHandler;
  let repository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    where: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllPriceListsQueryHandler,
        {
          provide: getRepositoryToken(PriceListOrmEntity),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetAllPriceListsQueryHandler);
  });

  it('should filter active price lists when includeInactive is false', async () => {
    const now = new Date();
    queryBuilder.getMany.mockResolvedValueOnce([
      {
        id: 'pl-1',
        name: 'Retail',
        priceListType: PriceListType.RETAIL,
        currency: 'CLP',
        validFrom: now,
        validUntil: undefined,
        priority: 1,
        isDefault: true,
        isActive: true,
        description: 'desc',
        createdAt: now,
        updatedAt: now,
        deletedAt: undefined,
      },
    ]);

    const result = await handler.execute(new GetAllPriceListsQuery(false));

    expect(queryBuilder.where).toHaveBeenCalledWith('pl.isActive = :active', {
      active: true,
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('pl.priority', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('pl.name', 'ASC');
    expect(result[0]).toMatchObject({
      id: 'pl-1',
      name: 'Retail',
      priceListType: PriceListType.RETAIL,
    });
  });

  it('should not apply active filter when includeInactive is true', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await handler.execute(new GetAllPriceListsQuery(true));

    expect(queryBuilder.where).not.toHaveBeenCalled();
  });
});