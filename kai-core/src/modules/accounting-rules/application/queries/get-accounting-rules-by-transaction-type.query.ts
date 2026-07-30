import { Query } from '@nestjs/cqrs';
import { AccountingRule } from '../../domain/accounting-rule.entity';

export class GetAccountingRulesByTransactionTypeQuery extends Query<
  AccountingRule[]
> {
  constructor(
    public readonly companyId: string,
    public readonly transactionType: string,
  ) {
    super();
  }
}
