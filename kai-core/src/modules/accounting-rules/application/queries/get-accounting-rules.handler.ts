import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { AccountingRuleRepositoryPort } from '../ports/accounting-rule.repository.port';
import { GetAccountingRulesQuery } from './get-accounting-rules.query';

@QueryHandler(GetAccountingRulesQuery)
export class GetAccountingRulesHandler implements IQueryHandler<GetAccountingRulesQuery> {
  constructor(
    @Inject('AccountingRuleRepositoryPort')
    private readonly repository: AccountingRuleRepositoryPort,
  ) {}

  async execute(query: GetAccountingRulesQuery): Promise<AccountingRule[]> {
    return this.repository.findAll(query.companyId);
  }
}
