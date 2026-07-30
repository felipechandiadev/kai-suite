import { BaseQuery } from '@shared/cqrs';

export class GetBudgetQuery extends BaseQuery {
  constructor(public readonly budgetId: string) {
    super();
  }
}
