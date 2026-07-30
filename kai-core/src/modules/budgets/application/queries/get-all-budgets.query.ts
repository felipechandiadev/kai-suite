import { BaseQuery } from '@shared/cqrs';

export class GetAllBudgetsQuery extends BaseQuery {
  constructor(
    public readonly limit: number = 100,
    public readonly offset: number = 0,
    public readonly companyId?: string,
    public readonly status?: string,
  ) {
    super();
  }
}
