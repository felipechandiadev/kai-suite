import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetPriceListByIdQueryHandler } from '@modules/price-lists/application/handlers/queries/get-price-list-by-id.handler';
import { GetPriceListByIdQuery } from '@modules/price-lists/application/queries/get-price-lists.query';
import { PriceListOrmEntity, PriceListType } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

describe('GetPriceListByIdQueryHandler', () => {
  let handler: GetPriceListByIdQueryHandler;
  let repository: { findOne: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPriceListByIdQueryHandler,
        {
          provide: getRepositoryToken(PriceListOrmEntity),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetPriceListByIdQueryHandler);
  });

  it('should return mapped price list when found', async () => {
    const now = new Date();
    repository.findOne.mockResolvedValueOnce({
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
    });

    const result = await handler.execute(new GetPriceListByIdQuery('pl-1'));

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'pl-1' },
    });
    expect(result).toMatchObject({
      id: 'pl-1',
      name: 'Retail',
      priceListType: PriceListType.RETAIL,
    });
  });

  it('should return null when price list is missing', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetPriceListByIdQuery('missing'))).resolves.toBeNull();
  });
});