import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllAccountingPeriodSnapshotsQuery } from './queries/get-all-accounting-period-snapshots.query';
import { GetAccountingPeriodSnapshotQuery } from './queries/get-accounting-period-snapshot.query';
import { ListAccountingPeriodSnapshotsDto } from './dto/list-accounting-period-snapshots.dto';

@Injectable()
export class AccountingPeriodSnapshotsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async findAll(query: ListAccountingPeriodSnapshotsDto) {
    const result = await this.queryBus.execute(
      new GetAllAccountingPeriodSnapshotsQuery(
        query?.limit || 100,
        query?.offset || 0,
        query?.periodId,
        query?.accountId,
      ),
    );
    return result.items;
  }

  async findOne(id: string) {
    return this.queryBus.execute(new GetAccountingPeriodSnapshotQuery(id));
  }
}
