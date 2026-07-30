import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetStockFiltersQuery,
  GetAllStocksQuery,
  GetStockByIdQuery,
  GetLowStockItemsQuery,
  GetStockMovementHistoryQuery,
} from '@modules/inventory/application/queries/get-stock.queries';
import {
  STOCK_LEVELS_REPOSITORY,
  StockLevelsRepositoryPort,
} from '@modules/inventory/application/ports/stock-levels.repository.port';
import {
  StockFiltersDto,
  StockLevelWithDetailsDto,
  StockLevelDto,
  StockMovementDto,
} from '@modules/inventory/application/dto/stock-level.dto';

@QueryHandler(GetStockFiltersQuery)
export class GetStockFiltersQueryHandler implements IQueryHandler<GetStockFiltersQuery> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
  ) {}

  async execute(query: GetStockFiltersQuery): Promise<StockFiltersDto> {
    return this.stockRepository.getFilters();
  }
}

@QueryHandler(GetAllStocksQuery)
export class GetAllStocksQueryHandler implements IQueryHandler<GetAllStocksQuery> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
  ) {}

  async execute(
    query: GetAllStocksQuery,
  ): Promise<{ rows: StockLevelWithDetailsDto[]; total: number }> {
    return this.stockRepository.search(query.filters || {});
  }
}

@QueryHandler(GetStockByIdQuery)
export class GetStockByIdQueryHandler implements IQueryHandler<GetStockByIdQuery> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
  ) {}

  async execute(query: GetStockByIdQuery): Promise<StockLevelDto | null> {
    return this.stockRepository.findByVariantAndStorage(
      query.variantId,
      query.storageId,
    );
  }
}

@QueryHandler(GetLowStockItemsQuery)
export class GetLowStockItemsQueryHandler implements IQueryHandler<GetLowStockItemsQuery> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
  ) {}

  async execute(
    query: GetLowStockItemsQuery,
  ): Promise<StockLevelWithDetailsDto[]> {
    return this.stockRepository.getLowStockItems(
      query.minimumThreshold,
      query.storageId,
    );
  }
}

@QueryHandler(GetStockMovementHistoryQuery)
export class GetStockMovementHistoryQueryHandler implements IQueryHandler<GetStockMovementHistoryQuery> {
  constructor(
    @Inject(STOCK_LEVELS_REPOSITORY)
    private readonly stockRepository: StockLevelsRepositoryPort,
  ) {}

  async execute(
    query: GetStockMovementHistoryQuery,
  ): Promise<StockMovementDto[]> {
    return this.stockRepository.getMovementHistory(
      query.variantId,
      query.storageId,
      query.limit,
    );
  }
}
