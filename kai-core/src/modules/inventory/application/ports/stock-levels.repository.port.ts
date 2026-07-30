import {
  StockLevelDto,
  StockLevelWithDetailsDto,
  SearchStockFiltersDto,
  StockMovementDto,
} from '../dto/stock-level.dto';

export const STOCK_LEVELS_REPOSITORY = 'STOCK_LEVELS_REPOSITORY';

export interface StockLevelsRepositoryPort {
  // CRUD
  findById(id: string): Promise<StockLevelDto | null>;
  findByVariantAndStorage(
    variantId: string,
    storageId: string,
  ): Promise<StockLevelDto | null>;

  // Single key queries
  findByVariantId(variantId: string): Promise<StockLevelDto[]>;
  findByStorageId(storageId: string): Promise<StockLevelDto[]>;

  // Search with filters
  search(filters: SearchStockFiltersDto): Promise<{
    rows: StockLevelWithDetailsDto[];
    total: number;
  }>;

  // Aggregations
  getTotalStockByVariant(variantId: string): Promise<number>;
  getAvailableStockByVariant(variantId: string): Promise<number>;

  // Specialized queries
  getMovementHistory(
    variantId: string,
    storageId: string,
    limit?: number,
  ): Promise<StockMovementDto[]>;
  getMovementHistoryPaginated(
    variantId: string,
    storageId: string | undefined,
    page: number,
    limit: number,
    companyId?: string,
  ): Promise<{
    rows: StockMovementDto[];
    total: number;
    page: number;
    limit: number;
  }>;
  getLowStockItems(
    minimumThreshold: number,
    storageId?: string,
  ): Promise<StockLevelWithDetailsDto[]>;
  getStockByBranch(branchId: string): Promise<StockLevelWithDetailsDto[]>;
  getFilters(): Promise<any>;

  // Updates (handled by repository, emitting events)
  save(stockLevel: StockLevelDto): Promise<StockLevelDto>;
  delete(id: string): Promise<void>;
  saveMany(stockLevels: StockLevelDto[]): Promise<StockLevelDto[]>;
}
