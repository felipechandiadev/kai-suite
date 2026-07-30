import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException, Inject } from '@nestjs/common';
import { GetAccountingPeriodSnapshotQuery } from '../../queries/get-accounting-period-snapshot.query';
import { AccountingPeriodSnapshot } from '../../../domain/accounting-period-snapshot.entity';
import { AccountingPeriodSnapshotRepositoryPort } from '../../ports/accounting-period-snapshot.repository.port';

@QueryHandler(GetAccountingPeriodSnapshotQuery)
export class GetAccountingPeriodSnapshotQueryHandler
  implements IQueryHandler<GetAccountingPeriodSnapshotQuery, AccountingPeriodSnapshot>
{
  private readonly logger = new Logger(
    GetAccountingPeriodSnapshotQueryHandler.name,
  );

  constructor(
    @Inject('AccountingPeriodSnapshotRepositoryPort')
    private readonly repository: AccountingPeriodSnapshotRepositoryPort,
  ) {}

  async execute(
    query: GetAccountingPeriodSnapshotQuery,
  ): Promise<AccountingPeriodSnapshot> {
    this.logger.debug(
      `Fetching accounting period snapshot ${query.snapshotId}`,
    );

    const snapshot = await this.repository.findById(query.snapshotId);

    if (!snapshot) {
      throw new NotFoundException(
        `Accounting period snapshot ${query.snapshotId} not found`,
      );
    }

    return snapshot;
  }
}
