import { BaseQuery } from '@shared/cqrs';

export class GetCustomerPendingPaymentsQuery extends BaseQuery {
  constructor(public readonly customerId: string) {
    super();
  }
}
