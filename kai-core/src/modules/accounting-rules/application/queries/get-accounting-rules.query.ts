import { Query } from '@nestjs/cqrs';
import { AccountingRule } from '../../domain/accounting-rule.entity';

export class GetAccountingRulesQuery extends Query<AccountingRule[]> {
  constructor(public readonly companyId: string) {
    super();
  }
}
