import { BaseQuery } from '@shared/cqrs';

export class SearchProductsQuery extends BaseQuery {
  constructor(
    public readonly query: string | undefined,
    public readonly page: number = 1,
    public readonly pageSize: number = 10,
    public readonly priceListId?: string,
    public readonly productType?: string,
  ) {
    super();
  }
}
