import { BaseQuery } from '@shared/cqrs';

export class GetCustomerPurchasesQuery extends BaseQuery {
  constructor(
    public readonly customerId: string,
    public readonly status?: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {
    super();
  }
}
