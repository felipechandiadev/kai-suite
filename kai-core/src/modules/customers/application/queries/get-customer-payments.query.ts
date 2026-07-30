import { BaseQuery } from '@shared/cqrs';

export class GetCustomerPaymentsQuery extends BaseQuery {
  constructor(
    public readonly customerId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {
    super();
  }
}
