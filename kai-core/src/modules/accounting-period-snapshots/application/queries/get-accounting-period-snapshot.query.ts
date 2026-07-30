import { BaseQuery } from '@shared/cqrs';

export class GetAccountingPeriodSnapshotQuery extends BaseQuery {
  constructor(public readonly snapshotId: string) {
    super();
  }
}
