import { Query } from '@nestjs/cqrs';
import { AccountingRule } from '../../domain/accounting-rule.entity';

export class GetAccountingRuleByIdQuery extends Query<AccountingRule | null> {
  constructor(public readonly id: string) {
    super();
  }
}
