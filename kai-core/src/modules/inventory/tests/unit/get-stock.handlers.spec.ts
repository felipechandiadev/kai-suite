import { Test, TestingModule } from '@nestjs/testing';
import {
  GetAllStocksQuery,
  GetLowStockItemsQuery,
  GetStockByIdQuery,
  GetStockFiltersQuery,
  GetStockMovementHistoryQuery,
} from '@modules/inventory/application/queries/get-stock.queries';
import {
  GetAllStocksQueryHandler,
  GetLowStockItemsQueryHandler,
  GetStockByIdQueryHandler,
  GetStockFiltersQueryHandler,
  GetStockMovementHistoryQueryHandler,
} from '@modules/inventory/application/handlers/queries/get-stock.handlers';
import {
  STOCK_LEVELS_REPOSITORY,
  StockLevelsRepositoryPort,
} from '@modules/inventory/application/ports/stock-levels.repository.port';

describe('Inventory query handlers', () => {
  let getFiltersHandler: GetStockFiltersQueryHandler;
  let getAllHandler: GetAllStocksQueryHandler;
  let getByIdHandler: GetStockByIdQueryHandler;
  let getLowStockHandler: GetLowStockItemsQueryHandler;
  let getMovementHistoryHandler: GetStockMovementHistoryQueryHandler;
  let repository: jest.Mocked<StockLevelsRepositoryPort>;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      findByVariantAndStorage: jest.fn(),
      findByVariantId: jest.fn(),
      findByStorageId: jest.fn(),
      search: jest.fn(),
      getTotalStockByVariant: jest.fn(),
      getAvailableStockByVariant: jest.fn(),
      getMovementHistory: jest.fn(),
      getLowStockItems: jest.fn(),
      getStockByBranch: jest.fn(),
      getFilters: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      saveMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStockFiltersQueryHandler,
        GetAllStocksQueryHandler,
        GetStockByIdQueryHandler,
        GetLowStockItemsQueryHandler,
        GetStockMovementHistoryQueryHandler,
        {
          provide: STOCK_LEVELS_REPOSITORY,
          useValue: repository,
        },
      ],
    }).compile();

    getFiltersHandler = module.get(GetStockFiltersQueryHandler);
    getAllHandler = module.get(GetAllStocksQueryHandler);
    getByIdHandler = module.get(GetStockByIdQueryHandler);
    getLowStockHandler = module.get(GetLowStockItemsQueryHandler);
    getMovementHistoryHandler = module.get(GetStockMovementHistoryQueryHandler);
  });

  it('should return filters from repository', async () => {
    const filters = {
      storages: [{ id: 's1' }],
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    };
    repository.getFilters.mockResolvedValueOnce(filters);

    await expect(getFiltersHandler.execute(new GetStockFiltersQuery())).resolves.toEqual(filters);
  });

  it('should search stock rows using provided filters', async () => {
    const payload = { rows: [], total: 0 };
    repository.search.mockResolvedValueOnce(payload);

    const result = await getAllHandler.execute(
      new GetAllStocksQuery({ search: 'abc', storageId: 'storage-1' }),
    );

    expect(repository.search).toHaveBeenCalledWith({
      search: 'abc',
      storageId: 'storage-1',
    });
    expect(result).toEqual(payload);
  });

  it('should fetch stock by variant and storage', async () => {
    repository.findByVariantAndStorage.mockResolvedValueOnce({
      id: 'stock-1',
      productVariantId: 'variant-1',
      storageId: 'storage-1',
      physicalStock: 10,
      committedStock: 2,
      availableStock: 8,
      incomingStock: 0,
      pmp: 1,
      lastTransactionId: null,
      lastUpdated: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await getByIdHandler.execute(
      new GetStockByIdQuery('variant-1', 'storage-1'),
    );

    expect(repository.findByVariantAndStorage).toHaveBeenCalledWith(
      'variant-1',
      'storage-1',
    );
    expect(result?.id).toBe('stock-1');
  });

  it('should fetch low stock items', async () => {
    repository.getLowStockItems.mockResolvedValueOnce([]);

    await getLowStockHandler.execute(new GetLowStockItemsQuery(5, 'storage-1'));

    expect(repository.getLowStockItems).toHaveBeenCalledWith(5, 'storage-1');
  });

  it('should fetch movement history', async () => {
    repository.getMovementHistory.mockResolvedValueOnce([]);

    await getMovementHistoryHandler.execute(
      new GetStockMovementHistoryQuery('variant-1', 'storage-1', 10),
    );

    expect(repository.getMovementHistory).toHaveBeenCalledWith(
      'variant-1',
      'storage-1',
      10,
    );
  });
});