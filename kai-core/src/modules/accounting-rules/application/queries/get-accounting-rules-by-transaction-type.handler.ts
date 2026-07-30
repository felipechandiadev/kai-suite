import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { AccountingRuleRepositoryPort } from '../ports/accounting-rule.repository.port';
import { GetAccountingRulesByTransactionTypeQuery } from './get-accounting-rules-by-transaction-type.query';

@QueryHandler(GetAccountingRulesByTransactionTypeQuery)
export class GetAccountingRulesByTransactionTypeHandler implements IQueryHandler<GetAccountingRulesByTransactionTypeQuery> {
  constructor(
    @Inject('AccountingRuleRepositoryPort')
    private readonly repository: AccountingRuleRepositoryPort,
  ) {}

  async execute(
    query: GetAccountingRulesByTransactionTypeQuery,
  ): Promise<AccountingRule[]> {
    return this.repository.findByTransactionType(
      query.companyId,
      query.transactionType,
    );
  }
}
