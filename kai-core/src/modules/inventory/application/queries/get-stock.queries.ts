import { SearchStockFiltersDto } from '../dto/stock-level.dto';

export class GetStockFiltersQuery {}

export class GetAllStocksQuery {
  constructor(public readonly filters?: SearchStockFiltersDto) {}
}

export class GetStockByIdQuery {
  constructor(
    public readonly variantId: string,
    public readonly storageId: string,
  ) {}
}

export class GetLowStockItemsQuery {
  constructor(
    public readonly minimumThreshold: number,
    public readonly storageId?: string,
  ) {}
}

export class GetStockMovementHistoryQuery {
  constructor(
    public readonly variantId: string,
    public readonly storageId: string,
    public readonly limit?: number,
  ) {}
}
