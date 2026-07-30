import { BaseQuery } from '@shared/cqrs';

export class SearchPosProductsQuery extends BaseQuery {
  constructor(
    public readonly priceListId: string,
    public readonly query?: string,
    public readonly branchId?: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {
    super();
  }
}
