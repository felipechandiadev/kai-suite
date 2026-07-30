import { BaseQuery } from '@shared/cqrs';

export class GetAllAccountingPeriodSnapshotsQuery extends BaseQuery {
  constructor(
    public readonly limit: number = 100,
    public readonly offset: number = 0,
    public readonly periodId?: string,
    public readonly accountId?: string,
  ) {
    super();
  }
}
