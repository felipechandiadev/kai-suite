import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllBudgetsQuery } from './queries/get-all-budgets.query';
import { GetBudgetQuery } from './queries/get-budget.query';
import { ListBudgetsDto } from './dto/list-budgets.dto';

@Injectable()
export class BudgetsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async findAll(query: ListBudgetsDto) {
    const result = await this.queryBus.execute(
      new GetAllBudgetsQuery(
        query?.limit || 100,
        query?.offset || 0,
        query?.companyId,
        query?.status,
      ),
    );
    return result.items;
  }

  async findOne(id: string) {
    return this.queryBus.execute(new GetBudgetQuery(id));
  }
}
