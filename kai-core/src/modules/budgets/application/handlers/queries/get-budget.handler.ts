import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException, Inject } from '@nestjs/common';
import { GetBudgetQuery } from '../../queries/get-budget.query';
import { Budget } from '../../../domain/budget.entity';
import { BudgetRepositoryPort } from '../../ports/budget.repository.port';

@QueryHandler(GetBudgetQuery)
export class GetBudgetQueryHandler
  implements IQueryHandler<GetBudgetQuery, Budget>
{
  private readonly logger = new Logger(GetBudgetQueryHandler.name);

  constructor(
    @Inject('BudgetRepositoryPort')
    private readonly repository: BudgetRepositoryPort,
  ) {}

  async execute(query: GetBudgetQuery): Promise<Budget> {
    this.logger.debug(`Fetching budget ${query.budgetId}`);

    const budget = await this.repository.findById(query.budgetId);

    if (!budget) {
      throw new NotFoundException(`Budget ${query.budgetId} not found`);
    }

    return budget;
  }
}
