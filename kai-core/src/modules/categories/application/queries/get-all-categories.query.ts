import { BaseQuery } from '@shared/cqrs';

export class GetAllCategoriesQuery extends BaseQuery {
  constructor(
    public readonly limit: number = 100,
    public readonly offset: number = 0,
    public readonly search?: string,
    public readonly withCounts: boolean = false,
  ) {
    super();
  }
}
