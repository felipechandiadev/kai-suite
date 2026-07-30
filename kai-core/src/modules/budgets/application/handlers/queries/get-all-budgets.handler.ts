import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { GetAllBudgetsQuery } from '../../queries/get-all-budgets.query';
import { Budget } from '../../../domain/budget.entity';
import { BudgetRepositoryPort } from '../../ports/budget.repository.port';

interface BudgetsResponse {
  items: Budget[];
  total: number;
  limit: number;
  offset: number;
}

@QueryHandler(GetAllBudgetsQuery)
export class GetAllBudgetsQueryHandler
  implements IQueryHandler<GetAllBudgetsQuery, BudgetsResponse>
{
  private readonly logger = new Logger(GetAllBudgetsQueryHandler.name);

  constructor(
    @Inject('BudgetRepositoryPort')
    private readonly repository: BudgetRepositoryPort,
  ) {}

  async execute(query: GetAllBudgetsQuery): Promise<BudgetsResponse> {
    this.logger.debug(
      `Fetching budgets with limit=${query.limit}, offset=${query.offset}`,
    );

    const result = await this.repository.findAllPaginated(
      query.limit,
      query.offset,
      query.companyId,
      query.status,
    );

    return {
      items: result.items,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
