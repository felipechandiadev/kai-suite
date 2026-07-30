import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { GetAllAccountingPeriodSnapshotsQuery } from '../../queries/get-all-accounting-period-snapshots.query';
import { AccountingPeriodSnapshot } from '../../../domain/accounting-period-snapshot.entity';
import { AccountingPeriodSnapshotRepositoryPort } from '../../ports/accounting-period-snapshot.repository.port';

interface SnapshotsResponse {
  items: AccountingPeriodSnapshot[];
  total: number;
  limit: number;
  offset: number;
}

@QueryHandler(GetAllAccountingPeriodSnapshotsQuery)
export class GetAllAccountingPeriodSnapshotsQueryHandler
  implements IQueryHandler<GetAllAccountingPeriodSnapshotsQuery, SnapshotsResponse>
{
  private readonly logger = new Logger(
    GetAllAccountingPeriodSnapshotsQueryHandler.name,
  );

  constructor(
    @Inject('AccountingPeriodSnapshotRepositoryPort')
    private readonly repository: AccountingPeriodSnapshotRepositoryPort,
  ) {}

  async execute(
    query: GetAllAccountingPeriodSnapshotsQuery,
  ): Promise<SnapshotsResponse> {
    this.logger.debug(
      `Fetching accounting period snapshots with limit=${query.limit}, offset=${query.offset}`,
    );

    const result = await this.repository.findAllPaginated(
      query.limit,
      query.offset,
      query.periodId,
      query.accountId,
    );

    return {
      items: result.items,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
