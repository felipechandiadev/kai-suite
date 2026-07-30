import { BaseQuery } from '@shared/cqrs';

export class SearchCustomersQuery extends BaseQuery {
  constructor(
    public readonly query?: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {
    super();
  }
}
