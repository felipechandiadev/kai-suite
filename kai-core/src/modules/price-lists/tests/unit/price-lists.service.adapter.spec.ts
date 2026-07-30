import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { PriceListsServiceAdapter } from '@modules/price-lists/application/price-lists.service.adapter';
import {
  GetAllPriceListsQuery,
  GetPriceListByIdQuery,
} from '@modules/price-lists/application/queries/get-price-lists.query';

describe('PriceListsServiceAdapter', () => {
  let service: PriceListsServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceListsServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get(PriceListsServiceAdapter);
  });

  it('should dispatch GetAllPriceListsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getAllPriceLists(true);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllPriceListsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ includeInactive: true });
  });

  it('should dispatch GetPriceListByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getPriceListById('pl-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetPriceListByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ id: 'pl-1' });
  });
});