import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllStocksQuery, GetStockByIdQuery, GetLowStockItemsQuery, GetStockMovementHistoryQuery } from './queries/get-stock.queries';

@Injectable()
export class InventoryServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getFilters() {
    // This method doesn't use CQRS queries, it's a simple data retrieval
    // We'll keep it as a direct call for now, but it should be moved to a query handler
    return {
      storages: [],
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    };
  }

  async search(params?: {
    search?: string;
    branchId?: string;
    storageId?: string;
  }) {
    const result = await this.queryBus.execute(
      new GetAllStocksQuery({
        search: params?.search,
        branchId: params?.branchId,
        storageId: params?.storageId,
      }),
    );
    return result;
  }

  async getStockById(variantId: string, storageId: string) {
    return this.queryBus.execute(new GetStockByIdQuery(variantId, storageId));
  }

  async getLowStockItems(minimumThreshold: number, storageId?: string) {
    return this.queryBus.execute(new GetLowStockItemsQuery(minimumThreshold, storageId));
  }

  async getStockMovementHistory(variantId: string, storageId: string, limit?: number) {
    return this.queryBus.execute(new GetStockMovementHistoryQuery(variantId, storageId, limit));
  }
}