import { BaseQuery } from '@shared/cqrs';

export interface GetStockLevelsQueryResult {
  stockLevels: Array<{
    id: string;
    productVariantId: string;
    storageId: string;
    physicalStock: number;
    committedStock: number;
    availableStock: number;
    incomingStock: number;
  }>;
}

export class GetStockLevelsQuery extends BaseQuery {
  constructor(
    public readonly productVariantId?: string,
    public readonly storageId?: string,
  ) {
    super();
  }
}