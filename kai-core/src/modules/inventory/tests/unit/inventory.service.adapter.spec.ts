import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { InventoryServiceAdapter } from '@modules/inventory/application/inventory.service.adapter';
import {
  GetAllStocksQuery,
  GetStockByIdQuery,
  GetLowStockItemsQuery,
  GetStockMovementHistoryQuery,
} from '@modules/inventory/application/queries/get-stock.queries';

describe('InventoryServiceAdapter', () => {
  let service: InventoryServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get(InventoryServiceAdapter);
  });

  it('should return static filters payload', async () => {
    await expect(service.getFilters()).resolves.toEqual({
      storages: [],
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    });
    expect(queryBus.execute).not.toHaveBeenCalled();
  });

  it('should dispatch GetAllStocksQuery from search', async () => {
    queryBus.execute.mockResolvedValueOnce({ rows: [], total: 0 });

    await service.search({
      search: 'abc',
      branchId: 'branch-1',
      storageId: 'storage-1',
    });

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllStocksQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      filters: {
        search: 'abc',
        branchId: 'branch-1',
        storageId: 'storage-1',
      },
    });
  });

  it('should dispatch GetStockByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getStockById('variant-1', 'storage-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetStockByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      variantId: 'variant-1',
      storageId: 'storage-1',
    });
  });

  it('should dispatch GetLowStockItemsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getLowStockItems(3, 'storage-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetLowStockItemsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      minimumThreshold: 3,
      storageId: 'storage-1',
    });
  });

  it('should dispatch GetStockMovementHistoryQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getStockMovementHistory('variant-1', 'storage-1', 20);

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(
      GetStockMovementHistoryQuery,
    );
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      variantId: 'variant-1',
      storageId: 'storage-1',
      limit: 20,
    });
  });
});