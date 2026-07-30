import { BaseQuery } from '@shared/cqrs';

export class GetCustomerQuery extends BaseQuery {
  constructor(public readonly customerId: string) {
    super();
  }
}
