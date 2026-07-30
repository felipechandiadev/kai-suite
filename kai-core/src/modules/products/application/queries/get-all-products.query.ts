import { BaseQuery } from '@shared/cqrs';

export class GetAllProductsQuery extends BaseQuery {
  constructor(
    public readonly limit: number = 100,
    public readonly offset: number = 0,
    public readonly search?: string,
  ) {
    super();
  }
}
