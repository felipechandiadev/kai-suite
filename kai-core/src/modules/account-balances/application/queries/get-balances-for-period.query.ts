import { BaseQuery } from '@shared/cqrs';

export class GetBalancesForPeriodQuery extends BaseQuery {
  constructor(
    public readonly companyId: string,
    public readonly periodId: string,
  ) {
    super();
  }
}
